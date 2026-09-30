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
export const SHORE_TRIAL = {
    title: 'En liten våg först', location: 'Alvas kustbit vid Pappersfyren',
    flatten: 'Skalet plattar ut hörnet',
    draw: 'Laga glappet med Alvas penna',
    wave: 'En liten våg tar sig förbi …', proof: 'Lite blött. Alldeles helt!'
};

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
    interact: 'Använd', spaceKey: 'Mellanslag',
    jumpHelp: 'Mellanslag: hoppa. Är du gömd kommer du fram först; tryck igen för att hoppa.',
    hideHelp: '↓ eller S: göm dig. Mellanslag: kom fram. G eller skal-knappen växlar mellan gömd och framme.',
    hideHoldHelp: 'Håll ↓, S, G eller skal-knappen för att gömma dig. Släpp eller tryck mellanslag för att komma fram.',
    interactHelp: 'E: använd det som finns nära – färglägg, knuffa, dra eller prata.',
    moveHelp: '← → / A D: gå\nI vatten: ↑ / W upp · X ner',
    keybindings: 'Tangenter',
    keyboardHelp: '← → / A D: gå och galoppera\nMellanslag: hoppa / kom fram ur skalet\n↓ / S: göm dig · G: göm dig / kom fram\nE: färglägg, knuffa, dra, prata eller läs\nI vatten: ↑ / W simma upp · X dyk ner\nJ: dagbok · Esc / P: paus\nN: gnägg · K: ropa på Klo\nI berättelsens samtal: mellanslag, E eller Enter fortsätter.',
    help: 'Hjälp', helpEasy: 'Utforska i lugn och ro', helpNormal: 'Lagom', helpHard: 'Lite mer klurigt',
    helpAsk: 'Bara när jag frågar', helpRemind: 'Påminn mig om Klo', helpGuided: 'Guida mig',
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
    raceStart: 'START', raceFinish: 'MÅL',
    notesSkip: 'Hoppa över',
    drawWake: 'Dra pennan längs skalets båge!',
    drawGull: 'Rita en mås!', drawCloud: 'Rita ett moln!', drawShore: 'Rita strandkanten vidare – ut på det vita papperet!',
    drawLast: 'Laga glappet i strandkanten – släpp fram en liten våg!',
    endingTitle: 'Havet är hemma igen!',
    endingBody: 'Du lagade kusten och hjälpte Kartväktaren att våga släppa fram havet. Nu plaskar vågen på stranden där allt började.',
    endingExplore: 'Tillbaka till stranden – utforska fritt',
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
        promise: ['horse', 'Vi ska få havet att plaska igen! Vi måste hitta den som vek undan det.'],
        mystery: ['klo', 'Jag följer med! Vi får undersöka vad dina hovar och ditt skal kan hjälpa oss med.'],
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
            ['klo', 'En av papperslapparna! En karta över Alvas strand. Här står ”Kartväktaren”.'],
            ['klo', 'Ser du den rosa snäckan? Den finns både på kartan och här på stranden.'],
            ['klo', 'Jag provar att vika kartan lite … Håll ögonen på snäckan!'],
            ['horse', 'Oj! Stranden vek sig också! Snäckan följde med!'],
            ['klo', 'Kartan och stranden hör ihop! När kartan blir platt igen blir stranden det också.'],
            ['horse', 'Då kanske vi kan veckla ut havet och få min våg att plaska igen!']
        ],
        mapPurpose: 'Kartan och världen hör ihop! Vi kan följa vecket under vågen eller undersöka spåren på land.',
        clouds: [['klo', 'Varför är de andra molnen inte färglagda?'], ['horse', 'De har inte lånat Alvas färgpennor.']],
        note1: ['note', 'OBS! Ofärdigt streck. Rör ej! /Kartväktaren'],
        noteKlo: [
            ['klo', 'Kartväktaren igen! Samma namn som på kartan. Varför får vi inte röra strecken?'],
            ['klo', 'Vecket har brutit av vägen till Stäppen. Men dina hovar kan rita ihop strecken!']
        ],
        noteMap: [
            ['klo', 'Kartväktaren igen! Samma namn som på kartan. Varför får vi inte röra strecken?'],
            ['klo', 'En kartbit flög bort över Stäppen. Dina hovar kan laga vägen dit!']
        ],
        noteKlo2: ['klo', 'I full galopp ritar hovarna klart vägen. Då når vi spåren uppe på Stäppen.'],
        noteMap2: ['klo', 'I full galopp kan hovarna laga bron. Då kommer vi över Stäppen för att leta efter kartbiten.'],
        bridgeDone: ['klo', 'Vägen håller! Nu kan vi följa havets spår uppe på branten.'],
        bridgeMapDone: ['klo', 'Bron håller! Från branten kan vi spana över Stäppen efter kartbiten.'],
        boardwalkLesson: ['klo', 'Hovslagen driver hjulet – och upp går flaggan! En brygga som arbetar till musik.'],
        glimpse: ['horse', 'Det finns fler!'],
        wavemarksSeen: ['klo', 'Vecket har lyft havets spår upp på branten. Vi behöver ta oss upp och följa dem!'],
        wavemarksMapSeen: ['klo', 'Vågmärken där uppe! Från branten kan vi spana efter kartbiten som flög över Stäppen.'],
        wavemarks: ['klo', 'Spåren leder till Klippudden! Där fortsätter sidan som vecket har gömt.'],
        wavemarksMap: ['klo', 'Vågmärkena leder mot Klippudden! Följ dem över Galoppbacken, så kan vi spana vidare.'],
        wavesToPool: 'Nu har vi spåret på land. Pölen vid stranden kan visa vägen under vattnet.',
        wavesToSea: 'Vi har spåret på land och en väg under vattnet. Nu kan vi följa vecket i havet!',
        wavesToLandPiece: 'Fortsätt över Galoppbacken mot klyftan. Där kan vi spana efter kartbiten.',
        poolPurpose: ['klo', 'Vattenporten är stängd. Bakom den går vägen under den frusna vågen. Hur såg den ut före vecket?'],
        mirror: ['klo', 'Pölen visar sidan före vecket. Återställ stenen och plankan, så öppnas Vattenporten!'],
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
        brantenTufts: 'Fjun från backsipporna får tuvorna att växa. Kan galoppvinden bära det uppåt?',
        rampGrew: 'En ramp av gräs! Nu kommer vi upp en bit.',
        swimTip: 'Här under vågen rör sig vattnet ännu! Simma fritt, eller göm dig och följ en ström.',
        seaPurpose: ['horse', 'Här under vågen rör sig vattnet ännu! Vi följer vecket vidare genom kelpen.'],
        flapLesson: ['klo', 'Ditt skal plattade ut vecket i havsbottnen! Titta – Alvas tecknade sand ligger platt igen.'],
        tasteGrass: ['horse', 'Mums. Stäppgräs.'],
        tasteKelp: ['horse', 'Kelp! Salt och krispigt.'],
        smak: [['klo', 'Gräs på land och kelp i havet?'], ['klo', 'Jag antecknar: äter både och. Det avgör ingenting!']],
        hook: [
            ['horse', 'Samma veck som stoppade mitt plask. Det fortsätter ända ner hit!'],
            ['klo', 'En hel vägg av vikt hav! Någon har stängt vägen till vattnet på andra sidan.'],
            ['horse', 'Vem var det där?!'],
            ['klo', 'Någon av papper … Han skyndade sig bort från vattnet!']
        ],
        paper: 'Nästa sida kommer snart.'
    },
    k2: {
        open: [
            ['klo', 'Här slutar kartans streck vid rivkanten. Därför når strömmen inte fram till fyren.'],
            ['klo', 'Två bitar flög iväg: en över Stäppen, en ner i havet. Vi får leta på båda ställena.'],
            ['klo', 'Vi kan leta i djupet, eller spana över Stäppen från branten. Du väljer!']
        ],
        record: ['klo', 'Fem hästlängder! Nytt rekord för sköldpaddor. Och för krabbor.'],
        landmarkPurpose: ['klo', 'Där ute på Klippudden ligger kartbiten! Den behövs för att laga vägen till fyren.'],
        landFound: ['klo', 'Där var kartbiten! Hovarna tog oss över klyftan som jag inte kunde ta mig förbi.'],
        lighthouse: ['horse', 'Fyren lyser – men bara i spegelbilden.'],
        note2: ['note', 'Snälla, rör inte strecken. Det är för teckningens skull. /Kartväktaren'],
        // the note lies sealed in a bottle: the first clue to his fear of water
        note2Klo: ['klo', 'Lappen låg i en flaska så att den inte blev blöt. Är Kartväktaren rädd för vatten?'],
        vaultPurpose: [
            ['klo', 'Ett strömstreck leder in i valvet, men mörkret döljer fortsättningen. Det kan visa vägen till kartbiten.'],
            ['horse', 'De där fiskarna lyser! Tänk om deras ljus kunde nå in dit.']
        ],
        vaultReveal: ['klo', 'Nu syns strömstrecket på berget! Det leder genom valvet och vidare mot Kelphjärtat.'],
        lanterns: ['klo', 'Fiskarna följde ditt stilla skal. Deras ljus visar vart strömstrecket tar vägen!'],
        cornerPurpose: ['horse', 'Havsbottnen har vikt sig upp. Kartbiten sitter fast därunder – vi behöver få papperet platt igen.'],
        cornerFlat: ['klo', 'Vecket är platt och kartbiten är fri! Titta på den rivna kanten.'],
        half: ['klo', 'Nu saknas bara kartbiten på land. Tillbaka till stranden – sedan letar vi på Stäppen!'],
        halfSea: ['klo', 'Nu saknas bara kartbiten i djupet. Med den kan vi laga vägen till fyren.'],
        fitPieces: ['klo', 'Vår första kartbit och de två vi hittade. Titta – rivkanterna passar ihop!'],
        bothHalves: ['klo', 'Vi lagade kartans streck – och strömmen fortsätter till fyren! Kartan ändrar världen igen!'],
        // the irony, planted before the meeting: his own fold tore his map
        torn: ['klo', 'Titta på rivkanterna! Kartan gick sönder precis där sidan veks.'],
        mapAssemble: 'Kartbitarna passar ihop',
        end: ['klo', 'Där är figuren med linjalen! Han smällde igen luckan. Vad är han så rädd för?'],
        lyktHint: 'Vi behöver ljus för att följa strömstrecket genom valvet. Göm dig i strömmen, så vågar lyktfiskarna följa med!',
        whirlHint: 'Kartbiten sitter under havsbottnens veck. Göm dig i virveln, så bär strömmen ditt tunga skal dit.',
        seaFound: ['klo', 'Skalet plattade ut havsbottnens veck. Nu har vi kartbiten från havet!'],
        leapHint: 'För lite fart vid kanten. Backen är lång – börja högst uppe och galoppera hela vägen!',
        afterEnd: 'Virveln har öppnat sig åt höger. Den nya strömmen leder till nästa sida!',
        laneHide: 'Fiskarna följer dig! Men här ligger du still. Göm dig i strömmen ovanför, så driver ni in i valvet tillsammans.',
        lyktWait: 'Lyktfiskarna blev blyga och stannade. De väntar! Göm dig nära dem igen, så följer de med.',
        ropeHint: 'Ett rep! Ställ dig vid det och tryck Dra, så fälls plankan ner över klyftan.'
    },
    k3: {
        arrive: ['klo', 'Han med linjalen gömmer sig i fyren. Öppnar vi luckorna kan vi få prata med honom.'],
        mirror: ['klo', 'Som i pölen! Tre öppna luckor i spegeln. Följ kedjorna, så får vi fram ljuset.'],
        // Why he folded (docs/skoldhast/story-kartvaktaren.md). His first words, as the lamp
        // lights and the shutters stand open: the fear, before the explanation.
        kvFirst: ['kv', 'Mina luckor! Nu kan ju havet stänka in!'],
        memoryCaption: 'Kartväktarens minne',
        guardianCaption: 'Kartväktarens gräns',
        // Talk 1 plays over his memory of the prologue (fx kvMemory), one picture per line.
        talk1: [
            ['kv', 'Jag är Kartväktaren. Det är jag som har skrivit lapparna och ritat kartan över Alvas sida.'],
            ['kv', 'Stranden växte ut på det vita papperet. Havet följde med – och vågen skulle plaska dit!'],
            ['kv', 'Jag är av papper. Blött papper går sönder! Så jag vek undan havet – mitt i plasket.']
        ],
        talk2: [
            ['kv', 'Här står LAND. Och här står HAV. Ett rakt streck emellan. Var ska jag skriva in dig?'],
            ['horse', 'Jag finns visst inte på kartan.'],
            ['klo', 'Då är det kartan som är fel. Inte du.']
        ],
        talk3: [
            ['horse', 'Jag bor där land och hav möts. Vi kan prova med en liten våg först!'],
            ['kv', 'En liten … ja. Vid fyrens fot har jag vikt in en bit av Alvas strand.'],
            ['kv', 'Laga den biten. Om en liten våg kan passera utan att papperet går sönder, öppnar jag havet.']
        ],
        line: ['klo', 'Hovarna lagar vägen till fyren. Sedan kan skalet platta ut det vikta strandhörnet.'],
        corner: ['klo', 'Där är hörnet! När det ligger platt kan Alva laga glappet i sin strandkant.'],
        lastStroke: ['horse', 'Hörnet är platt! Alva, rita ihop strandkanten där vecket avbröt den.'],
        waveReady: ['klo', 'Nu är glappet lagat. Titta – en liten våg kan ta sig förbi!'],
        chains: 'Tre kedjor går från luckorna: en ner till botten, en till repet på galleriet och en till bryggan.',
        shutterOpened: ['klo', 'Där öppnades en av fyrens luckor!'],
        ropeHint: 'Repet sitter i samma kedja som luckan. Dra, så öppnas den.',
        drumHint: 'Som på Spången vid stranden! Hovslagen driver hjulet som öppnar luckan. Galoppera på bryggan!',
        drumFirstHint: 'Hjulet sitter ihop med bryggan och luckans kedja. Galoppera här, så driver hovslagen hjulet!',
        plateHint: 'Tungt skal, precis som på vecket i havsbottnen. Göm dig över plattan och låt skalet sjunka!',
        pipeHint: 'Som i virveln: göm dig och följ strömmen. Här går den upp genom röret!',
        diveHint: 'Göm dig nu! Strömmen bär ditt tunga skal till det vikta strandhörnet.',
        // P8 is the proof: a small wave wets the repaired coast and the paper holds. Then the
        // evidence the player carried all game: his map, torn by his own fold.
        proof: ['kv', 'Vågen kom över på papperet … och det höll! Då vågar jag släppa fram resten.'],
        mapBack: ['klo', 'Här är din karta. Den gick sönder när du vek sidan – inte av vattnet.'],
        mapCaption: 'Kartväktarens karta',
        sorry: [
            ['kv', 'Så det var vikningen som rev sönder. Förlåt, Alva. Ditt streck behövde få fortsätta.'],
            ['kv', 'Nu vecklar jag ut havet. Kusten får vara i blyerts – vågorna får flytta den!']
        ],
        home: ['horse', 'Hem till stranden där vi började, Klo! Vårt plask väntar på oss.']
    },
    final: {
        arrival: ['horse', 'Vår strand! Och samma våg som fastnade när Alva ritade.'],
        splash: ['horse', 'Äntligen! Mitt plask på hovarna!'],
        home: ['klo', 'Havet är hemma igen. Nu tittar vi på Alvas teckning – på hennes bord.'],
        conclusion: [
            ['klo', 'Slutsats: För en sköldpadda – världsrekord. För en häst – helt okej.'],
            ['klo', 'För en sköldhäst … precis lagom.'],
            ['klo', 'Mer forskning behövs!']
        ],
        note: null, // her question + "Forskningen fortsätter." when HER_TEXT.question is set
        noteFallback: 'Snabbaste sköldpaddan eller långsammaste hästen? Forskningen fortsätter.',
        // at the table: the splash reached her real paper, and nothing tore
        wet: 'Tillbaka på Alvas bord. Ett vått hovspår – och teckningen är hel.',
        mira: [['mira', 'Varför är teckningen blöt?'], ['alva', 'Forskning.']]
    },
    // after the ending: Kapplöpning mot Sköldpaddan Signe (plan §4.6 O8)
    after: {
        signeHello: [
            ['signe', 'Hej! Jag heter Signe. Sköldpadda. Helt vanlig.'],
            ['signe', 'Det sägs att du är snabb. Kapplöpning till pölen?']
        ],
        signeGo: [['signe', 'Vi börjar vid pilen! Klara … färdiga … gå!']],
        signeLose: [['signe', 'Jag vann på stilpoäng.']],
        signeWin: [['signe', 'Jag vann! Och jag hade hela huset med mig!']],
        signeAgain: [['signe', 'En gång till? Klara … färdiga … gå!']],
        signeGiveUp: [['signe', 'Vi tar det en annan gång.']]
    }
};

// ---------------------------------------------------------------------------
// Balks: the sköldhäst refuses and shows why. A short thought only where a pose is not enough.
// ---------------------------------------------------------------------------
export const BALK = {
    paper: 'Nästa sida är inte ritad än …',
    thin: 'Strecket är inte klart ännu.',
    slow: 'För lite fart vid kanten!',
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
    p1Map: { q: 'Hur hittar vi kartbiten på land?', note: 'Biten flög över Stäppen. Streckbron är bruten, men hovarna kan laga den i full galopp.', sketch: 'Ta sats på plankorna till höger om bron och galoppera hela vägen åt vänster.' },
    p3: { q: 'Vart leder havets spår på land?', note: 'Vi behöver nå vågmärkena. När fjunet landar på de prickiga tuvorna växer gräset till ramper.', sketch: 'Galoppera förbi backsippan på slätten mot branten. Vänta tills rampen har växt och gå sedan upp.' },
    p3Map: { q: 'Vart tog kartbiten på land vägen?', note: 'Från branten kan vi spana över Stäppen. Fjun från backsipporna får tuvorna att växa till ramper uppför den.', sketch: 'Galoppera förbi backsippan på slätten mot branten. Vänta tills rampen har växt och gå sedan upp.' },
    p3b: { q: 'Hur når fjunet de övre tuvorna?', note: 'Två backsippor står på den nedre avsatsen. Spring förbi dem i full fart!', sketch: 'Ta sats på slätten, galoppera uppför rampen och vidare förbi backsipporna.' },
    p3bMap: { q: 'Hur når vi utsikten högst upp?', note: 'De övre tuvorna behöver också fjun. Två backsippor står på den nedre avsatsen.', sketch: 'Ta sats på slätten, galoppera uppför rampen och vidare förbi backsipporna.' },
    kelp: { q: 'Vart leder Vattenporten?', note: 'Valvet vid pölen är öppet nu!', sketch: 'Ställ dig i valvet och tryck Simma in.' },
    hook: { q: 'Vad finns längre ut i havet?', note: 'Simma österut, mot det ljusa vattnet. Strömmen hjälper dig.', sketch: 'Följ bubbelströmmen åt höger tills Klo säger till.' },
    p4: { q: 'Hur når vi kartbiten på Klippudden?', note: 'Biten ligger bortom klyftan. Du behöver full fart ända fram till kanten. Backen är lång …', sketch: 'Gå upp på toppen av backen och galoppera nerför hela vägen till kanten.' },
    toSea: { q: 'Var är den sista kartbiten?', note: 'Den ligger i havet, långt nere i djupet. Med den kan Klo laga vägen runt vecket.', sketch: 'Simma in genom valvet vid pölen och följ diket nedåt åt höger.' },
    p5: { q: 'Vart leder strömstrecket i Mörka valvet?', note: 'Lyktfiskarnas ljus kan visa fortsättningen. De följer ett stilla skal, men stannar när benen simmar.', sketch: 'Simma till strömmen ovanför fiskarnas kelp och göm dig där. Strömmen bär dig och fiskarna in i valvet.' },
    p6: { q: 'Hur får vi loss kartbiten under vecket?', note: 'Det uppvikta papperet är en del av havsbottnen. Ditt tunga skal kan platta till det.', sketch: 'Göm dig i virveln. Strömmen bär skalet in till vecket, där kartbiten sitter fast.' },
    toViken: { q: 'Vart leder strömmen?', note: 'Virveln har öppnat sig åt höger.', sketch: 'Simma till virveln längst in i diket och låt den nya strömmen ta dig vidare.' },
    p7: { q: 'Hur tänds fyren?', note: 'Tre luckor, tre kedjor. Följ varje kedja till sin maskin.', sketch: 'Göm dig över bottenplattan. Göm dig vid röret, åk upp och dra i repet. Galoppera på bryggan för den sista luckan.' },
    talk: { q: 'Varför vek Kartväktaren undan havet?', note: 'Kartväktaren väntar längst ut på bryggan. Prata med honom vid kartan.', sketch: 'Gå fram till honom och tryck Prata.' },
    p8: { q: 'Hur släpper vi fram en liten våg?', note: 'Laga vägen till fyren med hovarna. Platta ut strandhörnet med skalet. Alvas penna lagar glappet i kusten.', sketch: 'Galoppera över strecken på bryggan. Hoppa i, göm dig och följ strömmen till strandhörnet.' },
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
    p2: (n) => `Laga Vattenporten med hjälp av spegelbilden. (${n}/2)`,
    p1: 'Rita klart Streckbron – följ havets spår till vänster.',
    p1Map: 'Laga Streckbron – leta efter kartbiten på Stäppen.',
    p3: (n) => `Följ havets spår upp till vågmärkena. (${n}/3)`,
    p3Map: (n) => `Få ramperna att växa – spana efter kartbiten. (${n}/3)`,
    p3b: (n) => `Få ramperna att växa upp till vågmärkena. (${n}/3)`,
    p3bMap: (n) => `Nå toppen av branten – spana efter kartbiten. (${n}/3)`,
    kelp: 'Följ havets veck genom Vattenporten.',
    hook: 'Följ vecket österut – vem har stängt havet?',
    p4: (n) => `Hämta kartbiten bortom klyftan. (${n}/2)`,
    toSea: (n) => `Hämta den sista kartbiten i havet. (${n}/2)`,
    p5: 'Lys upp strömstrecket – hitta vägen till kartbiten.',
    p6: 'Platta ut havsbottnens veck – befria kartbiten.',
    toViken: 'Följ strömmen till han med linjalen i fyren.',
    p7: (n) => `Öppna luckorna – locka fram fyrens väktare. (${n}/3)`,
    talk: 'Fråga Kartväktaren varför han vek undan havet.',
    p8: 'Laga strandhörnet – prova med en liten våg!',
    signe: 'Tävla mot sköldpaddan Signe till pölen!',
    free: 'Utforska fritt – och leta färgpennor!',
    freeComplete: 'Alla färgpennor är hittade – utforska fritt!'
};

// One mission throughout the journey. The notebook connects discoveries to the
// current puzzle without revealing evidence that the player has not reached.
export const THREAD = {
    mission: 'Få havet att plaska igen',
    complete: 'Havet plaskar igen!',
    missionLabel: 'Vårt uppdrag', whyLabel: 'Därför gör vi det', nextLabel: 'Nästa steg',
    recap: {
        start: 'Alvas strandkant avbröts när någon vek undan havet. Vi vill hitta den personen och få tillbaka plasket.',
        map: 'Klos försök visade att kartan och världen hör ihop. Vecket har brutit vägarna både på land och i havet.',
        reflection: 'Pölen visar hur sidan såg ut före vecket. Den hjälper oss att laga vägen under den frusna vågen.',
        waves: 'Vågmärkena leder till Klippudden. Där fortsätter den vikta sidan. Vi behöver också följa vecket under vattnet.',
        survey: 'Vågmärkena ledde till Klippudden och Vattenporten är lagad. Nu kan vi jämföra spåren med vecket under vågen.',
        investigate: 'Vi såg att vecket fortsätter under havet. En figur av papper med en linjal sprang därifrån. Den trasiga kartan kan ge oss en väg runt.',
        land: 'Språnget tog oss till kartbiten på Klippudden. En bit i havet saknas ännu innan kartans väg kan bli hel.',
        sea: 'Skalet plattade ut havsbottnens veck i Kelphjärtat och befriade kartbiten. Nu saknas biten som flög över Stäppen.',
        pieces: 'Båda kartbitarna är hittade. Klo kan sätta ihop dem med sitt karthörn och laga vägen runt vecket.',
        tower: 'Den lagade kartan öppnade strömmen till fyren. Där gömmer sig figuren med linjalen.',
        fear: 'Kartväktaren vek undan havet för att skydda papperet från vatten. Vi behöver hjälpa honom att våga veckla ut det.',
        proof: 'Kartväktaren vill prova med en liten våg först. Vi behöver laga den vikta kustbiten vid fyren. Håller papperet släpper han fram hela havet.',
        end: 'Strandkanten höll! Kartväktaren vecklade ut havet och Alva fick tillbaka sitt plask. Nu är det fritt att upptäcka mer.'
    },
    why: {
        explore: 'Vi behöver både hovarna och skalet för att ta oss fram på Alvas sida. Klo hjälper oss att pröva dem.',
        hide: 'Klo gömde sig när vi stampade. Vi behöver få med honom igen för att undersöka vecket.',
        pool: 'Vi behöver en väg under den frusna vågen. I stilla vatten kan vi se hur vägen såg ut före vecket.',
        p2: 'Vecket har rubbat Vattenporten. När stenen och plankan stämmer med spegelbilden öppnas vägen in i havet.',
        p1: 'Vecket bröt vägen till Stäppen. Vi lagar bron för att nå havets spår på branten.',
        p1Map: 'Kartbiten på land behövs för att laga strömmen till fyren. Den flög över Stäppen, på andra sidan Streckbron.',
        p3: 'Vågmärkena visar vart den vikta sidan tog vägen. Galoppvinden bär fjun till tuvorna, som blir en väg upp.',
        p3Map: 'Kartbiten flög över Stäppen. Från branten kan vi spana efter den. Gräsramperna tar oss upp till utsikten.',
        p3b: 'De översta vågmärkena leder oss vidare. De övre tuvorna behöver också fjun innan vi kan nå dem.',
        p3bMap: 'Från toppen kan vi se längre och spana efter kartbiten. Fjun till de övre tuvorna gör resten av vägen upp klar.',
        kelp: 'Vattenporten är öppen. Nu kan vi följa vecket under den frusna vågen och se vad som finns där.',
        hook: 'Vi följer samma veck från havssidan för att hitta den som stängde vägen.',
        p4: 'Kartbiten på Klippudden behövs för att laga strömmen runt vecket. Ett långt språng tar oss över klyftan.',
        toSea: 'Kartbiten från land räcker inte ensam. Strecket genom havet måste också bli helt.',
        p5: 'Mörkret döljer strömstreckets fortsättning genom valvet. Med ljus kan vi följa det vidare mot kartbiten i djupet.',
        p6: 'Kartbiten sitter fast under ett veck i den tecknade havsbottnen. Vi behöver få papperet platt så att biten kommer loss.',
        toViken: 'Kartan är lagad. Strömmen leder till figuren med linjalen – han kan veta hur vi får tillbaka havet.',
        p7: 'Figuren gömmer sig bakom fyrens luckor. Kedjorna visar hur vi kan öppna dem och få kontakt.',
        talk: 'Kartväktaren använde linjalen. Vi behöver förstå varför han vek sidan innan vi kan hjälpa honom att öppna den.',
        p8: 'En liten våg ska få passera den lagade kusten medan Kartväktaren ser på. Då kan han våga släppa fram den stora vågen hemma på vår strand.',
        signe: 'Havet är hemma igen! Nu kan Klo fortsätta sin forskning med en kapplöpning.',
        free: 'Uppdraget är klart. Färgpennor och små upptäckter är till för den som vill utforska mer.',
        freeComplete: 'Uppdraget är klart och alla färgpennor är hittade. Hela sidan är öppen att leka på.'
    },
    talkMap: {
        goal: 'Visa Kartväktaren att du hör hemma på båda sidor.',
        why: 'Han skiljer land från hav med en rak linje. Men var får en sköldhäst plats på hans karta?',
        hint: { q: 'Var hör en sköldhäst hemma på kartan?', note: 'Kartväktaren har ritat LAND och HAV. Titta på kartan tillsammans.', sketch: 'Gå fram till Kartväktaren och välj Prata igen.' }
    },
    talkShore: {
        goal: 'Berätta för Kartväktaren om livet vid strandkanten.',
        why: 'Hans karta saknar platsen där land och hav möts. Vi lever där varje dag och kan visa att det går.',
        hint: { q: 'Vad saknas mellan LAND och HAV?', note: 'Du har galopperat på land och gömt dig i havet. Berätta hur de hör ihop.', sketch: 'Stanna vid Kartväktaren och välj Prata en gång till.' }
    }
};

// ---------------------------------------------------------------------------
// One-off tips about the controls (touch and keyboard versions)
// ---------------------------------------------------------------------------
export const TIPS = {
    gallop: { touch: 'Dra spaken ända ut – då galopperar du!', keys: 'Håll in pilen – efter en stund galopperar du!' },
    act: { touch: 'Knappen ovanför Hoppa byter namn: Färglägg, Knuffa, Läs … Hoppa har alltid en egen knapp.', keys: 'E gör det som står på Använd-knappen: Färglägg, Knuffa, Läs … Mellanslag hoppar.' },
    hide: { touch: 'Göm dig: du kryper in under skalet. Tryck Kom fram för att resa dig, sedan Hoppa för att hoppa.', keys: '↓ eller S gömmer dig under skalet. Mellanslag tar fram dig. Tryck mellanslag igen för att hoppa.' },
    swim: { touch: 'I vattnet styr du åt alla håll. Gömd sjunker du – men i en ström driver du med.', keys: '← → eller A/D simmar åt sidorna, ↑ eller W upp och X ner. ↓ eller S gömmer dig så att du sjunker. Mellanslag tar fram dig.' },
    journal: { touch: 'Undrar du något? Tryck Ropa på Klo. Dina upptäckter finns i boken.', keys: 'Undrar du något? Tryck K för Klo. J öppnar Forskningsdagboken.' },
    dashed: { touch: 'Streckade linjer är ofärdiga. Galoppera över dem, så ritas de klart!', keys: 'Streckade linjer är ofärdiga. Galoppera över dem, så ritas de klart!' },
    fullGallop: { touch: 'Full galopp! Nu ritar hovarna och du kan ta stora språng.', keys: 'Full galopp! Nu ritar hovarna och du kan ta stora språng.' }
};

// Persistent, state-derived help. The renderer and controls share these words;
// no timer or remembered one-off tip decides whether they are needed.
export const GUIDANCE = {
    controls: {
        hide: { touch: 'Tryck Göm dig.', keys: 'Tryck ↓ eller S.' },
        hideHold: { touch: 'Håll Göm dig intryckt.', keys: 'Håll ↓ eller S intryckt.' },
        emerge: { touch: 'Tryck Kom fram.', keys: 'Tryck mellanslag.' },
        emergeHold: { touch: 'Släpp Göm dig eller tryck Kom fram.', keys: 'Släpp göm-tangenten eller tryck mellanslag.' },
        stay: { touch: 'Stanna gömd.', keys: 'Stanna gömd.' },
        move: { touch: 'Styr med spaken.', keys: 'Styr med ← → eller A/D. Simma upp med ↑/W, ner med X.' },
        follow: 'Håll fingret dit du vill gå.',
        gallop: { touch: 'Dra spaken ända ut.', keys: 'Håll pilen inne för full galopp.' },
        followGallop: 'Håll fingret långt framför sköldhästen.',
        act: { touch: 'Tryck på knappen ovanför Hoppa.', keys: 'Tryck E.' },
        hideTipHold: { touch: 'Håll Göm dig intryckt för att krypa under skalet. Släpp för att komma fram.', keys: 'Håll ↓ eller S intryckt för att krypa under skalet. Släpp eller tryck mellanslag för att komma fram.' },
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
        landmark: 'Du är på andra sidan! Fortsätt till kartbiten på Klippudden.',
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
        p8Land: 'Laga vägen till strandhörnet. Galoppera åt höger över bryggans tre streck.',
        p8Jump: 'Vägen är lagad! Fortsätt i galopp ut i vattnet, mot strandhörnet.',
        p8Approach: 'Simma till strömmen efter bryggan. Den leder till det vikta hörnet.',
        p8Hide: 'Göm dig här. Skalet följer strömmen och plattar ut strandhörnet.',
        p8Drift: 'Stanna gömd tills skalet når det vikta strandhörnet.',
        p8Draw: 'Hörnet är platt! Alvas penna kan laga glappet i strandkanten.'
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
    halves: 'Två kartbitar gör vägen hel',
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
        map_corner: 'En kartbit med namnet Kartväktaren – en av lapparna som flög när sidan veks. Samma rosa snäcka finns på kartan och stranden. När Klo vek kartan följde stranden med. Båda blev platta när han vecklade ut den.',
        note1: 'En lapp vid Streckbron: ”OBS! Ofärdigt streck. Rör ej! /Kartväktaren” Samma namn som på kartan.',
        wave_marks: 'Havets spår går högt uppe på branten, vidare mot Klippudden. Land och hav har hängt ihop där.',
        reflection: 'I stilla vatten syns sidan utan vecket. Där står Vattenporten öppen med stenen mitt framför, och plankan vid pölen är hel.',
        fold: 'Ett veck genom havet – rakt som en linjal.',
        figure: 'Någon smal, av papper, med en linjal. Han skyndade sig bort från vattnet.',
        glimpse: 'Det finns fler sköldhästar!',
        lighthouse: 'Pappersfyren lyser bara i spegelbilden. Någon har stängt dess luckor.',
        note2: 'En lapp i en flaska i djupet: ”Snälla, rör inte strecken. Det är för teckningens skull. /Kartväktaren” Han skyddar lappen från vattnet.',
        mark_land: 'Kartbiten från land låg på Klippudden. Ett långt språng tog oss över klyftan. Strecket på biten fortsätter fram till en riven kant.',
        mark_sea: 'Kartbiten satt fast under havsbottnens veck i Kelphjärtat. Skalet plattade ut papperet och befriade biten. Tillsammans med de andra bitarna lagar den kartans väg till Pappersfyren.',
        torn_map: 'Kartbitarna passar ihop. Kartan rev sig där sidan veks – och bitarna flög åt alla håll.',
        kv_why: 'Kartväktaren är av papper. Han trodde att vågen skulle blöta ner sidan så att den gick sönder. Därför vek han undan havet.',
        kv_map: 'På Kartväktarens karta finns bara LAND och HAV – ingen strand, och ingen sköldhäst.'
    },
    reports: {
        1: ['Vi vill få havet att plaska igen. Genom Vattenporten hittade vi vecket under vågen.', 'En pappersfigur med linjal skyndade bort från vattnet.', 'Skalet gjorde pölen blank. Spegelbilden visade hur stenen och plankan kunde öppna Vattenporten.', 'Nästa: undersöka kartans rivna kant och hitta vägen förbi vecket.'],
        2: ['Språnget nådde kartbiten på land. Skalet befriade biten under havsbottnens veck.', 'Vi satte ihop kartan. Då öppnades strömmen till Pappersfyren!', 'Kartan rev sig där sidan veks. Figuren med linjalen gömmer sig i fyren.', 'Nästa: få kontakt med honom och ta reda på hur havet kan vecklas ut.']
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
    zoomIn: 'Förstora', zoomOut: 'Förminska', reset: 'Återställ vyn',
    viewStatus: (selectedName, percent) => selectedName ? `${selectedName}, ${percent} procent` : `Hela kartan, ${percent} procent`,
    missingPiece: (index, total) => `Kartbit ${index} av ${total}: inte hittad än`,
    collectedSummary: (names) => names.length ? `Hittade kartbitar: ${names.join(', ')}.` : 'Inga kartbitar hittade än.',
    zoomLevel: (percent) => `${percent} %`,
    guardian: { land: 'LAND', sea: 'HAV', shore: 'STRAND' },
    search: {
        title: 'Två kartbitar saknas', corner: 'Vårt karthörn',
        land: 'På land', sea: 'I havet',
        landHint: 'Bortom Stäppen', seaHint: 'Ner i Kelpskogen'
    },
    pan: { up: 'Visa längre upp', down: 'Visa längre ner', left: 'Visa mer åt vänster', right: 'Visa mer åt höger' },
    detailHint: 'Välj en kartbit för att titta närmare.',
    legend: 'Streck visar vägar. Rivna kanter visar var bitarna möts.',
    pieces: {
        corner: { name: 'Karthörnet', foundAt: 'Hos Klo på stranden', detail: 'Klo visade att kartan och världen hör ihop: samma rosa snäcka följde med när stranden veks. Kartväktaren har skrivit sitt namn här.' },
        land: { name: 'Kartbiten från land', foundAt: 'På Klippudden', detail: 'Ett långt språng över klyftan tog oss till udden. Här låg en bit av kartans väg runt vecket. Strecket slutar vid den rivna kanten.' },
        sea: { name: 'Kartbiten från havet', foundAt: 'Under vecket i Kelphjärtat', detail: 'Skalet plattade ut den vikta havsbottnen och befriade kartbiten. Den fortsätter kartans väg till Pappersfyren.' }
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

// Requested help: noticing, trying a connection, then the current action from
// GUIDANCE. No greeting or local remark gives away an unfinished experiment.
export const KLO_COMPANION = {
    ui: {
        call: 'Ropa på Klo', name: 'Professor Klo', eyebrow: 'Fältanteckningar',
        arriving: 'Klo är på väg…', close: 'Stäng samtalet', hint: 'En liten ledtråd',
        nudge: 'Lite tydligare', exact: 'Visa mig var', repeat: 'Visa ledtråden igen',
        recap: 'Vad vet vi?', local: 'Om den här platsen', thanks: 'Tack, Klo!',
        question: 'Vad funderar du på?', level: ['En liten ledtråd', 'Lite tydligare', 'Visa mig var'],
        waiting: 'Ett ögonblick…', callKey: 'K', hideHelp: 'Dölj hjälpen', remember: 'Dina ledtrådar',
        callTip: 'Undrar du något? Ropa på Klo med knappen här uppe.',
        controls: 'Hur gör jag?', requested: 'En anteckning från Klo',
        watching: 'Jag tittar på ditt försök.',
        noExact: 'Vi kan undersöka vidare i din egen takt.'
    },
    places: {
        beach: 'På stranden', sand: 'På stranden', pool: 'Vid pölen', rock: 'Vid pölen',
        wood: 'På Spången', bridge: 'På Spången', grass: 'På Stäppen', cliff: 'Vid klipporna',
        kelp: 'I Kelpskogen', vault: 'Vid Mörka valvet', vortex: 'I virveln', current: 'I strömmen',
        pier: 'I Spegelviken', gallery: 'På fyrens galleri', swim: 'Under ytan',
        hole: 'Vid Klos hål', nearby: 'Tillsammans', margin: 'En hälsning i marginalen', fallback: 'På forskningsbesök'
    },
    greetings: {
        beach: ['Sand i marginalen. Igen. Vad undersöker vi?', 'Här är jag! Jag räknade sandkorn. Tappade räkningen.'],
        sand: ['Sand i marginalen. Igen. Vad undersöker vi?', 'Sandprov nummer … äh. Hej!'],
        pool: ['God dag, professor! Åh. Det var min spegelbild.', 'Jag är här. Min spegelbild för också anteckningar.'],
        rock: ['God dag, professor! Åh. Det var min spegelbild.', 'Ett litet sidosteg runt stenen. Så!'],
        wood: ['Jag kom underifrån. Spången hade ingen dörr.', 'Träet säger knarr. Jag antecknar knarr.'],
        bridge: ['Jag kom underifrån. Spången hade ingen dörr.', 'En professor under varje planka? Bara den här.'],
        grass: ['Har jag något på huvudet? Det är … forskningsfjun.', 'Jag tog gräsvägen. Den kittlades.'],
        cliff: ['Alla ben på plats. Pennan också. Nästan.', 'Fin utsikt! Jag håller i anteckningsboken lite extra.'],
        kelp: ['Ursäkta gardinen. Den fastnade framför ögonen.', 'En professor, lätt panerad i kelp.'],
        vault: ['Schhh. Mina klor ekar här.', 'Jag viskar. Mest för att ekot inte ska avbryta.'],
        vortex: ['Jag kallade det där en mätning.', 'Ett varv till? Nej. Nu öppnar vi boken.'],
        current: ['Specialleverans med strömmen. En professor!', 'Vattnet erbjöd skjuts. Jag sa bubbel.'],
        pier: ['Lite blöt om klorna. Mycket redo att forska.', 'Bryggans undersida är också en sida. Jag har granskat den.'],
        gallery: ['Puh! Jag räknade stegen. Benen protesterade.', 'Vänta … pennan! Så. Nu är hela professorn här.'],
        swim: ['Bubbelposten fungerar. Du ropade?', 'Anteckningsboken simmar med mig i dag.'],
        hole: ['Jag hör dig här nere. Jag lyssnar gärna.', 'En liten viskning från en liten krabba.'],
        nearby: ['Jag är här. Vad funderar du på?', 'Boken är öppen. Ordet är ditt!'],
        margin: ['Jag tittar in från sidans kant. Vad funderar du på?', 'Här i marginalen har jag plats för en liten pratstund.'],
        fallback: ['Professor Klo, till din tjänst.', 'Jag hittade hit. Det räknas som forskning.']
    },
    help: {
        explore: ['Mitt stoppur har inte fått mäta en enda sköldhäst i dag.', 'Jag undrar hur fort dina hovar kan bära dig förbi mig.'],
        hide: ['Det blev väldigt stora hovljud för en väldigt liten krabba.', 'En sten ser lugn ut. Vad liknar ditt skal när benen inte syns?'],
        afterKlo: ['Nu vågade jag titta fram! Jag hittade något i sanden.', 'När vi båda är framme kan jag visa dig fyndet.'],
        pool: ['Pölen försöker visa oss något, men bilden darrar.', 'När du ligger alldeles stilla under skalet blir vattnet blankt.'],
        stone: ['Stenen och dess spegelbild verkar inte vara överens.', 'Jämför deras platser. Stenen på stranden går att knuffa längs spåret.'],
        plank: ['En liten del av stranden ser fortfarande annorlunda ut i spegeln.', 'Titta på plankan. Dina hovar kan lämna mer än fotspår när du springer fort.'],
        bridge: ['Vägen tar slut i små streck. Som om pennan lyftes mitt i teckningen.', 'Hovar i full fart kan fylla i sådana streck. Det behövs plats att ta sats.'],
        bridgeMap: ['En kartbit flög över Stäppen. På vägen dit har bron blivit små streck.', 'Hovar i full fart kan fylla i sådana streck. Det behövs plats att ta sats.'],
        ramp: ['De små fjunen rör sig när det blåser. Tuvorna står alldeles stilla.', 'Din galopp gör vind. Kan den bära ett fjun till den prickiga tuvan?'],
        rampMap: ['Från branten kan vi spana efter kartbiten. Små fjun svävar ovanför backsipporna.', 'Din galopp gör vind. Kan den bära ett fjun till den prickiga tuvan?'],
        upperRamp: ['Här finns fler backsippor och fler prickiga tuvor, högre upp.', 'Samma försök kan fungera på nästa avsats. Vinden följer din galopp.'],
        upperRampMap: ['Utsikten finns högre upp. Där finns fler backsippor och prickiga tuvor.', 'Samma försök kan fungera på nästa avsats. Vinden följer din galopp.'],
        waveLedge: ['Gräset har förändrat hela branten. Havets spår finns ovanför oss.', 'Nu finns en väg uppför ramperna till de högsta vågmärkena.'],
        waveLedgeMap: ['Ramperna når ända upp nu! Från toppen kan vi se långt över Stäppen.', 'Följ ramperna till de högsta vågmärkena och spana efter kartbiten.'],
        leap: ['Den långa backen och den breda klyftan verkar höra ihop.', 'Ett långt språng börjar långt före kanten. Backen ger plats åt farten.'],
        landmark: ['Vilket språng! Här ute finns något med en riven kant.', 'Undersök kartbiten längre ut på Klippudden.'],
        returnRope: ['Hit kom vi med ett språng. Vägen hem ser annorlunda ut.', 'Repet på den här sidan sitter ihop med en planka över klyftan.'],
        fish: ['Strömstrecket försvinner i mörkret. De där små levande ljusen skulle kunna visa vart det tar vägen.', 'Lyktfiskarna är blyga. Ett stilla skal är mindre skrämmande än simmande ben.'],
        fishRecover: ['Fiskarna är nära, men vattnet bär oss inte vidare här.', 'Den rörliga strömmen går ovanför fiskarnas plats. Skalet behöver vara där.'],
        vortex: ['Kartbiten sticker fram under havsbottnens veck. Vattnet cirklar runt det uppvikta papperet.', 'Ett gömt skal följer strömmen inåt. Tyngden kan platta ut vecket, precis som det lilla vid kelpen.'],
        mirror: ['Fyren där uppe och fyren i vattnet ser olika ut.', 'En lugn spegelbild låter dig jämföra luckorna, precis som vid pölen.'],
        plate: ['En kedja försvinner ner mot något platt på botten.', 'Plattan verkar behöva tyngd som stannar kvar en stund. Ditt skal är tungt.'],
        afterPlate: ['Plattan har gjort sitt. Luckan där uppe är öppen!', 'Du behöver inte tynga ner den längre. Benen kan bära dig vidare i vattnet.'],
        pipe: ['Bubblorna tar en märklig väg här. Rakt upp genom röret.', 'Strömmen kan bära ett gömt skal hela vägen upp till galleriet.'],
        rope: ['Här uppe kan vi se var en av luckornas kedjor slutar.', 'Repet bredvid oss hör ihop med luckan. Du kan ta tag i det.'],
        drum: ['Ett hjul vid bryggan har små hack längs kanten.', 'Hovslagen kan få hjulet att vrida sig, ett hack i taget.'],
        p8Land: ['Vi behöver nå det vikta strandhörnet vid fyren.', 'Hovarna kan laga de tre avbrutna strecken på vägen dit.'],
        p8Jump: ['Vägen till hörnet är lagad. Nu väntar skalets uppgift.', 'Behåll galoppen fram till kanten. Språnget för dig till strömmen.'],
        p8Water: ['Strömmen leder till strandhörnet som Kartväktaren vek in.', 'Göm dig. Skalet plattar till papper, precis som vid kartbiten i djupet.'],
        p8Draw: ['Skalet har plattat ut hörnet. Ett glapp i strandkanten finns kvar.', 'Alvas penna lagar glappet så att vår lilla provvåg kan komma förbi.'],
        talk: ['Nu är figuren med linjalen här. Han verkar bekymrad.', 'Vi kan lyssna på honom och fråga vad som hände.'],
        talkMap: ['På hans karta finns bara två olika sorters platser.', 'Var skulle en sköldhäst få plats? Prata med honom om kartan.'],
        talkShore: ['Hans karta har inget namn för platsen mellan land och hav.', 'Du vet hur det är att leva vid strandkanten. Berätta det för honom.'],
        hook: ['Vecket försvinner inte vid vattenytan. Det fortsätter längre in.', 'Följ det längre åt höger i Kelpskogen och undersök utsikten där.'],
        kelp: ['Vattenporten är öppen. Bakom den rör sig havet fortfarande.', 'Vid valvet finns vägen in under den frusna vågen.'],
        toSea: ['Vi har kartbiten från land. Den som föll ner i havet saknas fortfarande.', 'Vattenporten för oss tillbaka till Kelpskogen.'],
        toViken: ['Kartans väg är hel igen. Strömmen fortsätter till en annan sida.', 'Följ den öppna vägen mot Spegelviken och fyren.'],
        routeLand: ['Det vi letar efter just nu hör till spåren på land.', 'Vägen tillbaka till stranden finns åt vänster, genom grottan.'],
        routeKelp: ['Vi behöver undersöka den andra sidan av vattenytan.', 'Vattenporten vid pölen är förbindelsen till Kelpskogen.'],
        routeViken: ['Vårt nästa spår finns vid fyren i Spegelviken.', 'Följ den öppna vägen till Spegelviken på den här sidan.'],
        routeBayExit: ['Härifrån behöver vi återvända till strandens spår.', 'Stranden fortsätter åt vänster och tillbaka till sidan vi kom från.'],
        signe: ['Signe väntar vid snäckorna. Hon ser ovanligt målmedveten ut.', 'Hälsa på henne. Jag tror att hon har ett förslag.'],
        free: ['Havet är tillbaka, men min anteckningsbok har många tomma sidor.', 'Det finns färgpennor att upptäcka på de olika sidorna. Välj en plats du vill undersöka.'],
        freeComplete: ['Alla färgpennor är hittade. Vilken färgglad forskningsresa!', 'Du kan besöka Signe eller välja din favoritplats igen.'],
        fallback: ['Vi kan titta på vad som ser annorlunda ut här.', 'Ett litet försök i taget. Jag håller anteckningsboken redo.']
    },
    recap: {
        start: 'Någon vek undan havet mitt i Alvas plask. Vi undersöker vad som hände.',
        map: 'När vi vek kartan lyftes den rosa snäckan på stranden. Kartan och världen hör ihop.',
        reflection: 'Vi såg en annan bild av stranden i pölen. Där var sidan utan vecket.',
        waves: 'Vi hittade havets gamla spår högt uppe på branten. De ledde mot Klippudden.',
        survey: 'Vattenporten är lagad och vi har undersökt vågmärkena på branten.',
        investigate: 'Vecket fortsätter ner i havet. En pappersfigur med linjal skyndade därifrån.',
        land: 'Vi hittade en kartbit på Klippudden. Språnget tog oss hela vägen dit.',
        sea: 'Skalet plattade ut havsbottnens veck i Kelphjärtat och befriade kartbiten.',
        pieces: 'Båda kartbitarna är hittade. Deras rivna kanter passar ihop.',
        tower: 'Vi satte ihop kartan. Då fortsatte strömmen till fyren, där figuren gömde sig.',
        fear: 'Kartväktaren berättade att han vek undan havet för att skydda papperet mot vattnet.',
        mapTalk: 'Hans karta delar upp allt i LAND och HAV. Sköldhästen och stranden saknar plats där.',
        proof: 'Vi ska laga den vikta kustbiten och prova med en liten våg. Håller papperet släpper Kartväktaren fram hela havet.',
        end: 'Strandkanten höll! Kartväktaren vecklade ut havet. Alva fick tillbaka sitt plask.'
    },
    local: {
        beach: ['Jag hittade ett sandkorn i boken. Nu har det en egen fotnot.', 'Jag mätte stranden i sidosteg. Det blev väldigt många krabbor långt.'],
        pool: ['Min spegelbild skriver med fel klo. Högst misstänkt.', 'Vatten är bra på att spegla. Sämre på att hålla i en penna.'],
        wood: ['Jag lyssnade på en planka. Den sa knarr på tre olika språk.', 'Spången har fler ben än jag. Den går ändå ingenstans.'],
        grass: ['Gräs kittlar sex ben samtidigt. Svårt att anteckna resultatet.', 'Ett fjun landade på min penna. Nu skriver jag mjukare.'],
        cliff: ['Jag mäter utsikten. Den är ungefär ett väldigt långt oj.', 'Min penna vill rulla mot kanten. Den saknar försiktighetsinstinkt.'],
        kelp: ['Kelpen vinkar hela tiden. Jag hinner inte vinka tillbaka till alla.', 'Jag räknade blad. Ett simmade iväg. Det kan ha varit en fisk.'],
        vault: ['Hallå? … Hallå! Ekot vill också bli professor.', 'Vi ser inte allt här ännu. Jag skriver ett frågetecken i boken.'],
        vortex: ['Jag tog ett varv för mycket och mötte mig själv. Trevlig krabba.', 'Här pekar alla mina anteckningar lite åt olika håll.'],
        current: ['En ström behöver inga fötter för att komma fram. Orättvist bekvämt.', 'Bubblorna åker alltid före. De måste ha bråttom upp.'],
        pier: ['Bryggan har en ovanligt bra utsikt för att vara gjord av plankor.', 'Jag lånade en plats på pålen. Den ville inte ha någon hyra.'],
        gallery: ['Jag hittade vinden här uppe. Den försökte låna min bok.', 'Hur lång är en fyr? Längre än mina ben, enligt mätningen.'],
        swim: ['Min anteckningsbok är vattentät. Mina anteckningar är det inte.', 'En bubbla är havets sätt att säga plopp.'],
        hole: ['Det är litet här nere. Men jag har plats för en stor tanke.', 'Jag hör bättre när jag inte måste hålla reda på alla benen.'],
        margin: ['Här ute ryms en extra tanke. Därför tycker jag om marginaler.', 'Boken har fler kanter än jag har klor. Jag börjar med den här.'],
        fallback: ['Forskning kräver tålamod. Och ibland ett mellanmål.', 'Du undersöker. Jag antecknar. Vi är ett bra forskarlag.'],
        litVault: 'Fiskarna lyser fortfarande över strömstrecket. Nu kan vi följa det genom valvet till Kelphjärtat.',
        openPool: 'Vattenporten är öppen. Jag har ritat en liten stjärna vid vårt försök.',
        leapDone: 'Fem hästlängder! Jag har strukit under resultatet två gånger.',
        drumDone: 'Dina hovslag vred hjulet. Jag undrar om bryggan kan spela fler melodier.',
        ended: 'Hör du plasket? Jag tänker aldrig tröttna på den mätningen.'
    },
    story: {
        note: ['klo', 'Kartväktaren igen! Vägen till Stäppen är bruten. Där borta finns havets spår – vi behöver komma över.'],
        noteMap: ['klo', 'Kartväktaren igen! Bron är bruten. En kartbit flög över Stäppen, på andra sidan.'],
        branten: ['klo', 'Havets spår finns högt uppe på branten! Vi behöver nå dem och se vart den vikta sidan tog vägen.'],
        brantenMap: ['klo', 'Vågmärken högt uppe på branten! Därifrån kan vi spana efter kartbiten som flög över Stäppen.'],
        reflection: ['klo', 'I spegeln är Vattenporten öppen! Pölen visar stranden före vecket. Vi behöver få vägen under vågen tillbaka.'],
        bayReflection: ['klo', 'Tre öppna luckor i spegelbilden. Här uppe ser fyren annorlunda ut.'],
        line: ['klo', 'Hovarna lagar vägen till fyren. Sedan kan skalet platta ut det vikta strandhörnet.'],
        fluffMiss: 'Fjunet flög förbi tuvan …'
    }
};
