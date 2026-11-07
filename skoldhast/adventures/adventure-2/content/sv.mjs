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
    stuckDone: 'Du är tillbaka på en trygg plats.',
    endingTitle: 'Tio små tukankrabbor!',
    endingBody: 'Du hittade alla tio äggen och hjälpte molnet som var rädd för mörkret. Mira ritade månen och Alva stjärnorna.',
    endingExplore: 'Utforska den månljusa skogen',
    drawCloud: 'Rita ett litet moln med Miras penna!',
    drawMoon: 'Rita månen med Miras penna! Följ prickarna.',
    drawEgg: 'Rita det första ägget med Alvas penna! Följ prickarna.',
    drawStars: 'Rita en stjärna med Alvas penna! Följ prickarna.',
    pages: { strand: 'Flodstranden', skog: 'Djupa skogen', kristall: 'Kristallgrottan', topp: 'Åsktoppen' },
    places: {
        nest: 'boet', grove: 'Kakaolunden', klyft: 'Klyftan', river: 'Glimmerfloden', deep: 'Djuphålan',
        beetle: 'Tordyvelbacken', magtree: 'Skatträdet', fors: 'Forsen', cave: 'grottan bakom forsen',
        arrive: 'svampen vid brons ände', seeds: 'Rotgrottan', tunnel: 'Rotgrottan', hill: 'kullen vid den fallna stammen',
        trunkTop: 'den fallna stammen', ledge: 'Ravinen', tree: 'Jätteträdet', crown: 'Jätteträdets krona',
        'k-arrive': 'Kristallgrottan', 'k-plates': 'Kristallklangen', 'k-lake': 'Kristallsjön', 'k-east': 'Kristallsjön',
        'k-beetle': 'dammen vid porten', 'k-gate': 'porten', 'k-spring': 'Källan',
        't-arrive': 'Åsktoppen', 't-wind': 'Vindkanten', 't-chasm': 'Blixtbron', 't-gap': 'Klippan', 't-climb': 'stigen mot toppen', 't-summit': 'Stormens öga'
    }
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
    miraBridge: 'Mira ritar en hängbro – men hon glömmer att rita klart den.',
    miraCloud: ['mira', 'Nu ritar jag ett moln. Ett litet moln med blixtar!'],
    cool: ['mira', 'Blixtar är det häftigaste som finns.'],
    evening: ['alva', 'Det blir kväll på sidan. Mira, du ritar väl månen sen?'],
    busy: ['mira', 'Mm … blixtar först!'],
    dark: 'Sidan blir mörk. Det lilla molnet mullrar …',
    cloudFlees: 'Det blixtrar – och molnet flyger iväg, bort mot bergen.',
    storm: '… och en storm blåser genom den magiska skogen.',
    eggsAway: ['mira', 'Alva! Äggen blåser iväg!'],
    gallopIn: 'Sköldhästen galopperar in på den nya sidan, och Professor Klo kilar efter.',
    // epilogue
    table: 'Vid Alvas bord.',
    miraMoon: ['mira', 'Mitt moln sover! Det har fått världens största nattlampa.'],
    alvaTeam: ['alva', 'Och tio små tukankrabbor kläcktes. Vi är ett bra forskarlag.'],
    marry: ['mira', 'Kan Klo och Tukankrabban gifta sig?'],
    research: ['alva', 'Forskning pågår.'],
    end: 'Slut – men forskningen fortsätter.'
};

// ---------------------------------------------------------------------------
// The story beats. Each line: [speaker, text]. Each array is at most three boxes.
// ---------------------------------------------------------------------------
export const STORY = {
    arrive: [
        ['tukan', 'Ett, två … noll! Stormen tog alla mina tio ägg – och mitt guldmynt!'],
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
    arrive3: [
        ['tukan', 'Mina ägg kläcks bara när månen går upp – i den varma sanden här i boet.'],
        ['horse', 'Månen? Men det finns ingen måne här.'],
        ['tukan', 'Den kommer. Den kommer alltid. Tror jag.']
    ],
    mystery: [
        ['horse', 'Men vem är det som stormar – och varför?'],
        ['tukan', 'Det ska vi forska på. Hypotes nummer ett: stormen kommer någonstans ifrån!'],
        ['klo', 'Briljant! Det hade jag aldrig kommit på.']
    ],
    digSeen: 'Något glimmar i sanden där borta!',
    firstEgg: [
        ['tukan', 'Det första ägget! Men om det ligger i boet blåser stormen bort det igen.'],
        ['horse', 'Jag bär äggen i mitt skal. Där har de det varmt och tryggt.'],
        ['klo', 'En äggkorg med hovar. Jag antecknar.']
    ],
    alvaFirstEgg: [
        ['alva', 'Ett av tio! Jag skriver upp det i forskningsdagboken.'],
        ['tukan', 'Alva, är det du som har ritat mig? Tack för tukanklorna!'],
        ['alva', 'Varsågod! Nu hittar vi de andra nio.']
    ],
    // a thought for each egg that has no scene of its own
    eggLine: {
        e3: 'Ett ägg på grenen! Tack, svampen.',
        e4: 'Ett ägg från sjöbotten! Det glittrar som kristallerna.',
        e6: 'Där var du ju, lilla ägg. Rent och fint.',
        e8: 'Ett ägg bakom porten! Tack för lånet, Tordyveln.',
        e9: 'Varmt och tryggt i skalet.',
        e10: 'Det glimmar som en pärla – men det är ett ägg!'
    },
    eggLines: [
        'Ett ägg till i skalet!', 'Varmt och tryggt i skalet.', 'Det glimmar som en pärla!',
        'Där var du ju, lilla ägg.', 'Välkommen in i skalet, lilla ägg.'
    ],
    allEggs: [['tukan', 'Tio! Alla tio! Nu behöver de bara en måne.']],
    allEggsHome: [['horse', 'Då går vi hem till boet. Molnet väntar där!']],

    // Klo is in love (after eggs 2, 4, 6 and 8)
    love: {
        2: [
            ['klo', 'Hennes klor … två små tukaner. Och båda ler mot mig!'],
            ['horse', 'Klo, dina klor skakar.'],
            ['klo', 'Det är … stormen. Jag fryser.']
        ],
        4: [
            ['klo', 'Jag mätte mina hjärtslag med stoppuret. Hundrafyrtio slag i minuten!'],
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
        ['klo', 'Jag hör inte. Det är … stormen. Den mullrar så.']
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
        ['horse', 'En bro – men den är bara streckad.'],
        ['mira', 'Den ritade jag! Men jag glömde att rita klart den.'],
        ['alva', 'Min penna sitter kvar i dina hovar. Galoppera, så ritar du klart Miras bro!']
    ],
    thinRule: 'Det håller inte än! I full galopp ritar hovarna klart Miras streck.',
    thinSlow: 'För långsamt! Ofärdiga streck ritas klart i full galopp.',
    bridgeDone: [
        ['mira', 'Nu blev den hel! Tack, Sköldhästen!'],
        ['klo', 'På andra sidan börjar Djupa skogen.']
    ],
    // P9 the bouncing mushroom (where Mira's bridge comes down)
    skogArrive: [
        ['tukan', 'Där uppe på grenen! Ett ägg!'],
        ['horse', 'Så högt kan jag inte hoppa.'],
        ['klo', 'Den där svampen ser mjuk ut. Som en studsmatta …']
    ],
    bounce: 'Hoppsan! Svampen kastade upp mig!',

    // P3 the waterfall, and the passage into the mountain behind it
    fors: [
        ['tukan', 'Forsen! Någonstans bakom den går en gång in i berget.'],
        ['horse', 'Men forsen trycker bort allt som simmar.'],
        ['klo', 'Allt som simmar, ja. Men det som sjunker …?']
    ],
    forsKnown: [['tukan', 'Forsen! Det är här bakom som gången in i berget ska finnas.']],
    miraRiver: [['mira', 'Floden ritade jag med min allra blåaste penna!']],
    miraFors: [['mira', 'Forsen blev min finaste. Hör hur den brusar!']],
    forsPushed: 'Vattnet forsar ner och trycker mig tillbaka!',
    undertow: 'Strömmen längs botten tog mig rakt in bakom forsen!',
    caveDark: [
        ['horse', 'Bakom forsen! Och här går en gång rakt in i berget.'],
        ['tukan', 'Men där inne är det kolsvart. Vi behöver något som lyser.']
    ],
    caveLit: [
        ['horse', 'Bakom forsen! Och här går en gång rakt in i berget.'],
        ['tukan', 'Där inne är det kolsvart. Kom, månskensfröet visar vägen!']
    ],
    caveLitBack: [['tukan', 'Nu har vi vår lykta! Kom, månskensfröet visar vägen in i berget.']],
    darkCave: 'Gången in i berget är kolsvart. Jag behöver ljus.',

    // P4 the moonshine seeds
    seeds: [
        ['tukan', 'Månskensblommor! De slår bara ut när allt är alldeles stilla – och då lyser fröna.'],
        ['klo', 'Och hör du? Det mullrar mest när det är som mörkast.'],
        ['tukan', 'Hypotes nummer två: stormen är värst när det är som mörkast!']
    ],
    dark: 'För mörkt. Jag ser inte var jag sätter hovarna.',
    seedsShy: 'Blommorna slöt sig när jag rörde mig …',
    seedsWatched: 'Blommorna tittar på mig. De vågar inte slå ut när de ser mig …',
    seedsLit: [
        ['tukan', 'De slår ut! Titta, de lysande fröna flyger in i grottan.'],
        ['tukan', 'Jag tar med ett frö som lykta. Det lyser var vi än går.'],
        ['klo', 'En lykta! Nu kan vi gå in där det är kolsvart.']
    ],
    seedsLit2: [
        ['tukan', 'Jag har forskat på månskensfrön i tre år. Mest genom att äta dem.'],
        ['klo', 'Tre år! Vilken … uthållighet.']
    ],
    alvaSeeds: [['alva', 'Månskensfrön äter hon i stället för solrosfrön. Det har jag bestämt.']],

    // P5 the dung beetle
    beetle: [
        ['dyvel', 'Rör inte min boll! Det är världens finaste boll.'],
        ['tukan', 'Mitt ägg sitter fast mitt i den!'],
        ['dyvel', 'Jaså? Jag trodde det var en sten. En glänsande sten.']
    ],
    beetle2: [
        ['dyvel', 'Hmpf. Ta ägget, då. Om ni får loss det.'],
        ['klo', 'Bollen är gjord av jord. Och vad tvättar bort jord?']
    ],
    beetleTalk: [['dyvel', 'Min boll ska bli den rundaste i hela skogen. Hmpf.']],
    beetleAfter: [['dyvel', 'Hmpf. Stör mig inte. Jag tänker ut en ny boll – en ännu finare.']],
    washedLate: [['dyvel', 'Min boll! Nu är båda borta … Ja ja. Jag rullar en ny. En ännu finare.']],
    pushWrong: 'Bollen ska ner till floden. Jag får knuffa från andra sidan.',
    ballRoll: 'Den rullar! Rakt ner i floden!',
    washed: [
        ['tukan', 'Floden tvättade bort jorden. Där ligger mitt ägg!'],
        ['dyvel', 'Min boll! … Ja ja. Jag rullar en ny. En ännu finare.']
    ],

    // P6 Skatan and the gold coin
    magpie: [
        ['skata', 'Min pärla! En stor, glänsande pärla! Ingen får röra den.'],
        ['tukan', 'Det är ingen pärla! Det är mitt ägg!'],
        ['skata', 'Jag byter bara mot något som glänser ännu mer.']
    ],
    magpie2: [
        ['tukan', 'Mitt guldmynt! Det skulle hon älska. Jag såg stormen blåsa ner det i Djuphålan.'],
        ['klo', 'Djuphålan – mitt i floden.'],
        ['alva', 'Tukankrabbor älskar allt som glänser. Pärlhalsband och guldmynt!']
    ],
    magpieCoin: [['tukan', 'Något som glänser mer? Vi har ju mitt guldmynt!']],
    skataTalk: [['skata', 'Bara något som glänser mer än pärlor. Så är det med det.']],
    skataAfter: [['skata', 'Guldmyntet klär mig, eller hur? Nästan lika fint som mina fjädrar.']],
    whirl: 'Virveln snurrar bort mig! Jag kommer inte ner.',
    coin: [
        ['horse', 'Skalet snurrade ända ner till botten – där låg guldmyntet!'],
        ['tukan', 'Mitt guldmynt! Nu kan vi byta med Skatan.']
    ],
    coinEarly: [
        ['horse', 'Skalet snurrade ända ner till botten – där låg guldmyntet!'],
        ['tukan', 'Mitt guldmynt! Det glänser nästan som ett ägg.']
    ],
    climb: [['klo', 'Skatans bo sitter högt upp. Grenarna går som trappsteg uppför stammen.']],
    trade: [
        ['skata', 'Åh! Det glänser som en liten sol!'],
        ['skata', 'Här, ta ditt … ägg. Det glänser nästan lika fint.'],
        ['skata', 'Förresten: jag har hört ett moln gråta högt uppe i stormen. Det låter så sorgligt.']
    ],
    tradeThanks: [['tukan', 'Mitt ägg! Och ett spår: ett moln som gråter.']],
    tradeThanksLate: [['tukan', 'Mitt ägg! Tack, Skatan.']],

    // P7 the big leap
    leapSeen: [
        ['tukan', 'På andra sidan ravinen! Ett ägg i ett gammalt fågelbo.'],
        ['horse', 'Det är för långt att hoppa. Även för mig.'],
        ['klo', 'Om man galopperar nerför den fallna stammen går det fortare och fortare …']
    ],
    runupFirst: 'Inte tillräckligt fort! Jag behöver mer fart.',
    runup: 'Mer fart! Ta sats högst uppe på stammen och galoppera hela vägen ner.',
    leapDone: [
        ['horse', 'Jag flög! Nästan i alla fall.'],
        ['klo', 'Ett nytt rekord! Det skriver jag upp direkt.'],
        ['alva', 'Oj! Det är det längsta språnget jag någonsin har sett!']
    ],
    vineAsk: [['tukan', 'Vi kommer inte över! Dra i lianen, så får vi en bro.']],
    vineDone: 'Nu kommer vi tillbaka över ravinen.',

    // the giant tree: from its crown the storm's source can be seen
    tree: [
        ['klo', 'Jätteträdet! Kronan syns inte ens härifrån.'],
        ['horse', 'Grenarna slingrar sig ända upp till kronan. Där uppe ser man nog var stormen kommer ifrån.']
    ],
    source: [
        ['klo', 'Här uppifrån ser man hela den magiska skogen!'],
        ['horse', 'Och där borta, bakom forsen … ett berg där stormen snurrar!'],
        ['tukan', 'Åsktoppen! Hypotes nummer ett stämmer: stormen kommer därifrån!']
    ],
    sourceMira: [
        ['mira', 'Mitt lilla moln … Är det mitt moln som stormar?'],
        ['alva', 'Det får vi ta reda på. Det är det forskare gör.']
    ],
    sourceDark: [
        ['alva', 'Vägen till Åsktoppen går genom berget, och där inne är det kolsvart.'],
        ['tukan', 'Månskensfrön lyser i mörker! Det växer månskensblommor i Rotgrottan.']
    ],
    sourceLit: [['tukan', 'Det sägs att en gång bakom forsen leder in i berget. Och vi har vår lykta!']],
    // the crown after the dark cave: they have stood in that passage themselves
    sourceLitKnown: [['tukan', 'Gången bakom forsen leder in i berget! Och nu har vi vår lykta.']],
    sourceLate: [
        ['klo', 'Här uppifrån ser man hela den magiska skogen!'],
        ['horse', 'Och där borta bakom forsen: berget vi var inne i! Stormen snurrar runt toppen.'],
        ['tukan', 'Åsktoppen! Hypotes nummer ett stämmer: stormen kommer därifrån!']
    ],
    sourceLateGo: [['tukan', 'Vägen dit har vi redan hittat. Tillbaka in i berget!']],
    sourceAfter: [
        ['klo', 'Här uppifrån ser man hela den magiska skogen!'],
        ['horse', 'Och där borta ligger Åsktoppen. Där satt molnet alldeles ensamt.'],
        ['mira', 'Nu är mitt moln inte ensamt längre. Snart får det sin måne!']
    ],

    // Kristallgrottan
    kristall: [
        ['tukan', 'Kristallgrottan! Här inne ska vi … Åh! Det glittrar där. Och där. Och där!'],
        ['horse', 'Tukankrabban? Stormen, du vet. Vi letar efter stormen.'],
        ['klo', 'Hör ni? Det mullrar högt ovanför oss. Stormen är nära.']
    ],
    plates: [
        ['alva', 'Kristaller ringer som klockor när man rör vid dem.'],
        ['tukan', 'Och klyftan där framme är kolsvart. Kan kristallerna lysa upp den?'],
        ['klo', 'Titta, en av dem blinkar. Som om den väntar på sin tur.']
    ],
    crystalRing: 'Kristallen klingar under hovarna!',
    crystalSoft: 'Den klingar bara lite. Jag behöver mer fart.',
    crystalWait: 'Den här väntar. Det är den som blinkar som vill ha hovar.',
    crystalOne: 'En kristall lyser – och nu blinkar en annan!',
    crystalAll: 'Alla tre lyser – och över klyftan syns en streckad bro!',
    chasm: 'Klyftan är kolsvart. Jag ser inte var jag ska sätta hovarna.',
    k1Done: [
        ['tukan', 'En bro av kristall! Den klingar när du går på den.'],
        ['klo', 'Pling, plong! Du spelar ju xylofon med hovarna.']
    ],
    lake: [
        ['horse', 'Sjön tar slut vid en klippvägg. Hur kommer vi förbi?'],
        ['tukan', 'Under väggen går det strömmar. På botten ligger tre kristaller: en vit, en blå och en grön.'],
        ['klo', 'Vit som ett ägg … Det kanske betyder något.']
    ],
    rush: 'Vattnet under väggen forsar emot mig!',
    rescued: 'Hoppsan! Där höll jag på att ramla rakt ut ur sidan.',
    loopBack: 'Den strömmen gick i en ring, tillbaka hit! Jag simmar ner och väljer kristall.',
    throughWall: [['horse', 'Den vita strömmen tog mig rakt under väggen!']],
    glitter: [
        ['dyvel', 'Du igen! Jag rullade min nya boll ända hit in i berget. En glitterboll!'],
        ['tukan', 'Åh! Får jag forska på den? Bara lite? Bara en vecka?'],
        ['dyvel', 'Hmpf. Ni får låna den. Men akta glittret.']
    ],
    glitterEarly: [['dyvel', 'Du igen! Det här är min andra boll. Jag rullade den ända hit in i berget. En glitterboll!']],
    glitterTalk: [['dyvel', 'Akta glittret, sa jag. Bollen är nyrullad.']],
    glitterAfter: [['dyvel', 'En plattboll. Hmpf. Den rundaste i hela dammen, i alla fall.']],
    glitter2: [['klo', 'Porten där borta öppnas nog om båda plattorna i dammen trycks ner.']],
    glitterRoll: 'Bollen rullar ner i dammen …',
    glitterIn: 'Glitterbollen ligger på den ena plattan!',
    plateAlone: 'Plattan sjönk lite … men porten öppnas bara om båda plattorna trycks ner.',
    gateOpen: [
        ['horse', 'Porten öppnas!'],
        ['tukan', 'Ett ägg! Och där bakom bubblar en källa uppåt.'],
        ['dyvel', 'Min glitterboll ligger kvar i dammen. Ja ja. Nu är den en plattboll.']
    ],
    spring: [['klo', 'Källan stiger upp genom berget. Ett skal som ligger stilla flyter nog med.']],
    springFall: 'Vattnet faller ner längs kanterna och trycker ner mig.',

    // Åsktoppen
    topp: [
        ['horse', 'Källan kastade upp oss … ända upp på berget!'],
        ['tukan', 'Åsktoppen. Här blåser det som värst.'],
        ['klo', 'Och högst upp snurrar stormen. Där får vi svar på vår fråga.']
    ],
    // the top before the crown: hypothesis one is confirmed here instead
    toppFirst: [
        ['horse', 'Källan kastade upp oss … ända upp på berget!'],
        ['tukan', 'Åsktoppen! Hypotes nummer ett stämmer: stormen kommer härifrån!'],
        ['klo', 'Och högst upp snurrar stormen. Där får vi svar på vår fråga.']
    ],
    gustSoon: 'Det viner i gräset – en vindby kommer!',
    blown: ['Vinden knuffar mig bakåt! Nästa gång gömmer jag mig.', 'Manen står rakt ut. Jag ser ut som en flagga.', 'Det här räknas inte som galopp.'],
    windKlo: [
        ['klo', 'Ta min klo, Tukankrabban! Jag håller i dig.'],
        ['tukan', 'Min hjälte! Du fladdrar rakt ut som en vimpel.'],
        ['klo', 'Det är … en vetenskaplig flygning.']
    ],
    windTip: 'I skalet blåser jag inte bort. Jag gömmer mig när det viner.',
    blixtbro: [
        ['horse', 'Ett stup! Och ingen bro.'],
        ['klo', 'Vänta … titta när det blixtrar! Där syns en bro av ljus.'],
        ['mira', 'Mina blixtar ritar en bro! Galoppera när det blixtrar!']
    ],
    storm: 'I mörkret syns ingen bro. Jag väntar på nästa blixt!',
    t2Done: [
        ['alva', 'Du ritade bron i blixtens sken. Snyggt gjort!'],
        ['tukan', 'Åh, en bro som glänser! Får jag forska på den? Bara lite? Bara en vecka?'],
        ['horse', 'Tukankrabban. Stormen.']
    ],
    medvind: [
        ['tukan', 'Hypotes nummer tre: om stormen snurrar, blåser den åt andra hållet här uppe!'],
        ['klo', 'Briljant! Det hade jag inte heller kommit på.'],
        ['horse', 'Och stigen tar slut där framme. Så långt kan ingen hoppa.']
    ],
    tailHidden: 'Vinden susar förbi skalet. Om jag stod upp skulle den ta mig med …',
    carried: 'Vinden tar tag i mig – men nu blåser den framåt!',
    windCarried: [
        ['horse', 'Vinden bar mig över! Det där räknas som flygning.'],
        ['klo', 'Mätning klar: hypotes tre stämmer. Vindstyrka: väldigt.'],
        ['tukan', 'Hör ni? Det låter som om någon gråter där uppe.']
    ],
    summit: [
        ['moln', 'Snyft … Är det någon där? Det är så mörkt överallt.'],
        ['horse', 'Det är du som stormar! Men … du är ju rädd?'],
        ['moln', 'Jag är rädd för mörkret. När jag blixtrar blir det ljust en liten stund.']
    ],
    summit2: [
        ['tukan', 'Hypotes nummer två stämmer! Du blixtrar för att kunna se – därför stormar det mest i mörkret.'],
        ['klo', 'Men varför är det så mörkt på den här sidan?'],
        ['horse', 'För att det inte finns någon måne. Mira … du ritade aldrig månen.']
    ],
    summit3: [
        ['mira', 'Mitt lilla moln! Förlåt – jag ritade blixtar och glömde din måne.'],
        ['alva', 'Det är ingens fel. Vi ritar månen när alla ägg ligger i boet – de kläcks bara när den går upp.'],
        ['moln', 'En måne … Då blir det ljust på riktigt?']
    ],
    summit4: [
        ['moln', 'Förlåt för stormen. Här – jag har passat ett ägg åt er. Det blåste ända hit upp.'],
        ['tukan', 'Mitt ägg! Du har hållit det varmt i stormen.'],
        ['moln', 'Hoppa upp på mig. Jag bär er hem!']
    ],
    rideCaption: 'Molnet bär dem hem över hela den magiska skogen.',
    homeWait: [
        ['horse', 'Nu vet vi varför det stormar. Men några ägg saknas fortfarande.'],
        ['moln', 'Jag väntar här ovanför boet. Och jag ska försöka låta bli att blixtra.']
    ],

    // the finale at the nest
    finale: [
        ['tukan', 'Alla tio! Lägg dem i sanden. Försiktigt, försiktigt.'],
        ['horse', 'Ut ur skalet nu, små ägg. Det har varit fint att bära er.']
    ],
    gather: [
        ['skata', 'Jag hörde att något glänsande skulle hända här.'],
        ['dyvel', 'Hmpf. Jag ville bara se. Inte för att jag bryr mig.'],
        ['moln', 'Nu är alla här. Men det är fortfarande så mörkt …']
    ],
    forgive: [
        ['tukan', 'Du var bara rädd, lilla moln. Nu är du en av oss.'],
        ['horse', 'Alla är rädda ibland. Jag gömmer mig i skalet – och du blixtrar.']
    ],
    finale2: [
        ['horse', 'Mira! Nu behöver vi månen.'],
        ['mira', 'Den här är till dig, lilla moln. Den största månen som finns!']
    ],
    alvaStars: [['alva', 'Och jag ritar stjärnor runt månen!']],
    moonUp: [
        ['moln', 'Det är ljust! Jag är inte rädd längre.'],
        ['tukan', 'Vad var det jag sa? Den kommer alltid. Tror jag.']
    ],
    moonCaption: 'Stormen tystnar. Månskenet faller över boet.',
    hatch: [
        ['tukan', 'De kläcks! Ett, två, tre … tio! Tio små forskare!'],
        ['klo', 'Tukankrabban … jag har något till dig. Det mest glänsande jag äger.']
    ],
    watchCaption: 'Professor Klo ger henne sitt stoppur.',
    gift: [
        ['tukan', 'Det glänser som månen! Här är vår lykta. Den lyser starkast när dina klor är stilla.'],
        ['tukan', 'Och den minsta ungen döper jag till Lilla Klo.'],
        ['klo', 'Lilla … Klo …']
    ],
    faint: [['horse', 'Han svimmade. Av lycka, tror jag.']],
    skataGift: [
        ['skata', 'Här, små ungar. Varje ny forskare behöver något som glänser.'],
        ['tukan', 'Mitt guldmynt! Tack, Skatan – du glänser mest av alla.']
    ],
    after: [['tukan', 'Tack för att du ritade mig, Alva. Nu forskar vi i månskenet – allt glänser!']],
    // after the story (easter eggs): the ten little researchers follow the sköldhäst; Molnet lightens for joy
    hatchlingsFollow: [['tukan', 'De forskar på dig! Tio små forskare i rad – och Lilla Klo går först.']],
    molnJoy: [['moln', 'Nu blixtrar jag för att det är roligt – inte för att jag är rädd!']],
    // Tordyveln's finest ball yet, rolled from the hatched eggs' shells; and Skatan, who copies a whinny
    dyvelShells: [
        ['dyvel', 'Hmpf. Titta inte. Jag rullade en ny boll av äggskalen.'],
        ['dyvel', 'Den finaste hittills. Inte för att jag bryr mig.']
    ],
    dyvelShellsAgain: [['dyvel', 'Den är fortfarande den finaste. Hmpf.']],
    // Djupa skogen after the story: the mushroom giggles when it bounces you up
    mushroomGiggle: [
        ['tukan', 'Hörde ni? Svampen fnissar!'],
        ['klo', 'Hypotes nummer fyra: svampar är kittliga. Det antecknar jag.']
    ],
    // Åsktoppen after the story: a star falls from Alva's stars over Stormens öga
    starFall: [
        ['tukan', 'Ett stjärnfall! Det lossnade från Alvas stjärnor.'],
        ['klo', 'Då får man önska något. Jag önskar … nej. Det är vetenskapligt hemligt.']
    ],
    // Utsiktskullen after the story: a rocket flies off into space (a glimpse of the next adventure)
    rocket: [['horse', 'Titta! En raket!']],
    rocketAfter: [
        ['horse', 'Tänk hur det skulle vara att åka ut i rymden …'],
        ['klo', 'Rymden! Dit har ingen krabba forskat förut.'],
        ['tukan', 'Där uppe glänser allt. Det måste vi forska på!']
    ],
    // Kakaolunden after the story: the log is still a drum, and Klo still gives her the cocoa fruit
    cocoaAgain: [
        ['klo', 'En kakaofrukt till! Den är till dig … igen.'],
        ['tukan', 'Mjölkchoklad! Du kom ihåg min favorit, Klo.'],
        ['klo', 'Självklart. Det står i anteckningsboken. Bredvid diagrammen.']
    ],
    skataMimic: [['skata', 'Gnägg! … Hmm, nej. Det klär mig inte. Jag håller mig till mitt eget.']],
    // Häst eller sköldpadda? Klo says a word as a measurement goes into his notebook (a bubble: play goes on), as in
    // Äventyr 1, and once the story is over he gives his conclusion when he is talked to
    measure: {
        firstHorse: ['klo', 'Hovar! Jag antecknar en hästsak.'],
        firstTurtle: ['klo', 'Skalet igen! Jag antecknar en sköldpaddssak.'],
        leap: ['klo', 'Längre än någon sköldpadda har hoppat! En hästsak, utan tvekan.'],
        even: ['klo', 'Det står lika. Mer forskning behövs!']
    },
    measureEnd: [
        ['klo', 'Häst eller sköldpadda? Nu har jag räknat färdigt.'],
        ['klo', 'Slutsats: både häst och sköldpadda – och båda behövdes i den magiska skogen.']
    ]
};

// thoughts and refusals (short notes above the horse; never block play)
export const BALK = {
    paper: 'Här tar sidan slut.',
    branch: 'Längre ut på grenen kommer jag inte.',
    edge: 'Det är för långt ner. Där hoppar jag inte!',
    windGap: 'För långt att hoppa. Men här blåser det ju åt rätt håll …',
    slow: 'Jag behöver mer fart för det här språnget.',
    dark: STORY.dark,
    darkCave: STORY.darkCave,
    chasm: STORY.chasm,
    storm: STORY.storm,
    gate: 'Porten är stängd.',
    thin: STORY.thinSlow,
    runup: STORY.runup
};

// ---------------------------------------------------------------------------
// Objectives, purposes and hints (three each: why, where, how)
// ---------------------------------------------------------------------------
export const GOALS = {
    eggs: (n, total) => `Hitta Tukankrabbans ägg (${n} av ${total})`,
    eggsWhy: 'Äggen kläcks bara när månen går upp – i boet på Sandbanken.',
    peak: 'Ta dig upp till Åsktoppen',
    peakWhy: 'Där snurrar stormen. Vägen går genom berget bakom forsen.',
    peakInside: 'Där snurrar stormen. Vi är inne i berget – fortsätt uppåt.',
    summit: 'Klättra upp till stormens öga',
    summitWhy: 'Där får vi svar på vår fråga: vem stormar – och varför?',
    peakDark: 'Där snurrar stormen. Inne i berget är det kolsvart – månskensfröna i Rotgrottan lyser.',
    lastEggs: (n, total) => `Hitta de sista äggen (${n} av ${total})`,
    lastWhy: 'Molnet väntar ovanför boet. Mira ritar månen när alla ägg ligger där.',
    nest: 'Gå tillbaka till boet på Sandbanken',
    nestWhy: 'Alla tio ägg ska ligga i sanden när Mira ritar månen.',
    free: 'Utforska den månljusa skogen',
    freeWhy: 'Forskningen fortsätter – tillsammans.'
};

export const HINTS = {
    // once a puzzle has freed its egg but it has not been picked up yet
    pickup: ['Nu ligger ägget fritt – spring och hämta det!'],
    dig: ['Något glimmar i sanden nära boet.', 'Ställ dig där det glimmar.', 'Gräv där det glimmar.'],
    p1: ['Ägget sitter för högt. Kan man få hela trädet att skaka?', 'Stocken under trädet är ihålig. Den låter som en trumma.',
        'Galoppera fram och tillbaka över stocken – hovarna trummar på rötterna.'],
    p2: ['Bron är bara streckad.', 'Dina hovar ritar när du springer riktigt fort.', 'Ta sats och galoppera ut på den streckade bron.'],
    mush: ['Ägget ligger på grenen ovanför svampen.', 'Svampen är mjuk som en studsmatta.', 'Hoppa upp på svampen, så kastar den upp dig till grenen.'],
    p3: ['Forsen trycker bort allt som simmar. Men inte det som sjunker.', 'Längs botten under forsen rinner en ström in mot grottan.',
        'Göm dig i vattnet framför forsen. Skalet sjunker, och strömmen tar det med sig.'],
    cave: ['Gången in i berget är kolsvart.', 'Du behöver något som lyser i mörkret.', 'Månskensfröna i Rotgrottan i Djupa skogen lyser. Ta med ett.'],
    p4: ['Månskensblommorna är blyga. De sluter sig så fort något rör sig.', 'Om du blir alldeles stilla bredvid dem vågar de kanske slå ut.',
        'Göm dig i skalet bredvid månskensblommorna och vänta en stund.'],
    p5: ['Bollen är gjord av jord. Vad tvättar bort jord?', 'Floden ligger precis nedanför backen.',
        'Ställ dig på andra sidan bollen och knuffa den mot floden.'],
    coin: ['Skatan vill ha något som glänser mer än pärlor. Guldmyntet kanske?', 'Myntet ligger på botten av Djuphålan. Virveln snurrar bort den som simmar.',
        'Göm dig rakt ovanför virveln. Ett tungt skal snurrar ner mot mitten.'],
    trade: ['Nu har du myntet. Skatan bor högt upp i trädet.', 'Grenarna sitter som trappsteg. Hoppa från gren till gren.',
        'Ställ dig under nästa gren och hoppa rakt upp. Ge sedan myntet till Skatan.'],
    p7: ['Ravinen är för bred för en vanlig galopp.', 'Nerför den fallna stammen går det fortare och fortare.',
        'Ta sats högst upp på stammen och galoppera hela vägen ner.'],
    vine: ['Lianen hänger vid ravinens kant.', 'Ställ dig vid kanten, med nosen mot ravinen.', 'Dra i lianen.'],
    source: ['Var kommer stormen ifrån?', 'Från ett högt ställe ser man långt.', 'Klättra upp i Jätteträdets krona och titta ut över skogen.'],
    tree: ['Följ grenarna uppåt runt stammen.', 'Där en gren tar slut sitter nästa gren strax ovanför.',
        'Stå stilla längst ut på grenen och hoppa rakt upp.'],
    k1: ['Kristallerna i golvet klingar när man rör vid dem. En av dem blinkar.', 'Bara den som blinkar lyser upp. Sedan blinkar nästa, kanske bakom dig.',
        'Galoppera över den som blinkar, tills alla tre lyser. Rita sedan bron i full galopp.'],
    k2: ['Under väggen går tre strömmar. Bara en av dem går hela vägen.', 'Vit som ett ägg … Vilken kristall liknar äggen?',
        'Göm dig vid den vita kristallen på botten. Strömmen tar skalet under väggen.'],
    k3: ['Porten öppnas när båda plattorna i dammen trycks ner.', 'Glitterbollen är tung. Den kan ligga på en av plattorna.',
        'Knuffa bollen ner i dammen. Göm dig sedan på den andra plattan.'],
    spring: ['Källan stiger rakt uppåt genom berget.', 'Den som simmar trycks ner. Men ett skal som ligger stilla …',
        'Göm dig i dammen under källan. Strömmen bär skalet uppåt.'],
    t1: ['Vindbyarna knuffar dig bakåt.', 'I skalet blåser du inte bort. Bakom stenarna är det lä.',
        'Göm dig när det viner, och gå vidare när det är lugnt.'],
    t2: ['Bron syns bara när det blixtrar.', 'Ta sats och vänta på nästa blixt.', 'Galoppera ut på bron precis när det blixtrar.'],
    t3: ['Här uppe blåser vinden åt andra hållet: mot toppen.', 'I skalet står du emot vinden. Men här vill du ju följa med den.',
        'Göm dig inte! Stå vid kanten tills vindbyn kommer och tar dig med.'],
    summit: ['Stormen snurrar högst upp på toppen.', 'Följ stigen uppför berget.', 'Gå upp till toppen, där det är alldeles lugnt.'],
    nest: ['Boet ligger på Sandbanken, mitt på Flodstranden.', 'Sandbanken ligger mellan Kakaolunden och floden.', 'Gå fram till boet.'],
    more: ['Det finns fler ägg. Har du varit överallt?', 'Titta på kartan i dagboken: där står hur många ägg varje plats har kvar.',
        'Gå till en plats på kartan där det fattas ägg, och fråga mig igen där.']
};

/** Where each puzzle is, in words, for "the next egg is …" */
export const WHERE = {
    dig: 'i sanden nära boet', p1: 'i mjölkchokladträdet i Kakaolunden', p2: 'bortom Miras bro i väster',
    mush: 'på en gren ovanför svampen i Djupa skogen', p4: 'i Rotgrottan i Djupa skogen', p5: 'i Tordyvelns boll på andra sidan floden',
    coin: 'hos Skatan i Skatträdet', coinDeep: 'hos Skatan – och guldmyntet hon vill ha ligger i Djuphålan', trade: 'hos Skatan i Skatträdet', p7: 'på andra sidan ravinen i Djupa skogen',
    k2: 'under klippväggen i Kristallsjön', k3: 'bakom porten i Kristallgrottan', summit: 'högst upp på Åsktoppen',
    tree: 'i Jätteträdet', nest: 'i boet'
};
export const NEXT_EGG = where => `Jag tror att det ligger ett ägg ${where}.`;

export const CLUES = {
    moonRule: 'Tukankrabbans ägg kläcks bara när månen går upp, i den varma sanden i boet.',
    noMoon: 'Det finns ingen måne på den här sidan.',
    lightning: 'Blixtarna lyser upp skogen – som om någon vill se något.',
    darkStorm: 'Det mullrar mest när det är som mörkast.',
    cloudCries: 'Skatan har hört ett moln gråta högt uppe i stormen.',
    source: 'Stormen kommer från Åsktoppen, berget bakom forsen.',
    lantern: 'Ett månskensfrö lyser som en lykta i mörkret.',
    afraid: 'Molnet är rädd för mörkret. Därför blixtrar det – och därför stormar det.',
    moon: 'Mira ritade månen och Alva stjärnorna. Stormen tystnade och äggen kläcktes.'
};
export const CLUE_ORDER = ['moonRule', 'noMoon', 'lightning', 'darkStorm', 'cloudCries', 'source', 'lantern', 'afraid', 'moon'];

// ---------------------------------------------------------------------------
// The research notebook: Forskningsdagbok – Den magiska skogen (ui.mjs journal). Read, not heard: nothing here is
// recorded. Its pages: the title page, what we know now (the mission, the eggs, Klo's notes), the map, the question
// with Tukankrabban's numbered hypotheses, what we have found out, and the secrets found after the story.
// ---------------------------------------------------------------------------
export const NOTEBOOK = {
    head: 'Forskningsdagbok – Den magiska skogen',
    title: 'Forskningsdagbok',
    subtitle: 'Den magiska skogen',
    team: 'Forskarlaget: Sköldhästen, Professor Klo och Tukankrabban',
    tabs: ['Framsida', 'Vad vet vi?', 'Kartan', 'Frågan', 'Mätningar', 'Det vet vi', 'Hemligt'],
    mission: 'Vårt uppdrag', why: 'Därför', next: 'Nästa steg',
    eggs: 'Tukankrabbans ägg', eggsAria: (n, total) => `${n} av ${total} ägg hittade`,
    hatched: 'Tio små tukankrabbor', lillaKlo: 'Lilla Klo',
    hatchedAria: 'Tio kläckta tukankrabbor. Den minsta är Lilla Klo.',
    hint: 'Visa en ledtråd', hintMore: 'En ledtråd till', hintsAll: 'Mer vet jag inte här. Prova!',
    noteFrom: 'Klos lapp',
    // the map
    map: 'Kartan', mapUnknown: '?', mapEggs: (n, t) => `${n} av ${t} ägg`, mapEggsUnknown: '? ägg', mapHere: 'Här är vi',
    mapAria: (lines) => `Kartan: ${lines}`,
    here: place => `Här är vi: ${place}`,
    // the question, and Tukankrabban's hypotheses as the story numbers them
    question: 'Frågan', questionText: 'Vem är det som stormar – och varför?',
    answer: 'Svaret', answerText: 'Det är Molnet som stormar. Det är rädd för mörkret och blixtrar för att kunna se.',
    answerMoon: 'Nu har Mira ritat månen. Molnet är inte rädd längre – det blixtrar bara av glädje.',
    hypotheses: 'Tukankrabbans hypoteser',
    hyp: [
        ['Hypotes nummer ett', 'Stormen kommer någonstans ifrån.'],
        ['Hypotes nummer två', 'Stormen är värst när det är som mörkast.'],
        ['Hypotes nummer tre', 'Om stormen snurrar, blåser den åt andra hållet högst upp.']
    ],
    confirmed: 'Stämmer!',
    hypMore: 'Fler hypoteser kommer när vi forskar vidare.',
    // Häst eller sköldpadda? Klo measures on in the magic forest, as in Äventyr 1: what the sköldhäst did with its
    // hooves and what it did with its shell, written in as it happens, and which way it leans
    measures: 'Häst eller sköldpadda?', measuresIntro: 'Professor Klo mäter vidare i den magiska skogen.',
    horseThings: 'Hästsaker', turtleThings: 'Sköldpaddssaker', otherThings: 'Övriga mätningar', measuresEmpty: 'Inga mätningar än.',
    tally: (h, t) => `Hästsaker: ${h}. Sköldpaddssaker: ${t}.`,
    tallyHorse: 'Lutar åt häst.', tallyTurtle: 'Lutar åt sköldpadda.', tallyEven: 'Det står lika.',
    measuresConclusion: 'Slutsats: både häst och sköldpadda – och båda behövdes i den magiska skogen. Forskningen fortsätter.',
    measure: {
        drum: 'Trumtestet: hovarna trummade på stocken så att hela trädet skakade.',
        bridge: 'Rittestet: i full galopp ritar hovarna klart Miras streck.',
        leap: 'Språnget över ravinen: längre än någon sköldpadda har hoppat.',
        crystals: 'Klangtestet: hovarna fick alla tre kristallerna att lysa.',
        lightBridge: 'Blixtbron: galopp på ett streck av ljus, precis när det blixtrade.',
        falls: 'Sjunktestet: skalet sjönk under forsen. Hästar flyter.',
        seeds: 'Stillhetstestet: så stilla i skalet att blommorna vågade slå ut.',
        coin: 'Virveltestet: ett tungt skal snurrar ända ner till botten av Djuphålan.',
        wall: 'Strömtestet: skalet följde strömmen under klippväggen.',
        spring: 'Källtestet: källan bar skalet ända upp genom berget.',
        wind: 'Vindtestet: i skalet blåser man inte bort.',
        heart: 'Klos hjärtslag: hundrafyrtio i minuten. Ett vetenskapligt mysterium.',
        bounce: 'Svampstudsen: nästan tre hästlängder rakt upp.',
        windForce: 'Vindstyrka på Åsktoppen: väldigt.'
    },
    // what we know: facts that the moon has made untrue are struck out in pencil, answered ones get their answer
    clues: 'Det här vet vi', cluesEmpty: 'Inget än. Vi har precis börjat forska.',
    struck: { noMoon: 'Nu finns det en måne!', darkStorm: 'Stormen har tystnat.' },
    answered: { lightning: 'Det var Molnet!', cloudCries: 'Nu gråter det inte längre.' },
    // the secrets, found after the story (each line is written in when it is found)
    secrets: 'Hemliga upptäckter',
    secretsLocked: 'Hemligt! Den här sidan fylls i när äggen har kläckts.',
    secretsIntro: 'Skogen har fler hemligheter. Leta, lyssna och prova!',
    secretsCount: (n, t) => `${n} av ${t} hemliga upptäckter`,
    secretsAll: 'Alla hemligheter hittade. Riktiga forskare!',
    secretsOpen: 'Till de hemliga upptäckterna',
    secretUnknown: where => `Något hemligt ${where} …`,
    secretWhere: { strand: 'på Flodstranden', skog: 'i Djupa skogen', kristall: 'i Kristallgrottan', topp: 'på Åsktoppen' },
    secret: {
        hatchFollow: 'Göm dig vid boet, så följer tio små forskare efter dig – Lilla Klo först.',
        molnJoy: 'Gnägg under Molnet, så blixtrar det av glädje.',
        skataMimic: 'Skatan härmar gnägg. Det klär henne inte, tycker hon.',
        cocoaAgain: 'Stocken i Kakaolunden är fortfarande en trumma. Klo ger bort kakaofrukter.',
        mushroomGiggle: 'Svampen fnissar när den studsar. Hypotes nummer fyra: svampar är kittliga.',
        rocket: 'Från Utsiktskullen såg vi en raket flyga förbi månen. Vart då?',
        dyvelShells: 'Tordyveln har rullat en boll av äggskalen. Den finaste hittills.',
        starFall: 'Den som står stilla i Stormens öga får se ett stjärnfall. Klos önskan är hemlig.'
    }
};

export const CHATTER = {
    klo: ['Jag antecknar allt. Särskilt … henne.', 'Häst eller sköldpadda? Både och. Det står i dagboken.', 'Mitt hjärta tickar som ett stoppur. Fast stoppuret har hon nu.'],
    tukan: ['Jag skulle säga något viktigt. Sen glittrade det.', 'Allt som glänser är intressant!', 'Ditt skal glänser! Nio av tio i glans.', 'Hypotes: ägg trivs bäst i varma skal.', 'Alva ritade mina klor. Är de inte fina?', 'Lilla Klo har redan börjat anteckna.']
};
