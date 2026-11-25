# KFC Marke statistieken: specificatie

## Doel
De Google Sheet "KFC MARKE 2025-2026" omzetten naar een webapp die alles overzichtelijk toont en waarmee één beheerder gemakkelijk gegevens invoert. Werkt op smartphone en desktop, in zwart en groen. Eén app: een kijkversie voor iedereen en een beheerversie met login.

## Seizoenen en historiek
- Elk seizoen heeft eigen selectie, wedstrijden, spelersgegevens en puntentelling.
- Personen bestaan één keer en keren terug in meerdere seizoenen. Zo toont een spelerspagina de loopbaan over de seizoenen heen.
- Rugnummer en positie staan per seizoen, want nummers wisselen. De positie kies je met een dropdown in de selectie.
- Staf (T1, T2, keeperstrainer, delegee, verzorger Ivana Bourgeois; de staf wijzigt niet) wordt bijgehouden voor gele en rode kaarten en schorsingen.

## Fantasy 2026-2027 (standaardregels)
| Onderdeel | Punten |
|---|---|
| Minuten | meer dan 60 min: 2, minder: 1, niet gespeeld: 0 |
| Doelpunt | keeper 10, verdediger 6, middenvelder 5, aanvaller 4 |
| Assist | 3 |
| Clean sheet | keeper en verdediger 4, middenvelder 1 |
| Tegendoelpunten | -1 per 2, enkel keeper en verdediging |
| Geel / rood | -1 / -3, twee gele in één wedstrijd = rood |
| Man van de match | 3 / 2 / 1, enkel bij zege van KFC Marke |
| Bijzonder | eigen doelpunt -2, gemiste strafschop -2, gestopte strafschop (keeper) +5 |

Regels staan per seizoen en zijn aanpasbaar onder Beheer, Puntentelling. Seizoen 2025-2026 houdt zijn oude regels (rood -2, bonus ook bij gelijkspel of verlies) zodat de oude totalen kloppen. Alle 22 spelerstotalen, minuten, doelpunten en teamcijfers van 2025-2026 zijn gecontroleerd tegen de sheet (`tools/check.js`).

Clean sheet en tegendoelpunten tellen enkel voor spelers die **meer dan** 60 minuten speelden. Dat komt uit de formules van de oude sheet.

## Pagina's
Kijkers: Overzicht, Fantasy (klassement met uitleg), Selectie (kaarten of tabel), Spelerspagina (stats, puntenverdeling, wedstrijd per wedstrijd, seizoenen), Wedstrijden, Wedstrijdpagina, Kaarten en schorsingen, Analyse (thuis/uit, doelpunten per wedstrijd, hoe we scoren en tegen krijgen, stilstaande fases, seizoenen vergelijken).

Beheerder: Selectie (nummer, naam, positie, toevoegen, verwijderen), Wedstrijden (uitslag, spelers met minuten, goals, assists, kaarten, man van de match, bijzonderheden, teamcijfers), Kaarten B-ploeg, Puntentelling, Seizoen (nieuw seizoen, aanpassen, verwijderen), Back-up (export, import, startdata; herinnering "Laatste back-up: ..." in Beheer en op de back-uppagina, geel na 30 dagen, bijgehouden per toestel). In de wedstrijdpagina is de tabel "Opstelling en punten" sorteerbaar op elke kolom.

## Kaarten en vergelijken
- Schorsingen worden automatisch berekend: elke rode kaart en elke 3e gele kaart (ook die van de B-ploeg) is een schorsing. Ze staat "open" tot er na de kaart nog een wedstrijd gespeeld is, daarna is ze uitgezeten. Er is dus geen vakje "Geschorst" meer om aan te vinken.
- Kaarten en schorsingen: elke kolom is sorteerbaar (standaard meeste gele kaarten eerst), met filters "Met kaarten / Iedereen" en "Alle / Schorsing open / Bijna schorsing".
- Seizoenen vergelijken (Analyse en spelerspagina) kan "even veel wedstrijden": van elk seizoen tellen enkel de eerste N gespeelde wedstrijden, standaard evenveel als het geselecteerde seizoen al speelde (aanpasbaar). Handmatige correcties tellen dan niet mee. "Volledig seizoen" blijft beschikbaar.

## Snel invullen (wedstrijdformulier)
- **Tekst:** de beheerder typt in gewoon Nederlands wat er gebeurde. De app herkent doelpunten (met soort: corner, vrije trap, strafschop), assists, gele en rode kaarten, man van de match (volgorde = 1e, 2e, 3e), minuten (basis, bank, wissels), gestopte of gemiste strafschoppen, eigen doelpunten, uitslag en tegendoelpunten met oorzaak. Namen mogen voornaam, achternaam, "Lucas C" of rugnummer zijn; bij twee gelijke namen vraagt de app welke. Eerst een voorbeeld, pas na "Toepassen" en "Opslaan" wordt iets bewaard. Per categorie (doelpunten, assists, kaarten, man van de match, enz.) vervangt de tekst wat er al stond. Minuten gelden enkel voor de genoemde spelers. Teamtellingen (hoekschoppen, vrije trappen, strafschoppen voor en tegen) worden herkend uit tekst als "corners 5-3" (Marke eerst), "we hadden 4 corners, de tegenstander 1" of "strafschoppen: 1 voor, 0 tegen".
- **RBFA (halfautomatisch):** een knop (bladwijzer) op de RBFA-wedstrijdpagina kopieert opstelling, bank, wissels, kaarten, doelpunten, uitslag, datum en rugnummers. Plakken in het formulier of in Beheer, Wedstrijden geeft een voorbeeld met herkende spelers (niet herkende kan je toewijzen of negeren). Minuten worden berekend uit basis, wissels en rode kaart. RBFA kent geen assists, geen man van de match en niet hoe een doelpunt viel; die vul je aan met tekst. Er is geen automatische koppeling: de knop leest enkel de pagina die de beheerder zelf opent.
- Het gewone invulformulier blijft altijd beschikbaar.

## Kaarten B-ploeg
- A-spelers kunnen bij de B-ploeg spelen en daar een kaart krijgen. Die telt mee voor de schorsing (geel, rood), maar niet voor minuten, doelpunten, wedstrijden, uitslagen of fantasypunten.
- Invoer: Beheer, Kaarten B-ploeg. Per B-wedstrijd een datum, een optionele opmerking en per speler het aantal gele en rode kaarten.
- Technisch: opgeslagen als wedstrijd met competitie `b` en spelersregels met enkel `yellow`/`red`. De rekenmotor houdt `b`-wedstrijden uit alle lijsten en teamcijfers en telt enkel de kaarten (ook in `yellowB` en `redB`). Bij "vergelijken op aantal wedstrijden" tellen ze niet mee.
- Het kaartenoverzicht toont "2 (1 B)" voor het aantal kaarten waarvan er 1 bij de B-ploeg was; de spelerspagina toont de B-rijen apart.

## Gegevens
Tabellen: `seasons`, `people`, `roster`, `matches`, `lines`. Zie `supabase/schema.sql`. Lokaal staat dezelfde structuur in de browser (localStorage). Online: Supabase met lezen voor iedereen en schrijven enkel voor de ingelogde gebruiker.

## Startdata
- 2024-2025: 26 spelers, 5 staf en de 30 competitiewedstrijden uit de sheet "KFC MARKE 2024-2025". Enkel minuten, doelpunten en kaarten waren bijgehouden. Het seizoen heeft de regel `basic`: de app toont dan geen assists, fantasy, man van de match, soorten doelpunten of teamcijfers voor dit seizoen. Uitslagen komen van voetbalexpress.be/RBFA, want de sheet had ze niet. Wedstrijd 30 (27/04/2025, Sparta Heestert thuis) heeft geen spelersgegevens en staat op de officiële uitslag 0-3 (waarschijnlijk forfait). Spelers die nog bij de club zijn (zoals Lucas Vantieghem, geschreven als Lukas in de oude sheet) zijn dezelfde persoon als in de latere seizoenen.
- 2025-2026: 22 spelers, 5 staf, 30 competitiewedstrijden met alle spelersgegevens.
- 2026-2027: 25 spelers (15 terugkerend met posities uit vorig jaar, 10 nieuw), 5 staf en de 30 competitiewedstrijden uit de RBFA-kalender. De 13 al gespeelde wedstrijden hebben de uitslag; spelersgegevens moeten nog ingevuld worden. Bekers en oefenwedstrijden staan er niet in.

## Aandachtspunten
- Handmatige correcties 2025-2026: Jelle Duthoo +3, Emile Vanluchene -2 (eigen doelpunt, wedstrijd niet bijgehouden), Colin Degrande +10 (2 gestopte penalty's, wedstrijd niet bijgehouden).
- Nieuwe spelers 2026-2027 hebben nog geen positie of nummer. Zonder positie rekent de app als middenvelder.
- De positie van de terugkerende spelers komt uit de formules van de oude sheet. Controleer ze bij de start.
