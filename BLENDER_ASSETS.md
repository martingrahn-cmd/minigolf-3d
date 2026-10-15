# Blender-assets – vad som ska byggas

All grafik i spelet är i dag procedurell Three.js-geometri på mellannivå, plus några KayKit-modeller på prototypbanorna. Listan nedan visar vilka modeller som ska byggas i Blender, vilken kod de ersätter och vilka mått som inte får ändras.

## Teckenförklaring

- **🔴 Spelkritisk:** formen styr eller visar fysiken. Mått, pivot och läge måste stämma exakt med bandatan i `src/levels.js`. Modellen får inte smalna av, bli bredare eller flyttas.
- **🟡 Signal:** modellen förklarar något för spelaren, till exempel en lampa som byter färg, en pil eller en öppen kant. Formen är fri men delen som ändrar färg eller rör sig måste vara ett eget objekt.
- **🟢 Dekor:** fri form, så länge den står utanför spelytan och inte ser ut som en väg.

Prioritet: **P1** först (världsfinaler och delar som syns på varje hål), **P3** sist.

## Gemensamma regler för export

- **Enhet:** 1 Blender-enhet = 1 meter = 1 enhet i spelet. Exportera glTF 2.0 (`.glb`) med +Y upp.
- **Plats i projektet:** `public/assets/models/<värld>/<asset>.glb`. Kod laddar via `import.meta.env.BASE_URL`, samma som KayKit i `src/course.js`.
- **Pivot:** varje rörlig del är ett eget objekt med origo i sin fysiska led. Koden flyttar och roterar delarna utifrån fysiken, till exempel `pendulumPose`, `trapdoorPose` och `clockHandPose`. Baka aldrig spelanimation i Blender. Fri dekoranimation, som löv och moln, går bra.
- **Namn:** namnge rörliga noder med samma namn som i dag, till exempel `root-flap-0--1` eller `clock-hand-deck`, så att koden och testerna hittar dem.
- **Budget (mobil):** set piece ≤ 40 000 trianglar, mekanik ≤ 8 000, rekvisita ≤ 1 500 och träd ≤ 3 000. Högst 3 material per asset. Texturer högst 1024 px, gärna en gemensam palettatlas per värld. Behåll flat shading och lågpolystilen.
- **Kameraskymning:** stora föremål nära kameran tonas ut när de skymmer bollen (`forestOccluder`). Sådana modeller behöver egna material som tål `transparent = true`.

## Bygg inte i Blender

Följande räknas fram ur spelmatematiken och ska fortsätta genereras i kod:

- Spelytor och plattor (`CELLS`) samt höjdprofiler (`heightProfile`).
- Sargernas placering (`BOUNDARIES`). Själva sargbiten kan vara en modulär Blender-del, se kitet nedan.
- Rotloopens bana (`loopFrame` i `src/loop.js`).
- Glasröret på hål 2 (`createFunnelTrack`).
- Text på skyltar (`makeLabel`).
- Varningsmålning på öppna kanter.
- Den flytande öns klippform (`island()` utgår från konturen). Den kan senare ersättas av modulära klippbitar.

---

## Gemensamt kit (alla världar)

| Asset | Ersätter | Krav och mått | Prio |
|---|---|---|---|
| 🔴 Golfboll | `src/ball.js` | Radie 0,31 m (`BALL_RADIUS`) med gropar. Rullningen styrs av kod. | P3 |
| 🔴 Kopp med kant | `src/course.js`, kopp och flagga | Synlig kant med ytterradie 0,49 m. Hålet fångar bollen inom 0,32–0,38 m. Ovansidan ligger på 0,05–0,085 m. | P2 |
| 🟡 Flaggstång med vimpel | `src/course.js` | Stång 2,7 m hög från koppens mitt. Vimpeln är ett eget objekt så att den kan vaja. Färg per värld. | P2 |
| 🟡 Skyltbräda | `makeLabel` i `src/course.js` | Bara ramen, 3,5 × 0,88 m, ligger plant. Texten ritas i kod. | P3 |

## Urverkets stad (hål 1–6)

**Världskit** i `src/clockwork.js`: kugghjul i flera storlekar (`createGear`), gökurshus med visare, dörr och pendel som egna objekt (`cuckooHouse`), urtavlor, mässingslyktor, kedjor, klockskåp med spröjsade fönster, fjäderverk och urmakarbänk. Sarg och mässingsbeslag ska följa sargkitet. Filtytan genereras i kod. **P2**

| Hål | Asset | Ersätter | Krav och mått | Prio |
|---|---|---|---|---|
| 1 Gökporten | 🔴 Mässingsport med kugghjul och motvikter | `createClockGates` | Panelens halvbredd 2,18 m och tjocklek 0,25 m. Stolpar med radie 0,2 m vid ±2,3 m. Panelen lyfts 2,1 m rakt upp (`clock-gate-panel`). Motvikterna rör sig separat (`clock-counterweight-±1`). | P2 |
| 1 Gökporten | 🟢 Stort gökur bakom green | `cuckooHouse(hero)` | Visare, dörr och fågel som egna objekt. | P2 |
| 2 Rörposten | 🔴 Mässingstratt | `src/funnel-visuals.js`, `funnelSurface` | Radie 2,15 m, djup 1,65 m och hals 0,5 m. Plattan är 2,4 m. Skålens profil måste följa `funnelSurface` exakt. | P2 |
| 2 Rörposten | 🟢 Tryckluftsstation: tank, manometer, kolv, svänghjul, postfack, paket | `pneumatic-post-station` | Manometerns nål är ett eget objekt. | P3 |
| 3 Klangbron | 🔴 Vindbrygga | `src/bell-bridge-visuals.js` | x 0–7 och halvbredd 1,5 m. Gångjärnet sitter vid x = 0 och bryggan fälls upp 1,17 rad (`klangbron-deck`). Bommarna är egna objekt. | P2 |
| 3 Klangbron | 🔴 Klockknapp | `klangbron-button` | Radie 0,68 m vid (−8,5; −2,1). | P2 |
| 3 Klangbron | 🟢 Stor klocka, klockspel, trummor | `bell()` | | P3 |
| 4 Lodverket | 🔴 Hissbur | `src/lift-visuals.js` | Golvet är 4 × 4 m (x −9 till −5). Buren åker från 0 till 5,4 m (`lift-cage`). Dörrarna (`lift-entry-door`, `lift-exit-door`) och vikterna (`lift-weight-±1`) är egna objekt. | P2 |
| 4 Lodverket | 🟢 Torn, uppdragsnyckel, våningsindikator, gångbro | `counterweight-lift-tower` | Indikatorns ljus är eget objekt. | P3 |
| 5 Sekundvalvet | 🔴 Roterande mässingshjul | `src/clock-wheel-visuals.js` | Radie 3,85 m, tjocklek 0,42 m och nav på höjden 2,8 m. Tre hål med radie 1,02 m sitter på 2,6 m från navet. Hjulet roterar kring x (`sekundvalvet-perforated-wheel`). | P2 |
| 5 Sekundvalvet | 🔴 Studsklockor | `createClockBumpers` | Radie 0,65 m vid träffhöjd. | P3 |
| 6 Tolvslaget | 🔴 **Set piece:** öppet fickur med visarbrygga | `src/clock-hand-visuals.js` | Brunnens radie är 6,5 m. Visaren är 13 × 2,16 m och roterar kring y i fickurets mitt (`clock-hand-deck`). Urverket ligger under spelytan. Signalljusen är egna objekt. | **P1** |
| 6 Tolvslaget | 🟢 Krona, bygel, romerska siffror, två finalklockor | `tolvslaget-open-pocket-watch` | Klockorna rör sig vid vinst. | P2 |

## Molnskogen (hål 7–12)

**Världskit** i `forestKit`, `src/forest.js`. **P1**, eftersom kitet används på alla sex hålen.

| Asset | Ersätter | Krav och mått |
|---|---|---|
| 🟢 Träd i 3 varianter | `tree()` | Ungefär 6,6 m högt i skala 1. Kronorna är egna objekt som vajar, och de måste kunna tonas ut när de skymmer bollen. |
| 🟢 Ormbunke, svamp, kristall, sten | `fern()`, `mushroom()`, `crystal()` | |
| 🟡 Sargkit: stolpe, rep, list | Staket i varje `create…Course` | Listen ligger längs kollisionslinjen på höjden 0,16 m. Stolpen är 0,95 m och repet sitter på 0,66 m. Modulära bitar om 1,7–1,8 m. |
| 🟡 Trädäck och bro | Plankor, rep och balkar under träytor | Ovansidan får inte gå över 0,04 m, där spelytan ligger. |
| 🟢 Lyktor i 2–3 varianter | `lantern()` i flera filer | Ljuskroppen är eget objekt. |
| 🟢 Fjärilar, moln, blommor | `undergrowth()`, moln, `bloom()` | Vingarna är egna objekt. |
| 🟢 Snidad uggla | Uggla i `forestProps` | Ungefär 1,4 m hög. |

| Hål | Asset | Ersätter | Krav och mått | Prio |
|---|---|---|---|---|
| 7 Skybowling | 🔴 Studstrumma | `src/carnival-visuals.js` | Trumskinnet har radien 1,28 m och ligger på 0,065 m. Skinnet är eget objekt och studsar. | P2 |
| 7 Skybowling | 🔴 Träring | `createCarnival` | Mitten sitter på höjden 3,05 m vid x = 2,5 med radien 2,05 m. Bollen måste kunna passera fritt. | P2 |
| 7 Skybowling | 🔴 Sex ugglekäglor | `pinModel()` | Kollisionsradien är 0,32 m och höjden 1,5 m. Pivot vid foten, eftersom kod fäller dem. | P2 |
| 8 Rotravinen | 🟢 Rotbro (tonas ut), stenbankar, vattenhjul (roterar kring z), kvarnränna | `src/ravine.js` | Rännans yta följer `heightProfile` och genereras i kod. | P3 |
| 8 Rotravinen | 🔴 Spång utan sarger | `createRavineCourse` | 1,4 m bred. Kanterna är verkliga fallkanter. | P3 |
| 9 Ekollonsvingen | 🔴 Ekollonpendel | `src/acorn.js` (`pendulum-acorn`) | Kollisionen är en sfär med radien 1,4 m. Repet är 4,15 m och leden sitter på 5,65 m. Pivot i leden. | P2 |
| 9 Ekollonsvingen | 🔴 Vallstock | `level.banks` | Radie 0,23 m från (2,9; 4,6) till (10; −2,5). | P3 |
| 9 Ekollonsvingen | 🟢 Stubbhus, ekollonlyktor, fröförråd, rotpelare | `stumpHouse()` m.fl. | | P3 |
| 10 Rotvolten | 🟢 Stödrötter, jätteblommor, kluven stubbe, bärnsten | `src/loop-visuals.js` | Själva loopbanan genereras i kod. | P3 |
| 11 Törnkronan | 🔴 Tre rotluckor, två halvor vardera | `createTrapdoors` | Varje lucka är 3,6 m lång och 2,4 m bred. Halvorna har gångjärn vid z = ±1,2 och fälls nedåt upp till 0,48π (`root-flap-i-±1`). | P2 |
| 11 Törnkronan | 🟡 Signallyktor | `createTrapdoors` | Ljuskroppen är eget objekt. Färgen styrs i kod (grön, gul eller röd). | P2 |
| 11 Törnkronan | 🔴 Törnhjul | `createThornSpinner` | Räckvidd 1,9 m och armens radie 0,21 m. Roterar kring y (`thorn-arm-i`). | P2 |
| 11 Törnkronan | 🟢 Vaktugglor, kronportal, törnsnår | `sentinel()`, `royal-crown` | | P3 |
| **12 Moderträdet** | 🔴 **Set piece:** jätteträdets stam med tunnel | `src/mother-tree-visuals.js` (`mother-tree-trunk`) | Tunneln går längs x genom (7; 3; −3,2) med radien 1,9 m. Mynningarna ligger vid x = 4,6 och 9,4. Ingen geometri får gå innanför radien 1,9, för fysiken släpper igenom bollen inom 1,49 m plus bollens radie. Stammens radie följer `PROFILE`, cirka 3,05 m på tunnelns höjd. Måste tonas ut som skymmare. | **P1** |
| 12 Moderträdet | 🟡 Trädets öga: ögonbryn och kristallring | `mother-tree-eye` | Kristallerna är eget objekt, eftersom deras ljus pulserar och blinkar när bollen passerar. Ett punktljus sitter i tunneln. | **P1** |
| 12 Moderträdet | 🔴 Rankridåer och sidogrenar | `mother-tree-vines` | Täcker z inom ±5,6 m (`blockHalfWidth`) runt ögat vid den främre mynningen. Det ska se massivt ut, för fysiken räknar allt där som bark. | **P1** |
| 12 Moderträdet | 🟢 Krona: 7 grenar och blom- och lövklasar | `mother-tree-canopy` | Ligger på 14–28 m höjd. Klasarna är egna objekt som vajar och tonas ut. | P1 |
| 12 Moderträdet | 🟢 Rötter ner i molnhavet, och roten som bildar loopen | `createRoots()` | Roten till loopen ska se ut att bära loopbanan. | P2 |
| 12 Moderträdet | 🔴 Trumma | `createMotherTree` (`mother-tree-drum`) | Skinnet har radien 1,0 m och ligger på 0,065 m. Trumman får inte bli bredare än banan (z ±1,05). Skinnet är eget objekt. | P1 |
| 12 Moderträdet | 🟡 Finalblommor runt koppen | `bloomHead()` | Fyra blommor utanför spelytan. Blomhuvudet skalas från 0,45 till 1 vid vinst och mitten lyser. | P2 |
| 12 Moderträdet | 🟢 Två ugglevakter vid Barkstigens slut, lyktor, molnhav | `owl()`, `lantern()`, `cloudSea()` | | P2 |

## Månkarnevalen (hål 13–18, alla byggda)

**Världskit** i `src/moon.js`. **P2**, eftersom det återanvänds på alla sex hålen.

| Asset | Ersätter | Krav och mått |
|---|---|---|
| 🟡 Polkagrisrandig sarg med glödlampsstolpar | Sarger i `createMoonCourse` | Listen ligger längs kollisionslinjen på höjden 0,2 m med radien 0,1. Stolparna är 0,55 m med en lysande lampa. Modulära bitar. Lamporna är eget lysande material. |
| 🟢 Asteroider i 3–4 varianter | `asteroid()` | Används under banorna (skalas efter platta) och som svävande kulisser som roterar. |
| 🟢 Månraket | `rocket()` | Ungefär 5 m hög i skala 1. Fenor och nosspets röda, kropp elfenben, ett lysande fönster. Liten version vid greenen och stor lutande version som förebådar finalen. |
| 🟢 Pariserhjul | `ferrisWheel()` | Hjulet (radie cirka 7,5 m) roterar kring z, och korgarna är egna objekt som hålls lodräta. Förebådar hål 17, där det blir spelkritiskt. |
| 🟢 Cirkustält | `tent()` | Röda och elfenbensvita våder, flagga på toppen. |
| 🟢 Lyktor, ljusslingor, ringplanet, måne | `lantern()`, `stringLights()` | Lamporna är egna lysande material. |

| Hål | Asset | Ersätter | Krav och mått | Prio |
|---|---|---|---|---|
| 13 Raketrampen | 🔴 Raketplatta | `createRocketPads` | Plattan har radien 1,0 m och ligger nästan i nivå med filten (ovansidan på 0,055 m). Bollen avfyras inom 0,84 m från mitten. Det lysande innerfältet och de målade avgasflammorna är egna objekt som blinkar när plattan avfyras. Pilarna ska peka i plattans riktning (mot nästa platta för den första). | P2 |
| 13 Raketrampen | 🟡 Startrampens räls | Ytan `rail` i `createMoonCourse` | Elfenben med turkos mittrand. Ytan följer höjdprofilen och genereras i kod. | P3 |
| 13 Raketrampen | 🟢 Uppskjutningstorn med blinkande fyr, nedräkningsskylt med tre lampor | `rocketRampScenery()` | Står utanför spelytan. | P3 |

| 14 Tyngdlösa tältet | 🔴 Manegens kant runt hålet | `zeroGStage()` (extruderad åttkant med hål) | Hålet är exakt x −3…2, z −3…3 och helt öppet. Inga sarger eller kanter får sticka upp, för bollen svävar över i filtens höjd. Ovansidan ligger i nivå med filten. Insidan av hålet får gärna lysa (portalen). | P2 |
| 14 Tyngdlösa tältet | 🔴 Tältväggar och fasade hörn | `zeroGTent()`, `TENT` | Väggarna följer åttkanten `TENT` med kollision i hörnen (banks i bandata). Två öppningar ska vara kvar: ingången vid x = −9, z −3…3 och scenöppningen vid x = 9, z −3,5…3,5. Väggarna är 2,4 m höga runt spelytan. | P2 |
| 14 Tyngdlösa tältet | 🔴 Artistscenen | Platta x 9…18, z −3,5…3,5 | Scenen är 1,2 m hög med en ramp från x = 9 till 11,5. Bortre kanten vid x = 18 är öppen. Inga lister. Koppen står på (15,2, −2,1). | P2 |
| 14 Tyngdlösa tältet | 🟡 Gravitationsring och ballonger | `gravity-ring`, ballonger i `zeroGTent()` | Ringen hänger på y = 14 och ballongerna från y = 11. Inget får hänga lägre än cirka 10 m inne i tältet, annars skymmer det jaktkameran under svävandet. Ringen och ballongerna rör sig långsamt. | P3 |
| 14 Tyngdlösa tältet | 🟡 Manegefilt i violett | Ytan `ring` i `createMoonCourse` | Violett filt med målad cirkusring. Ytan är hal i fysiken (friktion 0,45). | P3 |
| 14 Tyngdlösa tältet | 🟢 Tältstänger, sammetsridåer, strålkastare med ljuskägla, rampljus, trummor och skylten TYNGDLÖST | `zeroGTent()`, `zeroGStage()` | Står utanför spelytan. Skylten hänger över ingången på x = −9. | P3 |

| 15 Svarta hålet | 🔴 Svarta hålet på filten | `createBlackHole()` | Allt ligger plant i filtens höjd, och inget får sticka upp, för bollen rullar över hela zonen. Den streckade ringen markerar dragningens gräns med radien 3,0 m kring (1, 0). Den svarta skivan är horisonten med radien 0,6 m, och den glödande ringen ligger precis utanför den. Virvelns spiralarmar och gnistorna roterar. Gör gärna virveln som shader. | P2 |
| 15 Svarta hålet | 🔴 Studsplaneter | `createPlanetBumpers()` | Planetens radie är 0,8 m och är samma som kollisionsradien. Den står på en låg sockel. Ringen och planeten pulserar vid träff. Två stycken i de bortre hörnen (8,3, ±5,3). | P2 |
| 15 Svarta hålet | 🟢 Observatorium med teleskop och skylten SVARTA HÅLET, lyktor | `blackHoleScenery()` | Står bakom koppen utanför spelytan. | P3 |

| 16 Kanonkometen | 🔴 Raketkanon på vridbar sockel | `createCometCannon()` | Sockeln har radien 1,25 m och står på (−4,4, 0). Bollen laddas inom 1,1 m från mitten. Tornet vrids kring y efter `barrelAngle` (±40°). Pipan pekar längs +x lokalt, lutar uppåt, har en lysande mynning och rekylerar vid skott. | P2 |
| 16 Kanonkometen | 🔴 Laddningstratt och glasrör | `createCometCannon()` | Tratten ligger i banans nivå på (−6,6, 0), och bollen fångas inom 0,9 m. Glasröret följer punkterna i `feed` upp i kanonens mitt. Röret måste vara genomskinligt, eftersom bollen syns på väg upp. Styrsargerna före tratten är kollisionslinjer (banks). | P2 |
| 16 Kanonkometen | 🔴 Landningsbågens ljus och siktet | `createCometCannon()` | Ljusen ligger på bågen med radien 13,2 m från kanonen. Färgen kommer från spelytan under (turkos över en hylla, röd över rymden) och får inte ändras för hand. Siktet följer pipans vinkel. | P2 |
| 16 Kanonkometen | 🟢 Komet med svans på himlen, lyktor och en liten raket | `cometScenery()` | Kulisser utanför spelytan. | P3 |

| 17 Pariserhjulet | 🔴 Spelbart pariserhjul med fyra gondoler | `createGondolaWheel()` | Navet sitter på (0, 1,95, 0) och radien är 4,19 m i x–y-planet. Gondolens golv hänger 0,7 m under sin upphängningspunkt och måste ligga i nivå med bryggan (y = 0 vid x = −4) och greenen (y = 2,5 vid x = 4) när hjulet står still. Gondolen är 2,2 m bred längs z. Hjulet vrider sig medurs i kvarts varv. | P2 |
| 17 Pariserhjulet | 🔴 Grind vid bryggan | `createGondolaWheel()` | En lampa (grön eller röd) och en bom över öppningen z −1…1 vid x = −4. Grön betyder att hjulet står still och att det går att gå ombord. | P2 |
| 17 Pariserhjulet | 🟢 Ljusslinga längs rampen, lyktor och en liten raket | `ferrisScenery()` | Står utanför spelytan. | P3 |

| 18 Månraketen | 🔴 **Set piece:** den trasiga månraketen på startplatta | `createMoonRocket()`, `rocket()` | Raketen står på (−8, 0) och är cirka 12 m hög. Bollen skjuts ut från nosen på y = 12 (`launchY`). Lappar, hängande kablar och en flamma under raketen när den skjuter. Startplattan har radien 2,2 m. Laddningstratten och glasröret är samma som på hål 16 (`loadingFunnel()`). | **P1** |
| 18 Månraketen | 🔴 Startbord med kraftmätare | `createMoonRocket()` | Mätaren fylls i takt med `cometRange` (8–33 m på 3,2 s). Den är turkos när landningen är säker och röd över rymden. | P2 |
| 18 Månraketen | 🔴 Kratern | `moonRocketScenery()` | Kratern x 12…16, z −3…3 är helt öppen, utan kanter, för bollen svävar över den. Glöden i botten ligger under spelytan. | P2 |
| 18 Månraketen | 🟢 Fyrverkerimörsare, skylten MÅNRAKETEN, ljusslingor och lyktor | `moonRocketScenery()` | Utanför spelytan. Fyrverkeriet skjuts upp vid vinst. | P3 |

Alla sex hål är byggda.

## Prototyper (Solskensöarna och Neonhamnen)

Kanonkurvan, Dubbelstudsen, Vippvarvet, Neonslussen och Frostfallet använder KayKit Platformer Pack (CC0) och enkel kodgrafik. De ska byggas om och ingå i rundan, så **gör inga Blender-modeller för dem** innan de har fått en plats och ett tema.

## Föreslagen arbetsordning

1. Molnskogens kit: träd, sargkit, trädäck och lyktor. Lyfter fem hål på en gång.
2. Moderträdet: stam med tunnel, ögat och rankridåerna, sedan kronan.
3. Urverkets kit: kugghjul, gökhus och mässingssarg.
4. Tolvslaget: fickur och visarbrygga.
5. Mekanikerna hål för hål (P2), sedan dekor (P3).

När ett asset är klart: byt ut funktionen i koden mot en laddning av modellen, kör `npm test` och provspela banan. Spelkritiska tester, till exempel att tunneln och fysikens öppning är samma hål (`tests/mother-tree.test.js`), behöver då peka på den nya modellen.
