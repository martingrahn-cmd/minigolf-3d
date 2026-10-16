# Mini Mayhem – banrytm och temavärldar

Uppdaterat 15 oktober 2026. **Rundan är numrerad 1–18 i `src/round.js`.** Urverkets stad (1–6) är klar. Molnskogen är hål 7–12: Skybowling, Rotravinen, Ekollonsvingen, Rotvolten, Törnkronan och Moderträdet som final och set piece. Månkarnevalen (13–18) är klar: Raketrampen, Tyngdlösa tältet, Svarta hålet, Kanonkometen, Pariserhjulet och finalen Månraketen. Alla 18 hål i rundan är byggda. Solskensöarna och Neonhamnen ligger kvar som spelbara prototyper utanför rundan.

## Aktuellt förslag – tre världar med sex hål

| Hål i den färdiga rundan | Tema | Spelmässig identitet |
| --- | --- | --- |
| 1–6 | **Urverkets stad** | Mässing, trä och turkos filt. Läsbara maskiner: port, rörpost, klockkontakt, därefter nya höjder och en avslutande kombination. De första fem hålen är byggda. |
| 7–12 | **Molnskogen** | Rosa molnhimmel, rotbroar, svampar och snidade ugglor. Mer terräng: rännor, smala spänger, pendlande ekollon och rotloop. Fem befintliga skogshål kan bilda basen efter omplacering och balansering. |
| 13–18 | **Månkarnevalen** | Ett övergivet tivoli mellan asteroider. Elfenbensvita raketer, violett rymd, turkosa lyktor och slitna röda cirkustält. Avgränsade zoner med låg gravitation, planetvallar, raketkanoner och en pariserhjulsfärja. Alla sex hål är byggda. Prototypernas bästa idéer återanvänds här. |

Sex hål per värld är användarens önskade upplägg; valet av den tredje världen är fortfarande ett förslag. Varje sexa bör börja med en lättläst regel, växla mellan placering, fart, höjd och tajmning och avsluta med två redan kända idéer i kombination. En kortare precisionsbana mitt i varje värld ger andrum. Äldre Solskensöarna och Neonhamnen finns kvar som prototyper; inget tidigare hål eller rekord har tagits bort eller numrerats om.

## Spelglädje: en värld i taget och stjärnor

Efter speltestet av hål 14 kom frågan om vem som orkar spela 18 hål. Rundan saknade också ett mål utöver rekordet per hål. Därför är en värld, sex hål på cirka tio minuter, nu standardpasset. Huvudmenyn har en spelknapp per värld. Världsrundan sparas mellan sidladdningarna och slutar med ett resultatkort: varje hål med slag, par och stjärnor, och totalen mot par. Hela turneringen finns kvar som ett frivilligt val.

Stjärnorna översätter slag till samma skala på alla hål: ★★★ för birdie eller bättre, ★★ för par, ★ för bogey och ingen stjärna för sämre. Spelaren föreslog den skalan. Stjärnorna från varje håls bästa resultat syns i banväljaren och summeras per värld, till exempel 6/9 ★. Ett hål med tomma stjärnor är en tydlig inbjudan att spela om. Nästa steg är flera spelare på samma telefon.

## Liv i Molnskogen

Efter grafikuppiffningen kändes miljöerna sterila: allt stod still, ytorna var för rena, ljuset var jämnt och det var tyst. Molnskogen fick först en livsrunda i `src/forest-life.js`, gemensam för alla sex hålen och placerad utifrån varje håls plattor:

- En fågelflock cirklar och glider över banan.
- Två fåglar hoppar och pickar på filten och flyger till en annan plats när bollen kommer inom cirka 3 meter.
- Löv och rosa kronblad faller, snurrar, landar på filten och tonas bort.
- Gräs och vildblommor växer längs alla sargkanter som inte är öppna, och de vajar i vinden via en vertex-shader.
- Solstrålar faller snett ner över banan.

Inget av detta påverkar bollen. Om spelaren valt reducerad rörelse står livet still. Vind och fågelsång ligger i ljudmotorn, se *Ljud* nedan.

**Byn.** Spelaren ville ha en mysig stämning med fler öar och en bebyggd närmiljö utanför banan. `src/forest-village.js` lägger därför en ring av upp till åtta små svävande öar runt varje skogshål, cirka 7,5 meter utanför banan. Öarna ligger aldrig på tee-sidan där kameran står, och lite lägre än filten så att de ramar in banan i stället för att skymma den. Öarna turas om att vara olika sorters platser:
- **Hem:** en stuga med halmtak där fönstren lyser varmt och det ryker ur skorstenen, en brunn eller en väderkvarn med snurrande vingar, trädgårdsland, vitt staket, en tvättlina med fladdrande kläder och en lykta.
- **Bondgård:** höbalar, vedtrave, pumpa- och kålland och en fårhage. Tre får och fyra höns strövar omkring, stannar och betar eller pickar och går sedan vidare.
- **Damm:** en damm med stenar och vass där tre ankor simmar runt. Ett vattenfall rinner över öns kant och bänkar står vid stranden.
- **Marknad:** två stånd med randiga markiser, vimplar mellan lyktor, en bänk, en vägvisare och höns som pickar.
- **Bigård:** fyra bikupor med surrande bin över en blomsteräng.

Repbroar hänger mellan grannöarna, och en lapptäcksfärgad luftballong driver sakta runt himlen. Alla modeller byggs i `blender/assets/village.py`: stuga, väderkvarn, brunn, ballong, stånd, bikupa, pumpa, kål, höbal, vedtrave, bänk, vägvisare, får, höna och anka. Ingenting i byn påverkar bollen.

## Urverkets stad som ett rum

Spelaren ville att Urverket skulle bli en levande stad och kännas mer som ett rum. Banan står nu på pelare i en urmakares verkstad, och på golvet runt banan har någon byggt en miniatyrstad av urverk. Allt byggs i `src/clock-town.js`.

**Rummet.** Rummet har tre väggar med tapet med små mässingskugghjul. Längs väggarna finns boaserad panel och golvlist. I vänsterväggen sitter ett högt fönster med sammetsgardiner och solstrålar. Högerväggen har en plankdörr. Bakväggen har hyllor med burkar, trådrullar och böcker, och på vänsterväggen hänger tavlor. Två taklampor hänger över staden. Under staden ligger en rund matta.

**Staden.** Två rader smala hus står runt banan. Raden närmast banan är lite mindre så att taken stannar under filten. Husen har lysande fönster som flimrar och skorstenar som ryker. Ett klocktorn har visare som går. Framför banan ligger ett torg med en fontän som sprutar, en karusell som snurrar och duvor som pickar och hoppar omkring. Utöver det rör sig följande:
- Ett uppdragbart leksakståg kör runt banan och ryker ur skorstenen.
- Sexton uppdragbara stadsbor promenerar på trottoaren, stannar och ser sig om, och nyckeln på ryggen snurrar.
- Ett luftskepp kryssar bakom banan.

**Det stora i rummet.** En stor rödrandig katt sover på en kudde. Den andas, viftar med svansen och snarkar små z. På en bokhög står en tekopp som ångar. Där finns också en krukväxt, och en urverksmus springer längs golvlisten.

Allt står på golvet långt under filten och påverkar aldrig bollen. Husen håller avstånd till banan och till kugghjulen, gökurshusen och rören som redan fanns i rummet. Modellerna byggs i `blender/assets/town.py`: tre stadshus, klocktorn, lok, två vagnar, stadsbo, duva, luftskepp, katt, karusell, fontän, böcker, tekopp, mus, krukväxt och taklampa.

## Månkarnevalen som levande tivoli

Månkarnevalen var en ödslig bana bland asteroider. Nu ligger en ring av svävande tivoliöar runt varje månhål, och varje ö har sin egen attraktion. Allt byggs i `src/moon-fair.js`.

**Öarna.** Varje ö har en klippig undersida och ett däck med stjärnmönster. Kanten är av guld med lampor som blinkar i jagande takt. Lampslingor med samma blinkande ljus hänger mellan grannöarna. Höga attraktioner står bakom banan och låga framför, så att översiktskameran alltid ser filten.

**Attraktionerna:**
- ett fritt fall-torn som hissas upp långsamt, väntar, faller och studsar
- ett pariserhjul (på hål 17, som redan har ett, blir det i stället en kättingflygare till)
- en kättingflygare vars stolar svänger ut när den snurrar
- cirkustältet
- kiosker med popcorn och randiga markiser
- spelstånd med ringkastning och en slagmaskin där puckan skjuts upp mot klockan
- en raketkarusell vars raketer åker upp och ner
- en liten berg-och-dalbana med tre vagnar som saktar i uppförsbackarna

Åkattraktionerna går en stund, saktar in, står still och startar igen.

**Livet:**
- Enögda utomjordingar i olika färger hoppar omkring på öarna och stannar och tittar på banan.
- Ballonger stiger mot himlen.
- Fyrverkerier smäller långt bakom banan.
- Två strålkastare sveper över himlen.
- Ett UFO med dragstråle kryssar förbi, och ibland drar ett stjärnfall över himlen.

Modellerna byggs i `blender/assets/carnival.py`: utomjording, kättingflygare, raketkarusell, kiosk, spelstånd, fritt fall-torn, UFO och berg-och-dalbanevagn. Besökarna ritas med instansering. Öarnas fasta delar och likadana material slås ihop med hjälpfunktionerna i `src/life-kit.js`, som Urverkets stad också använder. Ingenting påverkar bollen.

## Efterforskning och slutsatser

- **Walkabout Mini Golf:** Mighty Coconut beskrive## Ljud

Allt ljud syntetiseras med Web Audio i `src/audio.js`, så spelet behöver inga ljudfiler. Ljudet startar vid första tryckningen, eftersom webbläsare kräver det. Ljudknappen stänger av allt, och när fliken döljs pausas ljudet så att det inte drar batteri. Allt går genom en mjuk kompressor och lite rumsklang: lång klang på månen, ett verkstadsrum i Urverket och öppen skog i Molnskogen.

**Spelljud**
- Puttslaget är ett klickande *tock* med en kropp som följer slagets kraft.
- Bollen rasslar när den rullar, och ljudet blir starkare och ljusare ju fortare den går.
- När bollen slår i sargen låter det olika i varje värld: trä i skogen, en mässingsklang i Urverket och en gummistuds på månen. Ljudet följer hur hårt bollen slår.
- I koppen klonkar och rasslar bollen innan den landar.
- Efter hålet spelas en fanfar på världens eget instrument: marimba i skogen, speldosa i Urverket och klockspel på månen. Fanfaren blir längre ju fler stjärnor man fick.
- Ett fall låter som en fallande vissling och ett sus.
- De övriga händelseljuden har fått mjukare toner med lite klang.

**Ljudmiljöer**
- *Molnskogen:* vinden i löven sveper fram och tillbaka och fåglarna sjunger.
- *Urverkets stad:* tre klockor tickar i olika takt från olika håll i rummet. Göken gal ibland. Leksakståget tuffar förbi i stereo och visslar, speldosan på karusellen spelar sin vals, fontänen porlar och katten spinner då och då.
- *Månkarnevalen:* en kalliopvals hörs från tivolit och rymden surrar mjukt. Åkattraktionerna ger glada tjut och folkmassan sorlar. Fyrverkerierna smäller en stund efter att de syns, från rätt håll.

r tematiska 18-hålsbanor med sammanhängande miljöer, utforskande och egna trickslag. Tillämpning här: en tydlig värld per nio hål och en trovärdig plats även utanför sargen. [Utvecklarens spelbeskrivning](https://www.mightycoconut.com/minigolf).
- **Golf With Your Friends, Bouncy Castle:** Team17:s officiella presentation kopplar 18 hål till ett lekfullt tema, hinder och trickslag. Tillämpning här: temat ska synas i hur hindren fungerar. Neonhamnen får ljussignaler, flipperstötar och mekaniska bryggor. [Team17, 21 juni 2022](https://www.team17.com/news/golf-with-your-friends-bouncy-castle-and-more-out-now).
- **Cursed to Golf:** spelregissören beskriver genvägar, olika vägar, översiktskamera och återkommande utmaningar som går att lära sig. Tillämpning här: en synlig, riskfylld genväg och en tryggare väg runt. Förklarliga missar gör det meningsfullt att försöka igen. [Utvecklarintervju på PlayStation Blog, 18 augusti 2022](https://blog.playstation.com/2022/08/18/cursed-to-golf-is-out-today-on-ps5-and-ps4/).

Detta är inspiration och våra egna designval, inte ett påstående om att ett visst recept är bäst för alla minigolfspel.

## Riktning

Ett nytt huvudproblem per hål. Introducera det tydligt, låt spelaren prova och kombinera först senare med ett andra hinder. Växla mellan korta precisionshål, tajmning, höjdskillnader och långa kraftslag. Följ ett intensivt hål med ett lugnare. Genvägar ska spara slag, men missar måste gå att förstå från banans form.

Spelaren väljer riktning, kraft och tajmning. Ingen slump läggs på slaget. Ett perfekt slag går exakt dit man siktar. Topphastigheten är nu 26,5 i stället för 18,2; den extra farten kommer framför allt högt upp i kraftmätaren. Perfektzonen upptar 10 procent av precisionsmätaren, tidigare 32 procent. Ett helt missat kraftslag kan avvika 15 grader; korta puttar straffas mindre. Felet växer linjärt utanför den gröna zonen. Vid full kraft ger mätarlägena 60 och 75 procent cirka 1,7 respektive 6,7 graders avvikelse. Koppens fångstradie minskar från 58 till 32 cm och högsta fångstfart från 5,2 till 3,6. Den tidigare automatiska inbromsningen vid koppen är borttagen.

Vippvarvet har en vippbro som reagerar på bollens position. Brädan hålls still när bollen stannat, så det går att sikta. Den rosa avsatsen ger en fast uppåtkick; faktisk fart avgör hopplängden. Den längre bryggan saknar hopp. Flipperstötarna ger en begränsad knuff utåt och markerar träffen med ljus, rörelse och ljud.

Neonslussen är kortare än föregående hål och byter hopp mot tajmning och kraftkontroll. En lyftport visar rött när passagen är blockerad, grönt när bollen får plats och gult under stängningen. Två sidopassager ger ett alternativ till tajmningen. En sensor hindrar porten från att stänga på bollen. Par och banval hämtas från samma bandata.

Frostfallet byter rörliga hinder mot terräng och underlag: en tre meter hög takterrass leder till en hal ränna. Mittpartiet saknar sarger, och bollen får ett pliktslag och återgår till senaste slagplatsen om den faller. Alternativvägen är bredare, har högre friktion och sarger. Målet ligger runt hörnet, så ett kontrollerat slag utför följt av placering kan slå ren maxkraft. Det finns inga flipperstötar, portar eller snurror på detta hål.

## Äldre prototypplan för 18 hål

Tabellen dokumenterar den tidigare planeringen. Den nya fördelningen i sexhålsvärldar ovan ersätter den som riktning för den färdiga rundan.

| Hål | Värld | Huvudidé | Rytm/status |
|---|---|---|---|
| 1 | Solskensöarna | En tydlig rak putt | Introduktion, planerad |
| 2 | Solskensöarna | En bred kurva och vallslag | Välj vinkel, planerad |
| 3 | Solskensöarna | Låg ramp, bred landning | Lär kraft, planerad |
| 4 | Solskensöarna | Rör med synlig in- och utgång | Första trickslaget, planerad |
| 5 | Solskensöarna | Två korta greener i olika höjd | Lugn precision, planerad |
| 6 | Solskensöarna | En långsam snurra | Första tajmningen, planerad |
| 7 | Solskensöarna | Vallslag längs en vattenvik | Vägval, planerad |
| 8 | Solskensöarna | Smalt precisionshål | Kort andhämtning, planerad |
| 9 | Solskensöarna | Rör, kanon eller trygg omväg | **Kanonkurvan, spelbar** |
| 10 | Neonhamnen | Två riktade studsar och snurra | **Dubbelstudsen, spelbar** |
| 11 | Neonhamnen | Vippbro eller lång brygga | **Vippvarvet, par 3, spelbar** |
| 12 | Neonhamnen | Lyftport, sidopassager och kort flippergreen | **Neonslussen, par 3, spelbar** |
| 13 | Neonhamnen | Hal utförsränna eller bredare väg med sarg | **Frostfallet, par 4, spelbar** |
| 14 | Molnskogen | Skogstrumma, träring och vältbara ugglekäglor | **Skybowling, par 4, spelbar** |
| 15 | Molnskogen | Djup rot­ränna, smal spång eller skyddad svampstig | **Rotravinen, par 4, spelbar** |
| 16 | Molnskogen | Ekollonpendel och sned vallstock runt hörnet | **Ekollonsvingen, par 4, spelbar** |
| 17 | Molnskogen | Rotloop, utförsränna och två svängar | **Rotvolten, par 4, spelbar** |
| 18 | Molnskogen | Rotluckor, törnhjul och kronport | **Törnkronan, par 5, spelbar** |

Skybowling ger en lekfull flygtur efter Frostfallets underlagskontroll. Studstrumman ger ett fast lyft medan riktning och infartsfart avgör om bollen når den 3,7 meter breda landningsbryggan. För låg fart når inte fram; för hög fart flyger över eller rullar av den öppna änden. Fel riktning kan ge plums över de öppna sidokanterna. En miss ger ett pliktslag och återgång till föregående slagplats. Käglorna återgår samtidigt till läget före just det slaget; käglor som fällts med tidigare lyckade slag förblir borta. Gulsvarta målningar markerar exakt de kanter som saknar sarg. En rak träff kan välta hela kägeluppställningen i en kort kedjereaktion. Ring och käglor ger ljud, ljus och partiklar utan att lägga på nya knappar eller ett separat poängsystem. Flaggan ligger runt hörnet vid sidan av bowlinglinjen. Den längre bryggan runt gapet behåller sarger hela vägen fram till kägelområdet. Ett väl avvägt hopp kan spara slag, men maxkraft och ringträff garanterar inte längre att bollen når en säker plats.

Solskensöarna använder varmt ljus, turkost vatten, palmer och vimplar. Neonhamnen använder indigohimmel, måne, kristallöar, hamnlyktor och ljusslingor. Båda behåller ljusa spelplaner, tydliga sarger och hög kontrast kring bollen. Miljöobjekt står utanför spelytan.

Nästa balanseringspass bör mäta hur ofta spelare når respektive genväg, hur många omtag de behöver och om de förstår varför de missar. Första försöket behöver vara roligt även utan perfekt tajmning; precisionen ska främst belöna den som jagar rekord.

## Molnskogen – första temapasset på hål 14

Den nya visuella riktningen utgår från användarens referens: höga, vindpinade träd på gröna klippöar, trästaket och rosa himmel. Hål 14 är första provbanan. Hål 9–13 behåller sina befintliga miljöer. Tabellen för övriga hål är en äldre plan; den aktuella riktningen är nu tre världar med sex hål vardera.

Skogens signatur är snidade ugglor, svampgrupper, smala trädstammar med breda kronor och en mintgrön kristallgrotta under utslagsön. Samma trä-, läder- och växtmaterial återkommer i trumman, flygringen, bowlingkäglorna, bryggan och gränssnittet. Bakgrundsöar, moln, pollen och fjärilar ger djup och rörelse. Spelytan hålls fri från dekorativ växtlighet.

Hoppets fysik, smala landning, öppna kanter, kägelkedja och straffslag är oförändrade. Temapasset ändrar hur världen känns och läses, inte hur långt ett visst slag går. Kameran får lite mer utrymme framåt så att flygringen syns från utslaget. Stolparna slås ihop till jämna staketrader; vid avstampet används en låg kant för fri sikt över hoppet.

## Hål 15 – Rotravinen

Researchpasset utgick från Mighty Coconuts [beskrivning av Walkabouts sammanhängande temavärldar](https://www.mightycoconut.com/minigolf) och spelregissör Liam Edwards avsnitt ”The High Road or the Low Road?” i [Cursed to Golfs utvecklarartikel](https://blog.playstation.com/2022/08/18/cursed-to-golf-is-out-today-on-ps5-and-ps4/). De betonar miljön som spelplats, genvägar på olika höjder och att kunna överblicka vägvalen. Vår tillämpning är egen: efter Skybowlings flygtur kommer ett hål om rull, placering och smala passager.

Utslaget ligger 5,6 meter över den nedre gläntan. En stenränna med sarger och lägre rullmotstånd leder ner under en rotbro. Ett kontrollerat slag på ungefär halv kraft räcker; gravitationen gör resten. Gläntans högre friktion gör att man kan stanna och planera nästa slag. Rotbron är en del av platsen ovanför rännan, inte ett extra osynligt hinder eller en teleportering.

Spången är 1,4 meter bred och ligger två meter vid sidan av rännans linje. Hela spången saknar sidosarger; gula kantmarkeringar visar risken. Gläntans kant rakt fram är också öppen och markerad. Spelaren behöver hålla igen nedför rännan, placera bollen åt vänster och sedan välja en noggrann linje. Ett kontrollerat upplägg klarar par på fyra slag. Svampstigen ger större marginaler och räcken och går att spela på fem slag. Den har en plan avsats efter sin uppförsbacke så att bollen kan stanna inför svängen. Ett fall ger ett pliktslag och återgång till senaste slagplatsen.

Klipporna är högre på ravinens bortre sida så att den lägre spelytan går att läsa i översikten. En liten timmerränna driver ett vattenhjul på utsidan; bollen spelar i den separata stenrännan. Svampöar, lyktor, ormbunkar och en rotbro ger hålet karaktär utan nya knappar. Kopp, sarger och dekaler följer den faktiska terränghöjden.

### Balansjustering efter speltest, 28 september

Den ursprungliga raka spången gjorde Svampstigen ointressant: samma linje fortsatte från utslaget och sargerna kunde rädda felriktade slag. Spången har därför flyttats åt sidan och samtliga sidosarger tagits bort. Att enbart slå hårt och rakt är nu en miss som går att förstå från geometrin. Fysiktesterna visar att raka öppningsslag på 80–100 procent faller vid gläntans öppna kant; måttliga slag stannar före den. En väl placerad boll kan passera spången, medan sex graders avvikelse faller åt båda håll. Svampstigen behåller den tidigare skyddade, bredare sträckningen. Ändringen ger genvägen en placeringskostnad och en faktisk fallrisk i utbyte mot ett sparat slag. Hålets rekord jämförs inom den nya layoutversionen.

Kvarnhjulets rotation är också rättad: vattnet faller på hjulets vänstra sida och skovlarna rör sig nedåt på samma sida.

## Hål 16 – Ekollonsvingen

Efter ravinens höjdskillnader kommer en plan bana om tajmning och vallslag. Ett stort modellerat ekollon hänger mellan rotpelare och sveper lågt över en kort, smal passage. Spelaren kan lägga upp före pendeln eller försöka passera direkt. I ekollonets ytterläge öppnas en lucka, medan det täcker passagebredden på vägen genom mitten. En sidostöt kan kosta ett pliktslag över de markerade kanterna utan sarg. Före och efter passagen finns större gräsytor med träräcken.

Hålet svänger nittio grader efter pendeln. En diagonal vallstock gör att spelaren kan använda en studs för att nå träbron eller greenen på andra sidan. Gräs, trä och kollisionsytor följer samma layout. Ett testat upplägg med öppning, vall, transport och putt klarar par 4. En starkare öppning och ett längre vallslag kan ge birdie. Flaggans placering runt det andra hörnet kräver fortfarande en avslutande riktning.

Stubbstugor, små lysande frölyktor och ett ekollonförråd bakom vallen ger hålet en egen berättelse inom Molnskogens etablerade stil. Pendelns stora nöt har räfflat skal, överlappande fjäll på hatten och ett tvinnat rep. Hindret använder samma rörelseberäkning för den synliga modellen och bollens kontakt, även när bollen ligger stilla och spelaren siktar.

På hål 15 har gläntans skylt rättats till **SMAL SPÅNG →**, så att den pekar mot spångens faktiska infart.

### Svårare passage på hål 16

Den första versionen var för lätt att passera. Det höga, breda pendelutslaget lyfte undan nöten under större delen av cykeln, och den 6,6 meter breda fairwayn gav en nästan ostörd väg längs kanten. Passagen är nu 2,4 meter bred under pendeln och fem meter lång, med öppna, gula sidokanter och motsvarande urtag i klippan. Ekollonets diameter ökar från 2,1 till 2,8 meter, svängvinkeln minskar från 60 till cirka 21 grader och perioden kortas från 5,8 till 4,6 sekunder. Formen och materialarbetet är bevarade.

Automatiska slagprover testar 80 jämnt fördelade startögonblick över hela cykeln, tre höga kraftnivåer och tre riktningar. Testerna kräver att tajmningen ger både lyckade passager och tydliga missar även vid maxkraft. De provar också den tidigare vägen åtta och tolv grader längs utsidan, som nu stoppas av den synliga kanten före passagen. Samma kontrollerade parrunda och birdierunda är fortfarande spelbara. Rekord sparas separat för den nya svårighetsgraden.

## Hål 17 – Rotvolten

Efter pendelns tajmning kommer ett tydligt kraft- och linjeprov: en hel looping av trä och gräs. Roten vrider sig i sidled under varvet så att mynningarna möter varsin ö utan att korsa varandra. Bollens fart räknas genom hela loopen med gravitation och motstånd. För svaga slag rullar tillbaka. Det finns ingen automatisk minsta fart eller teleportering till utgången. Kameran glider åt sidan så att hela varvet syns.

En rak öppning runt 80 procent kan stanna på avsatsen efter loopen. Då räcker en mjuk knuff för att ta sig nerför den 2,4 meter höga trä­rännan. En starkare öppning kan passera avsatsen och spara ett slag, men maxkraft rullar över den tydligt markerade änden. Sidokanterna i rännans mitt är också öppna. Slutmålet ligger efter två svängar, vilket bryter linjen från loopen och ger en avslutande placeringsuppgift. Ett kontrollerat upplägg ger par 4 och ett bättre öppningsslag möjliggör birdie 3.

Jättestora vilda blommor ger den här delen av Molnskogen en egen siluett. Rotstöd bär upp loopen, träundersidan har synliga tvärslanor och små bärnstensljus följer varvet. Blomsterterrassen vilar på en kluven rot med glödande savkristaller. Höjder, sarger och markeringar delar bandata med fysiken; de öppna kanterna har ingen dold räddningsyta.

## Puttjustering efter speltest

Den skärpta precisionen på hål 17 gjorde de korta puttarna onödigt krävande. Nu får slag på högst 20 procent kraft en perfektzon på 28 procent och högst cirka 1,9 graders fel. Hjälpen avtar gradvis fram till halv kraft; hårda slag behåller 10 procent grönt och upp till 15 graders avvikelse. Mätarens synliga gröna fält och beräkningen använder samma funktion. Koppens fångstradie går mjukt från 32 cm vid högre fart till 45 cm vid låg fart. Högsta fångstfarten förblir 3,6 och ingen dold inbromsning har återinförts.

## Hål 18 – Törnkronan

Finalen kombinerar två läsbara risker och lämnar själva avslutningsputten lugn. Den första är en 10,8 meter lång rotbro med tre par fällbara blad. De öppnar i en förskjuten cykel och fäller neråt, så att man ser avgrunden under. Lyktor sitter längs varje lucka och som tre upprepade signaler på utslaget. Grönt betyder bärande, gult varnar 0,75 sekunder före öppning, rött betyder att stödet försvunnit. Signalerna visar det aktuella läget, inte en garanti om att ett långsamt slag hinner över hela bron.

Den andra är ett tvåarmat törnhjul på en gren utan sidosarger. En boll behöver passera vid sidan av navet och vid rätt ögonblick. Fyra armar testades men gav för få pålitliga öppningar på den smala bron; två armar ger en tajmningslucka som går att lära sig. Fel tajmning kan ge en sidostöt och ett fall. Hjulet fortsätter vara fysiskt även om bollen stannar eller spelaren siktar. Före hjulet finns en trygg plats att förbereda slaget. Flaggan står vid sidan av hjulets linje så att en bra passage följs av en egen avslutningsputt.

Automatiska prov över hela cykeln kräver att raka öppningsslag har både lyckade och misslyckade startögonblick även vid maxkraft. De testar även att sex graders sidovinkel inte kan gena förbi rotbron. Ett noggrant placerat öppningsslag, en transport, ett tajmat slag genom hjulet och en putt ger birdie 4. Med ett extra placeringsslag går par 5 att nå. Ett fall återgår till senaste säkra slagplats; en lucka som senare öppnas kan aldrig bli en permanent återställningsplats.

Rotbro, törnhjul, ugglevakter och kronport är egna modeller med Molnskogens etablerade bark, trä, blad, bärnsten och rosa himmel. Den stora porten och slutgreenen gör finalen tydlig redan i översikten.

## Tidigare temaförslag

**Månkarnevalen** var ett förslag för en tydlig kontrast till Molnskogen. Ett gammalt tivoli driver mellan asteroider: elfenbensvita raketer, koppar, mörkt violett och turkosa lyktor. Börja med en vanlig landningsbana, introducera sedan avgränsade zoner med låg gravitation, planetbanor och pariserhjul som bär bollen mellan avsatser. Ge varje ny regel ett lätt första hål innan den kombineras med något annat. En trasig månraket blir världens stora återkommande landmärke.

**Urverkets stad** ligger inuti en gigantisk gökurstad. Mässing, patinerad turkos, varmt trä och stora urtavlor ersätter naturen. Kugghjulsbroar, hisslod, rullande klockkulor och visare som flyttar passager ger spelidéer med en tydlig orsak till rörelsen. En återkommande tickande rytm gör tajmningen möjlig att lära sig.

**Djuphavets glömda tivoli** blandar sjunkna attraktioner, koraller och självlysande maneter. Bollen spelar i torra glasrör och kupoler mellan vrak, medan strömmar driver hjul utanför. Luftbubblor kan lyfta bollen, musslor öppna genvägar och bläckfiskarmar flytta broar. Det ger ett starkt eget utseende utan att alla puttar måste använda helt ny undervattensfysik.

Detta är egna konceptförslag, inte färdiga banplaner. En provbana i vald värld bör först visa både grafiken och en enda ny mekanik innan resten av världen byggs.


## Urverkets stad – vald värld, hål 1 byggt

Spelaren valde Urverkets stad. Första hålet, **Gökporten, par 3**, introducerar ett enda rörligt hinder. Porten använder ett långt öppet intervall och sarger runt hela banan. Missad tajmning kostar en dålig position snarare än ett fall. Kugghjul, kuggstänger, kedjor och motvikter gör rörelsen begriplig. Ett öppningsslag omkring 80–90 procent tar bollen genom porten, följt av ett placeringsslag till green och en närputt; en exakt längre andraslag kan ge birdie.

Spelytan är turkos filt inlagd i mörkt trä med mässingsbeslag. Urtavlans green står framför stadens stora gökur, med två visare, en pendel och en liten fågel som tittar ut. Mindre klockhus, gångbroar, en urmakarbänk, fjäderverk och stora motroterande kugghjul bildar staden. Hela platsen står inne i ett timrat klockskåp med stora spröjsade fönster. De mekaniska formerna ersätter skogens öar och vegetation. Inget nytt råmaterial eller bildpaket krävs; modeller, urtavlor och texturer är egna.

## Närspelet efter ytterligare speltest, 29 september

Den tidigare bredare precisionzonen löste inte svårigheten att dosera mycket små slag med en snabbt rörlig kraftmätare. Närputt tar därför bort båda tidskraven inom 5,5 meter på en fri och plan green. Spelaren väljer rulllängd på ett stilla reglage, ser avståndet till koppen och slår med ett tryck. Siktriktningen förblir spelarens; ett klick på hålet fungerar även i den vanliga spelvyn. Ett val för fullt slag behåller tillgången till vanliga slag. Längdmodellen använder aktuell friktion och putten har ingen slumpmässig sidavvikelse. Hårda slag på övriga banan behåller sin tidigare precision.

Törnkronans flimmer var två koplanära ytor på törnbron. Den bärande undersidan ligger nu under den synliga spelytan. Kronportens träd skymde guldkronan, så trädet har tagits bort och kronans siluett förstärkts med ett brett band, välvda byglar och en central sten.

## Närputt med egen dosering, 2 oktober

Förvald rulllängd efter hålavståndet gjorde närputten nästan automatisk. Reglaget börjar nu på 1 meter vid en ny runda och minns därefter spelarens eget val under hålet, även vid byte till fullt slag och tillbaka. Det räknas aldrig om efter bollens nya läge. Avstånd och sikte finns kvar som stöd, och puttar har fortfarande inget timingkrav eller slumpfel. Koppens extra hjälp vid låg fart minskar från 45 till 38 cm; grundradien 32 cm och fartgränsen 3,6 är oförändrade. Korta puttar får därför fortsatt marginal, medan för korta, för sneda och kraftigt överdoserade puttar missar. Fysikproven följer spelets verkliga stoppvillkor och testar både lyckade puttar och missar.

## Urverkets stad – hål 2: Rörposten

**Par 3.** Stadens poststation byter portens tajmning mot placering, transport och ett vallslag i två våningar. En mässingstratt är nedsänkt i utslagsytan. Den har ett riktigt hål i däcket och en skål som påverkar bollens riktning genom gravitation, med samma höjd och lutning i modell och fysik. Ett måttligt slag omkring 40–50 procent fångas även en bit från mitten. Ett hårt, snett slag kan passera över skålen i stället för att automatiskt fångas.

När bollen når trattens hals driver tryckluften den genom ett sammanhängande glasrör till en terrass 3,2 meter upp. Boll och rör delar samma kurva. Mässingsflänsar, en lysande ring som följer leveransen, tryckluftstank, manometer, kolv och svänghjul gör transporten begriplig. Postfack, paket, skyltar och urtavlegreen ger platsen en egen identitet inom stadens trä-, mässings- och turkosa formspråk. Utmatningen lämnar bollen på en skyddad terrass utan att kräva ett nytt knapptryck.

Nästa slag går genom en smal utförsränna. En diagonal mässingsvall leder bollen runt hörnet mot greenen. Ett kontrollerat slag omkring 80 procent lämnar en enkel närputt och en provspelad trea; en exakt kraftig vallträff kan ge birdie. Rännan och greenen har sarger, eftersom detta är världens andra introduktionshål. Alla tidigare hål finns kvar i banväljaren, och hål 1 länkar vidare till hål 2.

### Idébank för kommande hål – en ny huvudidé åt gången

| Hinder | Vad spelaren behöver göra | Möjlig senare kombination |
| --- | --- | --- |
| Två tidsportaler | Välja infartsvinkel: bollen behåller rörelseriktning relativt portalen och fart vid utgången. | En kort, smal genväg mot en längre väg med sarger. |
| Tryckluftskanon | Lägga bollen i laddkoppen och tajma ett långsamt svängande sikte. | Olika landningshyllor med olika vinst och risk. |
| Flipperkontakt | Träffa en tydlig kontaktplatta för att växla en bro eller öppna en dörr. | Ett placeringsslag som ändrar nästa slags väg. |
| Kugghjulsfärja | Spela in bollen på ett kugghjulsdäck och välja när man slår av det. | En hög och en låg utgång. |
| Förgrenad rörväxel | Träffa en växel före tratten för att välja utlopp. | En nära men brant utgång, eller en trygg omväg. |
| Motvikthiss | Rulla ombord, åka till en ny höjd och slå vidare från en stillastående avsats. | Ett senare hål med flera våningar att överblicka. |

Förslagen är egna designidéer, inte löften om en viss hålordning. Introducera först den nya regeln med tydliga visuella signaler och plats att misslyckas. Lägg därefter till ett vägval eller ett precisionskrav. Spara kombinationer till senare hål; variationen ska komma från olika beslut, höjder och bollrörelser, inte bara fler föremål på varje bana.


## Urverkets stad – hål 3: Klangbron

**Par 3.** Efter rörpostens transport introduceras en spelbar kontakt som förändrar banan. Träffa den gyllene knappen under klockan: den sjunker ner i golvet, klockan klämtar och en vindbrygga fälls ner över urverket. Synliga vajrar, kugghjul och motvikter följer öppningen. Bommarna vid båda ändarna går undan först när bron är helt nere. Själva bron är den enda synliga spelytan över gapet.

Ett måttligt öppningsslag mot klockan, ett kontrollerat slag över bron och en närputt klarar par. Ett mycket välriktat hårt andraslag kan ge birdie. Genvägen har öppna sidokanter, så fel riktning kan ge fall och pliktslag. Urmakargången runt har sarger hela vägen och går runt greenens bortre hörn. Fyra kontrollerade slag når mål; den tidigare direkta linjen för det tredje slaget är stängd. Att slå rakt och hårt från utslaget öppnar inte bron. Det måste vara ett medvetet vägval att använda klockan.

Knappen är nedsänkt efter träff så att nästa slag kan rulla över den. Ett fall återställer läget från före slaget: en klocka som träffades under just det misslyckade slaget återställs, men en öppning från ett tidigare lyckat slag behålls. Ny runda fäller upp bron och återställer klockan.

Klockspel, en modellerad mässingsklocka, länkar till bryggans mekanism och roterande kugghjul nere i gapet ger hålet egen karaktär i samma värld. Urmakarbänken står utanför både genvägen och omvägen. Parrundan har provspelats i webbläsaren; automatiska prov täcker båda vägarna, birdie, maxslag mot stängd bro, sidomiss och återställning.

## Rörkameran på hål 2

Kameran dyker mjukt in efter bollen och följer samma rörkurva med eftersläpning. Avståndet minskar från 2,8 till 1,4 meter under färden. Orienteringen följer böjarna utan plötsliga vändningar och rätas upp före utgången. Där glider kameran tillbaka till den vanliga spelvyn. Översikten behåller sin kameravinkel. Med systeminställningen för minskad rörelse används den lugnare sidovyn. Bollens fart, utsläpp och möjligheten till två slag på Rörposten är oförändrade.


### Klangbron – tydligare vinst för risken

Speltest visade att båda vägarna alltför enkelt gav tre slag. Par ändras därför inte; i stället ändras själva vägvalet. Den skyddade Urmakargången fortsätter nu förbi greenen, svänger runt dess utsida och ansluter från bortre hörnet. Den nya sträckan har sarger, synliga stöd och vägvisning. Långsträckan har lägre rullmotstånd så att den går att spela i ett slag; kostnaden är det extra hörnet och placeringen, inte långsam bolltransport.

Balansmålet är tre kontrollerade slag eller en skicklig tvåa via klockan och den oskyddade bron, mot fyra kontrollerade slag längs omvägen. Automatiska prov sveper 240 kombinationer av öppnings-, transport- och avslutningskraft på den säkra vägen: ett direkt tredje slag mot koppen stoppas nu av den synliga svängen. Fyra olika slutkrafter fullföljer samma fyrslagsväg. Omvägen är också provspelad i webbläsaren till mål på fyra slag. Bron behåller sina testade två- och treslagsvägar och sin fallrisk. Hålet sparar nya rekord med en ny layoutnyckel; gamla rekord finns kvar separat.


## Urverkets stad – hål 4: Lodverket

**Par 4.** Klangbrons vägval följs av ett hål om höjd, placering och fartkontroll. Hissens platta väntar på bottenvåningen. Bollen måste faktiskt stanna ombord innan dörrarna stänger och två motvikter sänks medan korgen går 5,4 meter upp. Ett alltför hårt utslag kan studsa tillbaka från den stängda bakre dörren och bli kvar före lastzonen. Den som stannar snett i korgen behåller sin sidoplacering. Vid övervåningen öppnas utfarten och en liten utmatningsarm hjälper bollen ut på balkongen; inget nytt knapptryck eller extraslag behövs.

Från balkongen går en tio meter lång ränna ner 4,8 meter. Sargerna skyddar sidorna. Längst fram efter backen finns däremot en tydligt markerad öppen kant. Normal kraft räcker långt eftersom gravitationen gör arbetet; ett rakt maxslag kan ge ett fall. Den sista delen svänger tillbaka runt ett hörn till en lugn green. Hiss, kontrollerat utförslag, placering runt hörnet och enkel närputt ger fyra slag. En exakt placering efter backen öppnar för ett kraftigt vallslag på tre.

Tornet har ett öppet ramverk för fri sikt, tandade kuggstänger, animerade kedjelänkar, två lod, våningsindikator och en stor uppdragsnyckel. Den ena dörren är öppen när den andra är stängd. Rörelse och kollision delar samma tillstånd. Hissgolvet har ingen statisk geometri under sig som skulle kunna flimra eller se ut som en osynlig ramp. Kameran visar färden från sidan och byter till en fri vinkel på balkongen innan den åter följer bollen nedför backen.

Ett fall återställer hissen till läget före slaget, medan en tidigare lyckad hissfärd bevaras. Ny runda börjar med hissen nere. Automatiska prov täcker kontinuerlig höjd, motvikternas riktning, dörrar vid båda avsatserna, kraftgränser vid ombordstigning, nedförsbackens höjdprofil, maxkraftens fallrisk samt både par- och birdievägen.


## Urverkets stad – hål 5: Sekundvalvet

**Par 4.** Efter hiss och utförsränna handlar femman om tajmning genom ett rörligt hinder, följt av ett vallslag. Ett stort tandat mässingshjul har tre riktiga öppningar som roterar förbi bollens höjd. De tre öppningarna identifieras med romerska siffror. Mässingsringar, nitar, lager, stödramar och ett mindre drivhjul ger maskinen en tydlig konstruktion. Små lampor och pilar visar när en öppning är vid golvet. I översikten beskriver den befintliga informationsrutan också öppningens aktuella läge.

Ett ungefär 60-procentigt utslag stannar tryggt före valvet. Ett tajmat kraftslag därefter går igenom och kan vallas runt hörnet. Placering mot greenen och enkel närputt ger fyra slag. Ett hårt utslag direkt genom hjulet kan spara upplägget och ge en trea. Det direkta slagets öppningsfönster omfattar ungefär en fjärdedel av cykeln. Ett felslag studsar tillbaka på banan; sarger skyddar hela hålet. Den större tajmningssvårigheten behöver inte samtidigt straffas med fall.

På andra sidan finns två mässingsklockor med fjädrande klang och extra bollfart. Det går att undvika dem eller utnyttja en studs. Den diagonala vallen har samma ändpunkter och radie i grafik och fysik. Det avslutande hörnet gör att en lyckad passage fortfarande kräver placering. Greenen är fri från rörliga hinder och använder den vanliga närputten.

Grafik och kollisionsprov använder samma öppningar, vinkel och klocka. Bollens hela tvärsnitt måste få plats. Snabba slag testas längs förflyttningen, inte bara vid slutpunkten. En boll som blir stående inne i en stängande öppning knuffas ut på närmaste sida och kan spelas vidare. Efter passagen glider kameran åt sidan så att den stora skivan inte skymmer bollen. Automatiska prov täcker synliga hål, högsta fart, felriktning, återstuds, tajmningsfönster, par, birdie och fri närputt.

Parrundan har även provspelats i webbläsaren på fyra slag med en avslutande närputt från 2,2 meter. Provspelningen ledde till en öppnare sista sväng; 27 kombinationer av uppläggs-, genomslags- och inspelskraft lämnar nu en fungerande närputt. Alla 81 tester och produktionsbygget passerar.

## Urverkets stad – hål 6: Tolvslaget

**Par 4, världens final.** Ett stort liggande fickur har öppet maskineri under en verkligt spelbar klockvisare. Visaren är 13 meter lång och 2,16 meter bred, stannar 2,4 sekunder och vrider sedan ett kvarts varv på 1,7 sekunder. Grönt markerar rak överfart, gult varnar före vridningen och rött markerar stängd passage. Ett kraftslag behöver även rätt riktning. Sidorna är öppna, och ett misslyckat försök kostar ett pliktslag och återgång till senaste fasta slagplatsen.

Bollen följer med visaren även när den står stilla eller spelaren laddar nästa slag. Relativ rullhastighet och sikte vrids med däcket; rotationen ger ingen gratis fart. Grafik, signaler, stöd och transport använder samma klocka och transformation i `src/clock-hand.js`. Den stationära banbyggaren lämnar urverket öppet. Fickurets sifferkrans ligger lägre än spelytan och är inte en osynlig extra väg. Kuggverk, axlar, uppdragskrona, romerska siffror, inläggningar, stödstag och de två finalklockorna är egen geometri i `src/clock-hand-visuals.js`.

Ett upplägg runt 55 procent stannar före mekanismen. Ett rakt kraftslag runt 85–95 procent tidigt i den gröna fasen korsar bryggan och vallas mot greenen. Inspel och manuellt doserad närputt ger fyra slag; ett precist inspel kan ge tre. Ett mycket väl tajmat maxutslag kan också spara upplägget. Genvägens tajmning provas över hela cykeln, inklusive sidomissar och maxslag som faller.

Servicegången har sammanhängande sarger och två extra hörn. En testad väg tar sex kontrollerade slag, eller fem med ett precist avslut. Den passerar aldrig visaren. Skillnaden mot genvägen ligger därför i extra placeringar och slag, inte bara utseende. Finalgreenen är lugn och behåller närputten med spelarens egen rulllängd. Två stora klockor rör sig när hålet sänks, och resultattexten markerar världens avslut.

`tests/clock-hand.test.js` verifierar den synliga spelytan mot fysisk bärighet, en hel rotation utan drift eller fartökning, tajmningsfönster, fallrisk, par och birdie, den skyddade omvägen och närputtens avgränsning. Samtliga 89 tester och produktionsbygget passerar. Hål 5 länkar vidare till hål 6, som också finns i banväljaren. Äldre banor och rekordnycklar behålls.

Webbläsarprov med de vanliga kontrollerna fullföljde genvägen till mål på fem slag, inklusive en för kort första närputt som korrekt stannade före koppen. Ett separat feltajmat kraftslag gav fall, ett pliktslag och återgång till upplägget framför visaren. Banväljaren visar samtliga sex urverkshål och webbläsarkonsolen var fri från fel.

## Molnskogen – hål 12: Moderträdet

**Par 5, världens final och set piece.** Varje värld ska sluta med ett landmärke som också är mekaniken. Törnkronan flyttades till hål 11 och Moderträdet tog finalplatsen.

Ett jätteträd växer upp ur molnhavet mellan utslaget och den svävande kronön. Genom stammen går en rund tunnel, trädets öga, i flygriktningen. Ett enda slag kan kedja två redan kända idéer: rotvolten från hål 10 och studstrumman från hål 7. Volten lämnar bollen på en smal rotbro som leder rakt in på trumman. Trumman kastar bollen genom ögat mot kronön.

Kraften avgör allt. Under cirka 77 procent rullar bollen tillbaka ur volten utan pliktslag. Runt 80–87 procent går kedjan hela vägen. Ett svagare hopp landar i barken eller före ön, och maxkraft seglar förbi ön och över den öppna bortre kanten. Flygningen räknas bara som lyckad genom själva tunneln. Stammen, sidogrenarna och rankridåerna inom 5,6 meter från ögat räknas som träd, så det finns ingen osynlig väg runt stammen. Fysikens öppning och den byggda tunneln provas mot varandra med strålar i testerna.

Barkstigen är en sargad hängbro söder om trädet. Den kräver tre placeringsslag, ett inspel och en putt, det vill säga par. Kedjan ger inspel och putt efteråt, alltså birdie, och ett exakt inspel kan ge eagle. Vid ett misslyckat hopp återgår bollen till slagplatsen med ett pliktslag, precis som på övriga skogshål.

En vid sidokamera följer flygningen så att stammen aldrig skymmer bollen. När bollen sjunker lyser ögat upp och fyra blommor runt koppen slår ut.

Grafiken är medvetet på samma nivå som övriga skogshål. Alla delar som ska ersättas av Blender-modeller, med de mått som inte får ändras, finns i [BLENDER_ASSETS.md](BLENDER_ASSETS.md).

## Månkarnevalen – hål 13: Raketrampen

**Par 3, världens introduktion.** Spelaren valde Månkarnevalen som tredje värld, att prototypernas idéer ska återanvändas och att världen byggs ett hål i taget med speltest emellan.

Hålet lär ut en enda regel: en raketplatta skjuter bollen vidare dit pilen pekar och lägger till extra fart till den fart bollen redan har. Idén kommer från Dubbelstudsens studsplattor, men där satte plattan alltid samma fart. Med en fast fart blev kedjan helt förutbestämd: varje slag som träffade plattan hamnade på samma ställe. Som booster avgör spelarens eget utslag hur långt kedjan bär.

Första plattan står i hörnet efter utslaget och siktar på andra plattans mitt. Andra plattan skickar bollen uppför en friktionssnål startramp, 2,2 meter, till en upphöjd green. Runt 80–90 procent kraft når greenen och ger en närputt för birdie. Svagare slag rullar tillbaka nerför rampen utan pliktslag, och ett nytt slag uppför rampen ger par. Från cirka 93 procent flyger bollen över greenens öppna kant ut i rymden. Efter första speltestet låg gränsen för högt: bara exakt 100 procent flög ut, medan mätaren visar MAXKRAFT redan från 83 procent. Greenen kortades därför till x = 14 och andra plattans booster höjdes från 7 till 7,5. Plattor skjuter bara iväg en boll som inte rullar mot pilen, så en boll på väg tillbaka nerför rampen kan inte pendla mellan plattorna.

Miljön är ett tivoli på flytande asteroider: violett rymd med stjärnor, en ringplanet, ett pariserhjul som förebådar hål 17, en lutande månraket som förebådar finalen, randiga cirkustält och ljusslingor. Spelytan är turkos filt med polkagrisrandiga sarger och glödlampor. Grafiken ligger på mellannivå inför Blender.

## Månkarnevalen – hål 14: Tyngdlösa tältet

**Par 4, mer varierat än hål 13.** Efter speltestet av Raketrampen bad spelaren om ett mer varierat hål. Hål 13 avgjordes nästan helt av ett enda kraftslag. Hål 14 har i stället tre olika slag: ett vallningsslag, ett svävhopp och en närputt på en upphöjd scen. Det finns också en lugnare väg runt.

Utslaget går längs en rak gång mot en diagonal hörnsarg som vallar runt bollen till tältets ingång. Det är ett placeringsslag utan risk. Runt 80 procent stannar framför ingången.

Inne i tältet, en åttkantig manege på 18 × 18 meter, är tyngdkraften svag. Filten har friktionen 0,45 i stället för 1,1, så bollen glider långt. Mitt i manegen finns ett öppet hål, 5 × 6 meter, utan sarger. En boll som rullar över kanten inne i tältzonen faller inte direkt. Den svävar vidare med oförändrad fart och sjunker med 2,2 m/s² (ungefär en fjärdedel av vanlig gravitation). Når den golvet på andra sidan innan den har sjunkit 0,4 meter landar den och rullar vidare. Når den golvet för lågt räknas det som att den slår i hålets kant. Har den sjunkit 1,6 meter är den förlorad. Båda fallen kostar ett pliktslag. Svävandet finns i `src/low-gravity.js` och delas av spelet och testerna.

Från ingången avgör kraften: 55 procent eller mindre sjunker i hålet. Runt 60–75 procent svävar över och glider upp för en kort ramp till artistscenen, 1,2 meter upp, för en närputt och birdie. Från cirka 85 procent flyger bollen av scenens öppna bortre kant. Koppen ligger snett på scenen, så ett perfekt riktat svävhopp hamnar i koppen i mindre än tolv procent av försöken. Ringvägen glider runt hålet med sarger på yttersidan, och ett andra slag uppför scenrampen ger par.

Miljön är ett slitet rödvitt cirkustält med en öppning mot rymden bakom scenen. Det har tältstänger, en svävande gravitationsring, ballonger, konfetti, sammetsridåer, strålkastare och en skylt med texten TYNGDLÖST över ingången. Ringen och ballongerna hänger högre än kameran, så sikten är fri under svävandet.

## Månkarnevalen – hål 15: Svarta hålet

**Par 3, ett kort hål med en enda ny idé.** Platshållaren hette Planetvallen och skulle ha planeter som studsar bollen runt en asteroid. Studsar ensamma gör utfallet slumpartat. Därför fick hålet i stället en kraft man kan lära sig läsa: ett svart hål målat på filten mellan utslaget och koppen. Planeterna finns kvar som studsplaneter i de bortre hörnen.

Inom den streckade ringen, 3 meter i radie, drar hålet bollen mot mitten. Dragningen är noll vid ringen och växer med ett omvänt kvadratiskt avstånd närmare mitten. Den svarta skivan, 0,6 meter i radie, är horisonten: där sugs bollen in, och det kostar ett pliktslag. Testet sveper hela steget, så en snabb boll kan inte hoppa över horisonten. Koppen ligger utanför dragningen och syns hela tiden rakt bakom hålet, så den första reflexen är att sikta rakt på den. Det slaget blir alltid uppslukat, och det lär ut regeln på första försöket.

**Slungskottet.** Siktar man 1–1,5 meter förbi hålet med 80–90 procent kraft böjer dragningen banan runt hålet, och bollen slungas mot koppen. Den hamnar inom cirka 2,5 meter för en närputt och birdie, och under 6 procent av de välriktade slungskotten går rakt i. Svagare slag förbi hålet hinner inte undan och sugs in. Det är riskdelen.

**Långt runt.** Siktar man 4–5 meter vid sidan av hålet med 60–70 procent kraft rullar bollen säkert längs kanten. Putten därifrån går fri från dragningen och ger par.

Studsplaneterna i de bortre hörnen tar emot överslagna bollar och skickar tillbaka dem in i arenan. Bakom koppen står ett observatorium med skylten SVARTA HÅLET. Fysiken finns i `src/black-hole.js` och delas av spelet och testerna.

## Månkarnevalen – hål 16: Kanonkometen

**Par 3, ett tajmingshål.** De tre första hålen i världen handlar om kraft och sikte. Det här handlar om när man trycker. Kanonkurvans kanon återkommer som raketkanon, men här väljer spelaren själv när den skjuter.

Utslaget är enkelt: allt från cirka 50 procent rullar ner i laddningstratten framför kanonen, och ett svagare slag kan följas av ett nytt. Efter första speltestet saknades en trovärdig väg in i kanonen, eftersom bollen bara försvann i sockeln. Nu leder två styrsarger bollen in i en tratt i banan, och tryckluft blåser upp den genom ett glasrör in i kanonen. I samma test syntes inte koppen: en dekorsten bakom greenen hade fått en slumpad rotation och stack upp över den. Den är borttagen. Kanonen laddas, och pipan sveper ±40 grader med en period på 3 sekunder. Kometen flyger alltid 13,2 meter, så landningspunkten bestäms bara av pipans vinkel när spelaren trycker FYR. Att skjuta kostar inget slag.

Svepet är sinusformat. Därför rör sig pipan snabbast över mitten, där greenen ligger (±7 grader, ungefär 11 procent av tiden), och stannar nästan upp vid ändarna över sidohyllorna (från 22 grader och utåt, ungefär 60 procent av tiden). Mellan hyllorna är rymden. En miss kostar ett pliktslag, och bollen laddas i kanonen igen för ett nytt försök. Greenen ger en putt för birdie, och en perfekt mittträff rullar rakt i koppen (under 4 procent av tiden). Från en sidohylla finns ingen rak putt över gapet. Två puttar runt hörnet och nerför bron ger par.

Landningsbågen är markerad med ljus, turkosa över hyllorna och röda över rymden. Medan kanonen är laddad följer ett sikte bågen, så fönstren kan läsas innan man skjuter. Kanonen står på en vridbar sockel med en randig pipa. En komet med svans syns på himlen.

## Månkarnevalen – hål 17: Pariserhjulet

**Par 3, ett lugnt hål före finalen.** Platshållaren sa "tajma när du kliver av", men tajming med ett tryck användes redan på hål 16. Här tajmar spelaren i stället själva slaget, som vid Neonslussens lyftport: bollen ska rulla in i en gondol medan den står vid bryggan.

Hjulet beter sig som ett riktigt tivolihjul. Det vrider sig ett kvarts varv på 1,4 sekunder och står sedan still i 1,6 sekunder. Fyra gondoler hänger lodrätt. Vid varje stopp står en gondol vid den nedre bryggan och en vid den övre greenen, ett halvt varv bort. En boll som rullar in i bryggans öppning medan hjulet står still går ombord, åker ett halvt varv (två steg) över toppen och tippas ut på greenen med lite fart. Därifrån ger en putt birdie. Medan hjulet snurrar är grinden stängd: en röd lampa och en bom. Då studsar bollen tillbaka, och det kostar inget pliktslag. Ungefär hälften av alla starttider når en stående gondol med ett slag på 70 procent. Genom att se hjulets rytm kan spelaren slå i rätt ögonblick.

Rampen längs sidan leder 2,5 meter upp till greenen och ger par. Kanten mot rymden är öppen, så ett slag som drar åt fel håll ramlar av. Hjulets geometri (nav, radie och var gondolerna hänger) delas av fysiken och grafiken i `src/ferris.js`. Testerna kontrollerar att gondolernas golv ligger i nivå med båda däcken.

## Månkarnevalen – hål 18: Månraketen (final)

**Par 4, världens final och set piece.** Finalen följer samma regel som de andra världarnas finaler: två idéer som spelaren redan känner kombineras. Här är det kanonen från hål 16 och den låga gravitationen från hål 14.

Den trasiga månraketen, ungefär 12 meter hög och lappad, står på en startplatta bredvid ett gammalt startbord med en kraftmätare. Utslaget rullar ner i samma laddningstratt som på hål 16, och bollen blåses upp i raketen. Raketen sveper inte. I stället laddas kraftmätaren upp linjärt från 8 till 33 meter på 3,2 sekunder och börjar sedan om. FYR avgör alltså längden, inte riktningen. Svepet är linjärt i stället för sinusformat som på hål 16, så varje fönster är lika långt i tid som det är brett. Medan raketen är laddad byter kameran till översikt, eftersom raketkroppen annars skymmer flyglinjen. Ljus längs linjen och ett sikte visar var bollen landar.

- Under 10 meter och över cirka 29 meter hamnar bollen i rymden. Det ger ett pliktslag, och raketen laddas om.
- Månbasen (10–20 meter, cirka 35 procent av tiden) är bred. Landar bollen nära kratern kan den glida ner i den.
- Kratern ligger mellan 20 och 24 meter.
- Toppen med koppen (24–29 meter, cirka 20 procent av tiden) ger en putt för eagle.

Månbasen är en zon med svag gravitation och hal filt. Ett slag på 45–65 procent från basen svävar över kratern och landar på toppen. Toppen har sarger, så ett för hårt slag studsar i bakre sargen och rullar tillbaka ner i kratern. Därför valdes sargen framför en öppen kant: överfart straffas på ett sätt som syns. Vägen runt kratern glider utan att sväva och når också toppen. Vägen via basen ger birdie och marginal för par. När bollen sjunker skjuts fyrverkerier upp över toppen. Skylten MÅNRAKETEN, fyrverkerimörsare, en glödande kraterbotten och ljusslingor ramar in finalen.

### Plan för resten av världen

| Hål | Arbetsnamn | Idé | Återanvänd prototyp |
| --- | --- | --- | --- |
| 13 | Raketrampen | Raketplattor som booster och en startramp | Dubbelstudsen (studsplattor) |
| 14 | Tyngdlösa tältet | Låg gravitation i ett tält: hal filt, svävhopp över ett öppet hål och en upphöjd scen | Frostfallet (hal yta med öppna kanter) |
| 15 | Svarta hålet (var Planetvallen) | Ett svart hål som böjer bollens bana; studsplaneter i hörnen | Neonhamnens flipperstötar |
| 16 | Kanonkometen | Raketkanon med svepande pipa: tajma FYR mot green eller sidohylla | Kanonkurvan (kanon) |
| 17 | Pariserhjulet | Pariserhjulsfärja: rulla in när hjulet stannar, åk till greenen | Neonslussens lyftport (tajma grinden) |
| 18 | Månraketen | Final och set piece: raketens kraftmätare och svävhopp i låg gravitation | Kanonkometen och Tyngdlösa tältet |

Neonslussens lyftport och Vippvarvets vippbro kan dyka upp som delmoment. Prototyperna ligger kvar som bonusbanor tills deras idéer har ersatts.

