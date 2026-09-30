/*
 * Sköldhästen – every player-facing string, in Swedish.
 *
 * Style (plan §3.6): short speaker boxes (≈ 90 characters at most), at most three
 * boxes before control returns, Swedish quotation marks and dashes, "du" to the
 * player, plain child words.
 *
 * Alva's printed text (plan §0 Q5): Pappa allowed it on 30 September (answer a).
 * Her exact words, as printed under her drawing, spelling and hyphen included:
 *   HER_TEXT.full     – all four sentences, for the journal page "Fältanteckning av Alva"
 *   HER_TEXT.question – her question sentence, for the evening note
 *   HER_TEXT.first    – her first sentence, for the journal's conclusion
 *   HER_TEXT.lastTwo  – her last two sentences, for the prologue caption
 * The fallback lines marked (c) remain for the case that these are ever set to null.
 */
const HER = [
    'Sköldhästar är fantastiska.',
    'De trivs lika bra med att sträcka ut benen i en galopp över stäpperna, som att gömma sig i kelp-skogarna i havets djup.',
    'Ingen vet om det är världens snabbaste sköldpadda eller världens långsammaste häst.',
    'Jag hoppas att någon forskare ska ta sig an det mysteriet.'
];
export const HER_TEXT = { full: HER.join(' '), question: HER[2], first: HER[0], lastTwo: `${HER[2]} ${HER[3]}`, hope: HER[3] };

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
export const SCENE_TITLES = { land: 'Stranden och Stäppen', kelp: 'Kelpskogen', viken: 'Spegelviken' };

export const UI = {
    goalLabel: 'Mål',
    title: 'Sköldhästen',
    subtitle: 'och havet mellan sidorna',
    credit: 'Sköldhästar är påhittade och ritade av Alva.',
    begin: 'Börja', cont: 'Fortsätt', back: 'Tillbaka till biljetten',
    loading: 'Laddar Sköldhästen …', loadFail: 'Något gick fel när spelet laddades.',
    retry: 'Försök igen', reload: 'Ladda om sidan', cancel: 'Avbryt',
    noWebgl: 'Den här webbläsaren kan tyvärr inte visa spelet.',
    noSave: 'Spelet kan inte sparas i den här webbläsaren – men du kan spela ändå.',
    badSave: 'Det sparade spelet gick inte att läsa.', startOver: 'Börja om från början',
    confirmRestart: 'Vill du börja om? Allt du har gjort hittills försvinner.',
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
    pencilBadge: (n, total) => `✎ ${n}/${total}`,
    pencilRegion: (name, n, total) => `${name}: ${n} / ${total}`,
    report: 'Forskningsrapport', code: 'Kod', photoTip: 'Ta gärna en bild på koden.',
    chapter1: 'Kapitel 1: Stranden och Stäppen', chapter2: 'Kapitel 2: Udden och djupet', chapter3: 'Kapitel 3: Pappersfyren',
    prologue: 'Ett streck till', finale: 'Havet hittar hem',
    theEnd: 'Slut – men forskningen fortsätter.', playOn: 'Utforska vidare',
    notesSkip: 'Hoppa över',
    drawWake: 'Dra pennan längs skalets båge!',
    drawGull: 'Rita en mås!', drawCloud: 'Rita ett moln!', drawShore: 'Rita strandkanten vidare – ut på det vita papperet!',
    drawLast: 'Förena strandkantens två ändar!',
    choiceWhat: 'Vad hände?', choiceWho: 'Vem gjorde det?'
};

// ---------------------------------------------------------------------------
// The story (plan §3.4). Each line: [speaker, text]. Speakers: horse, klo, kv, alva, mira, note, caption.
// ---------------------------------------------------------------------------
export const STORY = {
    prolog: {
        captionFull: null, // HER_TEXT.lastTwo when allowed
        // the opening starts in Alva's head, as she writes her field note
        thinking: 'Alva tänker på sin sköldhäst …',
        wakeCaption: 'Precis som Alva tänker sig den. Alldeles stilla – än så länge.',
        awake: ['horse', 'Alva? Det kittlas i hovarna!'],
        captionFallback: 'Häst eller sköldpadda? Ingen vet. Det behövs en forskare!',
        klo2: ['klo', 'Hittills mest krabbor.'],
        // Klo's first sight: a whispered wrong guess, then the mane changes everything.
        // (The direct "Häst eller sköldpadda?" / "Ja." stays for Kapitel 1.)
        kloWonder: ['klo', 'Oj … vilket skal! En jättesköldpadda?'],
        kloResearch: ['klo', 'Man och hovar?! Som en häst! Det här måste undersökas – från man till hov!'],
        // said after the cloud: he was too mesmerised to introduce himself
        kloIntro: ['klo', 'Förlåt! Forskaren är här: Professor Klo – expert på land och vatten.'],
        shoreInvite: ['horse', 'Rita stranden vidare, Alva. Jag vill känna nästa våg på hovarna!'],
        stuck: ['horse', 'Alva … vågen har fastnat.'],
        fold: ['horse', 'Havet veks undan! Och ditt streck tog slut vid vecket.'],
        foldCaption: 'Havet viks in under papperet.',
        afterFreezeCaption: 'Vågen stannar mitt i sitt plask.',
        // Both answers name the ruler; the second also names the tower and the flying scraps
        // (the torn map pieces of Kapitel 1–2, docs/skoldhast/story-kartvaktaren.md).
        choiceWhatAnswer: ['klo', 'Någon vek in havet under papperet med en linjal. Vecket stoppade vågen och ditt streck.'],
        choiceWhoAnswer: ['klo', 'Jag såg någon vid tornet där borta – med en linjal. Och papperslappar som flög!'],
        promise: ['horse', 'Jag vill ha tillbaka plasket på hovarna. Vi följer spåren!'],
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
            ['klo', 'En av papperslapparna! En karta över Alvas strand, ritad med linjal. Signerad /K.'],
            ['klo', 'Jag viker bara den här sanddynan på kartan. Håll ögonen på stranden!'],
            ['klo', 'Den vek sig också! Och när kartan vecklas ut, kommer sanddynan tillbaka.']
        ],
        mapPurpose: 'Vi följer spåren på land och under vattnet. De måste leda till havets veck.',
        mapDemoLabels: { map: 'Kartbiten', world: 'Stranden' },
        clouds: [['klo', 'Varför är de andra molnen inte färglagda?'], ['horse', 'De har inte lånat Alvas färgpennor.']],
        note1: ['note', 'OBS! Ofärdigt streck. Rör ej! /K'],
        noteKlo: [
            ['klo', 'K? Det är inte jag! Jag kan inte ens hålla i en linjal.'],
            ['klo', 'Vecket har brutit av vägen till Stäppen. Men dina hovar kan rita ihop strecken!']
        ],
        noteKlo2: ['klo', 'I full galopp ritar hovarna klart vägen. Då når vi spåren uppe på Stäppen.'],
        bridgeDone: ['klo', 'Vägen håller! Nu kan vi följa havets spår uppe på branten.'],
        boardwalkLesson: ['klo', 'Hovslagen driver hjulet – och upp går flaggan! En brygga som arbetar till musik.'],
        glimpse: ['horse', 'Det finns fler!'],
        wavemarksSeen: ['klo', 'Vågmärken här uppe? Vi måste se var stranden tog vägen när sidan vek sig.'],
        wavemarks: ['klo', 'Havet och Stäppen har hängt ihop här! Spåren fortsätter mot Klippudden.'],
        wavesToPool: 'Nu har vi spåret på land. Pölen vid stranden kan visa vägen under vattnet.',
        wavesToSea: 'Vi har spåret på land och en väg under vattnet. Nu kan vi följa vecket i havet!',
        mirror: ['klo', 'I blankt vatten syns sidan utan vecket. Där är vägen till havet öppen!'],
        whisper: ['klo', 'Du gömmer dig jättebra. Förutom manen. Den syns ända upp till ytan.'],
        fishRock: ['klo', 'Fiskarna tror att du är en sten!'],
        deep: ['klo', 'Djupare än alla hästar jag har mätt!'],
        enterHint: 'Vi ska hitta havets veck! Galoppera förbi mig först, så ser vi vad dina hovar kan.',
        holeHint: 'Jag kommer inte ut förrän det är lugnt. Göm dig, så tittar jag fram …',
        poolHint: 'Pölen krusar sig så fort du rör dig. Om du står alldeles stilla – göm dig – blir den blank som en spegel.',
        mirrorStone: ['klo', 'Titta noga! I spegelbilden ligger stenen mitt framför valvet.'],
        mirrorPlank: ['klo', 'I spegelbilden är plankan vid pölen hel. Här är den bara streckad.'],
        stoneDone: 'Stenen ligger precis som i spegelbilden!',
        stoneSide: 'Stenen ska fram till valvet. Gå runt den och knuffa från andra sidan!',
        fluffWrongWay: 'Fjunet flög åt fel håll … det flyger dit jag springer!',
        fluffMiss: 'Fjunet landade inte på någon prickig tuva …',
        plankDone: 'Plankan är hel – precis som i spegeln!',
        archDone: ['klo', 'Vattenporten! Här kan vi simma under den stillastående vågen.'],
        teachStreck: 'Såg du? Hovarna ritade klart strecket när du galopperade!',
        firstThin: 'Strecket är ofärdigt. I full galopp ritar dina hovar klart det!',
        teachFluff: 'Fjunet flög åt samma håll som du sprang – och tuvan växte!',
        brantenTufts: 'Tuvorna där uppe är prickiga, som om de väntar på något …',
        rampGrew: 'En ramp av gräs! Nu kommer vi upp en bit.',
        swimTip: 'Här under vågen rör sig vattnet ännu! Simma fritt, eller göm dig och följ en ström.',
        flapLesson: ['klo', 'Ditt tunga skal plattade till pappershörnet. Bra att veta om vi hittar fler veck!'],
        tasteGrass: ['horse', 'Mums. Stäppgräs.'],
        tasteKelp: ['horse', 'Kelp! Salt och krispigt.'],
        smak: [['klo', 'Gräs på land och kelp i havet?'], ['klo', 'Jag antecknar: äter både och. Det avgör ingenting!']],
        waitWaves: ['klo', 'Här ser vi bara havssidan. Vågmärkena på branten visar var vecket går på land.'],
        waitPool: ['klo', 'Pölen på stranden visar sidan utan vecket. Vi behöver jämföra med den också.'],
        hook: [
            ['horse', 'Samma veck som stoppade mitt plask. Det fortsätter ända ner hit!'],
            ['klo', 'Och spåren på land leder mot samma vikta sida. Någon har stängt vägen.'],
            ['horse', 'Vem var det där?!'],
            ['klo', 'Någon av papper … Han skyndade sig bort från vattnet!']
        ],
        paper: 'Nästa sida kommer snart.'
    },
    k2: {
        open: [
            ['klo', 'Kartan visar en väg runt vecket. Men märket som visar vägen är rivet mitt itu.'],
            ['klo', 'Den ena halvan finns på Klippudden, den andra i havet. Med båda kan vi hitta fram!']
        ],
        record: ['klo', 'Fem hästlängder! Nytt rekord för sköldpaddor. Och för krabbor.'],
        lighthouse: ['horse', 'Fyren lyser – men bara i spegelbilden.'],
        note2: ['note', 'Snälla, rör inte strecken. Det är för teckningens skull. /K'],
        // the note lies sealed in a bottle: the first clue to his fear of water
        note2Klo: ['klo', 'Lappen låg i en flaska, så att den inte blev blöt. K verkar vara rädd för vatten!'],
        lanterns: ['klo', 'De följde ditt skal och lyste upp vägen! Nu når vi kartbiten längre in.'],
        half: ['klo', 'Halva märket fattas. Den andra halvan ligger nog på Klippudden – dit vågmärkena leder.'],
        halfSea: ['klo', 'Den andra halvan finns i havet. Tillsammans visar de vägen till fyren.'],
        bothHalves: ['klo', 'Bitarna passar! Kartans väg blir hel – och strömmen öppnar sig mot fyren!'],
        // the irony, planted before the meeting: his own fold tore his map
        torn: ['klo', 'Titta på rivkanterna! Kartan gick sönder precis där sidan veks.'],
        mapAssemble: 'Kartbitarna passar ihop',
        end: ['klo', 'Där är figuren med linjalen! Han smällde igen luckan. Vad är han så rädd för?'],
        lyktHint: 'Valvet skymmer vägen till kartbiten. Lyktfiskarna kan lysa upp det – om du gömmer dig!',
        whirlHint: 'Ett vikt karthörn mitt i virveln! Göm dig, så bär strömmen ditt skal dit.',
        seaFound: ['klo', 'Skalet plattade ut hörnet. Där låg havshalvan av kartans märke!'],
        leapHint: 'För lite fart vid kanten. Backen är lång – börja högst uppe och galoppera hela vägen!',
        afterEnd: 'Virveln har öppnat sig åt höger. Den nya strömmen leder till nästa sida!',
        laneHide: 'Fiskarna följer dig! Men här ligger du still. Göm dig i strömmen ovanför, så driver ni in i valvet tillsammans.',
        lyktWait: 'Lyktfiskarna blev blyga och stannade. De väntar! Göm dig nära dem igen, så följer de med.',
        ropeHint: 'Ett rep! Ställ dig vid det och tryck Dra, så fälls plankan ner över klyftan.'
    },
    k3: {
        arrive: ['klo', 'Här gömde sig figuren! Om vi öppnar fyrens luckor vågar han kanske titta ut.'],
        mirror: ['klo', 'Som i pölen! Tre öppna luckor i spegeln. Följ kedjorna, så får vi fram ljuset.'],
        // Why he folded (docs/skoldhast/story-kartvaktaren.md). His first words, as the lamp
        // lights and the shutters stand open: the fear, before the explanation.
        kvFirst: ['kv', 'Mina luckor! Nu kan ju havet stänka in!'],
        memoryCaption: 'Kartväktarens minne',
        // Talk 1 plays over his memory of the prologue (fx kvMemory), one picture per line.
        talk1: [
            ['kv', 'Jag är Kartväktaren. /K – det är jag. Jag ritar kartan över Alvas sida.'],
            ['kv', 'Stranden växte ut på det vita papperet. Havet följde med – och vågen skulle plaska dit!'],
            ['kv', 'Jag är av papper. Blött papper går sönder! Så jag vek undan havet – mitt i plasket.']
        ],
        talk2: [
            ['kv', 'Här står LAND. Och här står HAV. Ett rakt streck emellan. Var ska jag skriva in dig?'],
            ['horse', 'Jag finns visst inte på kartan.'],
            ['klo', 'Då är det kartan som är fel. Inte du.']
        ],
        talk3: [
            ['horse', 'Strandkanten ska inte vara färdig. Den flyttar sig med varje våg.'],
            ['horse', 'Det är där jag bor – precis i mitten. Blöt om hovarna varje dag, och alldeles hel!'],
            ['kv', 'Hel … fast du är blöt? Det måste jag se.']
        ],
        line: ['klo', 'Vi visar honom! Rita vidare på Alvas strandkant – med hovarna på land och skalet i havet.'],
        lastStroke: ['horse', 'Nu når våra streck varandra, Alva. Du kan förena dem med din penna!'],
        chains: 'Tre kedjor går från luckorna: en ner till botten, en till repet på galleriet och en till bryggan.',
        drumHint: 'Som på Spången vid stranden! Hovslagen driver hjulet som öppnar luckan. Galoppera på bryggan!',
        plateHint: 'Tungt skal, precis som på karthörnet. Göm dig över plattan och låt skalet sjunka!',
        pipeHint: 'Som med lyktfiskarna: göm dig och följ strömmen. Här går den upp genom röret!',
        diveHint: 'Göm dig nu – låt strömmen ta dig till fönstret!',
        // P8 is the proof: the line runs into the water, and the paper holds. Then the
        // evidence the player carried all game: his map, torn by his own fold.
        proof: ['kv', 'Strecket går ända ner i vattnet … och papperet håller!'],
        mapBack: ['klo', 'Här är din karta. Den gick sönder när du vek sidan – inte av vattnet.'],
        mapCaption: 'Kartväktarens karta',
        sorry: [
            ['kv', 'Så det var vikningen som rev sönder. Förlåt, Alva. Ditt streck behövde få fortsätta.'],
            ['kv', 'Jag vecklar ut havet. Och strandkanten ritar jag i blyerts – så att vågorna får flytta den.']
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
        // at the table: the splash reached her real paper, and nothing tore
        wet: 'Teckningen är lite blöt. Och alldeles hel.',
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
    pool: { q: 'Hur kommer vi under den stillastående vågen?', note: 'Pölen kan visa sidan utan vecket. Göm dig, så blir vattnet så blankt att du ser vägen.', sketch: 'Gå fram till pölen och göm dig. Stanna gömd tills spegelbilden syns.' },
    p2: { q: 'Vad skiljer spegelbilden från stranden?', note: 'I spegelbilden ligger stenen mitt framför valvet, och plankan vid pölen är hel.', sketch: 'Ställ dig till vänster om stenen och tryck Knuffa tills den ligger mitt framför valvet. Galoppera sedan över den streckade plankan.' },
    p1: { q: 'Hur kommer man över Streckbron?', note: 'Streckade linjer är ofärdiga. I full galopp ritar hovarna klart dem!', sketch: 'Ta sats på plankorna till höger om bron och galoppera hela vägen över.' },
    p3: { q: 'Vart leder havets spår på land?', note: 'Vi behöver nå vågmärkena. När fjunet landar på de prickiga tuvorna växer gräset till ramper.', sketch: 'Galoppera förbi backsippan på slätten mot branten. Vänta tills rampen har växt och gå sedan upp.' },
    p3b: { q: 'Hur når fjunet de övre tuvorna?', note: 'Två backsippor står på den nedre avsatsen. Spring förbi dem i full fart!', sketch: 'Ta sats på slätten, galoppera uppför rampen och vidare förbi backsipporna.' },
    kelp: { q: 'Vart leder Vattenporten?', note: 'Valvet vid pölen är öppet nu!', sketch: 'Ställ dig i valvet och tryck Simma in.' },
    hook: { q: 'Vad finns längre ut i havet?', note: 'Simma österut, mot det ljusa vattnet. Strömmen hjälper dig.', sketch: 'Följ bubbelströmmen åt höger tills Klo säger till.' },
    p4: { q: 'Hur kommer man över klyftan?', note: 'Du behöver full fart ända fram till kanten. Backen är lång …', sketch: 'Gå upp på toppen av backen och galoppera nerför hela vägen till kanten.' },
    toSea: { q: 'Var är märkets andra halva?', note: 'Den ligger någonstans i havet, långt nere i djupet.', sketch: 'Simma in genom valvet vid pölen och följ diket nedåt åt höger.' },
    p5: { q: 'Hur når vi kartbiten bortom Mörka valvet?', note: 'Lyktfiskarna kan lysa upp vägen. De följer en gömd sköldhäst – men aldrig en simmare.', sketch: 'Simma till strömmen ovanför fiskarnas kelp och göm dig där. Strömmen bär dig in i valvet.' },
    p6: { q: 'Hur vecklar vi ut hörnet mitt i virveln?', note: 'Skalet är tungt nog att platta till papper. Låt strömmen bära det in till hörnet.', sketch: 'Göm dig i strömmen, så drar den dig in till mitten.' },
    toViken: { q: 'Vart leder strömmen?', note: 'Virveln har öppnat sig åt höger.', sketch: 'Simma till virveln längst in i diket och låt den nya strömmen ta dig vidare.' },
    p7: { q: 'Hur tänds fyren?', note: 'Tre luckor, tre kedjor. Följ varje kedja till sin maskin.', sketch: 'Göm dig över bottenplattan. Göm dig vid röret, åk upp och dra i repet. Galoppera på bryggan för den sista luckan.' },
    talk: { q: 'Varför vek Kartväktaren undan havet?', note: 'Kartväktaren väntar längst ut på bryggan. Prata med honom vid kartan.', sketch: 'Gå fram till honom och tryck Prata.' },
    p8: { q: 'Hur fortsätter Alvas strandkant?', note: 'Hovarna ritar på land. Skalet följer strecket i havet. Alvas penna förenar dem.', sketch: 'Galoppera längs linjen från stranden, hoppa i vattnet och göm dig där.' },
    signe: { q: 'Vem är snabbast?', note: 'Signe väntar vid snäckorna.', sketch: 'Gå fram till Signe och tryck Prata.' },
    free: { q: 'Snabbaste sköldpaddan eller långsammaste hästen?', note: 'Forskningen fortsätter. Leta efter färgpennor!', sketch: '' },
    freeComplete: { q: 'Vad vill du upptäcka nu?', note: 'Du har hittat alla färgpennor! Havet är öppet för nya upptäckter.', sketch: 'Ta en simtur, galoppera över Stäppen eller hälsa på Signe igen.' }
};

// ---------------------------------------------------------------------------
// The goal note at the top of the screen (src/guide.mjs): one short line for each objective
// ---------------------------------------------------------------------------
export const GOALS = {
    explore: 'Visa Klo din galopp – ni ska hitta havets veck!',
    hide: 'Göm dig nära Klos hål, så vågar han komma fram.',
    pool: 'Hitta vägen under vågen – titta i pölen vid klippan.',
    p2: (n) => `Gör stranden likadan som spegelbilden i pölen. (${n}/2)`,
    p1: 'Rita klart Streckbron – följ havets spår till vänster.',
    p3: (n) => `Följ havets spår upp till vågmärkena. (${n}/3)`,
    p3b: (n) => `Få ramperna att växa upp till vågmärkena. (${n}/3)`,
    kelp: 'Simma in genom valvet vid pölen.',
    hook: 'Utforska Kelpskogen österut.',
    p4: (n) => `Hitta märkets halva på land, bortom klyftan. (${n}/2)`,
    toSea: (n) => `Hitta märkets andra halva i havet. (${n}/2)`,
    p5: 'Lys upp vägen till kartbiten i djupet.',
    p6: 'Veckla ut karthörnet mitt i virveln.',
    toViken: 'Följ den nya strömmen från virveln till nästa sida.',
    p7: (n) => `Öppna luckorna – locka fram fyrens väktare. (${n}/3)`,
    talk: 'Fråga Kartväktaren varför han vek undan havet.',
    p8: 'Fortsätt Alvas strandkant – på land och i havet!',
    signe: 'Tävla mot sköldpaddan Signe till pölen!',
    free: 'Utforska fritt – och leta färgpennor!',
    freeComplete: 'Alla färgpennor är hittade – utforska fritt!'
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

// Persistent, state-derived help. The renderer and controls share these words;
// no timer or remembered one-off tip decides whether they are needed.
export const GUIDANCE = {
    controls: {
        hide: { touch: 'Tryck Göm dig.', keys: 'Tryck G.' },
        hideHold: { touch: 'Håll Göm dig intryckt.', keys: 'Håll G intryckt.' },
        emerge: { touch: 'Tryck Kom fram.', keys: 'Tryck G igen.' },
        emergeHold: { touch: 'Släpp Göm dig.', keys: 'Släpp G.' },
        stay: { touch: 'Stanna gömd.', keys: 'Stanna gömd.' },
        move: { touch: 'Styr med spaken.', keys: 'Styr med pilarna.' },
        follow: 'Håll fingret dit du vill gå.',
        gallop: { touch: 'Dra spaken ända ut.', keys: 'Håll pilen inne för full galopp.' },
        followGallop: 'Håll fingret långt framför sköldhästen.',
        act: { touch: 'Tryck på den stora knappen.', keys: 'Tryck mellanslag.' },
        hideTipHold: { touch: 'Håll Göm dig intryckt för att krypa under skalet. Släpp för att komma fram.', keys: 'Håll G intryckt för att krypa under skalet. Släpp för att komma fram.' },
        gallopTipFollow: 'Håll fingret långt framför sköldhästen – då galopperar du!'
    },
    progress: {
        calm: 'Vattnet blir stilla', waiting: 'Väntar på lyktfiskarna', drifting: 'Följer strömmen',
        sinking: 'Skalet sjunker', plate: 'Plattan hålls nere', ink: 'Hovarna ritar',
        ramps: n => `${n} av 3 ramper`, shutters: n => `${n} av 3 luckor`,
        ratchet: (n, total) => `${n} av ${total} steg i hjulet`,
        lines: n => `${n} av 3 streck på bryggan`
    },
    emerge: 'Kom fram ur skalet för att fortsätta.',
    afterKlo: 'Klo har kommit fram! Kom fram du också, så visar han kartbiten.',
    afterMirror: 'Spegelbilden syns! Kom fram och gör stranden likadan som bilden.',
    afterPlate: 'Luckan är öppen! Kom fram för att simma vidare.',
    lampLit: 'Nu lyser fyren – både på land och i spegelbilden!',
    route: {
        land: 'Simma tillbaka genom grottan till stranden.',
        kelp: 'Gå till Vattenporten vid pölen och välj Simma in.',
        viken: 'Följ strömmen åt höger, till nästa sida.',
        bayExit: 'Följ stranden åt vänster för att komma tillbaka.',
        bay: 'Följ stranden åt höger genom den öppna grinden till Spegelviken.'
    },
    steps: {
        hideApproach: 'Gå fram till Klos hål, så att han kan se ditt skal.',
        hideReady: 'Göm dig här. Klo vågar komma fram när du ser ut som en sten.',
        hideWait: 'Stanna gömd. Klo tittar försiktigt ut ur hålet.',
        poolApproach: 'Gå fram till pölen vid klippan.',
        poolReady: 'Göm dig vid vattnet, så slutar pölen krusa sig.',
        poolWait: 'Stanna gömd tills vattnet blir blankt.',
        stone: 'Ställ dig till vänster om stenen. Knuffa den fram till valvet.',
        plank: 'Ta sats och galoppera över den streckade plankan.',
        bridge: 'Ta sats till höger om bron. Galoppera hela vägen åt vänster.',
        ramp: 'Galoppera åt vänster förbi backsippan. Fjunet flyger till tuvan.',
        rampWait: 'Fjunet är på väg! Vänta tills rampen har vuxit fram.',
        waveLedge: 'Ramperna är klara! Följ dem upp till vågmärkena på den översta avsatsen.',
        leapRunup: 'Gå upp på Galoppbacken. Där hinner du få upp full fart.',
        leap: 'Galoppera ner åt vänster och fortsätt hela vägen till kanten.',
        landmark: 'Du är på andra sidan! Fortsätt till märket på Klippudden.',
        returnRope: 'Dra i repet vid klyftan. Då blir vägen tillbaka hel.',
        fishApproach: 'Simma till strömmen ovanför lyktfiskarna.',
        fishReady: 'Göm dig i strömmen. Fiskarna vågar följa ett stilla skal.',
        fishWait: 'Stanna gömd medan lyktfiskarna kommer närmare.',
        fishDrift: 'Stanna gömd. Strömmen bär dig och fiskarna in i valvet.',
        fishRecover: 'Kom fram och simma tillbaka till strömmen ovanför fiskarna.',
        vortexApproach: 'Simma in i virvelns ytterkant.',
        vortexReady: 'Göm dig i virveln. Skalet kan följa strömmen inåt.',
        vortexWait: 'Stanna gömd. Virveln drar skalet mot mitten.',
        mirrorReady: 'Göm dig på bryggan för att se fyrens spegelbild.',
        mirrorWait: 'Stanna gömd tills spegelbilden blir tydlig.',
        plateApproach: 'Simma ovanför plattan på botten.',
        plateReady: 'Göm dig här. Skalet sjunker ner och trycker på plattan.',
        plateSink: 'Stanna gömd. Skalet sjunker mot plattan.',
        plateWait: 'Stanna gömd en liten stund till. Plattan öppnar luckan.',
        pipeApproach: 'Simma till rörets mynning nere i viken.',
        pipeReady: 'Göm dig vid mynningen. Strömmen lyfter skalet upp i röret.',
        pipeWait: 'Stanna gömd tills röret släpper av dig på galleriet.',
        rope: 'Gå till repet på galleriet och välj Dra.',
        drum: 'Galoppera fram och tillbaka på bryggan. Hovarna vrider hjulet.',
        talk: 'Gå fram till Kartväktaren och välj Prata.',
        p8Runup: 'Börja vid stranden till vänster. Ta sats åt höger.',
        p8Land: 'Galoppera åt höger över de tre strecken på bryggan.',
        p8Jump: 'Alla tre strecken är klara! Fortsätt i galopp ut över bryggans kant.',
        p8Approach: 'Simma till linjens början i vattnet, strax efter bryggan.',
        p8Hide: 'Göm dig på linjen. Då kan skalet rita vidare under vattnet.',
        p8Drift: 'Stanna gömd. Följ linjen ner till det lilla fönstret.',
        p8Draw: 'Linjen är hel! Nu kan den sista teckningen bli klar.'
    }
};

// ---------------------------------------------------------------------------
// The journal: Forskningsdagbok (plan §4.7)
// ---------------------------------------------------------------------------
export const JOURNAL = {
    tallyHorse: 'Lutar åt häst.', tallyTurtle: 'Lutar åt sköldpadda.', tallyEven: 'Det står lika.',
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
    conclusionFull: HER_TEXT.first ? `Slutsats: ${HER_TEXT.first} Forskningen fortsätter.` : null,
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
        map_corner: 'En kartbit ritad med linjal och signerad /K – en av lapparna som flög när sidan veks. När Klo vek en sanddyna på kartan, vek sig sanddynan på stranden.',
        note1: 'En lapp vid Streckbron: ”OBS! Ofärdigt streck. Rör ej! /K”',
        wave_marks: 'Havets spår går högt uppe på branten, vidare mot Klippudden. Land och hav har hängt ihop där.',
        reflection: 'I stilla vatten syns sidan utan vecket. Där står Vattenporten öppen med stenen mitt framför, och plankan vid pölen är hel.',
        fold: 'Ett veck genom havet – rakt som en linjal.',
        figure: 'Någon smal, av papper, med en linjal. Han skyndade sig bort från vattnet.',
        glimpse: 'Det finns fler sköldhästar!',
        lighthouse: 'Pappersfyren lyser bara i spegelbilden. Någon har stängt dess luckor.',
        note2: 'En lapp i en flaska i djupet: ”Snälla, rör inte strecken. Det är för teckningens skull. /K” K vill inte att papper blir blött.',
        mark_land: 'Märkets landhalva låg på Klippudden, dit vågmärkena ledde. Den hör ihop med en kartbit från havet.',
        mark_sea: 'Märkets havshalva låg under det vikta hörnet i virveln. Två kartbitar visar hela vägen till Pappersfyren.',
        torn_map: 'Kartbitarna passar ihop. Kartan rev sig där sidan veks – och bitarna flög åt alla håll.',
        kv_why: 'Kartväktaren är av papper. Han trodde att vågen skulle blöta ner sidan så att den gick sönder. Därför vek han undan havet.',
        kv_map: 'På Kartväktarens karta finns bara LAND och HAV – ingen strand, och ingen sköldhäst.'
    },
    reports: {
        1: ['Vecket stänger havet både ovanför och under ytan.', 'En figur av papper, med linjal, sprang från vecket. Är det han som är /K?', 'Hovar ritar. Skal stillar vatten. Två talanger – ett och samma djur!', 'Nästa: hitta märkets två halvor och vägen runt vecket.'],
        2: ['Språnget nådde landhalvan. Skalet vecklade ut havshalvan.', 'Kartan rev sig där sidan veks. Lapparna var alltså hans!', 'Kartans väg är hel! Strömmen leder till Pappersfyren.', 'Figuren med linjalen bor där. Varför vek han undan havet?']
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

export const CONTEXT_LABELS = { talk: 'Prata', read: 'Läs', swimIn: 'Simma in', down: 'Gå ner', up: 'Gå upp', taste: 'Smaka', push: 'Knuffa', pull: 'Dra', color: 'Färglägg', shake: 'Skaka', dropIn: 'Hoppa i' };

// Drawing actions remain available without a precise trace or a keyboard.
export const DRAWING = {
    paletteLabel: name => `Molnfärg: ${name}`,
    cloudColors: { sky: 'Himmelsblå', lavender: 'Lavendel', peach: 'Persika', rose: 'Rosa', paper: 'Pappersvit' },
    freeHint: 'Rita med fingret eller musen. Du bestämmer formen.',
    traceHint: 'Följ prickarna med fingret eller musen.',
    previewHint: 'Vill du behålla teckningen eller rita om?',
    shortHint: 'Dra ett streck, eller låt pennan hjälpa till.',
    interruptedHint: 'Rita vidare när du vill.',
    redo: 'Rita om', example: 'Rita åt mig', done: 'Klar',
    progress: (done, total) => `${done} av ${total} prickar`,
    canvasLabel: 'Din rityta',
    keyboardHint: 'Enter hjälper dig vidare. Tab väljer knapp.'
};

// The three already-authored discoveries, shown as inspectable notebook pieces.
export const MAP = {
    title: 'Kartan mellan sidorna', overview: 'Hela kartan', inspect: 'Titta på kartan',
    assembled: 'Så hör kartbitarna ihop', empty: 'Här samlas kartbitarna ni hittar.',
    missing: 'Inte hittad än', count: (found, total) => `${found} av ${total} kartbitar`,
    selected: (name) => `Du tittar på: ${name}`,
    zoomIn: 'Förstora', zoomOut: 'Förminska', reset: 'Visa hela biten',
    pan: { up: 'Visa längre upp', down: 'Visa längre ner', left: 'Visa mer åt vänster', right: 'Visa mer åt höger' },
    detailHint: 'Välj en kartbit för att titta närmare.',
    legend: 'Streck visar vägar. Rivna kanter visar var bitarna möts.',
    pieces: {
        corner: { name: 'Karthörnet', foundAt: 'Hos Klo på stranden', detail: 'En av lapparna som flög från tornet när sidan veks. När kartan viks, viks världen också. Vem har skrivit /K?' },
        land: { name: 'Märket från land', foundAt: 'På Klippudden', detail: 'Vi följde vågmärkena och tog språnget till udden. Här låg landhalvan av märket som visar vägen runt vecket. Havshalvan passar ihop med den rivna kanten.' },
        sea: { name: 'Märket från havet', foundAt: 'I Kelphjärtats virvel', detail: 'Lyktfiskarna lyste upp vägen. Skalet plattade till hörnet och hittade havshalvan. Med båda bitarna blir strömmen till Pappersfyren fri.' }
    },
    places: { steppe: 'Stäppen', cliff: 'Klippudden', beach: 'Stranden', bridge: 'Streckbron', gate: 'Vattenporten', kelp: 'Kelpskogen', vault: 'Mörka valvet', heart: 'Kelphjärtat', bay: 'Spegelviken', tower: 'Pappersfyren', fold: 'Vecket' }
};

// ---------------------------------------------------------------------------
// The menus' notebook (src/ui.mjs): the journal's tabs, the report's stamp, the map sketch
// ---------------------------------------------------------------------------
export const MENU = {
    regions: [['Stäppen', 'land'], ['Stranden', 'land'], ['Kelpskogen', 'kelp'], ['Spegelviken', 'viken']],
    fold: '— veck —',
    tabs: ['Framsida', 'Fältanteckning', 'Vad vet vi?', 'Mätningar', 'Ledtrådar', 'Rapporter', 'Din anteckning'],
    stamp: 'Granskad',
    map: 'Karta'
};
// Professor Klo's optional, non-blocking research break. Never required for progress.
export const KLO_JOKES = [
    'Jag går i sidled. Det är mitt sätt att tänka utanför boxen.',
    'Forskningsrapport: sköldhästar är svåra att stoppa i ett pennfodral.',
    'Jag tog tid på en våg. Den vinkade och gick.',
    'Havet har många hemligheter. Min anteckningsbok är redan fuktig.',
    'En penna utan spets? Ett mycket kort trollspö.',
    'Jag har två klor och noll fickor. Vem ritade min labbrock?',
    'Min klocka säger tick. Jag säger klick. Vi har mycket gemensamt.',
    'Om en sköldhäst gömmer sig, är den då en hemlig häst?',
    'Jag frågade en snäcka vad klockan var. Den svarade: schhh.',
    'Dagens upptäckt: sand smakar fortfarande sand.',
    'Jag mäter mod i små steg. Sidosteg räknas också.',
    'Min penna simmar dåligt. Den föredrar att rita vatten.',
    'En våg räcker upp handen hela tiden. Så artigt!',
    'Jag skulle sortera alla sandkorn. Sedan blev det lunch.',
    'Sköldhästens man ser ut som havets bästa frisyr.',
    'Jag har skrivit en bok om tystnad. Den börjar med schhh.',
    'Forskning kräver tålamod. Och ibland ett mellanmål.',
    'Jag provade att galoppera. Det blev mest trassliga ben.',
    'Min anteckningsbok är vattentät. Mina anteckningar är det inte.',
    'En bubbla är havets sätt att säga plopp.',
    'Jag tappar aldrig hakan. Den sitter så opraktiskt till.',
    'Tänk om månen är ett suddgummi som någon glömt kvar på himlen.',
    'Jag frågade en fisk om vägen. Den pekade åt blubb.',
    'Sköldhästar har sköld. Jag har skal. Vi borde bilda en klubb.',
    'Dagens experiment: kan man kittla en våg? Den bara skvalpar.',
    'Jag går inte vilse. Jag undersöker oväntade riktningar.',
    'Gräs kittlar benen. Jag har gjort flera samtidiga mätningar.',
    'Min bästa teori står på nästa sida. Eller sidan efter den.',
    'Jag har hittat spår! Det kan vara hovar. Eller väldigt små tekoppar.',
    'En krabba som har bråttom tar en genväg. I sidled, förstås.',
    'Jag räknade bubblor till sju. Sedan sprack min uträkning.',
    'Det bästa med blyertspennor är att misstag kan bli moln.',
    'Min klocka mäter sekunder. Min mage mäter mellanmål.',
    'Undrar om havet får hicka när det blåser.',
    'Vetenskaplig slutsats: du är väldigt bra på att hitta krabbor.',
    'Jag tänkte vara allvarlig i dag. Men det kliar i klorna.'
];
