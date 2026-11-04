/*
 * Äventyr 2: Den magiska skogen – every player-facing string, in Swedish.
 *
 * Style as in Adventure 1 (plan §3.6): short speaker boxes (about 90 characters
 * at most), at most three boxes before control returns, Swedish quotation marks
 * and dashes, "du" to the player, plain child words.
 *
 * Alva and Mira are heard, never drawn (plan §3.2); both draw in the story
 * (Alva the tukankrabba, the first egg and the stars; Mira the forest, the
 * cloud and the moon). Tukankrabban is Alva's creature; her facts and her
 * drawing are in docs/skoldhast/adventure-2.md.
 */

export const NAMES = {
    horse: 'Sköldhästen', klo: 'Professor Klo', tukan: 'Tukankrabban', alva: 'Alva', mira: 'Mira',
    skata: 'Skatan', dyvel: 'Tordyveln', moln: 'Molnet', note: ''
};

export const WORDS = {
    title: 'Sköldhästen', subtitle: 'och den magiska skogen',
    credit: 'Sköldhästar och tukankrabbor är påhittade av Alva.',
    adventure: 'Den magiska skogen',
    begin: 'Börja', cont: 'Fortsätt', startOver: 'Börja om',
    confirmRestart: 'Vill du börja om Den magiska skogen? Äventyr 1 och det du har låst upp finns kvar.',
    yes: 'Ja', no: 'Nej', back: 'Tillbaka till biljetten', close: 'Stäng',
    eggs: 'Ägg', eggCount: (n, total) => `${n} av ${total}`,
    eggAria: (n, total) => `${n} av ${total} ägg hittade`,
    eggToast: (n, total) => `Ägg ${n} av ${total}!`,
    goalLabel: 'Mål',
    known: 'Vad vet vi?', knownEmpty: 'Inget än. Vi har precis börjat forska.',
    knownTitle: 'Det här har forskarlaget kommit fram till',
    hint: 'Visa en ledtråd', hintMore: 'En ledtråd till', noHint: 'Utforska fritt – allt är klart!',
    stuckDone: 'Du är tillbaka på en trygg plats.',
    endingTitle: 'Tio små tukankrabbor!',
    endingBody: 'Du hittade alla tio äggen. Mira ritade månen och Alva stjärnorna – nu stormar det inte längre i den magiska skogen.',
    endingExplore: 'Utforska den månljusa skogen',
    drawCloud: 'Rita Miras lilla moln!',
    drawMoon: 'Rita månen, Mira! Följ prickarna.',
    drawEgg: 'Rita det första ägget, Alva! Följ prickarna.',
    drawStars: 'Rita en stjärna, Alva! Följ prickarna.',
    pages: { strand: 'Flodstranden', skog: 'Djupa skogen' },
    places: {
        nest: 'boet', grove: 'Kakaolunden', klyft: 'Klyftan', river: 'Glimmerfloden', deep: 'Djuphålan',
        beetle: 'Tordyvelbacken', magtree: 'Skatträdet', fors: 'Forsen', cave: 'grottan bakom forsen',
        arrive: 'brons ände', seeds: 'Rotgrottan', tunnel: 'Rotgrottan', hill: 'Utsiktskullen',
        trunkTop: 'Rutschstammen', ledge: 'Fågelklippan', tree: 'Jätteträdet', crown: 'kronan'
    },
    here: place => `Här är vi: ${place}`
};

export const CONTEXT = { dig: 'Gräv', push: 'Knuffa', give: 'Ge myntet', talk: 'Prata', pull: 'Dra i lianen' };

// ---------------------------------------------------------------------------
// The table: Alva and Mira draw the new page (prologue) and look at it again (epilogue)
// ---------------------------------------------------------------------------
export const TABLE = {
    newPage: 'En ny sida i forskningsdagboken.',
    ask: ['mira', 'Alva! Får jag rita på nästa sida?'],
    yes: ['alva', 'Klart du får. Vi ritar en magisk skog. Där bor tukankrabban.'],
    alvaDraws: 'Alva ritar en orange krabba. Klorna är två tukanhuvuden!',
    tenEggs: '… och nio ägg till. Tio små ägg i sanden.',
    alvaFacts: ['alva', 'Hon gräver ner sina ägg vid floden. Och hon är galen i forskning.'],
    miraTrees: ['mira', 'Precis som Klo! Jag ritar träden. Och floden. Och en bro!'],
    miraBridge: 'Mira ritar en hängbro – men hon hinner inte rita klart den.',
    miraCloud: ['mira', 'Nu ritar jag ett moln. Ett litet moln med blixtar!'],
    cool: ['mira', 'Blixtar är det häftigaste som finns.'],
    evening: ['alva', 'Det blir kväll på sidan. Månen ritar vi sen.'],
    dark: 'Sidan blir mörk. Det lilla molnet mullrar …',
    storm: '… och en storm blåser genom den magiska skogen.',
    eggsAway: ['mira', 'Alva! Äggen blåser iväg!'],
    gallopIn: 'Sköldhästen galopperar in på den nya sidan, och Professor Klo kilar efter.',
    // epilogue
    table: 'Vid Alvas bord.',
    miraMoon: ['mira', 'Jag ritade månen! Den största som finns.'],
    alvaTeam: ['alva', 'Och tio små tukankrabbor kläcktes. Vi är ett bra forskarlag.'],
    marry: ['mira', 'Kan Klo och tukankrabban gifta sig?'],
    research: ['alva', 'Forskning pågår.'],
    end: 'Slut – men forskningen fortsätter.'
};

// ---------------------------------------------------------------------------
// The story beats. Each line: [speaker, text]. Each array is at most three boxes.
// ---------------------------------------------------------------------------
export const STORY = {
    arrive: [
        ['tukan', 'Ett, två … noll! Stormen tog alla mina tio ägg!'],
        ['horse', 'Vi hjälper dig att leta. Jag är Sköldhästen, och det här är …'],
        ['klo', 'P-p-professor Klo. Expert på land och vatten. Och på … ägg. Från och med nu.']
    ],
    arrive2: [
        ['horse', 'Sedan när är du expert på ägg?'],
        ['klo', 'Sedan … nyss.'],
        ['tukan', 'En forskare! Jag är också forskare. Jag forskar i allt som glänser.']
    ],
    claws: [
        ['horse', 'Dina klor … de har näbbar!'],
        ['tukan', 'Tukanklor! Med dem plockar jag kakaobönor och månskensfrön.'],
        ['klo', 'Fantastiskt. Jag antecknar … med darrande klo.']
    ],
    alvaHello: [
        ['tukan', 'Alva, är det du som har ritat mig? Tack för tukanklorna!'],
        ['alva', 'Varsågod! Nu hjälper vi dig att hitta alla äggen.']
    ],
    arrive3: [
        ['tukan', 'Mina ägg kläcks bara i månsken – i den varma sanden här i boet.'],
        ['horse', 'Månsken? Men det finns ingen måne här.'],
        ['tukan', 'Den kommer. Den kommer alltid. Tror jag.']
    ],
    digSeen: [['tukan', 'Titta! Något glimmar i sanden där borta!']],
    firstEgg: [
        ['tukan', 'Mitt första ägg! Men boet är för kallt i stormen.'],
        ['horse', 'Jag bär äggen i mitt skal. Där har de det varmt och tryggt.'],
        ['klo', 'En äggkorg med hovar. Jag antecknar.']
    ],
    alvaFirstEgg: [['alva', 'Ett av tio! Jag skriver upp det i forskningsdagboken.']],
    eggLines: [
        'Ett ägg till i skalet!', 'Varmt och tryggt i skalet.', 'Det glimmar som en pärla!',
        'Där var du ju, lilla ägg.', 'Snart är ni alla samlade.'
    ],
    allEggs: [['tukan', 'Tio! Alla tio! Nu behöver de bara månsken.']],
    allEggsNoCloud: [
        ['horse', 'Alla tio ägg! Men det stormar fortfarande.'],
        ['klo', 'Skatan sa att molnet bor i Jätteträdet. Vi måste fråga det varför det stormar.']
    ],
    allEggsCloud: [['horse', 'Alla tio ägg! Nu går vi till boet – och molnet följer med.']],

    // Klo is in love (after eggs 2, 4, 6 and 8)
    love: {
        2: [
            ['klo', 'Har du sett hennes klor? Två små tukaner – och båda ler mot mig!'],
            ['horse', 'Klo, dina klor skakar.'],
            ['klo', 'Det är … stormen. Jag fryser.']
        ],
        4: [
            ['klo', 'Jag mätte mina hjärtslag. Hundrafyrtio slag i minuten!'],
            ['horse', 'Är det mycket?'],
            ['klo', 'För en krabba är det … ett vetenskapligt mysterium.']
        ],
        6: [
            ['horse', 'Klo, varför har du ritat hjärtan i anteckningsboken?'],
            ['klo', 'Det är inga hjärtan. Det är … diagram.'],
            ['tukan', 'Vilka fina diagram!']
        ],
        8: [
            ['tukan', 'Professor Klo, vill du forska med mig när äggen har kläckts?'],
            ['klo', 'J-ja! Ja. Ja, ja, ja.'],
            ['horse', 'Han menar ja.']
        ]
    },
    alvaLove: [
        ['alva', 'Jag visste det! Klo är kär.'],
        ['mira', 'Kär, kär, kär!'],
        ['klo', 'Jag hör inte. Det är … så mycket regn i öronen.']
    ],
    lightning: [
        ['klo', 'Varje blixt lyser upp hela skogen. Som en jättelik ficklampa.'],
        ['tukan', 'Som om någon vill se något i mörkret … Intressant!']
    ],

    // P1 the cocoa tree
    grove: [
        ['tukan', 'Mjölkchokladträdet! Där uppe sitter mitt ägg fast bland kakaofrukterna!'],
        ['horse', 'För högt för mig.'],
        ['klo', 'Trädets rötter går in under den ihåliga stocken. Hör du hur det ekar?']
    ],
    drumSoft: 'Det dunkar lite i stocken … men trädet rör sig knappt.',
    drumHalf: 'Trädet skakar när hovarna trummar!',
    fallen: [
        ['tukan', 'Det föll! Rakt ner i de mjuka löven.'],
        ['klo', 'Och här … en kakaofrukt. Till dig. Den föll också.'],
        ['tukan', 'Mjölkchoklad! Min favorit. Tack, Klo!']
    ],

    // P2 Mira's bridge
    klyft: [
        ['horse', 'En bro – men den är bara prickad.'],
        ['mira', 'Den ritade jag! Jag hann inte rita klart.'],
        ['alva', 'Min penna sitter kvar i dina hovar. Galoppera, så ritar du klart Miras bro!']
    ],
    thinRule: 'Miras streck är inte färdigt. Men Alvas penna sitter i mina hovar – i full galopp kan jag rita klart det!',
    thinSlow: 'För långsamt! Ofärdiga streck ritas klart i full galopp.',
    bridgeDone: [
        ['mira', 'Nu blev den hel! Tack, Sköldhästen!'],
        ['klo', 'På andra sidan börjar Djupa skogen.']
    ],
    skogArrive: [
        ['tukan', 'Där! På svampen! Ett ägg har studsat ända hit.']
    ],

    // P3 the waterfall
    fors: [
        ['tukan', 'Två ägg i grottan bakom forsen! Jag ser dem glimma.'],
        ['horse', 'Men forsen trycker bort allt som simmar.'],
        ['klo', 'Allt som simmar, ja. Men det som sjunker …?']
    ],
    forsPushed: 'Vattnet forsar ner och trycker mig tillbaka!',
    undertow: 'Strömmen längs botten tog mig rakt in bakom forsen!',
    caveEggs: [
        ['tukan', 'Två på en gång! Du är ett geni!'],
        ['klo', 'Ett skal som sjunker. Vetenskapligt bevisat.']
    ],

    // P4 the moonshine seeds
    seeds: [
        ['horse', 'Det är kolsvart där inne. Jag ser inte var jag sätter hovarna.'],
        ['tukan', 'Månskensblommor! Fröna i dem lyser – men bara när allt är alldeles stilla.'],
        ['klo', 'Och hör du? Det mullrar mest när det är som mörkast.']
    ],
    dark: 'För mörkt. Jag ser inte var jag sätter hovarna.',
    seedsShy: 'Blommorna slöt sig när jag rörde mig …',
    seedsLit: [
        ['tukan', 'De slår ut! Titta, de lysande fröna flyger in i grottan.'],
        ['tukan', 'Jag har forskat på månskensfrön i tre år.'],
        ['klo', 'Tre år! Vilken … uthållighet.']
    ],
    alvaSeeds: [['alva', 'Månskensfrön äter hon i stället för solrosfrön. Det har jag bestämt.']],

    // P5 the dung beetle
    beetle: [
        ['dyvel', 'Rör inte min boll! Det är världens finaste boll.'],
        ['tukan', 'Mitt ägg sitter fast mitt i den!'],
        ['dyvel', 'Jaså? Jag trodde det var en sten. En glänsande sten.']
    ],
    beetle2: [['klo', 'Bollen är gjord av jord. Och vad tvättar bort jord?']],
    beetleTalk: [['dyvel', 'Min boll ska bli den rundaste i hela skogen. Hmpf.']],
    beetleAfter: [['dyvel', 'Ja ja. Jag rullar en ny. En ännu finare.']],
    pushWrong: 'Bollen ska ner till floden. Jag får knuffa från andra sidan.',
    ballRoll: 'Den rullar! Rakt ner i floden!',
    washed: [
        ['tukan', 'Floden tvättade bort jorden. Där ligger mitt ägg!'],
        ['dyvel', 'Min boll! … Ja ja. Jag rullar en ny. En ännu finare.']
    ],

    // P6 Skatan and the gold coin
    magpie: [
        ['skata', 'Mina pärlor! Två glänsande pärlor! Ingen får röra dem.'],
        ['tukan', 'Det är inga pärlor! Det är mina ägg!'],
        ['skata', 'Jag byter bara mot något som glänser ännu mer.']
    ],
    magpie2: [
        ['tukan', 'Mitt guldmynt! Det skulle hon älska. Men stormen blåste ner det i Djuphålan.'],
        ['klo', 'Djuphålan – mitt i floden.'],
        ['alva', 'Tukankrabbor älskar allt som glänser. Pärlhalsband och guldmynt!']
    ],
    skataTalk: [['skata', 'Bara något som glänser mer än pärlor. Så är det med det.']],
    whirl: 'Virveln snurrar bort mig! Jag kommer inte ner.',
    coin: [
        ['horse', 'Skalet snurrade ända ner till botten – där låg guldmyntet!'],
        ['tukan', 'Mitt guldmynt! Nu kan vi byta med Skatan.']
    ],
    climb: [['klo', 'Skatans bo sitter högt upp. Grenarna går som trappsteg uppför stammen.']],
    trade: [
        ['skata', 'Åh! Det glänser som en liten sol!'],
        ['skata', 'Här, ta dina … ägg. De glänste nästan lika mycket.'],
        ['skata', 'Förresten: molnet uppe i Jätteträdet gråter varje natt. Det är därför det stormar.']
    ],
    tradeThanks: [['tukan', 'Två ägg! Och ett spår: molnet i Jätteträdet.']],

    // P7 the big leap
    leapSeen: [
        ['tukan', 'På andra sidan ravinen! Ett ägg i ett gammalt fågelbo.'],
        ['horse', 'Det är för långt att hoppa. Även för mig.'],
        ['klo', 'Om man galopperar nerför den fallna stammen går det fortare och fortare …']
    ],
    runupFirst: 'Inte tillräckligt fort! Jag behöver mer fart.',
    runup: 'Mer fart! Ta sats högst uppe på stammen och galoppera hela vägen ner.',
    leapDone: [
        ['horse', 'Stora språnget i skogen!'],
        ['klo', 'Ett nytt rekord! Det skriver jag upp direkt.'],
        ['alva', 'Oj! Det är det längsta språnget jag någonsin har sett!']
    ],
    vineAsk: [['tukan', 'Dra i lianen, så får vi en bro tillbaka!']],
    vineDone: 'Nu kommer vi tillbaka över ravinen.',

    // the giant tree and the cloud
    tree: [
        ['klo', 'Jätteträdet. Det högsta träd jag någonsin har sett.'],
        ['horse', 'Grenarna slingrar sig ända upp till kronan.']
    ],
    treeCloud: [
        ['klo', 'Jätteträdet! Skatan sa att molnet bor högst upp i kronan.'],
        ['horse', 'Grenarna slingrar sig ända upp. Vi klättrar!']
    ],
    crown: [
        ['moln', 'Snyft … Är det någon där? Det är så mörkt.'],
        ['horse', 'Det är du som stormar! Varför då?'],
        ['moln', 'Jag är rädd för mörkret. När jag blixtrar blir det ljust en liten stund.']
    ],
    crown2: [
        ['tukan', 'Hypotes: molnet stormar för att det är mörkt. Det stämmer med allt vi har sett!'],
        ['klo', 'Men varför är det så mörkt här?'],
        ['horse', 'För att det inte finns någon måne. Mira … du glömde att rita månen!']
    ],
    crown3: [
        ['mira', 'Oj! Jag tänkte rita den sist.'],
        ['alva', 'Rita den när alla äggen ligger i boet. Då kan de kläckas.'],
        ['moln', 'En måne? Får jag följa med er?']
    ],
    crownWait: [['horse', 'Först måste vi hitta alla tio äggen. Vänta här, lilla moln.']],
    crownGo: [['horse', 'Kom! Alla tio ägg är hittade. Vi går till boet.']],

    // the finale at the nest
    finale: [
        ['tukan', 'Alla tio! Lägg dem i sanden. Försiktigt, försiktigt.']
    ],
    finale2: [
        ['moln', 'Här är jag! Men det är fortfarande så mörkt …'],
        ['horse', 'Mira! Nu behöver vi månen.'],
        ['mira', 'Jag ritar den största månen som finns!']
    ],
    alvaStars: [['alva', 'Och jag ritar stjärnor runt månen!']],
    moonUp: [
        ['moln', 'Det är ljust! Jag är inte rädd längre.']
    ],
    moonCaption: 'Stormen tystnar. Månskenet faller över boet.',
    hatch: [
        ['tukan', 'De kläcks! Ett, två, tre … tio! Tio små forskare!'],
        ['klo', 'Tukankrabban … jag har något till dig. Det mest glänsande jag äger.']
    ],
    watchCaption: 'Professor Klo ger henne sitt stoppur.',
    gift: [
        ['tukan', 'Det glänser som månen! Och du får ett månskensfrö. Det lyser när det är stilla.'],
        ['tukan', 'Och den minsta ungen döper jag till Lilla Klo.'],
        ['klo', 'Lilla … Klo …']
    ],
    faint: [['horse', 'Han svimmade. Av lycka, tror jag.']],
    after: [['tukan', 'Utforska gärna skogen i månskenet. Nu lyser allt som glänser!']]
};

// thoughts and refusals (short notes above the horse; never block play)
export const BALK = {
    paper: 'Här tar sidan slut.',
    branch: 'Längre ut på grenen kommer jag inte.',
    edge: 'Det är för långt ner. Där hoppar jag inte!',
    dark: STORY.dark,
    thin: STORY.thinSlow,
    runup: STORY.runup
};

// ---------------------------------------------------------------------------
// Objectives, purposes and hints (three each: why, where, how)
// ---------------------------------------------------------------------------
export const GOALS = {
    eggs: (n, total) => `Hitta Tukankrabbans ägg (${n} av ${total})`,
    eggsWhy: 'Äggen kläcks bara i månsken – i boet på Sandbanken.',
    tree: 'Klättra upp i Jätteträdet',
    treeWhy: 'Skatan sa att molnet i kronan gråter varje natt.',
    nest: 'Gå tillbaka till boet på Sandbanken',
    nestWhy: 'Alla tio ägg ska ligga i sanden när Mira ritar månen.',
    lastEggs: (n, total) => `Hitta de sista äggen (${n} av ${total})`,
    lastWhy: 'Molnet väntar i kronan. Mira ritar månen när alla ägg ligger i boet.',
    free: 'Utforska den månljusa skogen',
    freeWhy: 'Forskningen fortsätter – tillsammans.'
};

export const HINTS = {
    dig: ['Något glimmar i sanden nära boet.', 'Ställ dig där det glimmar.', 'Gräv där det glimmar.'],
    p1: ['Ägget sitter för högt. Kan man få hela trädet att skaka?', 'Stocken under trädet är ihålig. Den låter som en trumma.',
        'Galoppera fram och tillbaka över stocken – hovarna trummar på rötterna.'],
    p2: ['Bron är bara ritad med prickar.', 'Dina hovar ritar när du springer riktigt fort.', 'Ta sats och galoppera ut på den prickade bron.'],
    p3: ['Forsen trycker bort allt som simmar. Men inte det som sjunker.', 'Längs botten under forsen rinner en ström in mot grottan.',
        'Göm dig i vattnet framför forsen. Skalet sjunker, och strömmen tar det med sig.'],
    p4: ['Månskensblommorna är blyga. De sluter sig så fort något rör sig.', 'Om du blir alldeles stilla bredvid dem vågar de kanske slå ut.',
        'Göm dig i skalet bredvid månskensblommorna och vänta en stund.'],
    p5: ['Bollen är gjord av jord. Vad tvättar bort jord?', 'Floden ligger precis nedanför backen.',
        'Ställ dig på andra sidan bollen och knuffa den mot floden.'],
    coin: ['Skatan vill ha något som glänser mer än pärlor. Tukankrabbans guldmynt?', 'Myntet ligger på botten av Djuphålan. Virveln snurrar bort den som simmar.',
        'Göm dig rakt ovanför virveln. Ett tungt skal snurrar ner mot mitten.'],
    trade: ['Nu har du myntet. Skatan bor högt upp i trädet.', 'Grenarna sitter som trappsteg. Hoppa från gren till gren.',
        'Ställ dig under nästa gren och hoppa rakt upp. Ge sedan myntet till Skatan.'],
    p7: ['Ravinen är för bred för en vanlig galopp.', 'Nerför den fallna stammen går det fortare och fortare.',
        'Ta sats högst upp på stammen och galoppera hela vägen ner.'],
    vine: ['Lianen hänger vid ravinens kant.', 'Ställ dig vid kanten, med nosen mot stammen.', 'Dra i lianen.'],
    tree: ['Följ grenarna uppåt runt stammen.', 'Där en gren tar slut sitter nästa gren strax ovanför.',
        'Stå stilla längst ut på grenen och hoppa rakt upp.'],
    nest: ['Boet ligger på Sandbanken, mitt på Flodstranden.', 'Gå tillbaka över Miras bro.', 'Gå fram till boet.'],
    more: ['Det finns fler ägg. Har du varit överallt?', 'Leta på båda sidorna i dagboken: Flodstranden och Djupa skogen.',
        'Prata med Tukankrabban eller Klo – de vet var nästa ägg är.']
};

/** Where each puzzle is, in words, for "the next egg is …" */
export const WHERE = {
    dig: 'i sanden nära boet', p1: 'i mjölkchokladträdet i Kakaolunden', p2: 'bortom Miras bro i väster',
    p3: 'bakom forsen längst österut', p4: 'i Rotgrottan i Djupa skogen', p5: 'i Tordyvelns boll på andra sidan floden',
    coin: 'hos Skatan i Skatträdet', trade: 'hos Skatan i Skatträdet', p7: 'på andra sidan ravinen i Djupa skogen',
    tree: 'i Jätteträdet', nest: 'i boet'
};
export const NEXT_EGG = where => `Jag tror att det ligger ett ägg ${where}.`;

export const CLUES = {
    moonRule: 'Tukankrabbans ägg kläcks bara i månsken, i den varma sanden i boet.',
    noMoon: 'Det finns ingen måne på den här sidan.',
    lightning: 'Blixtarna lyser upp skogen – som om någon vill se något.',
    darkStorm: 'Det mullrar mest när det är som mörkast.',
    cloudCries: 'Skatan säger att molnet i Jätteträdet gråter varje natt.',
    afraid: 'Molnet är rädd för mörkret. Därför stormar det.',
    moon: 'Mira ritade månen och Alva stjärnorna. Stormen tystnade och äggen kläcktes.'
};
export const CLUE_ORDER = ['moonRule', 'noMoon', 'lightning', 'darkStorm', 'cloudCries', 'afraid', 'moon'];

// tapping on a companion with nothing to say about the current goal
export const CHATTER = {
    klo: ['Jag antecknar allt. Särskilt … henne.', 'Häst eller sköldpadda? Jag forskar fortfarande.', 'Stoppuret tickar lika fort som mitt hjärta.'],
    tukan: ['Allt som glänser är intressant!', 'Ditt skal glänser! Nio av tio i glans.', 'Hypotes: ägg trivs bäst i varma skal.', 'Alva ritade mina klor. Är de inte fina?']
};
