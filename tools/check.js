/* Controle: de rekenmotor moet voor 2025-2026 dezelfde totalen geven als de oude Google Sheet.
   Gebruik:  node tools/check.js */
const fs = require('fs');
const path = require('path');
const engine = require('../js/engine.js');
global.window = {};
eval(fs.readFileSync(path.join(__dirname, '../js/seed.js'), 'utf8'));
const seed = window.KFC_SEED;

const S = engine.computeSeason('s2025', seed);
const byName = {};
S.players.forEach(p => { byName[p.name] = p; });

// totalen uit de oude sheet (tab 'Data Fantasy League', rij Totaal)
const fantasy = { 'Robbe Pattijne': 70, 'Lucas Vantieghem': 48, 'Amaury Demuynck': 77, 'Joran De Rudder': -1, 'Lander Denduyver': 66,
  'Siegurd Defoirdt': 9, 'Arne Naessens': 96, 'Jelle Duthoo': 164, 'Thomas Menghis': 89, 'Bob Desmet': 49, 'Gerben Neirijnck': 70,
  'Hannes Tieberghien': 77, 'Sem Menghis': 1, 'Lucas Coornaert': 50, 'Benjamin Bonte': 56, 'Emile Vanluchene': 65, 'Damien Kontogom': 43,
  'Mounir Bouhid': 19, 'Noé Rogard': 31, 'Jannis Bourgeois': 54, 'Colin Degrande': 18, 'Jarne Wullaert': 175 };
const minutes = { 'Robbe Pattijne': 2160, 'Lucas Vantieghem': 1387, 'Amaury Demuynck': 1904, 'Joran De Rudder': 0, 'Lander Denduyver': 1813,
  'Siegurd Defoirdt': 177, 'Arne Naessens': 1987, 'Jelle Duthoo': 2402, 'Thomas Menghis': 2301, 'Bob Desmet': 1276, 'Gerben Neirijnck': 1572,
  'Hannes Tieberghien': 2033, 'Sem Menghis': 78, 'Lucas Coornaert': 589, 'Benjamin Bonte': 1137, 'Emile Vanluchene': 1979, 'Damien Kontogom': 1050,
  'Mounir Bouhid': 317, 'Noé Rogard': 841, 'Jannis Bourgeois': 1613, 'Colin Degrande': 450, 'Jarne Wullaert': 2441 };
const apps = { 'Robbe Pattijne': 27, 'Lucas Vantieghem': 26, 'Amaury Demuynck': 26, 'Joran De Rudder': 0, 'Lander Denduyver': 30, 'Siegurd Defoirdt': 7,
  'Arne Naessens': 26, 'Jelle Duthoo': 30, 'Thomas Menghis': 30, 'Bob Desmet': 22, 'Gerben Neirijnck': 26, 'Hannes Tieberghien': 27, 'Sem Menghis': 6,
  'Lucas Coornaert': 22, 'Benjamin Bonte': 22, 'Emile Vanluchene': 25, 'Damien Kontogom': 22, 'Mounir Bouhid': 6, 'Noé Rogard': 14,
  'Jannis Bourgeois': 29, 'Colin Degrande': 17, 'Jarne Wullaert': 29 };
const goals = { 'Jelle Duthoo': 18, 'Jarne Wullaert': 12, 'Arne Naessens': 5, 'Thomas Menghis': 4, 'Lucas Coornaert': 4, 'Damien Kontogom': 3, 'Mounir Bouhid': 3,
  'Lucas Vantieghem': 2, 'Amaury Demuynck': 2, 'Lander Denduyver': 2, 'Benjamin Bonte': 2, 'Bob Desmet': 1, 'Gerben Neirijnck': 1, 'Hannes Tieberghien': 1,
  'Emile Vanluchene': 1, 'Noé Rogard': 1 };
const assists = { 'Jarne Wullaert': 13, 'Jelle Duthoo': 8, 'Arne Naessens': 6, 'Gerben Neirijnck': 5, 'Amaury Demuynck': 3, 'Bob Desmet': 3, 'Hannes Tieberghien': 3,
  'Siegurd Defoirdt': 2, 'Lucas Coornaert': 2, 'Benjamin Bonte': 2, 'Jannis Bourgeois': 2, 'Lander Denduyver': 1, 'Thomas Menghis': 1, 'Emile Vanluchene': 1, 'Damien Kontogom': 1 };
const yellow = { 'Siegurd Defoirdt': 5, 'Damien Kontogom': 4, 'Jarne Wullaert': 4 };
const motm = { 'Jarne Wullaert': 17, 'Robbe Pattijne': 9, 'Emile Vanluchene': 9, 'Jelle Duthoo': 8, 'Thomas Menghis': 6, 'Gerben Neirijnck': 6, 'Hannes Tieberghien': 5 };

let bad = 0;
function expect(label, got, want) { if (got !== want) { bad++; console.log('  VERSCHIL', label, 'gekregen', got, 'verwacht', want); } }

Object.keys(fantasy).forEach(k => expect('fantasy ' + k, byName[k].fantasy.total, fantasy[k]));
Object.keys(minutes).forEach(k => expect('minuten ' + k, byName[k].stats.minutes, minutes[k]));
Object.keys(apps).forEach(k => expect('wedstrijden ' + k, byName[k].stats.apps, apps[k]));
S.players.forEach(p => { expect('doelpunten ' + p.name, p.stats.goals, goals[p.name] || 0); expect('assists ' + p.name, p.stats.assists, assists[p.name] || 0); });
Object.keys(yellow).forEach(k => expect('geel ' + k, byName[k].stats.yellow, yellow[k]));
Object.keys(motm).forEach(k => expect('motm-punten ' + k, byName[k].stats.motm1 * 3 + byName[k].stats.motm2 * 2 + byName[k].stats.motm3, motm[k]));

const T = S.team;
expect('gespeeld', T.played, 30); expect('doelpunten voor', T.gf, 62); expect('tegendoelpunten', T.ga, 51); expect('clean sheets', T.cleanSheets, 6);
expect('corners', T.sp.corners, 197); expect('vrije trappen', T.sp.free, 79); expect('strafschoppen', T.sp.pens, 3);
expect('tegenstander corners', T.sp.oppCorners, 134); expect('tegenstander vrije trappen', T.sp.oppFree, 64); expect('tegenstander strafschoppen', T.sp.oppPens, 4);
expect('ga corner', T.gaTypes.corner, 7); expect('ga vrije trap', T.gaTypes.free, 6); expect('ga strafschop', T.gaTypes.pen, 2);
expect('ga own error', T.gaTypes.error, 15); expect('ga kwaliteit', T.gaTypes.quality, 21);
expect('spelend', T.goalTypes.g_play, 52); expect('corner', T.goalTypes.g_corner, 3); expect('vrije trap', T.goalTypes.g_free, 4); expect('strafschop', T.goalTypes.g_pen, 3);

const S26 = engine.computeSeason('s2026', seed);
expect('2026: aantal wedstrijden', S26.allMatches.length, 30);
expect('2026: gespeeld', S26.team.played, 13);
expect('2026: komend', S26.team.upcoming.length, 17);
expect('2026: spelers', S26.players.length, 25);
expect('2026: staf', S26.staff.length, 6);


// eerste N wedstrijden (vergelijken per aantal gespeelde wedstrijden)
{
  const first13 = S.matches.filter(m => engine.result(m) != null).slice(0, 13);
  const L = engine.computeSeason('s2025', seed, { limit: 13 });
  expect('limiet: gespeeld', L.team.played, 13);
  expect('limiet: gescoord', L.team.gf, first13.reduce((a, m) => a + m.score_for, 0));
  expect('limiet: tegen', L.team.ga, first13.reduce((a, m) => a + m.score_against, 0));
  expect('limiet: seizoen blijft volledig', engine.computeSeason('s2025', seed).team.played, 30);
  const ids = new Set(first13.map(m => m.id));
  const jelle = L.players.find(p => p.name === 'Jelle Duthoo');
  const want = seed.lines.filter(l => ids.has(l.match_id) && l.roster_id === jelle.roster.id).reduce((a, l) => a + (l.g_play || 0) + (l.g_corner || 0) + (l.g_free || 0) + (l.g_pen || 0), 0);
  expect('limiet: goals Jelle', jelle.stats.goals, want);
  expect('limiet: correctie telt niet mee', jelle.fantasy.adjust, 0);
  const L26 = engine.computeSeason('s2026', seed, { limit: 13 });
  expect('limiet 2026: gelijk aan volledig (13 gespeeld)', L26.team.points, S26.team.points);
}

/* B-ploeg: kaarten tellen mee voor de schorsing, niets anders */
{
  const d = JSON.parse(JSON.stringify(seed)); const J = x => JSON.stringify(x);
  const base = engine.computeSeason('s2026', d);
  const who = base.players.find(p => p.name === 'Jelle Duthoo');
  d.matches.push({ id: 'mb-test', season_id: 's2026', date: '2026-11-15', opponent: 'B-ploeg', home: true, competition: 'b' });
  d.lines.push({ id: 'mb-test:' + who.roster.id, match_id: 'mb-test', roster_id: who.roster.id, minutes: null, yellow: 2, red: 1 });
  const B = engine.computeSeason('s2026', d);
  const w2 = B.players.find(p => p.name === 'Jelle Duthoo');
  expect('B-ploeg: geel telt mee', w2.stats.yellow, who.stats.yellow + 2);
  expect('B-ploeg: rood telt mee', w2.stats.red, who.stats.red + 1);
  expect('B-ploeg: waarvan B', J([w2.stats.yellowB, w2.stats.redB]), J([2, 1]));
  expect('B-ploeg: fantasy ongewijzigd', w2.fantasy.total, who.fantasy.total);
  expect('B-ploeg: minuten en wedstrijden ongewijzigd', J([w2.stats.minutes, w2.stats.apps]), J([who.stats.minutes, who.stats.apps]));
  expect('B-ploeg: team ongewijzigd', J([B.team.played, B.team.points, B.allMatches.length]), J([base.team.played, base.team.points, base.allMatches.length]));
  expect('B-ploeg: aparte lijst', B.bMatches.length, 1);
  const L = engine.computeSeason('s2026', d, { limit: 5 });
  expect('B-ploeg: telt niet mee bij vergelijken op aantal wedstrijden', L.players.find(p => p.name === 'Jelle Duthoo').stats.yellowB, 0);
}

console.log(bad === 0 ? 'ALLES KLOPT: de rekenmotor geeft dezelfde totalen als de oude sheet.' : bad + ' verschil(len) gevonden.');
console.log('2025-26 wedstrijden:', T.played, 'W-G-V', T.W + '-' + T.G + '-' + T.V, 'doelsaldo', T.gf + '-' + T.ga);
console.log('2026-27 stand na 13 wedstrijden: W-G-V', S26.team.W + '-' + S26.team.G + '-' + S26.team.V, 'doelsaldo', S26.team.gf + '-' + S26.team.ga, 'punten', S26.team.points);
process.exit(bad ? 1 : 0);
