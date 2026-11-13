/*
 * Äventyr 3: De försvunna stjärnorna – the direction for the recordings (docs/skoldhast/adventure-3.md, section 17.1).
 * Never loaded by the game: scripts/skoldhast-voice.mjs reads it when it records.
 *
 * Pappa chose direction line by line (12 November 2026, the audition page "Röstprov Äventyr 3", way B): every line is
 * acted. English audio tags in square brackets come before the words they colour, two or three words each, mid-line
 * too; Eleven v4 acts them and does not read them aloud. The tags never touch what is shown: with the tags taken out,
 * a line here is exactly its text in sv.mjs (that text is the clip's key). tests/skoldhast-a3-words.test.mjs checks
 * that every entry matches exactly one line, and that no line has two.
 *
 * DEFAULT is the tag of every line that has no entry of its own (hints, Nova's pointing words, chatter, remarks,
 * thoughts). LINES has the story's and the table's lines: [voice, say]. Pip is a sound, not a voice.
 *
 * The voices (section 17): Nova as first made; Suddet "Ljus och oskuldsfull"; Stora björnen "Jättelik bas"; Kometen
 * "Hes sportkommentator"; the others as in Äventyr 1 and 2. Recorded with stability 0.35, and every line of Äventyr 3 is
 * recorded (12 November; lines changed since are recorded again with them).
 */

export const DEFAULT = {
    horse: 'thoughtful, to itself',
    klo: 'helpful, a little nervous',
    nova: 'dry, deadpan',
    sudd: 'earnest',
    bjorn: 'slow, deep, kind',
    komet: 'rushed, excited',
    pip: 'beeping',
    alva: 'warm, bright',
    mira: 'eager, playful',
    tukan: 'warm, bubbly',
    moln: 'soft, timid',
    narrator: 'warm, storytelling'
};

export const LINES = [
    // launch
    ['narrator', '[excited, storytelling] Miras raket står på Utsiktskullen. Hela skogen har kommit för att vinka.'],
    ['tukan', '[urgent, tender] Professor Klo! Ta med lyktan. [softly, pleading] Och kom hem igen.'],
    ['klo', '[stammering, flustered] J-ja! [eager, promising] Jag skriver! Från varenda planet!'],
    // launch2
    ['tukan', '[worried, serious] Utan stjärnor mörknar skogen. [knowing, low] Och du vet vem som är rädd för mörkret.'],
    ['moln', '[brave, shaky] Jag är inte rädd. Inte än. [determined] Jag följer er så högt jag når!'],
    ['mira', '[counting, excited] Tre, två, ett … [shouting, joyful] SVÄNG!'],
    // launch3
    ['narrator', '[soaring, storytelling] Raketen svänger upp genom natten. Molnet följer med, ända tills luften tar slut.'],
    ['moln', '[breathless, straining] Längre än så här når jag inte. [warm, waving] Hälsa stjärnorna!'],
    ['horse', '[determined, gentle] Vi hittar dem. Jag lovar.'],
    // arrive
    ['klo', '[relieved, shaky] Vi landade! Lite snett. [proud] Men vi landade.'],
    ['horse', '[giddy, amazed] Jag känner mig så lätt! Hovarna vill uppåt av sig själva.'],
    ['nova', '[groggy, furious] VEM parkerar en raket på MIN måne? [exasperated sigh] Före frukost?!'],
    // arrive2
    ['klo', '[nervous, formal] P-professor Klo. Expert på land och vatten. [hopeful] Vi letar efter …'],
    ['nova', '[flat, final] Inte före frukost.'],
    ['horse', '[curious, friendly] Vad äter du till frukost?'],
    // arrive3
    ['nova', '[grumpy, matter-of-fact] Kometflingor. De står på hyllan. [stubborn] Jag flyger inte före frukost.'],
    ['klo', '[doubtful, small] Hyllan sitter väldigt högt.'],
    ['horse', '[confident, playful] Inte här. Här hoppar jag hur högt som helst!'],
    // breakfast
    ['nova', '[satisfied, munching] Så. Nu går det att prata med mig. [grudging] Lite.'],
    ['nova', '[dry, proud] Jag heter Nova. Jag kan allt om rymden. [warning] Fråga inget dumt.'],
    ['horse', '[hopeful, serious] Alvas stjärnor försvinner. Vet du vem som tar dem?'],
    // count
    ['nova', '[matter-of-fact, proud] Tio är borta sedan i natt. [superior] Jag håller reda på varenda stjärna på himlen.'],
    ['alva', '[earnest] Det är mina tioårsstjärnor. En för varje år. [urgent, pleading] Snälla, hitta dem!'],
    ['horse', '[determined, thoughtful] Vem tar Alvas stjärnor – och varför?'],
    // hypothesis1
    ['nova', '[authoritative] Hypotes nummer ett: ett svart hål. Svarta hål slukar allt. [smug] Det vet alla.'],
    ['klo', '[eager, excited] Jag är också forskare! Får man mäta hålet?'],
    ['nova', '[dry, dismissive] Man får hålla sig ur vägen.'],
    // crater
    ['nova', '[focused, curious] Min klo lyser. Det ligger något där nere.'],
    ['horse', '[peering down] Det är djupt. Ner kommer jag. [worried] Men upp?'],
    ['klo', '[scholarly, nervous] Jag antecknar: ner är lätt. Upp är forskning.'],
    // firstLight
    ['nova', '[quiet, tender] Det här är bara ljuset. [gently] Stjärnan är borta, men ljuset blev kvar.'],
    ['nova', '[protective, soft] Jag lägger det under kupan. Där är det tryggt.'],
    ['klo', '[amused, writing] En stjärnburk med ögon. Jag antecknar.'],
    // firstLight2
    ['nova', '[dry, unimpressed] Jag hörde det där.'],
    ['alva', '[overjoyed] Det var min första! Den lyser ju fortfarande. [excited] Nio kvar!'],
    // beam
    ['horse', '[frustrated, looking up] Väggarna är för höga. Till och med här.'],
    ['nova', '[bossy, dry] Ställ dig i ljusringen. Jag lyfter dig. [warning] Men sluta sprattla.'],
    ['klo', '[helpful, knowing] Ett skal som ligger stilla, kanske? Det brukar fungera.'],
    // beamDone
    ['nova', '[dry, strained] Tung var du. För en häst.'],
    ['klo', '[defensive, quick] För en sköldpadda är det helt normalt.'],
    ['nova', '[exasperated] Bestäm er.'],
    // night
    ['horse', '[uneasy, quiet] Det är kolsvart. Jag ser inte var jag sätter hovarna.'],
    ['nova', '[matter-of-fact] Det är natt på den här sidan. [lecturing] Natten på månen varar i två veckor.'],
    ['klo', '[astonished, nervous] Två veckor! Har du en lampa?'],
    // night2
    ['nova', '[dry, proud] Fem stycken. De lyser bäst när jag är arg.'],
    ['klo', '[curious, careful] Och när blir du arg?'],
    ['nova', '[grumpy] Av klapper. Hovklapper. [warning, curt] Säg inget.'],
    // nightAngry
    ['nova', '[furious] Det där var MED FLIT. … [grudging, approving] Bra. Fortsätt.'],
    // nightFace
    ['horse', '[uneasy, whispering] Den där kratern … den ser ut som ett ansikte.'],
    ['nova', '[flat, dismissive] Det är en krater. Kratrar tittar inte. Det vet alla.'],
    ['klo', '[nervous, stubborn] Jag antecknar ändå att den tittar.'],
    // nightDone
    ['nova', '[grumbling, reminiscing] Jag har inte varit så arg sedan en meteor landade i mina flingor.'],
    ['horse', '[sheepish] Förlåt.'],
    ['nova', '[grudging] Det lyste bra. [curt] Vi säger inget mer om det.'],
    // ledge
    ['nova', '[focused] Min klo lyser igen. Där, under klippan.'],
    ['horse', '[frustrated, laughing] Jag hoppar förbi varje gång. Jag svävar för långt!'],
    ['klo', '[sly, hinting] Allt är lätt här. Utom … ett visst skal?'],
    // ledgeDone
    ['klo', '[thrilled, amazed] Från svävande häst till fallande sköldpadda på en sekund!'],
    ['nova', '[smug, lecturing] Tyngden beror på vad man är. Det vet alla.'],
    ['klo', '[excited, triumphant] Just det vet ingen! Det är min forskning!'],
    // rival1
    ['klo', '[proud, important] Jag har mätt månen. Den är … [hesitant] stor.'],
    ['nova', '[flat, precise] Tretusenfyrahundrasjuttiofyra kilometer tvärs över.'],
    ['klo', '[stubborn, writing] Jag skriver ”stor”.'],
    // rival2
    ['klo', '[dreamy] Jag skriver ett vykort hem. [shy, hesitant] Till en … forskarkollega.'],
    ['horse', '[teasing, knowing] Till Tukankrabban.'],
    ['nova', '[suspicious] Hans lampor blinkar. [correcting herself] Jag menar ögon. Vad är det för fel på honom?'],
    // rival3
    ['nova', '[suspicious, peering] Nu blinkar han igen. [clinical] Det är något fel på honom.'],
    ['horse', '[matter-of-fact, amused] Han är kär.'],
    ['nova', '[baffled, dry] Det finns ingenting om det i mina stjärnkartor.'],
    ['klo', '[flustered, dignified] Det är ett vetenskapligt mysterium. Det har jag skrivit upp.'],
    // view0
    ['horse', '[awed, wistful] Där nere ligger den magiska skogen! Så liten.'],
    ['klo', '[worried, squinting] Det är mörkare där än när vi for. Jag ser knappt boet.'],
    ['nova', '[sober, quiet] Tio stjärnor mindre. Det märks ända dit ner.'],
    // view
    ['horse', '[awed, gasping] Hela himlen! [quiet, sad] Och där … hålen där Alvas stjärnor satt.'],
    ['klo', '[scholarly, writing] De är vita. Jag antecknar: vita hål.'],
    ['nova', '[dismissive, certain] Vita hål finns inte. Svarta hål är svarta. Det vet alla.'],
    // view2
    ['klo', '[thoughtful] Men titta. Vitt. [slowly] Som … papper.'],
    ['nova', '[long pause, crushed] … Hypotes nummer ett stämmer inte.'],
    ['horse', '[gentle, worried] Nova? Dina lampor slocknade.'],
    // view3
    ['nova', '[quiet, shaken] Jag har aldrig haft fel om rymden förut.'],
    ['klo', '[cheerful, encouraging] Fel är också forskning! Jag har fel hela tiden.'],
    ['nova', '[dry] Det märks. … [tiny, quick] Tack.'],
    // hypothesis2
    ['klo', '[excited, inspired] Hypotes nummer två: någon samlar på dem! Som Skatan med sina pärlor.'],
    ['nova', '[indignant, furious] En stjärntjuv. På MIN himmel.'],
    ['horse', '[determined, rallying] Då letar vi vidare. Till raketen!'],
    // fin
    ['horse', '[alarmed] Raketens fena! Den är borta. Det är bara ett streck kvar.'],
    ['klo', '[curious, investigating] Och här ligger smulor. Rosa smulor. [scholarly] Jag tar ett prov.'],
    ['mira', '[outraged] MIN fena! [determined] Jag ritar dit den igen!'],
    // finDone
    ['mira', '[proud, satisfied] Så! Lika sned som förut.'],
    ['nova', '[dry, skeptical] Den där raketen kommer att svänga.'],
    ['mira', '[gleeful, proud] Det är det som är meningen!'],
    // stjarnArrive
    ['nova', '[groggy, muffled] Är vi framme? Väck mig inte.'],
    ['klo', '[gentle, careful] Vi är framme.'],
    ['nova', '[grumpy, groaning] Då är det morgon. Igen. [warning] Rör mig inte.'],
    // stjarnArrive2
    ['horse', '[delighted, floating] Jag väger ingenting! Jag simmar – fast det finns inget vatten.'],
    ['nova', '[dreamy, matter-of-fact] Här finns inget upp och inget ner. Bara stjärnbilder.'],
    ['nova', '[proud, pointing] Det där är Karlavagnen. Sju stjärnor. [disapproving] Strecken är inte dragna.'],
    // wagon
    ['klo', '[eager, confident] Streckade linjer! Det kan vi. Eller hur?'],
    ['horse', '[determined] I full galopp ritar hovarna klart dem.'],
    ['nova', '[resigned sigh] Klapper. Naturligtvis.'],
    // wagonDone
    ['horse', '[thrilled, laughing] Den rullar! Karlavagnen är en riktig vagn!'],
    ['nova', '[smug, lecturing] En stjärnbild blir det den föreställer. Det vet alla.'],
    ['klo', '[admiring, writing] Det visste jag inte. Jag antecknar allt hon säger.'],
    // belt
    ['nova', '[lecturing, mysterious] Orions bälte. Tre stjärnor på rad. De tänds i en viss ordning.'],
    ['klo', '[curious] Vilken ordning?'],
    ['nova', '[bossy] Titta på mina lampor. Jag visar en gång. [grudging] Kanske två.'],
    // beltWrongNova
    ['nova', '[impatient, dry] Fel. Igen. Titta på lamporna.'],
    // beltDone
    ['horse', '[triumphant] Alla tre lyser – och där lossnade ett stjärnljus!'],
    ['nova', '[smug, dismissive] Mitten, vänster, höger. Det är inte svårt.'],
    ['klo', '[proud] Jag antecknade ”vänster, mitten, hö…”. [embarrassed, quick] Jag stryker det.'],
    // bear
    ['horse', '[awed, whispering] En björn! Av stjärnor. Den sover.'],
    ['nova', '[hushed, fond] Stora björnen. Karlavagnen är hans rygg och svans.'],
    ['nova', '[quiet, focused] Min klo lyser. Han ligger på ett stjärnljus.'],
    // bear2
    ['klo', '[excited] Vi väcker honom! Hallå! [shouting] HALLÅ!'],
    ['nova', '[dry, amused] Det hörs inget i rymden. Tur för dig. [knowing] Han är värre än jag på morgonen.'],
    ['horse', '[curious, pointing] Titta på hans nos. Den är bara streckad.'],
    // bearWakes
    ['bjorn', '[deep sniffing] … Snnff. [slow, hopeful] Det luktar … frukost?'],
    ['nova', '[delighted, relieved] Äntligen någon som förstår.'],
    ['bjorn', '[slow, grateful] Vem ritade min nos? Jag har inte känt en doft på hela natten.'],
    // bearGives
    ['bjorn', '[warm, slow, kind] Den här låg jag på. Den är varm. Ta den – den är inte min.'],
    ['bjorn', '[sniffing] Snnff. [puzzled, slow] Era smulor luktar gummi.'],
    ['klo', '[excited, writing] Gummi! Det skriver jag upp. Rosa smulor av gummi.'],
    // bearStands
    ['horse', '[amazed, shouting] Han reser sig! Vi står på en björn av stjärnor!'],
    ['klo', '[nervous, dizzy] Jag antecknar: högt. Väldigt högt. Jag tittar inte ner.'],
    ['bjorn', '[warm, booming] Håll i er. Jag bär er en bit. Tre kliv, så är vi framme.'],
    // pip
    ['nova', '[dry, explaining] Det är Pip. En satellit. Han säger bara pip.'],
    ['klo', '[curious] Vad betyder det?'],
    // pip2
    ['nova', '[dry, obvious] Att han snurrar. Det ser jag väl.'],
    ['nova', '[dry] Och att han har fångat något. Ni får hämta det själva. [stubborn] Jag snurrar inte.'],
    // pipDone
    ['nova', '[translating, flat] Han har tagit en bild av tjuven. [slow, serious] Liten. Rosa. Kantig.'],
    ['klo', '[thoughtful, piecing together] Liten, rosa, kantig – och smulor vid raketen …'],
    // hypothesis3
    ['klo', '[triumphant, excited] Hypotes nummer tre: någon suddar ut dem!'],
    ['nova', '[offended, quick] Det var min hypotes. Jag hann bara inte säga den.'],
    ['horse', '[kind, diplomatic] Den är bådas. Ni forskar ju tillsammans.'],
    // ringArrive
    ['nova', '[groaning, grumpy] Morgon. Igen. Vem bestämde att det ska vara morgon så ofta?'],
    ['mira', '[proud, excited] Det är min planet! Den har ringar. Den heter Ringo.'],
    ['nova', '[correcting, lecturing] Den heter Ringplaneten. Ringarna är is och sten, precis som Saturnus.'],
    // ringo
    ['mira', '[stubborn, sweet] Ringo.'],
    ['nova', '[grumpy, restrained] Jag bråkar inte med någon före frukost. … [muttering] Ringplaneten.'],
    ['klo', '[diplomatic, writing] Jag antecknar båda.'],
    // gravel
    ['horse', '[startled, wincing] Aj! Det regnar grus!'],
    ['nova', '[annoyed] Småsten från ringen. Det kommer i skurar. [grumbling] Jag hatar det.'],
    ['klo', '[confident, scholarly] Ett skal är en utmärkt sköld. Det har vi mätt förut.'],
    // sling
    ['horse', '[worried, looking out] Ringen tar slut. Och det är långt till andra sidan.'],
    ['nova', '[lecturing, calm] Planeten drar. Det går banor runt den. Tre stycken härifrån.'],
    ['klo', '[excited, discovering] Det ligger rosa smulor i den mellersta!'],
    // sling2
    ['nova', '[lecturing, dry] En som sparkar åker ur banan. En som ligger still följer med.'],
    ['horse', '[thinking aloud, eager] Ta sats, hoppa – och gömma mig i luften. Som på månen.'],
    ['nova', '[grudging, impressed] Det där var inte dumt. För att vara före lunch.'],
    // slingDone
    ['klo', '[breathless, amazed] Du blev slungad runt en hel planet! Jag hann inte ens mäta.'],
    ['nova', '[flat, precise] Tjugotvå sekunder.'],
    ['klo', '[touched, surprised] … Du mätte åt mig.'],
    // ice
    ['nova', '[focused] Min klo lyser. Det sitter ett stjärnljus i isen.'],
    ['horse', '[thoughtful] Is smälter i sol. Men här är det skugga.'],
    ['klo', '[scholarly, pointing] Planeten skuggar. Solen börjar där borta, vid strecket.'],
    // comet
    ['komet', '[rapid-fire, shouting] Hinner inte! Hinner inte! Ur vägen!'],
    ['nova', '[annoyed, sighing] Kometen. Den har aldrig tid. Jag står inte ut med den.'],
    ['horse', '[curious, pointing] Det sitter något i dess svans. Det lyser!'],
    // comet2
    ['klo', '[calling out, pleading] Hallå! Stanna! Vi vill bara …'],
    ['komet', '[breathless, boasting] Hinner inte! Varv femtusentolv! Rekord!'],
    ['nova', '[dry, knowing] Den stannar bara vid Rastplatsen. Ett andetag per varv.'],
    // cometRest
    ['komet', '[panting, impatient] Puh. Ett andetag. Vad vill ni? Fort!'],
    ['horse', '[calm, friendly] Du har ett stjärnljus i svansen.'],
    ['komet', '[surprised, rapid] Jaså den! Den har kittlats i tre varv. Ta den!'],
    // cometSaw
    ['komet', '[rapid, gossiping] Jag ser allt från min bana. En liten rosa en. [serious] Den tar bara de sneda.'],
    ['komet', '[boastful] Mina streck är raka. Jag har linjalsvans. [shouting, leaving] Den som hinner ikapp får åka på den! Hej!'],
    ['nova', '[dry] Ingen hinner ikapp den. … [thoughtful, slow] Bara de sneda, sa den.'],
    // crooked
    ['nova', '[slow realization] Det stämmer. De raka stjärnorna är kvar. Alvas är borta.'],
    ['alva', '[quiet, sad] Mina är sneda. Jag ritar på fri hand.'],
    ['klo', '[serious, writing] Hypotes nummer fyra: den tar bara det som är snett.'],
    // gap
    ['horse', '[uneasy] Ringen är borta här. Bara ett streck kvar – och grusskurar.'],
    ['nova', '[focused] Min klo lyser. Det sista ligger på andra sidan.'],
    ['klo', '[determined, scholarly] Galopp mellan skurarna. Hovarna ritar isen igen.'],
    // gapDone
    ['horse', '[excited, breathless] Nio! Bara ett kvar.'],
    ['nova', '[dry, warm] Nio under kupan. Det börjar bli trångt. Och varmt.'],
    ['nova', '[serious, knowing] Jag vet var det tionde är. Bortom ringarna. Det vita.'],
    // nine
    ['mira', '[worried, urgent] Alva! Molnet på förra sidan blixtrar igen. Bara lite.'],
    ['alva', '[urgent, worried] Det är för mörkt där nere. Skynda er!'],
    ['klo', '[nervous, whispering] Tänk om den som suddar … suddar oss?'],
    // eraserGone
    ['mira', '[distracted, searching] Alva, har du sett suddet? Jag ritade fel på en ring.'],
    ['alva', '[absent-minded] Det låg här nyss. Rita över, så länge.'],
    ['mira', '[proud, matter-of-fact] Jag ritar aldrig fel. Jag ritar om.'],
    // suddArrive
    ['nova', '[groggy, defensive] Jag sov inte. Jag blundade argt.'],
    ['horse', '[stunned, quiet] Himlen tar slut. Det är … vitt. Det finns ingenting.'],
    ['klo', '[lost, uneasy] Inget land. Inget vatten. Inte ens rymd. Jag är expert på ingenting här.'],
    // rocketGone
    ['mira', '[shrieking, outraged] MIN RAKET! Någon suddade HELA raketen!'],
    ['klo', '[alarmed, pointing] Där! Något litet och rosa! Det hoppade in i det vita!'],
    ['horse', '[quiet, devastated] Då kommer vi inte hem.'],
    // suddArrive2
    ['nova', '[grim, determined] Efter den. Vi har ändå ingen annan väg.'],
    ['nova', '[uncertain] Fast … här finns inga stjärnor. Inga kartor. [very quiet] Jag vet inte vägen.'],
    ['klo', '[pleading, worried] Du vet alltid vägen!'],
    // suddArrive3
    ['nova', '[quiet, bitter] Inte här. Här är jag ingen expert. Här är jag bara sur.'],
    ['horse', '[noticing, hopeful] Titta på papperet. Det finns märken där streck har suttit.'],
    ['klo', '[excited, realizing] Märken är streckade linjer! Och streckade linjer …'],
    // fog
    ['horse', '[uneasy, quiet] Det är grått överallt. Jag ser inga märken.'],
    ['nova', '[low, ominous] Blyertsdimma. Det blir så när någon suddar mycket.'],
    ['klo', '[soft, wistful] Jag har en lykta. Den jag fick av … henne. [sheepish] Den lyser bara när jag är stilla.'],
    // fog2
    ['horse', '[teasing, gentle] Och du är bara stilla när jag är det.'],
    ['klo', '[trying hard] Jag kan vara stilla! Titta. … [failing, fidgeting] Nej. Jo. … Nej.'],
    ['nova', '[dry, doubtful] Göm dig i skalet, så håller han sig lugn. Kanske.'],
    // fogGhosts
    ['horse', '[whispering, uneasy] Det står saker i dimman. Halva saker. [hushed] Ett hus utan tak. En drake utan huvud.'],
    ['nova', '[quiet, solemn] Märken. Hit kommer allt som någon har suddat ut.'],
    ['horse', '[shaken] Och den där … det där är jag. [trembling] Fast med fel ben.'],
    // fogGhosts2
    ['alva', '[quiet, ashamed] Det var mitt första försök. Det blev fel. Jag suddade det.'],
    ['horse', '[small, hurt] Jag vill inte titta på den.'],
    ['klo', '[brave, comforting] Titta på mig i stället. [silly, kind] Jag är väldigt röd. Det brukar hjälpa.'],
    // fogLit
    ['klo', '[amazed, tender] Den lyser! Jag tänkte på henne. Då blev klorna alldeles stilla.'],
    ['nova', '[dry, curious] Är det där också ett vetenskapligt mysterium?'],
    ['klo', '[warm, sincere] Det största.'],
    // bridge
    ['horse', '[frustrated, panting] Den suddar ut bron så fort jag har ritat den!'],
    ['klo', '[thoughtful, slow] Den suddar det som är snett. Och dina streck …'],
    ['nova', '[dry, gentle] Är sneda allihop. Du ritar med hovar.'],
    // bridge2
    ['horse', '[small, sad] Jag kan inte rita rakt. Jag är en sköldhäst.'],
    ['nova', '[gentle, firm] Ett skal är inget streck. Det går inte att sudda.'],
    ['nova', '[encouraging] Ljusringen. Du vet hur man gör. [teasing] Och sluta …'],
    // bridge3
    ['horse', '[smiling, sighing] … sprattla. Jag vet.'],
    // sudd1
    ['sudd', '[small, earnest] Vänta. Jag är snart klar. Bara en sak kvar. [matter-of-fact] Den där är inte rund.'],
    ['mira', '[outraged] Det är MIN måne! Den är visst rund! … [unsure] Nästan.'],
    ['nova', '[alarmed, pleading] Rör den inte. Det är mitt hem. [desperate] Mina flingor står där!'],
    // bite1
    ['nova', '[screaming, anguished] MIN MÅNE!'],
    ['horse', '[desperate, shouting] Sluta! Hör du inte? [screaming] SLUTA!'],
    ['sudd', '[calm, earnest] Snart. Den är sned här också.'],
    // bite2
    ['klo', '[whispering, scared] Jag ser knappt mina egna klor.'],
    ['mira', '[trembling, scared] Alva. Månen har fått ögon.'],
    ['alva', '[soothing, shaky] Det är bara hål, Mira. … [urgent whisper] Titta inte på den.'],
    // bite3
    ['mira', '[terrified, crying out] Den tittar på mig! Alva, DEN TITTAR PÅ MIG!'],
    ['nova', '[hollow, quiet] Det där är inte min måne längre.'],
    // forestDark
    ['narrator', '[hushed, ominous] I den magiska skogen blir det kolsvart.'],
    ['moln', '[terrified, sobbing] Mörkt … det är mörkt … [crying] Jag vill inte blixtra! Jag vill inte!'],
    // forestDark2
    ['tukan', '[urgent, shouting] In under mig, ungar! Allihop! … [panicked] Var är Lilla Klo?!'],
    ['tukan', '[breathless, relieved] Jag har dig. Jag har dig. [steady, promising] Han kommer hem. Det har han lovat.'],
    // drain
    ['nova', '[panicked, urgent] Kanten är borta. Utan kant håller månen inte ihop. Den rinner ut!'],
    ['horse', '[angry, accusing] Det är du som tar Alvas stjärnor. Och nu månen!'],
    ['sudd', '[calm, earnest] Jag tar ingenting. Jag suddar. Sneda streck ska bort.'],
    // sudd2
    ['sudd', '[small, earnest] Det är det enda jag kan. Jag hjälper till.'],
    ['klo', '[furious] Hjälper?! Jag har mätt dig. Du är nästan slut! [faltering] Och allt du gör är att …'],
    // notes
    ['klo', '[devastated, crying out] Mina anteckningar! Alla mätningar! Häst eller sköldpadda – BORTA!'],
    ['sudd', '[innocent, plain] De var sneda. Du skriver med klo.'],
    ['horse', '[quiet, furious] Nu räcker det. Du rör inte mina vänner.'],
    // offer
    ['horse', '[quiet, steady] Jag är sned överallt. Häst fram, sköldpadda bak. Ingen vet ens vad jag är.'],
    ['horse', '[very quiet, brave] Sudda mig då.'],
    ['klo', '[screaming] NEJ!'],
    // rubbed
    ['horse', '[faint, confused] Jag … känner inte mina kanter. [frightened, small] Klo? Var slutar jag?'],
    ['klo', '[voice breaking] Den är min forskning! Den är min VÄN! [sobbing, shouting] Ge tillbaka den!'],
    ['alva', '[distraught] Mina streck! … [hopeful, realizing] Men färgen. Färgen sitter kvar!'],
    // drawnSelf
    ['horse', '[breathless, quiet] Jag är här. Sned. [warm, proud] Men här.'],
    ['sudd', '[amazed, small] Du … gick inte bort.'],
    ['nova', '[proud, gentle] Färg går inte att sudda. Bara blyerts. Det vet alla.'],
    // sudd4
    ['sudd', '[wondering, slow] Och strecken ritade du tillbaka. Själv. Det har ingen gjort förut.'],
    ['sudd', '[quiet, certain] Då är du inget misstag.'],
    // alva1
    ['alva', '[ashamed, quiet] Suddet. Det var jag. Jag suddade den första stjärnan.'],
    ['alva', '[sad] Den blev sned, och jag blev arg på den. [remorseful] Sen ångrade jag mig.'],
    ['sudd', '[confused, small] Så jag … hjälpte inte?'],
    // alva2
    ['alva', '[gentle, sincere] Du gjorde precis det jag bad om. Det var jag som hade fel om stjärnan.'],
    ['alva', '[firm, proud] De sneda är mina. Jag ritar på fri hand. [smiling] Det ska synas.'],
    ['mira', '[warm, matter-of-fact] Jag tycker att de sneda är finast.'],
    // tenth
    ['horse', '[gentle, hopeful] Där är märket efter den första. Kan du rita den igen, Alva?'],
    ['alva', '[warm, smiling] Ja. Och den får bli precis lika sned.'],
    // tenthDone
    ['nova', '[satisfied, warm] Tio. Alla tio under kupan.'],
    ['sudd', '[lost, small] Vad ska jag göra nu? Jag kan bara sudda.'],
    ['nova', '[gentle] … [mysterious] Titta upp. Vad händer när man suddar på något svart?'],
    // newJob
    ['sudd', '[wondering, slow] Det blir vitt. Små vita prickar.'],
    ['nova', '[proud, warm] Det heter stjärnor. Jag kan allt om dem.'],
    ['sudd', '[hopeful, timid] Kan jag … rita? Med sudd?'],
    // stranded
    ['klo', '[worried, practical] Men vi har ingen raket. Och månen har ett hål. Hur kommer vi hem?'],
    ['nova', '[translating] Det är Pip. Han har sett alltihop. [dreading] Han har ropat på … [groaning] nej. Inte den.'],
    // cometComes
    ['komet', '[triumphant, shouting] HINNER! För en gångs skull hinner jag! Upp på svansen!'],
    ['sudd', '[relieved, earnest] Den är rak. Den suddar jag aldrig.'],
    ['horse', '[excited, commanding] Suddet, hoppa upp på skalet. Jag galopperar – och du ritar!'],
    // rideRemarks
    ['komet', '[ecstatic, shouting] Jag har aldrig haft någon på svansen förut! Spring! SPRING!'],
    ['sudd', '[joyful, amazed] Jag ritar! Jag ritar med sudd!'],
    ['mira', '[excited, waving] Där är Ringo! Hej Ringo!'],
    ['bjorn', '[deep, content] Snnff. Nu luktar hela himlen stjärnor.'],
    ['klo', '[giddy, laughing] Jag åker Karlavagnen! Jag har slutat räkna vid tusen!'],
    ['nova', '[awed, quiet] Det heter Vintergatan. Jag visste inte att man kunde göra den själv.'],
    // lift
    ['komet', '[panicked, shouting] Månen! Jag hinner inte bromsa! Hoppa!'],
    ['horse', '[worried, breathless] Det är för långt. Och månen har ett hål där vi ska landa!'],
    ['nova', '[calm, commanding] Hoppa. Göm dig i luften. Jag fångar dig.'],
    // lift2
    ['nova', '[straining, grumpy] Jag är ingen taxi. … [determined] Håll i er. Allihop.'],
    ['klo', '[amazed, cheering] Hon bär oss alla! Sköldhäst, sudd och professor!'],
    ['nova', '[straining, breathless] Säg … inget. Det är … tungt.'],
    // landed
    ['sudd', '[surprised, happy] Jag blev inte mindre. Inte ett dugg.'],
    ['nova', '[thoughtful] Man blir inte mindre av att rita. [admitting, soft] Det … visste jag inte heller.'],
    ['mira', '[excited, bossy] Sen ritar jag ögon på suddet. Så det ser vad det gör!'],
    // rim
    ['horse', '[determined] Månens kant är utsuddad. Men märket finns kvar.'],
    ['sudd', '[sheepish, small] Förlåt. Den var visst rund. Nästan.'],
    ['mira', '[excited, encouraging] Rita den precis så! Nästan rund!'],
    // rimHeals
    ['mira', '[relieved, joyful] Ögonen försvinner! Den tittar inte längre!'],
    ['nova', '[dismissive] Det var aldrig ögon. Det var hål. … [admitting, quiet] Jag tittade inte heller.'],
    ['klo', '[scholarly, content] Jag antecknar att den är rund. Nästan.'],
    // forestLight
    ['narrator', '[warm, relieved] Månskenet faller över den magiska skogen igen. Stormen tystnar.'],
    ['moln', '[joyful, amazed] Det är ljust! Jag slutade! Och titta – en hel väg av stjärnor!'],
    ['tukan', '[tender, proud] Titta, ungar! Titta, Lilla Klo! Där uppe galopperar den som bar er.'],
    // rimDone
    ['horse', '[satisfied, gentle] Månen är hel. Nu ska stjärnorna hem.'],
    ['nova', '[quiet, tender] Till min krater. Där satt de. Rakt ovanför min säng.'],
    ['nova', '[soft, admitting] Jag har tittat på dem varje morgon. Sur. Men jag har tittat.'],
    // finale
    ['nova', '[bossy, tender] Ut med er. En i taget. Tillbaka till era platser.'],
    ['horse', '[quiet, happy] Alla tio. Precis där de satt.'],
    ['sudd', '[earnest, promising] Jag rör dem inte. Jag lovar.'],
    // gold
    ['alva', '[happy, determined] Nu färglägger jag dem. Med guldpenna.'],
    ['alva', '[proud, knowing] Färgpenna går inte att sudda. Det sa Nova.'],
    ['nova', '[dry] Det vet alla. … [smiling, quiet] Nu.'],
    // constellation
    ['alva', '[excited, proud] Och så ritar jag ihop dem. Tio stjärnor – en stjärnbild.'],
    // constellationDone
    ['horse', '[astonished, delighted] Det är … jag! Hovar fram och skal bak!'],
    ['alva', '[proud, tender] Sköldhästen. En alldeles egen stjärnbild.'],
    ['klo', '[triumphant, scholarly] Häst eller sköldpadda? Det står på himlen nu: både och.'],
    // supernova
    ['klo', '[awed, whispering] Nova … dina lampor är guld. Alla fem.'],
    ['nova', '[matter-of-fact, glowing] Det kallas supernova. Det händer nästan aldrig.'],
    ['nova', '[sincere, quiet] Tack. Allihop. [embarrassed, quick] Säg det inte till någon.'],
    // telescope
    ['nova', '[formal, gruff] Professorn. Den här är till dig. Mitt gamla teleskop.'],
    ['klo', '[overwhelmed, stammering] Till mig? Men jag kan ingenting om rymden!'],
    ['nova', '[dry, warm] Nej. Men du antecknar bra.'],
    // ink
    ['sudd', '[sincere, sorry] Förlåt för anteckningarna. De var inte sneda. De var dina.'],
    ['klo', '[warm, forgiving] Jag kan dem utantill. Jag skriver om dem. Med bläck den här gången.'],
    ['nova', '[dry] Bläck går inte heller att sudda. Det vet … [resigned, smiling] ja, ja.'],
    // moonJoke
    ['klo', '[amused, reminiscing] Jag sa en gång att månen kanske var ett suddgummi som någon glömt på himlen.'],
    ['nova', '[dry, pointing] Månen är sten. Suddgummit är han där.'],
    ['sudd', '[happy, quiet] Jag är inte glömd längre.'],
    // secondBox
    ['nova', '[munching, content] Två frukostar. … [delighted, surprised] Supernova.'],
    // cometRace
    ['komet', '[breathless, impressed] Inte illa. För en … vad du nu är.'],
    // measure.firstHorse
    ['klo', '[excited, writing] Hovar! Även i rymden. Jag antecknar en hästsak.'],
    // measure.firstTurtle
    ['klo', '[delighted, scholarly] Skalet igen! En sköldpaddssak – med utsikt.'],
    // measure.even
    ['klo', '[amazed, scholarly] Det står lika. Till och med här uppe.'],
    // measureEnd
    ['klo', '[thoughtful, scholarly] I rymden väger ingen någonting. Då borde det inte gå att väga häst mot sköldpadda.'],
    ['klo', '[satisfied, proud] Men det står lika ändå. Åtta mot åtta.'],
    ['nova', '[dry, warm] Den är ingetdera. Den är en egen stjärnbild. Det vet alla. Nu.'],
    // TABLE
    ['narrator', '[hushed, storytelling] En ny sida i forskningsdagboken. Den här gången är det natt.'],
    ['mira', '[excited] Alva! [eager, bouncy] Nu ritar vi rymden. Jag ritar en raket!'],
    ['alva', '[dreamy, warm] Och jag målar den som bor där uppe. Med vattenfärg.'],
    ['narrator', '[warm, storytelling] Alva målar en lila krabba. Skalet ser ut som ett flygande tefat.'],
    ['alva', '[proud, warm] Det är rymdkrabban. Hon kan allt om rymden.'],
    ['mira', '[curious, small] Är hon snäll?'],
    ['alva', '[laughing] Ja. [knowing, wry] Men inte på morgonen.'],
    ['narrator', '[amused, storytelling] Mira ritar raketen. Ena fenan blir sned.'],
    ['mira', '[stubborn, proud] Den ska vara sned. Då svänger den bättre.'],
    ['alva', '[proud, delighted] Titta, mina tio stjärnor! [softly, fond] Jag ritade en för varje år när jag fyllde tio.'],
    ['alva', '[frowning, dissatisfied] Fast den där blev sned …'],
    ['narrator', '[quiet, storytelling] Alva suddar ut den sneda stjärnan.'],
    ['narrator', '[slow, ominous] Då slocknar en stjärna till. Och en till.'],
    ['mira', '[alarmed, urgent] Alva! Dina stjärnor försvinner!'],
    ['alva', '[shocked, defensive] Jag suddade bara EN!'],
    ['narrator', '[hushed, ominous] Under den mörka himlen blir hela den magiska skogen mörkare.'],
    ['narrator', '[warm, peaceful] Vid Alvas bord. Det är kväll.'],
    ['mira', '[delighted, proud] Där är ju suddet! Det har ögon. Dem har jag ritat.'],
    ['alva', '[warm] Och en guldstjärna. Den har jag ritat. [smiling, proud] Sned.'],
    ['mira', '[proud, cheeky] Och jag har ritat en ny raket. Ännu snedare.'],
    ['alva', '[content] Tio stjärnor för tio år. [wondering] Vad gör jag när jag fyller elva?'],
    ['mira', '[bright idea, excited] Då får Suddet sudda fram en till!'],
    ['mira', '[sleepy, tender] Får suddet sova i pennfodralet?'],
    ['alva', '[gentle, tender] Ja. Det har jobbat hela natten.'],
    ['mira', '[curious, puzzled] Varför är rymdkrabban så sur?'],
    ['alva', '[deadpan, amused] Hon har inte ätit frukost.'],
    ['narrator', '[wonder, storytelling] Utanför fönstret tänds stjärnorna. En av stjärnbilderna har hovar.'],
];
