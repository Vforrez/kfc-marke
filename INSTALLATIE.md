# KFC Marke statistieken: installatie

De app bestaat uit gewone bestanden. Je hoeft niets te installeren of te bouwen.

## Optie 1: lokaal gebruiken (meteen klaar)

1. Pak de map uit.
2. Dubbelklik op `index.html`. De app opent in je browser, met seizoen 2025-2026 en de selectie en kalender van 2026-2027.
3. Alles wat je invoert blijft in **die browser op die computer** bewaard.
4. Maak af en toe een back-up: **Beheer, Back-up, Back-up downloaden**.

Beperking: je telefoon en je computer delen dan geen gegevens, en je kan geen kijklink doorsturen. Daarvoor is optie 2.

## Optie 2: online met een kijklink (aanbevolen)

Je hebt twee gratis diensten nodig: **Supabase** (de database en je login) en een plek om de bestanden te zetten (**Netlify**, **Cloudflare Pages** of **GitHub Pages**).

### Stap 1: database maken
1. Maak een account op supabase.com en kies **New project**. Bewaar het databasewachtwoord ergens veilig. De app zelf heeft het niet nodig.
2. Open in het project **SQL Editor**, plak de volledige inhoud van `supabase/schema.sql` en klik op **Run**.

### Stap 2: enkel jij kan inloggen
1. Ga naar **Authentication, Sign In / Providers** en zet **Allow new users to sign up** uit.
2. Ga naar **Authentication, Users, Add user, Create new user**. Vul je e-mailadres en een sterk wachtwoord in en laat **Auto Confirm User** aangevinkt.

### Stap 3: koppelen
1. Ga naar **Project Settings, API**.
2. Kopieer de **Project URL** en de **publishable key** (in oudere projecten heet die **anon public**).
3. Open `config.js` in een teksteditor en vul ze in:

```js
window.KFC_CONFIG = {
  SUPABASE_URL: 'https://jouwproject.supabase.co',
  SUPABASE_KEY: 'sb_publishable_...'
};
```

Gebruik nooit de **secret** of **service_role** key. De publishable key mag publiek staan: de database laat anonieme bezoekers enkel lezen.

### Stap 4: online zetten
Kies één van de drie:
- **Netlify**: ga naar app.netlify.com/drop en sleep de hele map `kfc-marke` in het venster.
- **Cloudflare Pages**: maak een project met **Direct Upload** en upload de map.
- **GitHub Pages**: zet de map in een repository en zet Pages aan.

Je krijgt een webadres. **Dat adres is de kijkversie.** Stuur het door aan wie je wil.

### Stap 5: eerste keer vullen
1. Open je webadres, klik onderaan op **Beheerder? Inloggen** en log in.
2. Ga naar **Beheer, Back-up** en klik op **Startdata uploaden**. Daarmee staat seizoen 2025-2026 en de selectie en kalender van 2026-2027 online.
3. Je kan dit ook lokaal doen: heb je al een back-up uit optie 1, dan zet je die hier terug.

### Gebruik
- Kijkers openen het webadres en zien alles, zonder login.
- Jij logt in via de link onderaan. Daarna verschijnt **Beheer** in het menu en kan je alles invoeren, ook vanop je smartphone.
- Wijzigingen zijn meteen zichtbaar voor iedereen die de pagina opent of ververst.
- Een gratis Supabase-project kan na een week zonder bezoek in slaap vallen. Je heractiveert het met één klik in het Supabase-dashboard.

## Snel invullen en de RBFA-knop
- In elk wedstrijdformulier staat **Snel invullen**: typ wat er gebeurde ("Jelle scoort na een corner van Jarne. Geel voor Arne. Man van de match: Jarne, Robbe, Emile.") en klik op Toepassen. Onder het vak staat een lijstje met wat de app begrijpt.
- Voor RBFA: open **Beheer, RBFA-knop** en sleep de groene knop naar je favorietenbalk. Klik hem op de wedstrijdpagina van rbfa.be en plak daarna in **Beheer, Wedstrijden** (vak "Wedstrijd importeren uit RBFA").
- Er is niets extra te installeren: dit werkt lokaal en online hetzelfde.

## Het seizoen na dit seizoen
**Beheer, Seizoen, Nieuw seizoen starten.** Je kan de selectie overnemen (posities blijven, rugnummers worden leeg gelaten zodat je ze zelf invult) en de regels van een vorig seizoen kopiëren. Oude seizoenen blijven bewaard.

## Controle van de cijfers
Met Node.js kan je nagaan of de rekenmotor nog dezelfde cijfers geeft als je oude spreadsheet:

```
python3 tools/build_seed.py
node tools/check.js
node tools/quick-test.js
```
