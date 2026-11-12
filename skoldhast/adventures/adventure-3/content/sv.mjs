/*
 * Äventyr 3: De försvunna stjärnorna – every player-facing string, in Swedish
 * (docs/skoldhast/adventure-3.md, sections 10–15).
 *
 * Style as in the two adventures before (plan §3.6): short speaker boxes (about 90 characters at most), at most
 * three boxes before control returns, Swedish quotation marks and dashes, "du" to the player, plain child words.
 *
 * Alva and Mira are heard, never drawn (plan §3.2). Nova, rymdkrabban, is Alva's creature (her painting of 9
 * November, design section 3). Suddet is Alva's eraser. Pip is a sound, not a voice: his lines are shown, not read.
 *
 * Shapes: a beat is an array of [speaker, text] (a caption inside a beat is ['caption', text]); a plain string in
 * STORY is a thought of the sköldhäst's; TABLE has [speaker, text] for speech and a plain string for a caption.
 *
 * What must not be said too early (design section 7): after the prologue, nobody calls the missing stars "sneda"
 * before Kometen does (cometSaw), and nobody says "sudd" or "sudda" before hypothesis 3, except Mira's one line at
 * the table (eraserGone). Three lines of the design's draft broke that rule and are said otherwise here: the
 * sköldhäst's bearNose, the hint s3 and the ring's gap (with the hint r5 and the clue crumbs).
 *
 * Every spoken line is recorded with a direction (content/regi.mjs, design section 17.1); nothing of Äventyr 3 is
 * recorded until Pappa says the adventure is finished (scripts/skoldhast-voice.mjs, PENDING).
 */

export const NAMES = {
    horse: 'Sköldhästen', klo: 'Professor Klo', nova: 'Nova', sudd: 'Suddet', bjorn: 'Stora björnen', komet: 'Kometen',
    pip: 'Pip', alva: 'Alva', mira: 'Mira', tukan: 'Tukankrabban', moln: 'Molnet', note: ''
};

export const WORDS = {
    title: 'Sköldhästen', subtitle: 'och de försvunna stjärnorna',
    adventure: 'De försvunna stjärnorna',
    credit: 'Sköldhästar och rymdkrabbor är påhittade av Alva.',
    begin: 'Börja', cont: 'Fortsätt', startOver: 'Börja om',
    confirmRestart: 'Vill du börja om De försvunna stjärnorna? Äventyr 1 och 2 och det du har låst upp finns kvar.',
    yes: 'Ja', no: 'Nej', back: 'Tillbaka till biljetten', close: 'Stäng',
    stuckDone: 'Du är tillbaka på en trygg plats.',
    lights: 'Stjärnljus',
    lightCount: (n, total) => `${n} av ${total}`,
    lightAria: (n, total) => `${n} av ${total} stjärnljus hittade`,
    lightToast: (n, total) => `Stjärnljus ${n} av ${total}!`,
    // the ending card (section 11.13)
    endingTitle: 'Tio stjärnor – och en hel vintergata!',
    endingBody: 'Du hittade Alvas tio stjärnor och gav Suddet ett nytt jobb. Nu galopperar Sköldhästen över himlen varje natt.',
    endingExplore: 'Utforska rymden',
    // the four drawings with a pencil: the flame (the prologue), the fin, the tenth star, the constellation
    drawFlame: 'Rita raketens eld med Miras penna!',
    drawFin: 'Rita fenan igen med Miras penna! Sned ska den vara.',
    drawStar: 'Rita stjärnan igen med Alvas penna! Sned får den vara.',
    drawConstellation: 'Rita stjärnbilden med Alvas penna! Följ stjärnorna från ett till tio.',
    pages: { mane: 'Månen', stjarn: 'Stjärnbildsfältet', ring: 'Ringplaneten', sudd: 'Det vita hålet', vinter: 'Vintergatan' },
    places: {
        westRim: 'Västra kanten', landing: 'Landningsplatsen', crater: 'Novas krater', jumps: 'Hoppfälten', deep: 'Djupa kratern',
        night: 'Nattsidan', edge: 'Kanten', view: 'Utsikten',
        dock: 'Hamnstenen', wagon: 'Karlavagnen', belt: 'Orions bälte', bear: 'Stora björnen', pip: 'Pips omlopp',
        icedock: 'Isbryggan', gravel: 'Grusregnet', sling: 'Slungan', shade: 'Skuggsidan', cometLane: 'Kometens bana', gap: 'Luckan',
        whiteEdge: 'Kanten av himlen', marks: 'Märkena', fog: 'Blyertsdimman', lastBridge: 'Sista bron', crumbs: 'Smulhögen',
        tail: 'Kometens svans', cometHead: 'Kometens huvud'
    },
    // the rocket's door: "Res" opens a small picture of the places (section 8.6)
    travel: {
        title: 'Vart reser vi?', stay: 'Stanna här', locked: '?', here: 'Här är vi',
        lights: (n, total) => `${n} av ${total} stjärnljus`
    }
};

export const CONTEXT = { push: 'Knuffa', talk: 'Prata', travel: 'Res' };

// ---------------------------------------------------------------------------
// The table: Alva and Mira make the night page (prologue, 11.1) and look at it again (epilogue, 11.13)
// ---------------------------------------------------------------------------
export const TABLE = {
    newPage: 'En ny sida i forskningsdagboken. Den här gången är det natt.',
    miraRocket: ['mira', 'Alva! Nu ritar vi rymden. Jag ritar en raket!'],
    alvaPaint: ['alva', 'Och jag målar den som bor där uppe. Med vattenfärg.'],
    paintCaption: 'Alva målar en lila krabba. Skalet ser ut som ett flygande tefat.',
    isCrab: ['alva', 'Det är rymdkrabban. Hon kan allt om rymden.'],
    kind: ['mira', 'Är hon snäll?'],
    morning: ['alva', 'Ja. Men inte på morgonen.'],
    finCaption: 'Mira ritar raketen. Ena fenan blir sned.',
    finCrooked: ['mira', 'Den ska vara sned. Då svänger den bättre.'],
    // (here the player draws the rocket's flame: WORDS.drawFlame)
    tenStars: ['alva', 'Titta, mina tio stjärnor! Jag ritade en för varje år när jag fyllde tio.'],
    crooked: ['alva', 'Fast den där blev sned …'],
    rubCaption: 'Alva suddar ut den sneda stjärnan.',
    goneCaption: 'Då slocknar en stjärna till. Och en till.',
    vanish: ['mira', 'Alva! Dina stjärnor försvinner!'],
    onlyOne: ['alva', 'Jag suddade bara EN!'],
    darker: 'Under den mörka himlen blir hela den magiska skogen mörkare.',
    // epilogue
    evening: 'Vid Alvas bord. Det är kväll.',
    eyes: ['mira', 'Där är ju suddet! Det har ögon. Dem har jag ritat.'],
    goldStar: ['alva', 'Och en guldstjärna. Den har jag ritat. Sned.'],
    newRocket: ['mira', 'Och jag har ritat en ny raket. Ännu snedare.'],
    eleven: ['alva', 'Tio stjärnor för tio år. Vad gör jag när jag fyller elva?'],
    elevenAnswer: ['mira', 'Då får Suddet sudda fram en till!'],
    sleep: ['mira', 'Får suddet sova i pennfodralet?'],
    sleepYes: ['alva', 'Ja. Det har jobbat hela natten.'],
    whyGrumpy: ['mira', 'Varför är rymdkrabban så sur?'],
    breakfast: ['alva', 'Hon har inte ätit frukost.'],
    window: 'Utanför fönstret tänds stjärnorna. En av stjärnbilderna har hovar.',
    end: 'Slut – men forskningen fortsätter.'
};

// ---------------------------------------------------------------------------
// The story beats (section 11). Each beat: [speaker, text], at most three boxes. A plain string is a thought.
// ---------------------------------------------------------------------------
export const STORY = {
    // 11.1b The launch (a picture)
    launch: [
        ['caption', 'Miras raket står på Utsiktskullen. Hela skogen har kommit för att vinka.'],
        ['tukan', 'Professor Klo! Ta med lyktan. Och kom hem igen.'],
        ['klo', 'J-ja! Jag skriver! Från varenda planet!']
    ],
    launch2: [
        ['tukan', 'Utan stjärnor mörknar skogen. Och du vet vem som är rädd för mörkret.'],
        ['moln', 'Jag är inte rädd. Inte än. Jag följer er så högt jag når!'],
        ['mira', 'Tre, två, ett … SVÄNG!']
    ],
    launch3: [
        ['caption', 'Raketen svänger upp genom natten. Molnet följer med, ända tills luften tar slut.'],
        ['moln', 'Längre än så här når jag inte. Hälsa stjärnorna!'],
        ['horse', 'Vi hittar dem. Jag lovar.']
    ],

    // 11.2 The landing and breakfast (M1)
    arrive: [
        ['klo', 'Vi landade! Lite snett. Men vi landade.'],
        ['horse', 'Jag känner mig så lätt! Hovarna vill uppåt av sig själva.'],
        ['nova', 'VEM parkerar en raket på MIN måne? Före frukost?!']
    ],
    arrive2: [
        ['klo', 'P-professor Klo. Expert på land och vatten. Vi letar efter …'],
        ['nova', 'Inte före frukost.'],
        ['horse', 'Vad äter du till frukost?']
    ],
    arrive3: [
        ['nova', 'Kometflingor. De står på hyllan. Jag flyger inte före frukost.'],
        ['klo', 'Hyllan sitter väldigt högt.'],
        ['horse', 'Inte här. Här hoppar jag hur högt som helst!']
    ],
    shelfSeen: 'Där uppe står asken. På månen når jag nog.',
    boxFalls: 'Den faller så långsamt! Som en fjäder.',
    breakfast: [
        ['nova', 'Så. Nu går det att prata med mig. Lite.'],
        ['nova', 'Jag heter Nova. Jag kan allt om rymden. Fråga inget dumt.'],
        ['horse', 'Alvas stjärnor försvinner. Vet du vem som tar dem?']
    ],
    count: [
        ['nova', 'Tio är borta sedan i natt. Jag håller reda på varenda stjärna på himlen.'],
        ['alva', 'Det är mina tioårsstjärnor. En för varje år. Snälla, hitta dem!'],
        ['horse', 'Vem tar Alvas stjärnor – och varför?']
    ],
    hypothesis1: [
        ['nova', 'Hypotes nummer ett: ett svart hål. Svarta hål slukar allt. Det vet alla.'],
        ['klo', 'Jag är också forskare! Får man mäta hålet?'],
        ['nova', 'Man får hålla sig ur vägen.']
    ],

    // 11.3 The first star-light and the beam (M2)
    crater: [
        ['nova', 'Min klo lyser. Det ligger något där nere.'],
        ['horse', 'Det är djupt. Ner kommer jag. Men upp?'],
        ['klo', 'Jag antecknar: ner är lätt. Upp är forskning.']
    ],
    firstLight: [
        ['nova', 'Det här är bara ljuset. Stjärnan är borta, men ljuset blev kvar.'],
        ['nova', 'Jag lägger det under kupan. Där är det tryggt.'],
        ['klo', 'En stjärnburk med ögon. Jag antecknar.']
    ],
    firstLight2: [
        ['nova', 'Jag hörde det där.'],
        ['alva', 'Det var min första! Den lyser ju fortfarande. Nio kvar!']
    ],
    beam: [
        ['horse', 'Väggarna är för höga. Till och med här.'],
        ['nova', 'Ställ dig i ljusringen. Jag lyfter dig. Men sluta sprattla.'],
        ['klo', 'Ett skal som ligger stilla, kanske? Det brukar fungera.']
    ],
    beamKick: 'Hon lyfter inte en häst som sprattlar. Jag gömmer mig i skalet.',
    beamUp: 'Jag flyger! I ett skal. I en ljusstråle.',
    beamDone: [
        ['nova', 'Tung var du. För en häst.'],
        ['klo', 'För en sköldpadda är det helt normalt.'],
        ['nova', 'Bestäm er.']
    ],

    // 11.4 The night side (M3) and the ledge (M4)
    night: [
        ['horse', 'Det är kolsvart. Jag ser inte var jag sätter hovarna.'],
        ['nova', 'Det är natt på den här sidan. Natten på månen varar i två veckor.'],
        ['klo', 'Två veckor! Har du en lampa?']
    ],
    night2: [
        ['nova', 'Fem stycken. De lyser bäst när jag är arg.'],
        ['klo', 'Och när blir du arg?'],
        ['nova', 'Av klapper. Hovklapper. Säg inget.']
    ],
    nightDark: 'För mörkt. Jag ser ingenting.',
    nightLit: 'Hon lyser! Röd som en lykta. Jag ser marken!',
    nightOut: 'Lamporna slocknade. Hon har lugnat sig. Mer klapper!',
    // the first time, while galloping
    nightAngry: [['nova', 'Det där var MED FLIT. … Bra. Fortsätt.']],
    // in the red light, at the crater
    nightFace: [
        ['horse', 'Den där kratern … den ser ut som ett ansikte.'],
        ['nova', 'Det är en krater. Kratrar tittar inte. Det vet alla.'],
        ['klo', 'Jag antecknar ändå att den tittar.']
    ],
    nightDone: [
        ['nova', 'Jag har inte varit så arg sedan en meteor landade i mina flingor.'],
        ['horse', 'Förlåt.'],
        ['nova', 'Det lyste bra. Vi säger inget mer om det.']
    ],
    ledge: [
        ['nova', 'Min klo lyser igen. Där, under klippan.'],
        ['horse', 'Jag hoppar förbi varje gång. Jag svävar för långt!'],
        ['klo', 'Allt är lätt här. Utom … ett visst skal?']
    ],
    ledgeFloat: 'Jag svävar förbi. Jag skulle behöva falla som en sten.',
    drop: 'Skalet faller rakt ner! Som en sten – fast på månen.',
    ledgeDone: [
        ['klo', 'Från svävande häst till fallande sköldpadda på en sekund!'],
        ['nova', 'Tyngden beror på vad man är. Det vet alla.'],
        ['klo', 'Just det vet ingen! Det är min forskning!']
    ],

    // 11.5 Klo and Nova (after stars 1, 2 and 3)
    rival1: [
        ['klo', 'Jag har mätt månen. Den är … stor.'],
        ['nova', 'Tretusenfyrahundrasjuttiofyra kilometer tvärs över.'],
        ['klo', 'Jag skriver ”stor”.']
    ],
    rival2: [
        ['klo', 'Jag skriver ett vykort hem. Till en … forskarkollega.'],
        ['horse', 'Till Tukankrabban.'],
        ['nova', 'Hans lampor blinkar. Jag menar ögon. Vad är det för fel på honom?']
    ],
    rival3: [
        ['horse', 'Han är kär.'],
        ['nova', 'Det finns ingenting om det i mina stjärnkartor.'],
        ['klo', 'Det är ett vetenskapligt mysterium. Det har jag skrivit upp.']
    ],

    // 11.6 The view (M5) and the fin
    view0: [
        ['horse', 'Där nere ligger den magiska skogen! Så liten.'],
        ['klo', 'Det är mörkare där än när vi for. Jag ser knappt boet.'],
        ['nova', 'Tio stjärnor mindre. Det märks ända dit ner.']
    ],
    view: [
        ['horse', 'Hela himlen! Och där … hålen där Alvas stjärnor satt.'],
        ['klo', 'De är vita. Jag antecknar: vita hål.'],
        ['nova', 'Vita hål finns inte. Svarta hål är svarta. Det vet alla.']
    ],
    view2: [
        ['klo', 'Men titta. Vitt. Som … papper.'],
        ['nova', '… Hypotes nummer ett stämmer inte.'],
        ['horse', 'Nova? Dina lampor slocknade.']
    ],
    // (that "Tack." is small and fast, and Klo nearly falls off the rock: the only one before the finale)
    view3: [
        ['nova', 'Jag har aldrig haft fel om rymden förut.'],
        ['klo', 'Fel är också forskning! Jag har fel hela tiden.'],
        ['nova', 'Det märks. … Tack.']
    ],
    hypothesis2: [
        ['klo', 'Hypotes nummer två: någon samlar på dem! Som Skatan med sina pärlor.'],
        ['nova', 'En stjärntjuv. På MIN himmel.'],
        ['horse', 'Då letar vi vidare. Till raketen!']
    ],
    fin: [
        ['horse', 'Raketens fena! Den är borta. Det är bara ett streck kvar.'],
        ['klo', 'Och här ligger smulor. Rosa smulor. Jag tar ett prov.'],
        ['mira', 'MIN fena! Jag ritar dit den igen!']
    ],
    // (here the player draws the fin again: WORDS.drawFin)
    finDone: [
        ['mira', 'Så! Lika sned som förut.'],
        ['nova', 'Den där raketen kommer att svänga.'],
        ['mira', 'Det är det som är meningen!']
    ],

    // 11.7 Stjärnbildsfältet
    stjarnArrive: [
        ['nova', 'Är vi framme? Väck mig inte.'],
        ['klo', 'Vi är framme.'],
        ['nova', 'Då är det morgon. Igen. Rör mig inte.']
    ],
    stjarnArrive2: [
        ['horse', 'Jag väger ingenting! Jag simmar – fast det finns inget vatten.'],
        ['nova', 'Här finns inget upp och inget ner. Bara stjärnbilder.'],
        ['nova', 'Det där är Karlavagnen. Sju stjärnor. Strecken är inte dragna.']
    ],
    wagon: [
        ['klo', 'Streckade linjer! Det kan vi. Eller hur?'],
        ['horse', 'I full galopp ritar hovarna klart dem.'],
        ['nova', 'Klapper. Naturligtvis.']
    ],
    wagonThin: 'Strecket håller inte än. Jag behöver full galopp.',
    wagonStar: 'Varje stjärna klingar när jag springer förbi!',
    wagonDone: [
        ['horse', 'Den rullar! Karlavagnen är en riktig vagn!'],
        ['nova', 'En stjärnbild blir det den föreställer. Det vet alla.'],
        ['klo', 'Det visste jag inte. Jag antecknar allt hon säger.']
    ],
    belt: [
        ['nova', 'Orions bälte. Tre stjärnor på rad. De tänds i en viss ordning.'],
        ['klo', 'Vilken ordning?'],
        ['nova', 'Titta på mina lampor. Jag visar en gång. Kanske två.']
    ],
    beltWrong: 'Fel ordning. Alla slocknade.',
    beltOne: 'Den tändes! Vilken blinkade hon sen?',
    // a remark, at most every third miss
    beltWrongNova: ['nova', 'Fel. Igen. Titta på lamporna.'],
    beltDone: [
        ['horse', 'Alla tre lyser – och där lossnade ett stjärnljus!'],
        ['nova', 'Mitten, vänster, höger. Det är inte svårt.'],
        ['klo', 'Jag antecknade ”vänster, mitten, hö…”. Jag stryker det.']
    ],
    bear: [
        ['horse', 'En björn! Av stjärnor. Den sover.'],
        ['nova', 'Stora björnen. Karlavagnen är hans rygg och svans.'],
        ['nova', 'Min klo lyser. Han ligger på ett stjärnljus.']
    ],
    bear2: [
        ['klo', 'Vi väcker honom! Hallå! HALLÅ!'],
        ['nova', 'Det hörs inget i rymden. Tur för dig. Han är värre än jag på morgonen.'],
        ['horse', 'Titta på hans nos. Den är bara streckad.']
    ],
    // (the design's draft said "utsuddad", which is too early: section 7)
    bearNose: 'Nosen är bara streckad. Om jag tar sats över ryggen kan jag rita den.',
    bearWakes: [
        ['bjorn', '… Snnff. Det luktar … frukost?'],
        ['nova', 'Äntligen någon som förstår.'],
        ['bjorn', 'Vem ritade min nos? Jag har inte känt en doft på hela natten.']
    ],
    bearGives: [
        ['bjorn', 'Den här låg jag på. Den är varm. Ta den – den är inte min.'],
        ['bjorn', 'Snnff. Era smulor luktar gummi.'],
        ['klo', 'Gummi! Det skriver jag upp. Rosa smulor av gummi.']
    ],
    // he rises; the heroes are on his back; the camera pulls far out
    bearStands: [
        ['horse', 'Han reser sig! Vi står på en björn av stjärnor!'],
        ['klo', 'Jag antecknar: högt. Väldigt högt. Jag tittar inte ner.'],
        ['bjorn', 'Håll i er. Jag bär er en bit. Tre kliv, så är vi framme.']
    ],
    pip: [
        ['pip', 'Pip.'],
        ['nova', 'Det är Pip. En satellit. Han säger bara pip.'],
        ['klo', 'Vad betyder det?']
    ],
    pip2: [
        ['nova', 'Att han snurrar. Det ser jag väl.'],
        ['pip', 'Pip pip!'],
        ['nova', 'Och att han har fångat något. Ni får hämta det själva. Jag snurrar inte.']
    ],
    orbitKick: 'Jag sparkar mig ur banan! Jag är för lätt.',
    orbit: 'Skalet går i omlopp! Jag är en liten måne.',
    pipDone: [
        ['pip', 'Pip. Pip pip. Pip!'],
        ['nova', 'Han har tagit en bild av tjuven. Liten. Rosa. Kantig.'],
        ['klo', 'Liten, rosa, kantig – och smulor av gummi …']
    ],
    // plays when both the photograph and the rubber are known, wherever that happens
    hypothesis3: [
        ['klo', 'Hypotes nummer tre: någon suddar ut dem!'],
        ['nova', 'Det var min hypotes. Jag hann bara inte säga den.'],
        ['horse', 'Den är bådas. Ni forskar ju tillsammans.']
    ],

    // 11.8 Ringplaneten
    ringArrive: [
        ['nova', 'Morgon. Igen. Vem bestämde att det ska vara morgon så ofta?'],
        ['mira', 'Det är min planet! Den har ringar. Den heter Ringo.'],
        ['nova', 'Den heter Ringplaneten. Ringarna är is och sten, precis som Saturnus.']
    ],
    ringo: [
        ['mira', 'Ringo.'],
        ['nova', 'Jag bråkar inte med någon före frukost. … Ringplaneten.'],
        ['klo', 'Jag antecknar båda.']
    ],
    gravel: [
        ['horse', 'Aj! Det regnar grus!'],
        ['nova', 'Småsten från ringen. Det kommer i skurar. Jag hatar det.'],
        ['klo', 'Ett skal är en utmärkt sköld. Det har vi mätt förut.']
    ],
    gravelSoon: 'Det glimmar till där borta – nu kommer en skur!',
    gravelHit: 'Gruset knuffar mig bakåt! I skalet känns det inte.',
    sling: [
        ['horse', 'Ringen tar slut. Och det är långt till andra sidan.'],
        ['nova', 'Planeten drar. Det går banor runt den. Tre stycken härifrån.'],
        ['klo', 'Det ligger rosa smulor i den mellersta!']
    ],
    sling2: [
        ['nova', 'En som sparkar åker ur banan. En som ligger still följer med.'],
        ['horse', 'Ta sats, hoppa – och gömma mig i luften. Som på månen.'],
        ['nova', 'Det där var inte dumt. För att vara före lunch.']
    ],
    slingBack: 'Den banan gick tillbaka hit. Jag provar en annan.',
    slingGo: 'Det går fort! Hela planeten snurrar förbi!',
    slingDone: [
        ['klo', 'Du blev slungad runt en hel planet! Jag hann inte ens mäta.'],
        ['nova', 'Tjugotvå sekunder.'],
        ['klo', '… Du mätte åt mig.']
    ],
    ice: [
        ['nova', 'Min klo lyser. Det sitter ett stjärnljus i isen.'],
        ['horse', 'Is smälter i sol. Men här är det skugga.'],
        ['klo', 'Planeten skuggar. Solen börjar där borta, vid strecket.']
    ],
    iceWrong: 'Blocket ska in i solen. Jag får knuffa från andra hållet.',
    iceMelts: 'Det smälter! Där är stjärnljuset.',
    comet: [
        ['komet', 'Hinner inte! Hinner inte! Ur vägen!'],
        ['nova', 'Kometen. Den har aldrig tid. Jag står inte ut med den.'],
        ['horse', 'Det sitter något i dess svans. Det lyser!']
    ],
    comet2: [
        ['klo', 'Hallå! Stanna! Vi vill bara …'],
        ['komet', 'Hinner inte! Varv femtusentolv! Rekord!'],
        ['nova', 'Den stannar bara vid Rastplatsen. Ett andetag per varv.']
    ],
    cometLane: 'Dess bana korsar ringen. Om skalet följer med banan kommer jag till Rastplatsen.',
    cometRest: [
        ['komet', 'Puh. Ett andetag. Vad vill ni? Fort!'],
        ['horse', 'Du har ett stjärnljus i svansen.'],
        ['komet', 'Jaså den! Den har kittlats i tre varv. Ta den!']
    ],
    cometSaw: [
        ['komet', 'Jag ser allt från min bana. En liten rosa en. Den tar bara de sneda.'],
        ['komet', 'Mina streck är raka. Jag har linjalsvans. Den som hinner ikapp får åka på den! Hej!'],
        ['nova', 'Ingen hinner ikapp den. … Bara de sneda, sa den.']
    ],
    crooked: [
        ['nova', 'Det stämmer. De raka stjärnorna är kvar. Alvas är borta.'],
        ['alva', 'Mina är sneda. Jag ritar på fri hand.'],
        ['klo', 'Hypotes nummer fyra: den tar bara det som är snett.']
    ],
    // (the design's draft said "utsuddad": the gap can be reached before hypothesis 3, section 7)
    gap: [
        ['horse', 'Ringen är borta här. Bara ett streck kvar – och grusskurar.'],
        ['nova', 'Min klo lyser. Det sista ligger på andra sidan.'],
        ['klo', 'Galopp mellan skurarna. Hovarna ritar isen igen.']
    ],
    gapDone: [
        ['horse', 'Nio! Bara ett kvar.'],
        ['nova', 'Nio under kupan. Det börjar bli trångt. Och varmt.'],
        ['nova', 'Jag vet var det tionde är. Bortom ringarna. Det vita.']
    ],
    // at the table, right after the ninth light
    nine: [
        ['mira', 'Alva! Molnet på förra sidan blixtrar igen. Bara lite.'],
        ['alva', 'Det är för mörkt där nere. Skynda er!'],
        ['klo', 'Tänk om den som suddar … suddar oss?']
    ],

    // 11.9 At the table (once, on the second of pages 2 and 3): the one allowed early word
    eraserGone: [
        ['mira', 'Alva, har du sett suddet? Jag ritade fel på en ring.'],
        ['alva', 'Det låg här nyss. Rita över, så länge.'],
        ['mira', 'Jag ritar aldrig fel. Jag ritar om.']
    ],

    // 11.10 Det vita hålet
    suddArrive: [
        ['nova', 'Jag sov inte. Jag blundade argt.'],
        ['horse', 'Himlen tar slut. Det är … vitt. Det finns ingenting.'],
        ['klo', 'Inget land. Inget vatten. Inte ens rymd. Jag är expert på ingenting här.']
    ],
    // a squeak behind them; a pink blur; three strokes, and the rocket is a dashed outline
    rocketGone: [
        ['mira', 'MIN RAKET! Någon suddade HELA raketen!'],
        ['klo', 'Där! Något litet och rosa! Det hoppade in i det vita!'],
        ['horse', 'Då kommer vi inte hem.']
    ],
    suddArrive2: [
        ['nova', 'Efter den. Vi har ändå ingen annan väg.'],
        ['nova', 'Fast … här finns inga stjärnor. Inga kartor. Jag vet inte vägen.'],
        ['klo', 'Du vet alltid vägen!']
    ],
    suddArrive3: [
        ['nova', 'Inte här. Här är jag ingen expert. Här är jag bara sur.'],
        ['horse', 'Titta på papperet. Det finns märken där streck har suttit.'],
        ['klo', 'Märken är streckade linjer! Och streckade linjer …']
    ],
    whiteThin: 'Det finns inget att stå på. Jag måste rita det – i full galopp.',
    whiteDraw: 'Marken ritas under hovarna! Jag ritar vägen själv.',
    fog: [
        ['horse', 'Det är grått överallt. Jag ser inga märken.'],
        ['nova', 'Blyertsdimma. Det blir så när någon suddar mycket.'],
        ['klo', 'Jag har en lykta. Den jag fick av … henne. Den lyser bara när jag är stilla.']
    ],
    fog2: [
        ['horse', 'Och du är bara stilla när jag är det.'],
        ['klo', 'Jag kan vara stilla! Titta. … Nej. Jo. … Nej.'],
        ['nova', 'Göm dig i skalet, så håller han sig lugn. Kanske.']
    ],
    fogSqueak: 'Det gnisslar där framme. Långsamt. Någon suddar.',
    // when the seed lights the second group of dents
    fogGhosts: [
        ['horse', 'Det står saker i dimman. Halva saker. Ett hus utan tak. En drake utan huvud.'],
        ['nova', 'Märken. Hit kommer allt som någon har suddat ut.'],
        ['horse', 'Och den där … det där är jag. Fast med fel ben.']
    ],
    fogGhosts2: [
        ['alva', 'Det var mitt första försök. Det blev fel. Jag suddade det.'],
        ['horse', 'Jag vill inte titta på den.'],
        ['klo', 'Titta på mig i stället. Jag är väldigt röd. Det brukar hjälpa.']
    ],
    // the first time the seed lights
    fogLit: [
        ['klo', 'Den lyser! Jag tänkte på henne. Då blev klorna alldeles stilla.'],
        ['nova', 'Är det där också ett vetenskapligt mysterium?'],
        ['klo', 'Det största.']
    ],
    // after the second rub-out
    bridge: [
        ['horse', 'Den suddar ut bron så fort jag har ritat den!'],
        ['klo', 'Den suddar det som är snett. Och dina streck …'],
        ['nova', 'Är sneda allihop. Du ritar med hovar.']
    ],
    bridge2: [
        ['horse', 'Jag kan inte rita rakt. Jag är en sköldhäst.'],
        ['nova', 'Ett skal är inget streck. Det går inte att sudda.'],
        ['nova', 'Ljusringen. Du vet hur man gör. Och sluta …']
    ],
    bridge3: [['horse', '… sprattla. Jag vet.']],

    // the climax (section 16.1 says how it looks, sounds and is limited)
    // no music; the Moon fills the sky beyond the crumbs; the slow squeak; Suddet at the Moon's rim
    sudd1: [
        ['sudd', 'Vänta. Jag är snart klar. Bara en sak kvar. Den där är inte rund.'],
        ['mira', 'Det är MIN måne! Den är visst rund! … Nästan.'],
        ['nova', 'Rör den inte. Det är mitt hem. Mina flingor står där!']
    ],
    // a squeal; a white bite in the rim; everything dims one step; Nova's lamps go red
    bite1: [
        ['nova', 'MIN MÅNE!'],
        ['horse', 'Sluta! Hör du inte? SLUTA!'],
        ['sudd', 'Snart. Den är sned här också.']
    ],
    // a second bite, round, beside the first; darker again; pink crumbs fall like snow
    bite2: [
        ['klo', 'Jag ser knappt mina egna klor.'],
        ['mira', 'Alva. Månen har fått ögon.'],
        ['alva', 'Det är bara hål, Mira. … Titta inte på den.']
    ],
    // the third, long and jagged, under the two: a mouth. The Moon is a face. Then its light goes out.
    bite3: [
        ['mira', 'Den tittar på mig! Alva, DEN TITTAR PÅ MIG!'],
        ['nova', 'Det där är inte min måne längre.']
    ],
    // a picture, seen only in flashes of lightning
    forestDark: [
        ['caption', 'I den magiska skogen blir det kolsvart.'],
        ['moln', 'Mörkt … det är mörkt … Jag vill inte blixtra! Jag vill inte!']
    ],
    // between her two lines, one flash: the smallest one in the air, and a toucan claw closing round him
    forestDark2: [
        ['tukan', 'In under mig, ungar! Allihop! … Var är Lilla Klo?!'],
        ['tukan', 'Jag har dig. Jag har dig. Han kommer hem. Det har han lovat.']
    ],
    // back in the white: the Moon's yellow is running out of it in slow threads
    drain: [
        ['nova', 'Kanten är borta. Utan kant håller månen inte ihop. Den rinner ut!'],
        ['horse', 'Det är du som tar Alvas stjärnor. Och nu månen!'],
        ['sudd', 'Jag tar ingenting. Jag suddar. Sneda streck ska bort.']
    ],
    sudd2: [
        ['sudd', 'Det är det enda jag kan. Jag hjälper till.'],
        ['klo', 'Hjälper?! Jag har mätt dig. Du är nästan slut! Och allt du gör är att …']
    ],
    // Suddet turns to Klo's notebook: three strokes, and the pages are grey smears
    notes: [
        ['klo', 'Mina anteckningar! Alla mätningar! Häst eller sköldpadda – BORTA!'],
        ['sudd', 'De var sneda. Du skriver med klo.'],
        ['horse', 'Nu räcker det. Du rör inte mina vänner.']
    ],
    offer: [
        ['horse', 'Jag är sned överallt. Häst fram, sköldpadda bak. Ingen vet ens vad jag är.'],
        ['horse', 'Sudda mig då.'],
        ['klo', 'NEJ!']
    ],
    // the outline goes faint, then dashed, then is gone: the colours hang in the dark with no edges
    rubbed: [
        ['horse', 'Jag … känner inte mina kanter. Klo? Var slutar jag?'],
        ['klo', 'Den är min forskning! Den är min VÄN! Ge tillbaka den!'],
        ['alva', 'Mina streck! … Men färgen. Färgen sitter kvar!']
    ],
    // as the controls return (V5), while galloping, and if the player stands still for a while
    drawSelf: 'Alvas penna sitter i mina hovar. Jag kan rita. Jag kan rita MIG!',
    drawSelf2: 'Ett ben! Ryggen! Skalet!',
    drawSelfWait: 'Jag finns kvar. Färgen håller. Men jag behöver galoppera.',
    // the last line closes; the sköldhäst stands whole, a little differently drawn than before
    drawnSelf: [
        ['horse', 'Jag är här. Sned. Men här.'],
        ['sudd', 'Du … gick inte bort.'],
        ['nova', 'Färg går inte att sudda. Bara blyerts. Det vet alla.']
    ],
    sudd4: [
        ['sudd', 'Och strecken ritade du tillbaka. Själv. Det har ingen gjort förut.'],
        ['sudd', 'Då är du inget misstag.']
    ],
    alva1: [
        ['alva', 'Suddet. Det var jag. Jag suddade den första stjärnan.'],
        ['alva', 'Den blev sned, och jag blev arg på den. Sen ångrade jag mig.'],
        ['sudd', 'Så jag … hjälpte inte?']
    ],
    alva2: [
        ['alva', 'Du gjorde precis det jag bad om. Det var jag som hade fel om stjärnan.'],
        ['alva', 'De sneda är mina. Jag ritar på fri hand. Det ska synas.'],
        ['mira', 'Jag tycker att de sneda är finast.']
    ],
    tenth: [
        ['horse', 'Där är märket efter den första. Kan du rita den igen, Alva?'],
        ['alva', 'Ja. Och den får bli precis lika sned.']
    ],
    // (here the player draws the tenth star: WORDS.drawStar)
    tenthDone: [
        ['nova', 'Tio. Alla tio under kupan.'],
        ['sudd', 'Vad ska jag göra nu? Jag kan bara sudda.'],
        ['nova', '… Titta upp. Vad händer när man suddar på något svart?']
    ],
    newJob: [
        ['sudd', 'Det blir vitt. Små vita prickar.'],
        ['nova', 'Det heter stjärnor. Jag kan allt om dem.'],
        ['sudd', 'Kan jag … rita? Med sudd?']
    ],
    stranded: [
        ['klo', 'Men vi har ingen raket. Och månen har ett hål. Hur kommer vi hem?'],
        ['pip', 'Pip! Pip pip pip!'],
        ['nova', 'Det är Pip. Han har sett alltihop. Han har ropat på … nej. Inte den.']
    ],
    // a streak of light; the long straight tail sweeps in and lies still along the edge of the white
    cometComes: [
        ['komet', 'HINNER! För en gångs skull hinner jag! Upp på svansen!'],
        ['sudd', 'Den är rak. Den suddar jag aldrig.'],
        ['horse', 'Suddet, hoppa upp på skalet. Jag galopperar – och du ritar!']
    ],

    // 11.11 Den stora galoppen (G1), the catch (F1) and the Moon's rim (F2)
    ride1: 'Det blir stjärnor bakom oss! Hundratals!',
    ride2: 'Fortare! Över hela himlen!',
    ride3: 'Jag har aldrig galopperat så här långt. Jag vill aldrig sluta!',
    // remarks during the gallop (they never stop it), each where its picture passes (section 8.5)
    rideRemarks: [
        ['komet', 'Jag har aldrig haft någon på svansen förut! Spring! SPRING!'],
        ['sudd', 'Jag ritar! Jag ritar med sudd!'],
        ['mira', 'Där är Ringo! Hej Ringo!'],
        ['bjorn', 'Snnff. Nu luktar hela himlen stjärnor.'],
        ['klo', 'Jag åker Karlavagnen! Jag har slutat räkna vid tusen!'],
        ['pip', 'Pip!'],
        ['nova', 'Det heter Vintergatan. Jag visste inte att man kunde göra den själv.']
    ],
    // at Kometens huvud
    lift: [
        ['komet', 'Månen! Jag hinner inte bromsa! Hoppa!'],
        ['horse', 'Det är för långt. Och månen har ett hål där vi ska landa!'],
        ['nova', 'Hoppa. Göm dig i luften. Jag fångar dig.']
    ],
    liftMiss: 'Jag sprattlade. Kometen svänger runt – jag försöker igen.',
    liftCaught: 'Hon har mig! Mitt i luften!',
    // the beam holds the shell, Suddet on it, Klo below; her lamps blaze
    lift2: [
        ['nova', 'Jag är ingen taxi. … Håll i er. Allihop.'],
        ['klo', 'Hon bär oss alla! Sköldhäst, sudd och professor!'],
        ['nova', 'Säg … inget. Det är … tungt.']
    ],
    landed: [
        ['sudd', 'Jag blev inte mindre. Inte ett dugg.'],
        ['nova', 'Man blir inte mindre av att rita. Det … visste jag inte heller.'],
        ['mira', 'Sen ritar jag ögon på suddet. Så det ser vad det gör!']
    ],
    rim: [
        ['horse', 'Månens kant är utsuddad. Men märket finns kvar.'],
        ['sudd', 'Förlåt. Den var visst rund. Nästan.'],
        ['mira', 'Rita den precis så! Nästan rund!']
    ],
    rimDraw: 'Långa, lätta kliv – och månen ritas hel under hovarna!',
    // the last stride closes the rim; the yellow runs back into the Moon and fills the three holes
    rimHeals: [
        ['mira', 'Ögonen försvinner! Den tittar inte längre!'],
        ['nova', 'Det var aldrig ögon. Det var hål. … Jag tittade inte heller.'],
        ['klo', 'Jag antecknar att den är rund. Nästan.']
    ],
    // a picture: the storm stops in the middle of a flash; the moonlight falls on the forest again
    forestLight: [
        ['caption', 'Månskenet faller över den magiska skogen igen. Stormen tystnar.'],
        ['moln', 'Det är ljust! Jag slutade! Och titta – en hel väg av stjärnor!'],
        ['tukan', 'Titta, ungar! Titta, Lilla Klo! Där uppe galopperar han som bar er.']
    ],
    rimDone: [
        ['horse', 'Månen är hel. Nu ska stjärnorna hem.'],
        ['nova', 'Till min krater. Där satt de. Rakt ovanför min säng.'],
        ['nova', 'Jag har tittat på dem varje morgon. Sur. Men jag har tittat.']
    ],

    // 11.12 Finale in Novas krater
    finale: [
        ['nova', 'Ut med er. En i taget. Tillbaka till era platser.'],
        ['horse', 'Alla tio. Precis där de satt.'],
        ['sudd', 'Jag rör dem inte. Jag lovar.']
    ],
    gold: [
        ['alva', 'Nu färglägger jag dem. Med guldpenna.'],
        ['alva', 'Färgpenna går inte att sudda. Det sa Nova.'],
        ['nova', 'Det vet alla. … Nu.']
    ],
    constellation: [['alva', 'Och så ritar jag ihop dem. Tio stjärnor – en stjärnbild.']],
    // (here the player draws the constellation: WORDS.drawConstellation)
    constellationDone: [
        ['horse', 'Det är … jag! Hovar fram och skal bak!'],
        ['alva', 'Sköldhästen. En alldeles egen stjärnbild.'],
        ['klo', 'Häst eller sköldpadda? Det står på himlen nu: både och.']
    ],
    // all five lamps go gold; her eyes open wide
    supernova: [
        ['klo', 'Nova … dina lampor är guld. Alla fem.'],
        ['nova', 'Det kallas supernova. Det händer nästan aldrig.'],
        ['nova', 'Tack. Allihop. Säg det inte till någon.']
    ],
    telescope: [
        ['nova', 'Professorn. Den här är till dig. Mitt gamla teleskop.'],
        ['klo', 'Till mig? Men jag kan ingenting om rymden!'],
        ['nova', 'Nej. Men du antecknar bra.']
    ],
    ink: [
        ['sudd', 'Förlåt för anteckningarna. De var inte sneda. De var dina.'],
        ['klo', 'Jag kan dem utantill. Jag skriver om dem. Med bläck den här gången.'],
        ['nova', 'Bläck går inte heller att sudda. Det vet … ja, ja.']
    ],
    moonJoke: [
        ['klo', 'Jag sa en gång att månen kanske var ett suddgummi som någon glömt på himlen.'],
        ['nova', 'Månen är sten. Suddgummit är han där.'],
        ['sudd', 'Jag är inte glömd längre.']
    ],
    finaleCaption: 'Över hela himlen lyser Vintergatan. Mitt i den galopperar en stjärnbild.',

    // 11.14 Small lines
    // a thought on finding a star-light that has no scene of its own
    lightLine: [
        'Ett stjärnljus! Det är alldeles varmt.', 'Ett ljus till under kupan.', 'Där var du, lilla ljus.',
        'Det lyser som en liten sol!', 'Alva kommer att bli så glad.'
    ],
    // Nova when galloped beside (remarks, in turn, then silent)
    novaGallop: ['Klapper.', 'MÅSTE du?', 'Jag försöker vara sur i fred.', 'Nu räknar jag till fem. Lampa för lampa.'],
    // after the story: Suddet on the Moon
    suddTalk: [
        'Jag ritar en ny stjärna varje natt. En liten.',
        'När Alva fyller år suddar jag fram en stor. Det har Mira bestämt.',
        'Mira ritade mina ögon. Nu ser jag vad jag gör.',
        'Jag suddar bara när någon ber om det. Och frågar två gånger.'
    ],
    // the secrets' remarks (section 15)
    silentNeigh: ['nova', 'Jag hörde det där.'],
    secondBox: ['nova', 'Två frukostar. … Supernova.'],
    cometRace: ['komet', 'Inte illa. För en … vad du nu är.'],
    rescued: 'Hoppsan! Där höll jag på att ramla rakt ut ur sidan.',

    // Häst eller sköldpadda? in space (section 14): Klo's word as a measurement goes in, and his conclusion
    measure: {
        firstHorse: ['klo', 'Hovar! Även i rymden. Jag antecknar en hästsak.'],
        firstTurtle: ['klo', 'Skalet igen! En sköldpaddssak – med utsikt.'],
        even: ['klo', 'Det står lika. Till och med här uppe.']
    },
    measureEnd: [
        ['klo', 'I rymden väger ingen någonting. Då borde det inte gå att väga häst mot sköldpadda.'],
        ['klo', 'Men det står lika ändå. Åtta mot åtta.'],
        ['nova', 'Den är ingetdera. Den är en egen stjärnbild. Det vet alla. Nu.']
    ]
};

// refusals and short notes above the sköldhäst (never block play)
export const BALK = {
    paper: 'Här tar sidan slut.',
    dark: STORY.nightDark,
    thin: 'Strecket håller inte än. I full galopp ritar hovarna klart det.',
    float: 'Jag svävar förbi. Så kommer jag inte dit.',
    high: 'För högt. Till och med här.',
    white: 'Där finns inget att stå på. Inte än.',
    rubbed: 'Den suddade ut det igen!',
    gravel: 'Gruset knuffar mig bakåt. Jag väntar ut skuren.',
    kick: 'Jag sparkar mig ur banan. Jag är för lätt.',
    // before breakfast Nova will not come along, and nobody knows the way on (M1 gates everything)
    breakfast: 'Först frukost. Utan Nova hittar vi inte stjärnorna.',
    // in the fog no dents can be seen until Klo's seed lights them (V2)
    fog: 'Jag ser inga märken i dimman. Jag vågar inte gå vidare.'
};

// ---------------------------------------------------------------------------
// Help (section 12): the goal note says what and why; three hints a puzzle, in either companion's words
// ---------------------------------------------------------------------------
export const GOALS = {
    travel: 'Res vidare med raketen',
    travelWhy: 'Här finns inga fler stjärnljus. Gå till raketen och res dit det fattas.',
    breakfast: 'Hitta Novas frukost',
    breakfastWhy: 'Hon pratar inte före frukost – och hon vet allt om rymden.',
    moon: (n, total) => `Hitta Alvas stjärnor (${n} av ${total})`,
    moonWhy: 'Stjärnornas ljus har drivit iväg över hela rymden. Novas klo lyser när ett är nära.',
    view: 'Klättra upp till Utsikten',
    viewWhy: 'Därifrån ser man hela himlen – och hålen där stjärnorna satt.',
    rocket: 'Gå tillbaka till raketen',
    rocketWhy: 'Stjärnljusen har drivit längre bort än månen.',
    lights: (n, total) => `Hitta Alvas stjärnor (${n} av ${total})`,
    lightsWhy: 'Någon tar dem. Vem – och varför?',
    white: 'Res till det vita hålet',
    whiteWhy: 'Det tionde ljuset är där. Och den som suddar.',
    through: 'Ta dig genom det vita',
    throughWhy: 'Här finns inget ritat. Hovarna får rita vägen.',
    self: 'Rita dig själv',
    selfWhy: 'Suddet tog dina streck. Färgen sitter kvar – och Alvas penna sitter i hovarna.',
    ride: 'Galoppera hem på Kometens svans',
    rideWhy: 'Raketen är borta. Suddet rider på skalet och ritar stjärnor hela vägen hem.',
    jump: 'Hoppa till månen',
    jumpWhy: 'Kometen hinner inte bromsa. Nova fångar ett skal som ligger still.',
    rim: 'Rita månens kant hel',
    rimWhy: 'Utan måne är det mörkt i skogen – och Molnet är rädd för mörkret.',
    crater: 'Gå till Novas krater',
    craterWhy: 'Stjärnorna ska tillbaka till sina platser, rakt ovanför hennes säng.',
    free: 'Utforska rymden',
    freeWhy: 'Forskningen fortsätter – ända ut i Vintergatan.'
};

export const HINTS = {
    // once a puzzle has freed its light but it has not been touched yet
    pickup: ['Nu ligger stjärnljuset fritt – gå fram och rör vid det!'],
    m1: ['Novas flingor står på hyllan ovanför hennes krater.', 'På månen hoppar du mycket högre än hemma.',
        'Hoppa upp på hyllan och knuffa ner asken.'],
    m2: ['Stjärnljuset ligger på kraterns botten. Ner kommer du lätt.', 'Väggarna är för höga att hoppa upp för. Men Nova kan lyfta.',
        'Ställ dig i ljusringen och göm dig. Strålen lyfter ett skal som ligger still.'],
    m3: ['På nattsidan behövs ljus. Novas lampor lyser bäst när hon är arg.', 'Hon blir arg av hovklapper.',
        'Galoppera bredvid Nova. Gå vidare medan lamporna lyser, och galoppera igen när de slocknar.'],
    m4: ['Stjärnljuset ligger på en avsats under klippan.', 'Varje hopp svävar förbi. Du behöver falla rakt ner.',
        'Hoppa ut över avsatsen och göm dig mitt i luften. Skalet faller som en sten.'],
    m5: ['Från Spiran ser man hela himlen.', 'Stenarna hänger som en trappa ut över kanten.',
        'Hoppa från sten till sten ända upp. Här bär varje hopp långt.'],
    fin: ['Raketen kan inte flyga utan sin fena.', 'Mira ritade den. Hon kan rita den igen.',
        'Gå fram till raketen och rita fenan med Miras penna.'],
    s1: ['Karlavagnens streck är inte dragna.', 'Dina hovar ritar när du springer riktigt fort.',
        'Ta sats på Hamnstenen och galoppera ut längs det streckade strecket, förbi alla sju stjärnorna.'],
    s2: ['De tre stjärnorna tänds i en viss ordning.', 'Novas lampor blinkar ordningen. Prata med henne, så visar hon igen.',
        'Sväva till stjärnorna i den ordningen och landa på var och en: mitten, vänster, höger.'],
    // (the design's draft said "utsuddad", which is too early: section 7)
    s3: ['Björnen sover på ett stjärnljus, och ingen kan väcka honom.', 'Hans nos är bara streckad. Utan nos känner han ingen doft av frukost.',
        'Ta sats över hans rygg och galoppera längs den streckade nosen.'],
    s4: ['Pip snurrar i en bana runt stenen.', 'Den som simmar sparkar sig ur banan. Ett skal som ligger stilla följer med.',
        'Sväva in i banan och göm dig. Skalet går i omlopp och möter Pip.'],
    r1: ['Grusskurarna knuffar dig bakåt.', 'I skalet känns gruset inte. Bakom isblocken är det lä.',
        'Göm dig när det glimmar, och gå vidare när skuren har dragit förbi.'],
    r2: ['Tre banor går runt planeten. Bara en går hela vägen.', 'Någon har lämnat rosa smulor i en av dem.',
        'Ta sats, hoppa från ringens ände mot den mellersta banan och göm dig i luften.'],
    r3: ['Stjärnljuset sitter fast i isen. Is smälter i sol.', 'Solen börjar vid strecket längre fram på ringen.',
        'Ställ dig bakom blocket och knuffa det ända in i solen.'],
    r4: ['Kometen stannar inte för någon. Men den vilar ett andetag vid Rastplatsen.', 'Dess bana korsar ringen. Ett skal följer med banan.',
        'Sväva in i Kometens bana och göm dig. Vid Rastplatsen plockar du ljuset ur svansen.'],
    // (the gap can be reached before hypothesis 3: "borta", not the draft's "utsuddad")
    r5: ['Ringen är borta här, men märket finns kvar.', 'Hovarna ritar isen igen i full galopp. Vänta ut skuren först.',
        'Ta sats och galoppera ut på det streckade strecket precis när en skur har dragit förbi.'],
    v1: ['Här finns inget ritat. Men papperet minns var strecken satt.', 'Märkena är streckade linjer.',
        'Galoppera längs ett märke, så ritas marken under hovarna.'],
    v2: ['I dimman syns inga märken.', 'Klos lykta lyser bara när hans klor är stilla. Han är stilla när du är det.',
        'Göm dig i skalet och vänta en stund. Lyktan visar nästa märke.'],
    // (Suddet is not met until Smulhögen: "något", not the draft's "Suddet")
    v3: ['Något suddar ut bron bakom dig. Dina streck är sneda.', 'Ett skal är inget streck. Det går inte att sudda.',
        'Göm dig i ljusringen vid brons början. Nova lyfter skalet över.'],
    // Smulhögen, before the Moon is touched: the small pink one is up on the hill (not named yet)
    v4: ['Den lilla rosa är uppe på smulhögen.', 'Gå uppför högen, mot månen.', 'Gå ända upp, nära månens kant.'],
    v5: ['Suddet har suddat dina konturer. Men färgen sitter kvar.', 'Alvas penna sitter i dina hovar. Den ritar när du springer fort.',
        'Galoppera! Varje kliv ritar en bit av dig själv.'],
    g1: ['Kometens svans är rak. Den suddar Suddet aldrig.', 'Suddet rider på ditt skal och ritar stjärnor när du springer fort.',
        'Galoppera längs hela svansen, ända fram till Kometens huvud. Stannar du går inget förlorat.'],
    f1: ['Kometen kan inte bromsa, och månen är för långt bort för ett hopp.', 'Nova fångar ett skal som ligger stilla. Precis som i kratern.',
        'Ta sats, hoppa från Kometens huvud och göm dig mitt i luften.'],
    f2: ['Månens kant är utsuddad, men märket finns kvar.', 'Hovarna ritar i full galopp. På månen blir kliven långa.',
        'Ta sats och galoppera längs hela den streckade kanten.'],
    home: ['Alla tio ljusen ligger under Novas kupa.', 'Stjärnornas märken sitter kvar ovanför Novas krater.', 'Gå till Novas krater.'],
    more: ['Det finns fler stjärnljus. Novas klo lyser när ett är nära.',
        'Titta på stjärnkartan i dagboken: där står hur många du har hittat på varje plats.',
        'Res dit det fattas ljus, och prata med Nova där.']
};

/** Pekklon (3.5): what Nova says when "Prata" finds a light near her, by where it lies. */
export const POINT = {
    up: 'Min klo lyser. Uppåt.',
    down: 'Min klo lyser. … Neråt.',
    side: 'Min klo lyser. … Åt det hållet. Långt.',
    near: 'Min klo lyser. … Alldeles nära. Titta bättre.'
};

// ---------------------------------------------------------------------------
// The red thread (section 7): what the research team finds out, in the order it can be found
// ---------------------------------------------------------------------------
export const CLUES = {
    ten: 'Alvas tio stjärnor är borta. Hon ritade en för varje år när hon fyllde tio.',
    light: 'Stjärnans ljus blir kvar när stjärnan försvinner. Det driver iväg.',
    white: 'Hålen i himlen är vita. Ett svart hål är det inte.',
    // (the draft's "Fenan var bortsuddad" is written in too early: section 7)
    crumbs: 'Vid raketen låg rosa smulor. Fenan var borta.',
    rubber: 'Smulorna är gummi. Stora björnen känner lukten.',
    photo: 'Pip har tagit en bild av tjuven: liten, rosa och kantig.',
    crooked: 'Bara de sneda stjärnorna är borta. De raka är kvar.',
    gone: 'Vid Alvas bord är suddet försvunnet.',
    sudd: 'Det är Suddet. Det suddar ut allt som är snett, för det tror att det hjälper.',
    colour: 'Färg går inte att sudda. Bara blyerts.',
    milky: 'Ett sudd kan rita på en mörk himmel. Så blev Vintergatan till.'
};
export const CLUE_ORDER = ['ten', 'light', 'white', 'crumbs', 'rubber', 'photo', 'crooked', 'gone', 'sudd', 'colour', 'milky'];

/** Novas rymdfakta (13.5): true, in her voice; checked against ordinary school astronomy on 12 November 2026. */
export const FACTS = {
    sixth: 'På månen väger du bara en sjättedel av vad du väger hemma.',
    prints: 'Det finns ingen luft och ingen vind på månen. Ett hovspår ligger kvar i miljoner år.',
    night: 'Natten på månen varar i två veckor.',
    side: 'Månen vänder alltid samma sida mot jorden.',
    sound: 'I rymden hörs inget ljud. Det finns ingen luft som kan bära det.',
    wagon: 'Karlavagnen är en del av stjärnbilden Stora björnen.',
    belt: 'Orions bälte är tre stjärnor på rad.',
    twinkle: 'Stjärnor blinkar inte i rymden. Det är jordens luft som får dem att blinka.',
    rings: 'Saturnus ringar är gjorda av is och sten.',
    tail: 'En komets svans pekar alltid bort från solen.',
    sun: 'Solen är en stjärna.',
    milky: 'Vintergatan är vår galax. I den finns flera hundra miljarder stjärnor.'
};
export const FACT_ORDER = ['sixth', 'prints', 'night', 'side', 'sound', 'wagon', 'belt', 'twinkle', 'rings', 'tail', 'sun', 'milky'];

/** Vykort hem (13.6): Klo writes Tukankrabban from each page; read, not spoken. The last is her answer. */
export const POSTCARDS = {
    mane: 'Kära Tukankrabban! Här väger jag ingenting. Det gör inte mitt hjärta heller, när jag tänker på dig. Hälsa ungarna. /Klo',
    stjarn: 'Kära Tukankrabban! Här glänser allt. Du skulle bli tokig. Jag har träffat en forskare som kan mer än jag. Jag antecknar. /Klo',
    ring: 'Kära Tukankrabban! Lyktan du gav mig lyser varje gång jag skriver till dig. Hur växer Lilla Klo? /Klo',
    sudd: 'Kära Tukankrabban! Här finns ingenting alls. Då märker man vad man saknar. /Klo',
    end: 'Kära Tukankrabban! Titta upp i natt. Den nya stjärnbilden har hovar. Jag kommer hem med ett teleskop. /Din Klo',
    answer: 'Käre Klo! Vi såg allt härifrån. Lilla Klo har ritat av stjärnbilden, med elva ben. Den glänser mer än guldmyntet. Kom hem snart. Ta med teleskopet – och den sura. /Din Tukankrabba'
};

// "Prata" when there is no hint to give (11.14); novaAfter only after the story
export const CHATTER = {
    nova: [
        'Solen är en stjärna. Det vet alla. Nästan.',
        'Jag är inte sur. Jag är på morgonhumör. Hela dagen.',
        'Fråga mig efter frukost. Nästa frukost.',
        'Jag har haft rymden för mig själv i tusen år. Det var … tyst.',
        'Stjärnor blinkar inte här uppe. Det är er luft som blinkar.',
        'Mina lampor är inte till för att tittas på.'
    ],
    klo: [
        'Här väger jag ingenting. Mitt hjärta väger lika mycket som vanligt.',
        'Jag antecknar allt hon säger. Hon säger väldigt mycket.',
        'Expert på land och vatten. Och, från och med nu, lite på rymden.',
        'Lyktan lyser när jag tänker på henne. Den lyser ganska ofta.'
    ],
    novaAfter: 'Ringo är inget namn på en planet. … Det är ett ganska bra namn.'
};

// ---------------------------------------------------------------------------
// The research notebook: Forskningsdagbok · De försvunna stjärnorna (ui.mjs journal, section 13). Read, not
// heard: nothing here is recorded.
// ---------------------------------------------------------------------------
export const NOTEBOOK = {
    head: 'Forskningsdagbok · De försvunna stjärnorna',
    title: 'Forskningsdagbok',
    subtitle: 'De försvunna stjärnorna',
    tabs: ['Framsida', 'Vad vet vi?', 'Stjärnkartan', 'Frågan', 'Det vet vi', 'Mätningar', 'Hemligt'],
    coverLine: 'En ny sida i forskningsdagboken. Den här gången är det natt.',
    team: 'Forskarlaget: Sköldhästen, Professor Klo och Nova',
    teamAfter: 'Forskarlaget: Sköldhästen, Professor Klo, Nova och Suddet',
    mission: 'Vårt uppdrag', why: 'Därför', next: 'Nästa steg',
    kupa: 'Novas kupa',
    kupaAria: (n, total) => `${n} av ${total} stjärnljus under Novas kupa`,
    constellationNote: 'Nu lyser de som en stjärnbild: Sköldhästen.',
    here: place => `Här är vi: ${place}`,
    hint: 'Visa en ledtråd', hintMore: 'En ledtråd till',
    noteFrom: 'Lapp',
    // the sky chart (Stjärnkartan)
    chart: 'Stjärnkartan', chartUnknown: '?',
    chartLights: (n, total) => `${n} av ${total} ljus`, chartLightsUnknown: '? ljus', chartHere: 'Här är vi',
    chartAria: (text) => `Stjärnkartan: ${text}`,
    ringo: 'Ringo', milky: 'Vintergatan', constellationName: 'Sköldhästen',
    // the question, the answer, and the numbered hypotheses
    question: 'Frågan', questionText: 'Vem tar Alvas stjärnor – och varför?',
    answer: 'Svaret',
    answerText: 'Det var Suddet, Alvas suddgummi. Det suddade ut allt som var snett, för det trodde att det hjälpte.',
    hypotheses: 'Hypoteserna',
    hyp: [
        ['Hypotes nummer ett (Nova)', 'Ett svart hål slukar dem.'],
        ['Hypotes nummer två (Klo)', 'Någon samlar på dem. Som Skatan.'],
        ['Hypotes nummer tre (Klo och Nova)', 'Någon suddar ut dem.'],
        ['Hypotes nummer fyra (Kometen och Nova)', 'Den tar bara de sneda.']
    ],
    confirmed: 'Stämmer!', notConfirmed: 'Stämmer inte',
    hypMore: 'Fler hypoteser kommer när vi forskar vidare.',
    // what we know
    clues: 'Det vet vi', cluesEmpty: 'Inget än. Vi har precis börjat forska.',
    cluesAfter: { white: 'Nu är de fyllda.', gone: 'Det sover i pennfodralet.' },
    facts: 'Novas rymdfakta',
    // Häst eller sköldpadda? in space (section 14)
    measures: 'Mätningar', measuresQuestion: 'Häst eller sköldpadda?',
    measuresIntro: 'Professor Klo mäter vidare – ända ut i rymden.',
    measuresEmpty: 'Inga mätningar än.',
    horseThings: 'Hästsaker', turtleThings: 'Sköldpaddssaker', otherThings: 'Övriga mätningar',
    tally: (h, t) => `Hästsaker: ${h}. Sköldpaddssaker: ${t}.`,
    tallyHorse: 'Lutar åt häst.', tallyTurtle: 'Lutar åt sköldpadda.', tallyEven: 'Det står lika.',
    measure: {
        moonJump: 'Hoppade upp på en hylla. På månen.',
        angry: 'Klapprade så att en rymdkrabba lyste.',
        wagon: 'Ritade Karlavagnen med hovarna.',
        nose: 'Ritade en björns nos i full galopp.',
        ice: 'Knuffade ett isblock ut i solen.',
        gap: 'Ritade en ring av is.',
        milky: 'Galopperade fram Vintergatan. På en komet.',
        rim: 'Ritade månen hel med hovarna.',
        beam: 'Lyftes i en ljusstråle. Sprattlade inte.',
        drop: 'Föll som en sten. På månen.',
        orbit: 'Gick i omlopp som en liten måne.',
        gravel: 'Skalet höll för en grusskur.',
        comet: 'Åkte snålskjuts i en komets bana.',
        still: 'Låg så stilla att en lykta tändes.',
        noLine: 'Ett skal är inget streck. Gick inte att sudda.',
        caught: 'Fångades mitt i luften. Av en rymdkrabba.',
        weight: 'Vikt på månen: en sjättedel. Av en häst eller av en sköldpadda?',
        sling: 'Ett varv runt en planet: tjugotvå sekunder (Novas mätning).',
        mornings: 'Nova har varit morgonsur fyra gånger i dag.',
        self: 'Ritade sina egna kanter. Det gör varken hästar eller sköldpaddor.'
    },
    measuresConclusion: 'Slutsats: åtta mot åtta. Den är ingetdera – den är en egen stjärnbild. Forskningen fortsätter.',
    // the page Suddet rubbed out (from notes until ink, in the finale)
    rubbedNote: 'Suddet tog Klos anteckningar.',
    inkNote: 'Skrivet med bläck den här gången.',
    postcards: 'Vykort hem',
    // the secrets, found after the story (each line is written in when it is found)
    secrets: 'Hemligt',
    secretsLocked: 'Hemligt! Den här sidan fylls i när stjärnorna är hemma igen.',
    secretsIntro: 'Rymden har fler hemligheter. Leta, lyssna och prova!',
    secretsCount: (n, t) => `${n} av ${t} hemliga upptäckter`,
    secretsOpen: 'Till de hemliga upptäckterna',
    secretsAll: 'Alla hemligheter hittade. Riktiga rymdforskare!',
    secretUnknown: where => `Något hemligt ${where} …`,
    secretWhere: {
        mane: 'på Månen', stjarn: 'i Stjärnbildsfältet', ring: 'på Ringplaneten', sudd: 'i Det vita hålet',
        vinter: 'i Vintergatan', any: 'någonstans i rymden'
    },
    secret: {
        silentNeigh: 'Ett gnägg hörs inte i rymden. Men Novas klo hör allt.',
        earthrise: 'Från Utsikten ser man den magiska skogen. Molnet blinkar hej.',
        suddStar: 'Suddet ritar en ny stjärna varje natt. En liten.',
        secondBox: 'Två askar kometflingor ger en liten supernova.',
        bearSnore: 'Stora björnen somnar om när man ligger stilla bredvid.',
        pipPhoto: 'Pip har tagit en bild av dig i omlopp.',
        cometRace: 'Kometen tycker att du är snabb. För en vad-du-nu-är.',
        whiteDraw: 'Det vita hålet är ett tomt papper. Det du ritar där får vara kvar.'
    }
};
