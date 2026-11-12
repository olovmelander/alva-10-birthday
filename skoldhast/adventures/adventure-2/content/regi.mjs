/*
 * Äventyr 2: Den magiska skogen – the direction for the recordings (docs/skoldhast/voices.md, design
 * docs/skoldhast/adventure-3.md section 17.2). Never loaded by the game: scripts/skoldhast-voice.mjs reads it when it
 * records.
 *
 * Äventyr 2 was first recorded plain, as written (5 November 2026). On 12 November Pappa heard a before/after trial
 * (the audition page "Röstprov", round three: 31 lines of Äventyr 1 and 2 in six scenes, as the game plays them and
 * recorded again with direction); direction won all six scenes, and he chose to record every line again with it.
 * Scenes s4 ("Molnet på Åsktoppen") and s5 ("Klo är kär") are lines of this adventure: their tags here are the ones
 * he approved, word for word.
 *
 * English audio tags in square brackets come before the words they colour, two or three words each, mid-line too;
 * Eleven v4 acts them and does not read them aloud. The tags never touch what is shown: with the tags taken out, a
 * line here is exactly its text in sv.mjs (that text is the clip's key). tests/skoldhast-regi.test.mjs checks that
 * every entry matches exactly one line, that no line has two, and that every line of dialogue has its own.
 *
 * DEFAULT is the tag of every line that has no entry of its own (hints, where the next egg is, the sköldhäst's
 * thoughts, refusals). LINES has the story's, the table's and the chatter's lines: [voice, say].
 */

export const DEFAULT = {
    horse: 'thoughtful, to itself',
    klo: 'helpful, curious',
    tukan: 'curious, bubbly',
    alva: 'warm, encouraging',
    mira: 'eager, playful',
    dyvel: 'grumpy, gravelly',
    skata: 'vain, chatty',
    moln: 'soft, timid',
    narrator: 'warm, storytelling'
};

export const LINES = [
    // arrive
    ['tukan', '[counting, then dismayed] Ett, två … noll! [distraught] Stormen tog alla mina tio ägg – [wailing] och mitt guldmynt!'],
    ['horse', '[kind, reassuring] Vi hjälper dig att leta. [friendly] Jag är Sköldhästen, och det här är …'],
    ['klo', '[stammering, starstruck] P-p-professor Klo. [trying to impress] Expert på land och vatten. [improvising] Och på … ägg. Från och med nu.'],
    // arrive2
    ['horse', '[teasing, amused] Sedan när är du expert på ägg?'],
    ['klo', '[caught out, sheepish] Sedan … nyss.'],
    ['tukan', '[delighted] En forskare! Jag är också forskare. [dreamy, proud] Jag forskar i allt som glänser.'],
    // claws
    ['horse', '[astonished] Dina klor … de har näbbar!'],
    ['tukan', '[proud, cheerful] Tukanklor! Med dem plockar jag kakaobönor och månskensfrön.'],
    ['klo', '[dazzled, breathless] Fantastiskt. [shaky, writing] Jag antecknar … med darrande klo.'],
    // arrive3
    ['tukan', '[tender, explaining] Mina ägg kläcks bara när månen går upp – i den varma sanden här i boet.'],
    ['horse', '[puzzled, looking up] Månen? Men det finns ingen måne här.'],
    ['tukan', '[hopeful] Den kommer. Den kommer alltid. [unsure, small] Tror jag.'],
    // mystery
    ['horse', '[determined, wondering] Men vem är det som stormar – och varför?'],
    ['tukan', '[eager, scholarly] Det ska vi forska på. [triumphant] Hypotes nummer ett: stormen kommer någonstans ifrån!'],
    ['klo', '[admiring, smitten] Briljant! Det hade jag aldrig kommit på.'],
    // firstEgg
    ['tukan', '[overjoyed] Det första ägget! [worried] Men om det ligger i boet blåser stormen bort det igen.'],
    ['horse', '[gentle, protective] Jag bär äggen i mitt skal. Där har de det varmt och tryggt.'],
    ['klo', '[amused, writing] En äggkorg med hovar. Jag antecknar.'],
    // alvaFirstEgg
    ['alva', '[proud, cheerful] Ett av tio! Jag skriver upp det i forskningsdagboken.'],
    ['tukan', '[shy, touched] Alva, är det du som har ritat mig? [grateful] Tack för tukanklorna!'],
    ['alva', '[warm, smiling] Varsågod! [encouraging] Nu hittar vi de andra nio.'],
    // allEggs, allEggsHome
    ['tukan', '[ecstatic] Tio! Alla tio! [softer, hopeful] Nu behöver de bara en måne.'],
    ['horse', '[happy, eager] Då går vi hem till boet. Molnet väntar där!'],
    // love
    ['klo', '[dreamy, sighing] Hennes klor … två små tukaner. [lovestruck] Och båda ler mot mig!'],
    ['horse', '[gently, noticing] Klo, dina klor skakar.'],
    ['klo', '[flustered, hasty] Det är … stormen. [unconvincing] Jag fryser.'],
    ['klo', '[breathless, worried] Jag mätte mina hjärtslag med stoppuret. Hundrafyrtio slag i minuten!'],
    ['horse', '[innocent, curious] Är det mycket?'],
    ['klo', '[dazed, solemn] För en krabba är det … ett vetenskapligt mysterium.'],
    ['horse', '[teasing, curious] Klo, varför har du ritat hjärtan i anteckningsboken?'],
    ['klo', '[too quickly] Det är inga hjärtan. [dignified] Det är … diagram.'],
    ['tukan', '[admiring, oblivious] Vilka fina diagram!'],
    ['tukan', '[shy, hopeful] Professor Klo, vill du forska med mig när äggen har kläckts?'],
    ['klo', '[stammering, overjoyed] J-ja! Ja. Ja, ja, ja.'],
    ['horse', '[dry, amused] Han menar ja.'],
    // alvaLove
    ['alva', '[giggling, teasing] Jag visste det! Klo är kär.'],
    ['mira', '[teasing, playful] Kär, kär, kär!'],
    ['klo', '[flustered, too loud] Jag hör inte. [mumbling] Det är … stormen. Den mullrar så.'],
    // lightning
    ['klo', '[awed, nervous] Varje blixt lyser upp hela skogen. Som en jättelik ficklampa.'],
    ['tukan', '[thoughtful, intrigued] Som om någon vill se något i mörkret … [curious] Intressant!'],
    // grove
    ['tukan', '[excited, pointing] Mjölkchokladträdet! Där uppe sitter mitt ägg fast bland kakaofrukterna!'],
    ['horse', '[looking up, rueful] För högt för mig.'],
    ['klo', '[knocking, curious] Trädets rötter går in under den ihåliga stocken. [listening] Hör du hur det ekar?'],
    // fallen
    ['tukan', '[relieved, delighted] Det föll! Rakt ner i de mjuka löven.'],
    ['klo', '[shy, offering] Och här … en kakaofrukt. Till dig. [awkward] Den föll också.'],
    ['tukan', '[thrilled] Mjölkchoklad! Min favorit. [warmly] Tack, Klo!'],
    // klyft
    ['horse', '[disappointed] En bro – men den är bara streckad.'],
    ['mira', '[proud, then sheepish] Den ritade jag! [embarrassed] Men jag glömde att rita klart den.'],
    ['alva', '[encouraging, bright] Min penna sitter kvar i dina hovar. [rallying] Galoppera, så ritar du klart Miras bro!'],
    // bridgeDone
    ['mira', '[delighted] Nu blev den hel! [grateful] Tack, Sköldhästen!'],
    ['klo', '[hushed, a bit uneasy] På andra sidan börjar Djupa skogen.'],
    // skogArrive
    ['tukan', '[excited, pointing] Där uppe på grenen! Ett ägg!'],
    ['horse', '[measuring, doubtful] Så högt kan jag inte hoppa.'],
    ['klo', '[sly, hinting] Den där svampen ser mjuk ut. [thoughtful] Som en studsmatta …'],
    // fors
    ['tukan', '[eager, mysterious] Forsen! Någonstans bakom den går en gång in i berget.'],
    ['horse', '[worried] Men forsen trycker bort allt som simmar.'],
    ['klo', '[thinking aloud] Allt som simmar, ja. [sly hint] Men det som sjunker …?'],
    ['tukan', '[knowing, eager] Forsen! Det är här bakom som gången in i berget ska finnas.'],
    // Mira at the river and the falls
    ['mira', '[proud, beaming] Floden ritade jag med min allra blåaste penna!'],
    ['mira', '[proud, delighted] Forsen blev min finaste. [excited] Hör hur den brusar!'],
    // the cave behind the falls
    ['horse', '[surprised, excited] Bakom forsen! [wondering] Och här går en gång rakt in i berget.'],
    ['tukan', '[uneasy, peering] Men där inne är det kolsvart. [thoughtful] Vi behöver något som lyser.'],
    ['tukan', '[brave, cheerful] Där inne är det kolsvart. [encouraging] Kom, månskensfröet visar vägen!'],
    ['tukan', '[triumphant] Nu har vi vår lykta! [encouraging] Kom, månskensfröet visar vägen in i berget.'],
    // seeds
    ['tukan', '[hushed, wonder] Månskensblommor! [whispering] De slår bara ut när allt är alldeles stilla – och då lyser fröna.'],
    ['klo', '[uneasy, listening] Och hör du? Det mullrar mest när det är som mörkast.'],
    ['tukan', '[inspired] Hypotes nummer två: stormen är värst när det är som mörkast!'],
    // seedsLit
    ['tukan', '[awed, delighted] De slår ut! [wonder] Titta, de lysande fröna flyger in i grottan.'],
    ['tukan', '[practical, cheerful] Jag tar med ett frö som lykta. Det lyser var vi än går.'],
    ['klo', '[relieved, brave] En lykta! Nu kan vi gå in där det är kolsvart.'],
    ['tukan', '[proud, scholarly] Jag har forskat på månskensfrön i tre år. [confiding, munching] Mest genom att äta dem.'],
    ['klo', '[impressed, smitten] Tre år! [searching for words] Vilken … uthållighet.'],
    ['alva', '[amused, matter-of-fact] Månskensfrön äter hon i stället för solrosfrön. [proud] Det har jag bestämt.'],
    // beetle
    ['dyvel', '[gruff, protective] Rör inte min boll! [proud] Det är världens finaste boll.'],
    ['tukan', '[alarmed] Mitt ägg sitter fast mitt i den!'],
    ['dyvel', '[unconvinced, grumbling] Jaså? Jag trodde det var en sten. [stubborn] En glänsande sten.'],
    ['dyvel', '[grudging, gruff] Hmpf. Ta ägget, då. [smug] Om ni får loss det.'],
    ['klo', '[thinking, sly] Bollen är gjord av jord. [hinting] Och vad tvättar bort jord?'],
    ['dyvel', '[proud, grumbling] Min boll ska bli den rundaste i hela skogen. Hmpf.'],
    ['dyvel', '[grumpy, busy] Hmpf. Stör mig inte. [scheming] Jag tänker ut en ny boll – en ännu finare.'],
    ['dyvel', '[dismayed] Min boll! Nu är båda borta … [sighing, resigned] Ja ja. Jag rullar en ny. En ännu finare.'],
    // washed
    ['tukan', '[relieved, excited] Floden tvättade bort jorden. Där ligger mitt ägg!'],
    ['dyvel', '[dismayed] Min boll! … [sighing, resigned] Ja ja. Jag rullar en ny. En ännu finare.'],
    // magpie
    ['skata', '[possessive, preening] Min pärla! En stor, glänsande pärla! [haughty] Ingen får röra den.'],
    ['tukan', '[indignant] Det är ingen pärla! Det är mitt ägg!'],
    ['skata', '[haughty, bargaining] Jag byter bara mot något som glänser ännu mer.'],
    ['tukan', '[excited idea] Mitt guldmynt! Det skulle hon älska. [remembering] Jag såg stormen blåsa ner det i Djuphålan.'],
    ['klo', '[uneasy, thoughtful] Djuphålan – mitt i floden.'],
    ['alva', '[amused, knowing] Precis som tukankrabbor! [fond] De älskar allt som glänser – pärlhalsband och guldmynt.'],
    ['tukan', '[brightening] Något som glänser mer? [eager] Vi har ju mitt guldmynt!'],
    ['skata', '[dismissive, vain] Bara något som glänser mer än pärlor. Så är det med det.'],
    ['skata', '[preening, vain] Guldmyntet klär mig, eller hur? [admiring herself] Nästan lika fint som mina fjädrar.'],
    // coin
    ['horse', '[breathless, triumphant] Skalet snurrade ända ner till botten – där låg guldmyntet!'],
    ['tukan', '[overjoyed] Mitt guldmynt! [eager] Nu kan vi byta med Skatan.'],
    ['tukan', '[delighted, dreamy] Mitt guldmynt! Det glänser nästan som ett ägg.'],
    // climb
    ['klo', '[looking up, measuring] Skatans bo sitter högt upp. Grenarna går som trappsteg uppför stammen.'],
    // trade
    ['skata', '[gasping, dazzled] Åh! Det glänser som en liten sol!'],
    ['skata', '[reluctant, graceful] Här, ta ditt … ägg. [sniffy] Det glänser nästan lika fint.'],
    ['skata', '[gossiping, lowered] Förresten: jag har hört ett moln gråta högt uppe i stormen. [sad] Det låter så sorgligt.'],
    ['tukan', '[joyful] Mitt ägg! [thoughtful, intrigued] Och ett spår: ett moln som gråter.'],
    ['tukan', '[happy, polite] Mitt ägg! Tack, Skatan.'],
    // leap
    ['tukan', '[excited, pointing] På andra sidan ravinen! Ett ägg i ett gammalt fågelbo.'],
    ['horse', '[doubtful, measuring] Det är för långt att hoppa. Även för mig.'],
    ['klo', '[thinking aloud, sly] Om man galopperar nerför den fallna stammen går det fortare och fortare …'],
    ['horse', '[exhilarated, breathless] Jag flög! [laughing] Nästan i alla fall.'],
    ['klo', '[thrilled, scribbling] Ett nytt rekord! Det skriver jag upp direkt.'],
    ['alva', '[amazed, delighted] Oj! Det är det längsta språnget jag någonsin har sett!'],
    ['tukan', '[urgent, eager] Vi kommer inte över! [idea] Dra i lianen, så får vi en bro.'],
    // tree
    ['klo', '[awed, craning] Jätteträdet! Kronan syns inte ens härifrån.'],
    ['horse', '[determined, looking up] Grenarna slingrar sig ända upp till kronan. [hopeful] Där uppe ser man nog var stormen kommer ifrån.'],
    // source
    ['klo', '[breathless, awed] Här uppifrån ser man hela den magiska skogen!'],
    ['horse', '[gasping, pointing] Och där borta, bakom forsen … [ominous] ett berg där stormen snurrar!'],
    ['tukan', '[triumphant] Åsktoppen! Hypotes nummer ett stämmer: stormen kommer därifrån!'],
    ['mira', '[worried, small] Mitt lilla moln … [guilty] Är det mitt moln som stormar?'],
    ['alva', '[gentle, reassuring] Det får vi ta reda på. [steady] Det är det forskare gör.'],
    ['alva', '[serious, explaining] Vägen till Åsktoppen går genom berget, och där inne är det kolsvart.'],
    ['tukan', '[bright idea] Månskensfrön lyser i mörker! Det växer månskensblommor i Rotgrottan.'],
    ['tukan', '[mysterious, eager] Det sägs att en gång bakom forsen leder in i berget. [triumphant] Och vi har vår lykta!'],
    ['tukan', '[confident, eager] Gången bakom forsen leder in i berget! Och nu har vi vår lykta.'],
    ['horse', '[recognizing, amazed] Och där borta bakom forsen: berget vi var inne i! [ominous] Stormen snurrar runt toppen.'],
    ['tukan', '[brisk, cheerful] Vägen dit har vi redan hittat. [rallying] Tillbaka in i berget!'],
    ['horse', '[wistful, soft] Och där borta ligger Åsktoppen. Där satt molnet alldeles ensamt.'],
    ['mira', '[happy, relieved] Nu är mitt moln inte ensamt längre. [excited] Snart får det sin måne!'],
    // kristall
    ['tukan', '[determined, then distracted] Kristallgrottan! Här inne ska vi … [gasping, enchanted] Åh! Det glittrar där. Och där. Och där!'],
    ['horse', '[patient, amused] Tukankrabban? [gently prodding] Stormen, du vet. Vi letar efter stormen.'],
    ['klo', '[tense, listening] Hör ni? Det mullrar högt ovanför oss. [worried] Stormen är nära.'],
    // plates
    ['alva', '[gentle, explaining] Kristaller ringer som klockor när man rör vid dem.'],
    ['tukan', '[uneasy, thoughtful] Och klyftan där framme är kolsvart. [hopeful] Kan kristallerna lysa upp den?'],
    ['klo', '[noticing, curious] Titta, en av dem blinkar. [hushed] Som om den väntar på sin tur.'],
    // k1Done
    ['tukan', '[enchanted] En bro av kristall! Den klingar när du går på den.'],
    ['klo', '[playful, delighted] Pling, plong! Du spelar ju xylofon med hovarna.'],
    // lake
    ['horse', '[worried, looking ahead] Sjön tar slut vid en klippvägg. Hur kommer vi förbi?'],
    ['tukan', '[scholarly, explaining] Under väggen går det strömmar. [counting] På botten ligger tre kristaller: en vit, en blå och en grön.'],
    ['klo', '[pondering, slow] Vit som ett ägg … [hinting] Det kanske betyder något.'],
    ['horse', '[exhilarated, breathless] Den vita strömmen tog mig rakt under väggen!'],
    // glitter
    ['dyvel', '[surprised, gruff] Du igen! [proud] Jag rullade min nya boll ända hit in i berget. En glitterboll!'],
    ['tukan', '[pleading, enchanted] Åh! Får jag forska på den? [wheedling] Bara lite? Bara en vecka?'],
    ['dyvel', '[grudging, gruff] Hmpf. Ni får låna den. [warning] Men akta glittret.'],
    ['dyvel', '[surprised, gruff] Du igen! [proud] Det här är min andra boll. Jag rullade den ända hit in i berget. En glitterboll!'],
    ['dyvel', '[fussy, grumbling] Akta glittret, sa jag. Bollen är nyrullad.'],
    ['dyvel', '[gloomy, then proud] En plattboll. Hmpf. [making the best] Den rundaste i hela dammen, i alla fall.'],
    ['klo', '[reasoning, precise] Porten där borta öppnas nog om båda plattorna i dammen trycks ner.'],
    // gateOpen
    ['horse', '[surprised, delighted] Porten öppnas!'],
    ['tukan', '[thrilled] Ett ägg! [wondering] Och där bakom bubblar en källa uppåt.'],
    ['dyvel', '[gloomy, resigned] Min glitterboll ligger kvar i dammen. [sighing] Ja ja. Nu är den en plattboll.'],
    ['klo', '[thoughtful, hinting] Källan stiger upp genom berget. Ett skal som ligger stilla flyter nog med.'],
    // topp
    ['horse', '[breathless, astonished] Källan kastade upp oss … ända upp på berget!'],
    ['tukan', '[shouting over wind] Åsktoppen. Här blåser det som värst.'],
    ['klo', '[bracing, determined] Och högst upp snurrar stormen. Där får vi svar på vår fråga.'],
    ['tukan', '[triumphant, windswept] Åsktoppen! Hypotes nummer ett stämmer: stormen kommer härifrån!'],
    // windKlo
    ['klo', '[heroic, straining] Ta min klo, Tukankrabban! Jag håller i dig.'],
    ['tukan', '[adoring, laughing] Min hjälte! [giggling] Du fladdrar rakt ut som en vimpel.'],
    ['klo', '[flapping, dignified] Det är … en vetenskaplig flygning.'],
    // blixtbro
    ['horse', '[alarmed] Ett stup! Och ingen bro.'],
    ['klo', '[hesitant, then excited] Vänta … titta när det blixtrar! [amazed] Där syns en bro av ljus.'],
    ['mira', '[thrilled, proud] Mina blixtar ritar en bro! [urgent, cheering] Galoppera när det blixtrar!'],
    // t2Done
    ['alva', '[proud, impressed] Du ritade bron i blixtens sken. Snyggt gjort!'],
    ['tukan', '[enchanted, pleading] Åh, en bro som glänser! [wheedling] Får jag forska på den? Bara lite? Bara en vecka?'],
    ['horse', '[patient, dry] Tukankrabban. Stormen.'],
    // medvind
    ['tukan', '[inspired, excited] Hypotes nummer tre: om stormen snurrar, blåser den åt andra hållet här uppe!'],
    ['klo', '[admiring, smitten] Briljant! Det hade jag inte heller kommit på.'],
    ['horse', '[worried, looking ahead] Och stigen tar slut där framme. Så långt kan ingen hoppa.'],
    // windCarried
    ['horse', '[exhilarated, proud] Vinden bar mig över! [cheeky] Det där räknas som flygning.'],
    ['klo', '[formal, then giddy] Mätning klar: hypotes tre stämmer. [awed] Vindstyrka: väldigt.'],
    ['tukan', '[hushed, worried] Hör ni? Det låter som om någon gråter där uppe.'],
    // summit
    ['moln', '[sniffling, scared] Snyft … [small voice] Är det någon där? Det är så mörkt överallt.'],
    ['horse', '[surprised] Det är du som stormar! [softening, gently] Men … du är ju rädd?'],
    ['moln', '[tearful, whispering] Jag är rädd för mörkret. När jag blixtrar blir det ljust en liten stund.'],
    ['tukan', '[gentle, realizing] Hypotes nummer två stämmer! [softly] Du blixtrar för att kunna se – därför stormar det mest i mörkret.'],
    ['klo', '[puzzled, gentle] Men varför är det så mörkt på den här sidan?'],
    ['horse', '[realizing, soft] För att det inte finns någon måne. [gently] Mira … du ritade aldrig månen.'],
    ['mira', '[heartbroken] Mitt lilla moln! [remorseful] Förlåt – jag ritade blixtar och glömde din måne.'],
    ['alva', '[warm, reassuring] Det är ingens fel. Vi ritar månen när alla ägg ligger i boet – de kläcks bara när den går upp.'],
    ['moln', '[hopeful, wondering] En måne … Då blir det ljust på riktigt?'],
    ['moln', '[ashamed, shy] Förlåt för stormen. [offering, brighter] Här – jag har passat ett ägg åt er. Det blåste ända hit upp.'],
    ['tukan', '[moved, grateful] Mitt ägg! Du har hållit det varmt i stormen.'],
    ['moln', '[brave, eager] Hoppa upp på mig. Jag bär er hem!'],
    // homeWait
    ['horse', '[thoughtful, steady] Nu vet vi varför det stormar. Men några ägg saknas fortfarande.'],
    ['moln', '[earnest, trying] Jag väntar här ovanför boet. [small, promising] Och jag ska försöka låta bli att blixtra.'],
    // finale
    ['tukan', '[joyful, then careful] Alla tio! Lägg dem i sanden. [whispering, tender] Försiktigt, försiktigt.'],
    ['horse', '[tender, a little sad] Ut ur skalet nu, små ägg. Det har varit fint att bära er.'],
    // gather
    ['skata', '[curious, preening] Jag hörde att något glänsande skulle hända här.'],
    ['dyvel', '[gruff, pretending] Hmpf. Jag ville bara se. [mumbling] Inte för att jag bryr mig.'],
    ['moln', '[small, worried] Nu är alla här. Men det är fortfarande så mörkt …'],
    // forgive
    ['tukan', '[tender, kind] Du var bara rädd, lilla moln. [warmly] Nu är du en av oss.'],
    ['horse', '[gentle, kind] Alla är rädda ibland. [warm, smiling] Jag gömmer mig i skalet – och du blixtrar.'],
    // finale2
    ['horse', '[hopeful, eager] Mira! Nu behöver vi månen.'],
    ['mira', '[tender, proud] Den här är till dig, lilla moln. [grand, delighted] Den största månen som finns!'],
    ['alva', '[happy, joining in] Och jag ritar stjärnor runt månen!'],
    // moonUp
    ['moln', '[amazed, joyful] Det är ljust! [relieved] Jag är inte rädd längre.'],
    ['tukan', '[smug, joyful] Vad var det jag sa? Den kommer alltid. [laughing, unsure] Tror jag.'],
    // hatch
    ['tukan', '[ecstatic, counting] De kläcks! Ett, två, tre … tio! [overjoyed] Tio små forskare!'],
    ['klo', '[shy, nervous] Tukankrabban … [tender] jag har något till dig. Det mest glänsande jag äger.'],
    // gift
    ['tukan', '[touched, awed] Det glänser som månen! [tender] Här är vår lykta. Den lyser starkast när dina klor är stilla.'],
    ['tukan', '[warm, teasing] Och den minsta ungen döper jag till Lilla Klo.'],
    ['klo', '[overwhelmed, faint] Lilla … Klo …'],
    ['horse', '[dry, amused] Han svimmade. [fond] Av lycka, tror jag.'],
    // skataGift
    ['skata', '[generous, grand] Här, små ungar. Varje ny forskare behöver något som glänser.'],
    ['tukan', '[delighted, grateful] Mitt guldmynt! [warm, flattering] Tack, Skatan – du glänser mest av alla.'],
    // after the story
    ['tukan', '[grateful, warm] Tack för att du ritade mig, Alva. [joyful] Nu forskar vi i månskenet – allt glänser!'],
    ['tukan', '[proud, amused] De forskar på dig! [fond] Tio små forskare i rad – och Lilla Klo går först.'],
    ['moln', '[giggling, happy] Nu blixtrar jag för att det är roligt – inte för att jag är rädd!'],
    ['dyvel', '[gruff, embarrassed] Hmpf. Titta inte. Jag rullade en ny boll av äggskalen.'],
    ['dyvel', '[secretly proud] Den finaste hittills. [mumbling] Inte för att jag bryr mig.'],
    ['dyvel', '[stubborn, proud] Den är fortfarande den finaste. Hmpf.'],
    ['tukan', '[giggling, delighted] Hörde ni? Svampen fnissar!'],
    ['klo', '[scholarly, amused] Hypotes nummer fyra: svampar är kittliga. Det antecknar jag.'],
    ['tukan', '[awed, whispering] Ett stjärnfall! Det lossnade från Alvas stjärnor.'],
    ['klo', '[dreamy, then flustered] Då får man önska något. Jag önskar … [hasty] nej. Det är vetenskapligt hemligt.'],
    ['horse', '[amazed, pointing] Titta! En raket!'],
    ['horse', '[dreamy, wistful] Tänk hur det skulle vara att åka ut i rymden …'],
    ['klo', '[excited, scholarly] Rymden! Dit har ingen krabba forskat förut.'],
    ['tukan', '[dreamy, eager] Där uppe glänser allt. [determined] Det måste vi forska på!'],
    ['klo', '[shy, offering] En kakaofrukt till! [sheepish] Den är till dig … igen.'],
    ['tukan', '[delighted, touched] Mjölkchoklad! Du kom ihåg min favorit, Klo.'],
    ['klo', '[proud, matter-of-fact] Självklart. Det står i anteckningsboken. [lowering voice] Bredvid diagrammen.'],
    ['skata', '[mimicking, trying] Gnägg! … [considering] Hmm, nej. [haughty] Det klär mig inte. Jag håller mig till mitt eget.'],
    // Häst eller sköldpadda? (Klo's measurements)
    ['klo', '[excited, writing] Hovar! Jag antecknar en hästsak.'],
    ['klo', '[pleased, writing] Skalet igen! Jag antecknar en sköldpaddssak.'],
    ['klo', '[astonished, thrilled] Längre än någon sköldpadda har hoppat! [certain] En hästsak, utan tvekan.'],
    ['klo', '[puzzled, scholarly] Det står lika. [determined] Mer forskning behövs!'],
    ['klo', '[solemn, important] Häst eller sköldpadda? Nu har jag räknat färdigt.'],
    ['klo', '[warm, conclusive] Slutsats: både häst och sköldpadda – [tender] och båda behövdes i den magiska skogen.'],
    // the table: the prologue
    ['narrator', '[warm, inviting] En ny sida i forskningsdagboken.'],
    ['mira', '[eager, pleading] Alva! Får jag rita på nästa sida?'],
    ['alva', '[warm, generous] Klart du får. [imaginative] Vi ritar en magisk skog. Där bor tukankrabban.'],
    ['narrator', '[warm, storytelling] Alva ritar en orange krabba. [amused, wondering] Klorna är två tukanhuvuden!'],
    ['narrator', '[gentle, counting] … och nio ägg till. Tio små ägg i sanden.'],
    ['alva', '[fond, explaining] Hon gräver ner sina ägg vid floden. [laughing] Och hon är galen i forskning.'],
    ['mira', '[giggling, eager] Precis som Klo! [excited, rushing] Jag ritar träden. Och floden. Och en bro!'],
    ['narrator', '[gentle, knowing] Mira ritar en hängbro – men hon glömmer att rita klart den.'],
    ['mira', '[delighted, eager] Nu ritar jag ett moln. [thrilled] Ett litet moln med blixtar!'],
    ['mira', '[gleeful, admiring] Blixtar är det häftigaste som finns.'],
    ['alva', '[gentle, reminding] Det blir kväll på sidan. Mira, du ritar väl månen sen?'],
    ['mira', '[distracted, busy] Mm … blixtar först!'],
    ['narrator', '[hushed, ominous] Sidan blir mörk. Det lilla molnet mullrar …'],
    ['narrator', '[tense, storytelling] Det blixtrar – och molnet flyger iväg, bort mot bergen.'],
    ['narrator', '[dramatic, low] … och en storm blåser genom den magiska skogen.'],
    ['mira', '[alarmed, urgent] Alva! Äggen blåser iväg!'],
    ['narrator', '[lively, storytelling] Sköldhästen galopperar in på den nya sidan, och Professor Klo kilar efter.'],
    // the table: the epilogue
    ['narrator', '[calm, warm] Vid Alvas bord.'],
    ['mira', '[happy, tender] Mitt moln sover! [proud] Det har fått världens största nattlampa.'],
    ['alva', '[content, proud] Och tio små tukankrabbor kläcktes. [warm] Vi är ett bra forskarlag.'],
    ['mira', '[giggling, hopeful] Kan Klo och Tukankrabban gifta sig?'],
    ['alva', '[amused, mysterious] Forskning pågår.'],
    ['narrator', '[warm, closing] Slut – [smiling] men forskningen fortsätter.'],
    // chatter
    ['klo', '[confiding, dreamy] Jag antecknar allt. [lovestruck] Särskilt … henne.'],
    ['klo', '[satisfied, scholarly] Häst eller sköldpadda? Både och. Det står i dagboken.'],
    ['klo', '[wistful, fond] Mitt hjärta tickar som ett stoppur. [sighing, smiling] Fast stoppuret har hon nu.'],
    ['tukan', '[distracted, bubbly] Jag skulle säga något viktigt. [enchanted] Sen glittrade det.'],
    ['tukan', '[enthusiastic] Allt som glänser är intressant!'],
    ['tukan', '[admiring, playful] Ditt skal glänser! [judging, cheerful] Nio av tio i glans.'],
    ['tukan', '[scholarly, warm] Hypotes: ägg trivs bäst i varma skal.'],
    ['tukan', '[proud, showing off] Alva ritade mina klor. Är de inte fina?'],
    ['tukan', '[proud, fond] Lilla Klo har redan börjat anteckna.']
];
