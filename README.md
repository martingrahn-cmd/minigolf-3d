# Mini Mayhem – tre världar, arton hål

3D-minigolf byggd med Three.js, egna modeller och KayKit Platformer Pack. Rundan består av tre världar med sex hål vardera. Paketmodellerna ligger lokalt i `public/assets/kaykit`.

```bash
npm install
npm run dev
```

Öppna adressen som Vite visar. Startsidan är en **huvudmeny** där varje värld spelas som en egen kort runda: **Spela** på en värld går igenom dess byggda hål i ordning och slutar med ett **resultatkort** med slag mot par och stjärnor per hål. Varje hål ger ★★★ för birdie eller bättre, ★★ för par och ★ för bogey. Det bästa resultatet per hål syns i banväljaren och summeras per värld. Under världarna finns **Hela turneringen** (alla hål i rad), **Fortsätt** (första hålet utan rekord) och **Välj hål**. Logiken finns i `src/progress.js` och testerna i `tests/progress.test.js`. Banväljaren visar alla 18 hål grupperade per värld. Hål som inte är byggda visas som streckade platshållare med arbetsnamn och idé. När ett hål startar visas först en banöversikt med hålets vägval; ett tryck eller <kbd>Mellanslag</kbd> börjar spelet.

| Hål | Värld | Status |
| --- | --- | --- |
| 01–06 | Urverkets stad | Klar |
| 07–12 | Molnskogen | Klar – hål 12 Moderträdet är världens set piece |
| 13–18 | Månkarnevalen | Klar – Raketrampen, Tyngdlösa tältet, Svarta hålet, Kanonkometen, Pariserhjulet och finalen Månraketen |
| 19–24 | Spökhamnen (specialvärld) | Klar – halloweenvärlden med finalen Spökskeppet |
| P | Prototyper (Solskensöarna, Neonhamnen) | Spelbara, ska byggas om |

Rundans ordning och platshållarna finns i `src/round.js`. Banornas interna `id` i `src/levels.js` är oförändrade, så rekord och banspecifik logik påverkas inte av numreringen. Länkar: `/?hole=1` … `/?hole=18` för rundan och `/?proto=kanonkurvan`, `dubbelstudsen`, `vippvarvet`, `neonslussen`, `frostfallet` för prototyperna. Ett obyggt hål öppnar menyn med en notis.

## Publicering, uppdateringar och mobil

- **GitHub Pages:** `.github/workflows/pages.yml` testar, bygger och publicerar vid varje push till `main`. Slå på det en gång under repots *Settings → Pages → Source: GitHub Actions*. Spelet hamnar på `https://<användare>.github.io/minigolf-3d/`. Bygget använder relativa sökvägar (`base: './'` i `vite.config.js`), så det fungerar både där och på en egen domän.
- **Versionskoll:** varje bygge får ett versions-id som finns i spelet och i `version.json`. Spelet kollar efter en nyare version vid start, när det kommer tillbaka i förgrunden och var femte minut. Finns en nyare version visas **Ny version av spelet finns · Uppdatera**. Knappen laddar om med `?v=<id>` så att ingen gammal cache blir kvar. Aktuell version står längst ner i huvudmenyn. Kollen är avstängd i `npm run dev`.
- **Manifest och ikoner:** `public/manifest.webmanifest` och `public/icons/` gör att spelet kan läggas till på hemskärmen och då öppnas i helskärm utan webbläsarlist.
- **Stående läge:** manifestet låser stående läge när spelet är installerat på Android. iOS tillåter inte låsning, så en liggande telefon får ett tips att vrida den, med knappen *Spela liggande ändå*.

## Troféer

Mini Mayhem har **31 troféer** enligt GameVolts standard, som i de andra GameVolt-spelen: 15 brons, 10 silver, 5 guld och 1 platina. De finns under **Troféer** i huvudmenyn.

- **Listan** finns i `src/trophies.js`, samma uppbyggnad som Chrome Circuits `achievements.js`.
  - Spelet skickar händelser: sänkt hål, slag, perfekt träff, kanon, rör, Rotvolten, pariserhjulet, kanthjälp, pliktslag, käglor, matcher och en världsrunda i rad.
  - Världar och stjärnor läses ur rekorden.
  - Repriser för den som tittar, ikappspolning och QA-bänken räknas inte.
- **GameVolt:** SDK:n laddas bara på gamevolt.io (`/sdk/gamevolt.js`, `init('mini-mayhem')`). En gästs troféer och statistik flyttas till kontot vid inloggning, och troféer från andra enheter hämtas ner. Utan GameVolt sparas allt i webbläsaren.
- **`node scripts/gamevolt-export.mjs`** skriver två filer med engelska namn: `gamevolt/achievement_defs.sql` (spelet och de 31 troféerna, körs en gång i Supabase) och `gamevolt/trophy_catalog.js` (posten i GameVolts profilsida). Ett test underkänner bygget om de inte stämmer med listan.
- **Bilderna** i `public/trophies/` (12 former × 4 metaller) renderas i Blender med `python blender/trophies.py public/trophies 256`. Studion, sockeln och sex av formerna kommer från Chrome Circuit, så samlingarna ser likadana ut. Minigolfformerna är boll på tee, hålflagga, putter, kugghjul, löv och pumpa.

## Språk

Spelet finns på **svenska**, **engelska** och **spanska** (latinamerikansk, med "tú"). Språket väljs med flaggorna uppe till höger i huvudmenyn och sparas på enheten. Första gången följer det enhetens språk, och annars blir det engelska. En länk kan också välja språk: `?lang=sv`, `?lang=en` eller `?lang=es`.

- Svenskan är källtexten. Den skrivs direkt i koden och i `index.html`.
- Översättningarna finns i `src/locales/en.js` och `src/locales/es.js`, med den svenska texten som nyckel.
- I koden går texterna genom `t('Sikta')` och `t('Hål {n}',{n})` från `src/i18n.js`.
- Sidans egna texter, hålen och världarna översätts när sidan laddas.
- `node scripts/i18n-keys.mjs en` listar texter som saknar översättning. `tests/i18n.test.js` underkänner bygget om något fattas eller om en platshållare som `{n}` har tappats bort.

## Spela med vänner

**Spela med vänner** i huvudmenyn öppnar ett rum för två till fyra spelare med varsin enhet. Värden väljer spelsätt. Med **Samtidigt** spelar alla samma hål på en gång och ser de andras bollar som färgade spökbollar. Med **Turordning** spelar en i taget medan de andra tittar, i en lottad ordning som flyttas ett steg per hål. Logiken beskrivs i [DESIGN.md](DESIGN.md#spela-med-vänner-upp-till-fyra).

Onlineläget använder [Supabase Realtime](https://supabase.com/docs/guides/realtime) och behöver inga tabeller:

1. Skapa ett gratis projekt på supabase.com.
2. Kopiera *Project URL* och den publika nyckeln (*anon* eller *publishable*) från *Project Settings → API*.
3. Fyll i dem i `src/supabase-config.js`, eller sätt `VITE_SUPABASE_URL` och `VITE_SUPABASE_ANON_KEY` vid bygget.
4. Kontrollera under *Realtime → Settings* att publika kanaler är tillåtna, alltså att *Allow public access* är på.

Den publika nyckeln får ligga i klientkoden. Utan konfiguration döljs knappen i det publicerade spelet. I `npm run dev`, eller med `?net=local`, fungerar rum mellan flikar i samma webbläsare.

## Banorna

Molnskogens hål beskrivs nedan med sina gamla nummer: 14 → 07, 15 → 08, 16 → 09, 17 → 10, 18 → 11. Moderträdet är hål 12. Hål 9–13 nedan är prototyperna.

Varje värld avslutas med ett **set piece**: ett landmärke som också är hålets mekanik. Grafiken är tills vidare procedurell på mellannivå; vilka modeller som ska byggas i Blender, med spelkritiska mått, står i [BLENDER_ASSETS.md](BLENDER_ASSETS.md).

- **01 · Gökporten · par 3** – första banan i **Urverkets stad**. En mässingsport lyfts av kugghjul och motvikter. En bred fairway med sarger leder till en green med romerska siffror framför ett animerat gökur. Kontrollerade slag ger par; en exakt placering kan ge birdie.
- **02 · Rörposten · par 3** – en nedsänkt mässingstratt samlar bollen och skickar den genom ett glasrör till en hög postterrass. Dosera nästa slag i utförsrännan och använd mässingsvallen runt hörnet. Tryckluftstank, manometer, kolv, postfack och paket ger poststationen en egen prägel.

- **03 · Klangbron · par 3** – träffa klockknappen så sänker kugghjul och motvikter en vindbrygga över urverket. Den korta bron saknar sidosarger; Urmakargången har sarger och går runt greenens bortre hörn. Bron ger en normal trea och chans till två, medan omvägen kräver ett extra placeringsslag. En stor mässingsklocka, klockspel och rörliga motvikter ger verkstaden en egen identitet. Ett exakt kraftslag efter klockträffen kan ge birdie.

- **04 · Lodverket · par 4** – stanna ombord på en motvikthiss som lyfter bollen 5,4 meter till balkongen. Dosera slaget nedför klockrännan; maxkraft kan rulla över den markerade öppna kanten. En skyddad sväng leder till greenen. Ett exakt vallslag kan ge birdie. Hissbur, kedjor, dörrar, motvikter och uppdragsnyckel är egna modeller.

- **05 · Sekundvalvet · par 4** – tajma ett mässingshjul med tre verkliga öppningar. Ett upplägg före hjulet ger kontroll; ett hårt och vältajmat utslag kan spara ett slag. Två studsklockor och en diagonal mässingsvall följs av en lugn green. Hjulets hål, lampor och kollision följer samma rotation.

- **06 · Tolvslaget · par 4** – finalen i **Urverkets stad**. Ett jättelikt öppet fickur har en klockvisare som spelbar, roterande bro. Tajma kraftslaget eller låt en parkerad boll åka med. Öppna kanter ger verklig fallrisk; den skyddade servicegången tar extra slag. Ett vallslag leder till finalgreenen under två mässingsklockor. [Spela hål 6](http://localhost:5173/?hole=6).

- **09 · Kanonkurvan · par 5** – en tratt med uppfart leder in i röret och vidare till kanonen. Det finns också en omväg runt gapet.
- **10 · Dubbelstudsen · par 4** – två riktade studsplattor tar bollen runt svängen, följt av en lång röd snurra och en avslutande green.
- **11 · Vippvarvet · par 3** – rörlig vippbro, kraftberoende hopp över vattnet, flipperstötar och en längre säker brygga.
- **12 · Neonslussen · par 3** – en lyftport med trafikljus, två sidopassager och en kort flippergreen. Porten håller öppet om bollen ligger under den.
- **13 · Frostfallet · par 4** – tre meters fallhöjd, en hal isränna med öppna kanter och en bredare väg med sarger. Greenen ligger runt hörnet.

- **14 · Skybowling · par 4** – första hålet i **Molnskogen**. En infälld skogstrumma skjuter bollen genom en slingrande träring mot en smal bowlingbrygga med sex snidade ugglekäglor. För korta, långa eller sneda hopp kan ge ett fall och ett pliktslag; de markerade sidokanterna och änden saknar sarg. Sex käglor kan välta varandra, och en längre brygga med sarger ger en väg utan hopp.

- **15 · Rotravinen · par 4** – en stenränna sjunker 5,6 meter mellan skogsklippor, under en rotbro. Gläntan nedanför ger plats att sikta mot en sidoförskjuten, 1,4 meter bred spång helt utan sarger, eller mot Svampstigen runt med räcken. Ett för hårt, rakt slag från utslaget kan rulla över gläntans markerade kant. Vattenhjul, en liten kvarnränna och svampöar ger hålet en egen miljö i Molnskogen.

- **16 · Ekollonsvingen · par 4** – en jättestor ekollonpendel sveper lågt över en 2,4 meter bred passage utan sarger. Tajma passagen eller lägg upp före hindret; den tidigare vägen längs ytterkanten är stängd. En sned vallstock kan styra bollen runt hörnet, över en träbro och upp mot greenen. Frölyktor, stubbstugor och ekollonförråd ger hålet en egen prägel i Molnskogen.

- **17 · Rotvolten · par 4** – en 6,4 meter hög rotloop över ett riktigt gap. För lite fart ger återrullning, medan ett kontrollerat kraftslag tar bollen genom hela varvet och nedför trä­rännan. Slå för hårt och du riskerar den öppna kanten efter backen. Två svängar leder till en blomsterterrass med jättestora blommor, bärnstensdetaljer och rotpelare.

- **18 · Törnkronan · par 5** – Skogens portvakt före finalen. Tre rotluckor öppnar sig efter varandra över en avgrund. Grönt ljus betyder bärande lucka, gult varnar före öppning, rött betyder öppet. Efter en trygg avsats väntar en smal trägren med ett roterande törnhjul och öppna sidokanter. Två snidade ugglevakter och en stor guldkrona vaktar den lugna slutgreenen.

- **12 · Moderträdet · par 5** – Molnskogens final och set piece. Ett jätteträd växer upp ur molnhavet med en tunnel, trädets öga, rakt genom stammen. Ett slag från utslaget kan ta bollen genom en rotvolt, ut på en rotbro och upp på en trumma som kastar den genom ögat till den svävande kronön. Kraftfönstret ligger runt 80–87 procent: för svagt rullar bollen tillbaka ur volten eller landar i barken, maxkraft seglar förbi ön. Allt bredvid ögat, inklusive rankridåerna, räknas som träd. Barkstigen runt trädet har sarger hela vägen och ger par; kedjan ger birdie och en chans till eagle. När bollen sjunker blommar trädet ut. Fysiken för ögat finns i `src/mother-tree.js`, grafiken i `src/mother-tree-visuals.js` och testerna i `tests/mother-tree.test.js`. [Spela hål 12](http://localhost:5173/?hole=12).

- **13 · Raketrampen · par 3** – första hålet i **Månkarnevalen**, ett övergivet tivoli mellan asteroider. Raketplattor skjuter bollen vidare dit pilen pekar och lägger till extra fart (idén från prototypen Dubbelstudsen, nu som booster). Två plattor tar bollen runt två hörn och uppför en friktionssnål startramp till en upphöjd green. Utslaget avgör hur långt bollen kommer: runt 80–90 procent når greenen och ger birdiechans, svagare rullar tillbaka nerför rampen utan pliktslag, och från cirka 93 procent flyger bollen över den öppna kanten ut i rymden. En boll som rullar mot pilen passerar plattan utan att skjutas iväg. Världens miljö finns i `src/moon.js`, testerna i `tests/rocket-ramp.test.js`. [Spela hål 13](http://localhost:5173/?hole=13).

- **14 · Tyngdlösa tältet · par 4** – ett trasigt cirkustält där tyngdkraften är svag. Utslaget är ett vallningsslag: hörnsargen tar bollen runt till tältets ingång. Därinne är filten hal och bollen glider långt. Mitt i manegen finns ett öppet hål. En boll som rullar över kanten svävar vidare med sin fart och sjunker sakta. Når den golvet på andra sidan i tid landar den och rullar vidare, annars försvinner den ut i rymden med ett pliktslag. Från ingången ger runt 60–75 procent ett svävhopp över hålet och upp på den upphöjda artistscenen för birdie. 55 procent eller mindre sjunker i hålet, och från cirka 85 procent flyger bollen av scenens öppna bortre kant. Ringvägen runt hålet glider utan att sväva och ger par med ett slag till. Koppen ligger snett på scenen, så ett direkt svävhopp i koppen är ovanligt. Fysiken för svävandet finns i `src/low-gravity.js`, testerna i `tests/zero-g.test.js`. [Spela hål 14](http://localhost:5173/?hole=14).

- **15 · Svarta hålet · par 3** – ett kort hål med ett svart hål målat mitt i arenan, rakt mellan utslaget och koppen. Inom den streckade ringen drar hålet bollen mot mitten, och dragningen växer ju närmare bollen kommer. Når bollen den svarta skivan sugs den in, och det kostar ett pliktslag. Den som siktar rakt på koppen blir alltid uppslukad. **Slungskottet** siktar en dryg meter förbi hålet med runt 80–90 procent kraft: dragningen böjer banan runt hålet och slungar bollen mot koppen för en närputt och birdie. Ibland går den rakt i. Ett svagare slag förbi hålet hinner inte undan och sugs in. **Långt runt** längs kanten är säkert och ger par. Planeterna i de bortre hörnen är studsplaneter som skickar tillbaka bollar som far förbi. Fysiken finns i `src/black-hole.js`, testerna i `tests/black-hole.test.js`. [Spela hål 15](http://localhost:5173/?hole=15).

- **16 · Kanonkometen · par 3** – utslaget rullar ner bollen i en laddningstratt framför en raketkanon. Styrsarger leder bollen in i tratten, och tryckluft blåser upp den genom ett glasrör in i kanonen. Varje fast slag laddar kanonen. Kanonens pipa sveper fram och tillbaka, och spelaren trycker **FYR** (knappen, Mellanslag eller ett tryck på banan). Kometen flyger alltid lika långt, så det enda som avgör är tajmingen. Ljusen längs landningsbågen visar fönstren: turkosa över en hylla, röda över rymden. Medan kanonen är laddad följer ett sikte bågen. Mitt i svepet ligger greenen med koppen, och där rör sig pipan snabbast. Den som träffar där får en putt för birdie, och ibland går kometen rakt i. Vid ändarna av svepet stannar pipan nästan upp över sidohyllorna, som är lätta att träffa men kräver två puttar runt hörnet för par. Mellan dem är rymden: en miss kostar ett pliktslag och laddar kanonen igen. Logiken finns i `src/comet-cannon.js`, testerna i `tests/comet-cannon.test.js`. [Spela hål 16](http://localhost:5173/?hole=16).

- **17 · Pariserhjulet · par 3** – tivolits pariserhjul är en färja över rymden. Hjulet vrider sig ett kvarts varv och stannar sedan. Medan det står still väntar en gondol vid bryggan, och grinden lyser grönt. Rullar bollen in då åker den ett halvt varv över toppen och tippas ut på den upphöjda greenen, varifrån en putt ger birdie. Medan hjulet snurrar är grinden röd och stängd, och bollen studsar tillbaka utan pliktslag. Det handlar alltså om att tajma slaget, inte om att trycka vid rätt ögonblick. Rampen längs sidan är den långa vägen och ger par, men den har en öppen kant mot rymden. Logiken finns i `src/ferris.js`, testerna i `tests/ferris.test.js`. [Spela hål 17](http://localhost:5173/?hole=17).

- **18 · Månraketen · par 4** – Månkarnevalens final och set piece. Den trasiga månraketen är kanonen. Bollen rullar ner i en tratt och blåses upp i raketen. Medan raketen är laddad laddas en kraftmätare upp om och om igen, och kameran visar hela hålet. Siktet följer hur långt raketen skulle skjuta just då. **FYR** avgör alltså hur långt bollen flyger, inte åt vilket håll. För lite kraft eller för mycket hamnar i rymden. Månbasen är bred och lätt att träffa. Toppen med koppen ligger bortom en krater, och den som träffar den kan sätta en eagle. På månbasen är tyngdkraften svag, som i tältet på hål 14. Därifrån svävar bollen över kratern med rätt fart (45–65 procent), men för hårt studsar den i bakre sargen och åker tillbaka ner. Vägen runt kratern glider utan att sväva. När bollen sjunker blir det fyrverkeri över toppen. Testerna finns i `tests/moon-rocket.test.js`. [Spela hål 18](http://localhost:5173/?hole=18).

Varje bana har ett eget rekord i webbläsaren.

## Blender-modeller

Modellerna byggs med Python-skript i `blender/` och exporteras som `.glb` till `public/assets/models/<värld>/`. Varje modell är kod, så den kan byggas om, granskas i git och öppnas i Blender för finputs.

```bash
npm run models          # blender -b -P blender/build.py: bygger och exporterar alla modeller
npm run models:preview  # renderar förhandsbilder till blender/previews/
```

Utan Blender-appen fungerar samma skript med Python-modulen `bpy` (`pip install bpy`, sedan `python blender/build.py`). Spelet laddar modellerna i `src/models.js` innan ett hål byggs. Om en modell saknas används den gamla kodgrafiken. Mått, pivot och namn följer [BLENDER_ASSETS.md](BLENDER_ASSETS.md).


Prototyperna Kanonkurvan (Solskensöarna) och Dubbelstudsen, Vippvarvet, Neonslussen och Frostfallet (Neonhamnen) ligger utanför rundan. Molnskogen använder skulpterade klippöar, höga träd, ormbunkar, svamp, fjärilar, en kristallgrotta och träbroar mot rosa molnhimmel. Efterforskning och plan för hela rundan finns i [DESIGN.md](DESIGN.md).

Kameran följer bollen snett ovanifrån. Dra musen i sidled för att sikta eller finjustera med A/D. Shift ger extra precision. Tryck mellanslag tre gånger för att starta mätaren, välja kraft och välja precision; skärmknappen gör samma sak. Det gröna fältet ger ett rakt slag: 28 procent brett vid högst 20 procent kraft, sedan gradvis smalare till 10 procent vid halv kraft. Maxkraften är 26,5, men korta puttar behåller låg känslighet. Hårda slag utanför grönt avviker nu upp till 15 grader. Felet växer linjärt från grönzonens kant; en träff vid 75 procent av precisionsmätaren ger ungefär 6,7 graders fel vid maxkraft. Vid 20 procent kraft är maximalt riktningsfel nu cirka 1,9 grader. Koppens fångstradie växer mjukt från 32 till 38 cm för långsamma bollar. Den högsta fångstfarten är fortsatt 3,6; snabba puttar bromsas inte automatiskt för att räddas. Riktningen låses när mätaren startas, och Esc avbryter. I översikten klickar du på banan för att sikta. Hjälp finns under ?.

Spelytans geometri och kollisioner använder samma layout. Banan och dess par väljs i `src/levels.js`, som även bygger banväljaren; `src/layout.js` bygger ytor, kanter och höjder. Båda snurrorna, studsplattorna, bågarna och rörmynningarna är KayKit-modeller. Rörets förbindelse och bolltransport delar en sammanhängande kurva. Infarten har en faktisk ramp och släpper bara in bollen genom öppningens plan. Golfbollen har geometriska gropar och roterar med sin rörelse.

```bash
npm test
npm run build
```

Testerna kontrollerar rampskarvar, kanter vid hög fart, snurrornas rotation, kraft/precision, rörinfarten, båda studsarna på bana 10, vippbrons lutning/hopplängd och vägen runt på bana 11, lyftportens trafikljus/kollision/sensor samt spelbara vägar till mål på bana 12 och 13. För Månkarnevalen kontrolleras raketplattornas kraftfönster och svävhoppets fönster på hål 14 samt slungskottet och den säkra vägen runt det svarta hålet på hål 15 samt kanonkometens svep och landningsfönster på hål 16 samt pariserhjulets stopp, åktur och ramp på hål 17 samt raketens kraftmätare, kratern och svävhoppet på hål 18. Frostfallets höjdprofil och underlag delar data mellan geometri, gravitation och friktion i `src/terrain.js`. Översiktens sikte träffar den faktiska terrängen på banor med höjdprofil. Vippbrons geometri och fysik delar ytmodell i `src/bridge.js`. Egenbyggda hinder finns i `src/obstacles.js` och temaväljaren i `src/environment.js`. Rundans hål väljer sitt tema explicit via `theme` i bandata.

Skybowling använder egna modeller i `src/carnival-visuals.js`: fjädrad studstrumma, klätterväxter kring träringen, svarvade träugglor och målad bowlingbrygga. Mekaniken i `src/carnival.js` bevarar infartens riktning, förstärker faktisk infartsfart och känner av ringpassager. Trumman garanterar ingen minsta säker hopplängd. För mycket fart kan även få en lyckad landning att rulla över den öppna änden. Banlayouten skiljer nu på öppna kanter i båda axelriktningarna, med samma kanter i grafik och kollision. Lätta käglor kan vältas både av bollen och av närliggande fallande käglor; vid ett fall återställs uppställningen till läget före slaget, med en kort uppresningsanimation. Käglor från tidigare lyckade slag förblir borta. En ny runda återställer hela uppställningen. Kägelkedjan, hoppet, ringpassagerna, omvägen och en fullföljd runda samt återställning efter upprepade fall kontrolleras av `tests/carnival.test.js`.

3D-assets: KayKit Platformer Pack 1.0 av Kay Lousberg, CC0.

Ekollonsvingen använder egna modeller i `src/acorn.js`, med fysisk pendel i `src/pendulum.js`. Pendeln och dess kollision delar tid och position vid 120 fysiksteg per sekund. En stillaliggande boll kan också träffas. Ekollonet är 2,8 meter brett och täcker den smala passagen när det sveper genom mitten; i ytterlägena finns utrymme att passera. Gula markeringar visar de öppna sidokanterna, och både terräng och räcken följer den smalare formen. Vallstockens radie och riktning läses från samma bandata som dess kollision. `tests/acorn.test.js` kontrollerar grafikens läge mot kollisionsvolymen, sidostötar, fri höjd, tajmning över hela svingcykeln, fallrisk, stängd sidogenväg, maxfart mot vallen och rundor på fyra respektive tre slag. Hålet använder en ny rekordnyckel för den svårare layouten; äldre rekord ligger kvar separat. Dekorativ rörelse kan minskas med systeminställningen; pendeln fortsätter röra sig eftersom den är ett spelhinder.

## Grafik – Molnskogen

`src/forest.js` bygger skogens egna 3D-modeller, material, växtlighet, terräng och moln. Gräs och plankor har egna procedurtexturer. Gränserna för träkanterna hämtas från samma layout som fysiken; hoppets öppna kanter förblir öppna. Den tryggare vägen har träkanter, stolpar och rep under bryggan. Träd, lyktor och dekorationer står utanför spelytan. Träd som hamnar mellan kamera och boll tonas bort; översikten visar hela världen.

`src/forest-renderer.js` ger kontakt­skuggor, kantutjämning och en svag glöd kring kristaller. Solen har en 4096-pixels skuggkarta. Statiska smådetaljer slås ihop per material och grästuvorna instansieras, medan rörliga delar förblir separata. Animationerna i skogen respekterar systemets inställning för minskad rörelse. Skogens renderingspass laddas bara när temat används.

Rotravinens egna klippväggar, rotbro, kvarn och spänger byggs i `src/ravine.js`. De använder skogens gemensamma material, modeller och golvbyggare. Ränna, gravitation, sarger, bollhöjd och översiktssikte använder samma höjdprofil. Kopp och flagga följer också banans höjd. Kvarnhjulet och vattnet rör sig; bron och klippväggarna kan tonas bort när de skymmer bollen. `tests/ravine.test.js` verifierar sammanhängande höjder, rännans sarger, öppna kanter, båda vägarna och fullföljda rundor på fyra respektive fem slag. Testerna täcker även den tidigare genvägen med raka maxslag och sneda slag över spången. Bana 15 använder en ny rekordnyckel för den ändrade layouten; gamla resultat finns kvar i webbläsarens lagring.

Rotvoltens spelbana och bollbana använder samma tredimensionella ram i `src/loop.js`. Farten påverkas av höjd, gravitation och motstånd hela varvet; ett för svagt slag vänder naturligt. Mynningspassage kontrolleras i båda riktningarna. Loopen modelleras som en styrd arkadränna med sidokanter, inte en förutbestämd flyganimation. `src/loop-visuals.js` bygger grönytan, träundersidan, bärnstensljusen, rotstöden och blommorna. Kameran visar loopen från sidan under varvet. `tests/loop.test.js` provar grafisk/fysisk kontinuitet, infart, återrullning, missad precision, maxkraftens fallrisk samt rundor på par 4 och birdie 3.

Törnkronans luckor och signallyktor delar `trapdoorPose` i `src/trapdoors.js`. De sex synliga halvorna fälls ner från ytterkanterna; varken den vanliga golvmeshen eller öarnas terräng fyller hålen. Stöd kontrolleras även när bollen står stilla eller spelaren startar mätaren. Ett nytt slag på en lucka ersätter inte den senaste säkra återställningsplatsen. Törnhjulets två armar delar radie, räckvidd och rotation med kollisionen, och kan träffa en vilande boll. `src/crown.js` bygger luckor, bladådring, gångjärn, lyktor, snidade ugglevakter, törnhjul och kronport. `tests/crown.test.js` täcker synlig rörelse kontra stöd, varningsfärger, tajmning över hela cykeln, stängda genvägar och en fullföljd runda på fyra respektive fem slag. `scripts/probe-crown.mjs` är ett separat verktyg för att mäta öppningsslag under balansering.


## Närputt

Inom 5,5 meter från koppen, på en fri och plan green, byts tidsmätaren mot ett reglage för **rulllängd i meter**. Klicka på hålet i spelvyn eller översikten för att sikta, dra reglaget och välj **Putta** (eller mellanslag). Putten har inget separat precisionstryck och följer vald riktning. Siktets längd visar vald rulllängd; uppgiften bredvid reglaget visar avståndet till koppen. **Fullt slag** växlar tillbaka till den vanliga mätaren. Rulllängden räknas från underlagets friktion; hjälp aktiveras inte genom sarg, gap, port eller snurra. Reglaget börjar på **1 meter** varje hål och behåller sedan spelarens eget val; avståndet till koppen fyller aldrig i kraften. Långsamma bollars fångstradie är 38 cm i stället för 45 cm, så tydliga kantmissar rullar förbi. Riktigt korta puttar förblir förlåtande. Hårda slags precision är oförändrad.

## Urverkets stad

`src/clockwork.js` bygger den nya världen från egen geometri: tandade mässingshjul, romerska urtavlor, gökfåglar med rörliga luckor, pendlar, timrade klockhus, kedjor, motvikter, parkett och ett uppdraget fjäderverk. Banan har vävd turkos filt och mässingssarger. Statiska detaljer sammanfogas, medan kugghjul, visare och hinder förblir rörliga. Miljön använder kontakt­skuggor, kantutjämning och varmt fönsterljus. Portens panel och motvikter delar samma höjdberäkning som kollisionerna. `tests/clockwork.test.js` verifierar rörelsen, en bred tajmningslucka och fullföljda slagvägar. `tests/putting.test.js` verifierar närputtens aktivering och tolerans för längd/riktningsfel.

Törnkronans bro har separata höjder för trägolv och bärande undersida, vilket tar bort z-flimret. Trädet bakom kronporten är borttaget och själva kronan har fått en större guldring, välvda byglar och en central ädelsten.

Rörposten använder `src/funnel.js` för skålens höjd, gravitation, infångning och transportkurva. `src/funnel-visuals.js` bygger skålen med en verklig öppning, glasrör, flänsar och poststationens egna modeller. Den synliga glasbanan och bollens färd använder samma kurva. `tests/funnel.test.js` kontrollerar tvådimensionell lutning, snabba passager genom halsen, kontinuerlig transport, säker utmatning, skillnaden mellan mjuka och hårda felslag samt vägar på par och birdie. Kameran följer nu efter bollen inne i röret och kommer gradvis närmare. `src/tube-camera.js` följer samma kurva, undviker tvära vridningar och rätar upp vyn vid utgången. Spelvyn återkommer mjukt. Översikten behåller sin vy, och systemets inställning för minskad rörelse ger en lugn sidokamera. Kamerans kontinuitet kontrolleras i `tests/tube-camera.test.js`.

Klangbrons mekanik finns i `src/bell-bridge.js` och dess egna modeller i `src/bell-bridge-visuals.js`. Klockknappen sjunker undan efter träff; säkerhetsbommar spärrar passagen tills bron ligger helt nere. Det finns inget dolt golv under den uppfällda bron. Ett fall återställer klockans läge till före slaget; tidigare lyckad öppning behålls. `tests/bell-bridge.test.js` kontrollerar grafik mot kollision, stängd passage vid maxkraft, öppning, fallrisk, båda spelvägarna och återställning. `scripts/probe-bell-bridge.mjs` används för att balansera slaglängderna.

Lodverkets hiss använder `src/lift.js` för stopp ombord, dörrar, lyfthöjd och återställning. `src/lift-visuals.js` bygger det öppna hisstornet, rörliga kedjor, motvikter och en liten utmatningsarm. Bollen behåller sin placering på plattan under färden. Kameran visar hissen från sidan och håller tornet ur siktlinjen när nästa slag förbereds. Ingen statisk ramp eller dold golvplatta korsar schaktet. Höjdprofilen efter hissen delas av fysik, golv, skyltar och sikte. `tests/lift.test.js` kontrollerar höjder, dörrar, ombordstigning, fallrisk, återställning och rundor på fyra respektive tre slag.

Sekundvalvets mekanik i `src/clock-wheel.js` delar öppningarnas centrum och radie med `src/clock-wheel-visuals.js`. Den tandade skivan är extruderad med tre genomgående hål, numrerade mässingsringar, lager och ett mindre drivhjul. Kollisionsprovet sveper hela förflyttningen, tar hänsyn till bollens radie och släpper undan en boll som blivit stående vid en stängande öppning. Kameran glider åt sidan efter passagen. Egna studsklockor använder de befintliga flipperstötarnas fysik. `tests/clock-wheel.test.js` provar faktisk geometri med strålar, rotation, signaler, maxfart, felträffar, trygg återstuds och rundor på fyra respektive tre slag.
