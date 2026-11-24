/* Test van het snel invullen: tekst en RBFA.  Gebruik:  node tools/quick-test.js */
const fs = require('fs');
const path = require('path');
const engine = require('../js/engine.js');
const quick = require('../js/quick.js');
global.window = {};
eval(fs.readFileSync(path.join(__dirname, '../js/seed.js'), 'utf8'));
const S = engine.computeSeason('s2026', window.KFC_SEED);
const players = S.players.map(r => ({ rid: r.roster.id, first: r.person.first_name, last: r.person.last_name, number: r.roster.number, staff: false }))
  .concat(S.staff.map(r => ({ rid: r.roster.id, first: r.person.first_name, last: r.person.last_name, number: r.roster.number, staff: true })));
const nameOf = {}; players.forEach(p => { nameOf[p.rid] = p.first + ' ' + p.last; });

let bad = 0;
function plan(text, choices) { const p = quick.parseText(text, players); return { p, plan: quick.textPlan(p, choices || {}, players) }; }
function rowsByName(pl) { const o = {}; Object.keys(pl.rows).forEach(r => { o[nameOf[r]] = pl.rows[r]; }); return o; }
function canon(v) { return Array.isArray(v) || v === null || typeof v !== 'object' ? v : Object.keys(v).sort().reduce((o, k) => { o[k] = canon(v[k]); return o; }, {}); }
function eq(label, got, want) {
  const g = JSON.stringify(canon(got)), w = JSON.stringify(canon(want));
  if (g !== w) { bad++; console.log('VERSCHIL', label, '\n   gekregen ', g, '\n   verwacht ', w); }
}

// eerst enkele namen uit de selectie
const names = players.filter(p => !p.staff).map(p => p.first + ' ' + p.last);
console.log('Selectie:', names.join(', '));

let r;
r = plan('Jelle scoort na een corner van Jarne.');
eq('corner+assist', rowsByName(r.plan), { 'Jelle Duthoo': { g_corner: 1 }, 'Jarne Wullaert': { assists: 1 } });

r = plan('Jarne scoort uit een strafschop. Jelle scoort uit een vrije trap.');
eq('pen en vrije trap', rowsByName(r.plan), { 'Jarne Wullaert': { g_pen: 1 }, 'Jelle Duthoo': { g_free: 1 } });

r = plan('Jelle scoort 2 keer, assist van Jarne en Arne');
eq('2 keer', rowsByName(r.plan)['Jelle Duthoo'], { g_play: 2 });

r = plan('Jarne scoorde met een assist van Bob, Bob scoorde na een voorzet van Jelle');
eq('twee goals', rowsByName(r.plan), { 'Jarne Wullaert': { g_play: 1 }, 'Bob Desmet': { assists: 1, g_play: 1 }, 'Jelle Duthoo': { assists: 1 } });

r = plan('Bob geeft de assist aan Jelle');
eq('geeft assist', rowsByName(r.plan), { 'Bob Desmet': { assists: 1 }, 'Jelle Duthoo': { g_play: 1 } });

r = plan('1-0 Jelle (assist Jarne)\n2-0 Jarne (penalty)');
eq('lijst met stand', rowsByName(r.plan), { 'Jelle Duthoo': { g_play: 1 }, 'Jarne Wullaert': { assists: 1, g_pen: 1 } });

r = plan('12\' Jelle (assist Jarne, corner)');
eq('minuut en haakjes', rowsByName(r.plan), { 'Jelle Duthoo': { g_corner: 1 }, 'Jarne Wullaert': { assists: 1 } });

r = plan('Gele kaart voor Arne en Jelle. Rood voor Brecht. Jarne twee keer geel.');
eq('kaarten', rowsByName(r.plan), { 'Arne Naessens': { yellow: 1 }, 'Jelle Duthoo': { yellow: 1 }, 'Brecht Santy': { red: 1 }, 'Jarne Wullaert': { yellow: 2 } });

r = plan('Man van de match: Jarne, Robbe, Emile');
eq('motm', rowsByName(r.plan), { 'Jarne Wullaert': { motm: 1 }, 'Robbe Pattijne': { motm: 2 }, 'Emile Vanluchene': { motm: 3 } });

r = plan('Man van de match: 1e Jarne 2e Jelle');
eq('motm 1e 2e', rowsByName(r.plan), { 'Jarne Wullaert': { motm: 1 }, 'Jelle Duthoo': { motm: 2 } });

r = plan('Robbe stopt een penalty. Brecht mist een penalty. Emile maakt een eigen doelpunt.');
eq('pen en eigen', rowsByName(r.plan), { 'Robbe Pattijne': { pen_saved: 1 }, 'Brecht Santy': { pen_missed: 1 }, 'Emile Vanluchene': { own_goals: 1 } });

r = plan('Uitslag 3-1. Jelle scoorde een hattrick');
eq('uitslag', r.plan.team, { score_for: 3, score_against: 1 });
eq('hattrick', rowsByName(r.plan), { 'Jelle Duthoo': { g_play: 3 } });

r = plan('We verloren met 3-1');
eq('verloren', r.plan.team, { score_for: 1, score_against: 3 });

r = plan('Basis: Robbe, Emile, Jelle. Bank: Jarne, Arne. Jarne viel in na 60 minuten voor Jelle.');
eq('basis/bank/wissel', rowsByName(r.plan), { 'Robbe Pattijne': { minutes: 90 }, 'Emile Vanluchene': { minutes: 90 }, 'Jelle Duthoo': { minutes: 60 }, 'Jarne Wullaert': { minutes: 30 }, 'Arne Naessens': { minutes: 0 } });

r = plan('Robbe 90 minuten, Emile 60 min, Arne speelde de volledige wedstrijd');
eq('minuten', rowsByName(r.plan), { 'Robbe Pattijne': { minutes: 90 }, 'Emile Vanluchene': { minutes: 60 }, 'Arne Naessens': { minutes: 90 } });

r = plan('Jelle scoort en krijgt geel');
eq('scoort en geel', rowsByName(r.plan), { 'Jelle Duthoo': { g_play: 1, yellow: 1 } });

r = plan('Tieberghien scoort');
eq('dubbelzinnige naam', r.plan.ambiguous.map(a => a.label + ':' + a.cands.length), ['Tieberghien:2']);
const mich = players.find(p => p.first === 'Michiel').rid;
r = plan('Tieberghien scoort', { 0: mich });
eq('keuze Tieberghien', rowsByName(r.plan), { 'Michiel Tieberghien': { g_play: 1 } });
r = plan('Hannes T scoort, Michiel T krijgt geel');
eq('initiaal', rowsByName(r.plan), { 'Hannes Tieberghien': { g_play: 1 }, 'Michiel Tieberghien': { yellow: 1 } });

r = plan('Tegendoelpunt na een corner. Tegendoelpunt door eigen fout.');
eq('tegendoelpunten', r.plan.team, { ga: { ga_corner: 1, ga_error: 1 } });

{ const withNr = players.map(p => Object.assign({}, p, { number: p.last === 'Wullaert' ? '9' : p.number }));
  const q = quick.parseText('Noé scoort na assist van nr 9', withNr), pl = quick.textPlan(q, {}, withNr);
  eq('rugnummer', Object.keys(pl.rows).map(k => nameOf[k]).sort(), ['Jarne Wullaert', 'Noé Rogard']); }

r = plan('Hoekschoppen 6-2. Vrije trappen: 4-7. Strafschoppen 1-0');
eq('teamtellingen paren', r.plan.team.counts, { sp_corners: 6, opp_corners: 2, sp_free: 4, opp_free: 7, sp_pens: 1, opp_pens: 0 });
r = plan('We hadden 5 corners en 3 vrije trappen, de tegenstander 2 corners');
eq('teamtellingen zinnen', r.plan.team.counts, { sp_corners: 5, sp_free: 3, opp_corners: 2 });
r = plan('2 strafschoppen voor Marke, 1 tegen');
eq('teamtellingen voor/tegen', r.plan.team.counts, { sp_pens: 2, opp_pens: 1 });
r = plan('Uitslag 3-1, corners 5-3, Jelle scoort 2 keer. Jarne scoort uit een strafschop, vrije trappen 4-1');
eq('teamtellingen naast spelers', [r.plan.team.score_for, r.plan.team.counts.sp_corners, r.plan.team.counts.opp_free, rowsByName(r.plan)['Jelle Duthoo'].g_play, rowsByName(r.plan)['Jarne Wullaert'].g_pen], [3, 5, 1, 2, 1]);
r = plan('Jarne scoort na een corner van Jelle. Robbe stopt een penalty.');
eq('speler-corner blijft speler', [r.plan.team.counts, rowsByName(r.plan)['Jarne Wullaert'].g_corner, rowsByName(r.plan)['Robbe Pattijne'].pen_saved], [undefined, 1, 1]);

r = plan('Het was een mooie wedstrijd met veel sfeer.');
eq('onbegrepen tekst', r.p.unparsed.length > 0 && Object.keys(r.plan.rows).length === 0, true);


// ---- RBFA ----
{
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/rbfa-7521015.json'), 'utf8'));
  const pl = quick.rbfaPlan(data, players);
  const rb = rowsByName(pl);
  eq('rbfa: Thibault', rb['Thibault Trioen'], { minutes: 90, g_play: 2, g_pen: 0, yellow: 0, red: 0, own_goals: 0 });
  eq('rbfa: Arne', [rb['Arne Naessens'].minutes, rb['Arne Naessens'].yellow], [71, 1]);
  eq('rbfa: Noé (invaller 46)', rb['Noé Rogard'].minutes, 44);
  eq('rbfa: Gaëtan (invaller 71)', rb['Gaetan Vercaemer'] ? rb['Gaetan Vercaemer'].minutes : rb['Gaëtan Vercaemer'] && rb['Gaëtan Vercaemer'].minutes, 19);
  eq('rbfa: Amaury', rb['Amaury Demuynck'].minutes, 46);
  eq('rbfa: bank', [rb['Robbe Pattijne'].minutes, rb['Emile Vanluchene'].minutes, rb['Michiel Tieberghien'].minutes], [0, 0, 0]);
  eq('rbfa: aantal spelers', Object.keys(pl.rows).length, 16);
  eq('rbfa: niet gevonden', pl.unmatched.map(e => e.rbfa.name), []);
  eq('rbfa: uitslag', [pl.match.score_for, pl.match.score_against, pl.match.home, pl.match.date, pl.match.kickoff], [2, 0, false, '2026-11-22', '15:00']);
  eq('rbfa: tegenstander', pl.match.opponent, 'Beveren-Leie');
  eq('rbfa: doelpunten kloppen', pl.goalsFound, 2);
  eq('rbfa: geen waarschuwingen', pl.warnings, []);
  // rode kaart en invaller met kaart
  const d2 = JSON.parse(JSON.stringify(data));
  d2.away.players[3].ev.push({ c: 'red', t: 'Rode kaart', m: 60 });
  d2.away.bench[4].ev.push({ c: 'yellow', t: 'Gele kaart', m: 80 });
  const p2 = rowsByName(quick.rbfaPlan(d2, players));
  eq('rbfa: rood na 60 minuten', [p2['Jelle Duthoo'].minutes, p2['Jelle Duthoo'].red], [60, 1]);
  eq('rbfa: invaller met geel', p2['Gaetan Vercaemer'] || p2['Gaëtan Vercaemer'], { minutes: 19, g_play: 0, g_pen: 0, yellow: 1, red: 0, own_goals: 0 });
  // onbekende speler
  const d3 = JSON.parse(JSON.stringify(data));
  d3.away.bench.push({ nr: '55', name: 'Pieter Onbekend', gk: false, ev: [] });
  const p3 = quick.rbfaPlan(d3, players);
  eq('rbfa: onbekende speler', p3.unmatched.map(e => e.rbfa.name), ['Pieter Onbekend']);
  // thuiswedstrijd (Marke links)
  const d4 = JSON.parse(JSON.stringify(data)); const tmp = d4.home; d4.home = d4.away; d4.away = tmp; d4.score = [3, 1];
  const p4 = quick.rbfaPlan(d4, players);
  eq('rbfa: thuis', [p4.match.home, p4.match.score_for, p4.match.score_against], [true, 3, 1]);
  // nummer invullen waar het ontbreekt
  eq('rbfa: nummers invullen', Object.keys(pl.setNumbers).length > 0, true);
  // tekst die de knop kopieert
  eq('rbfa: herkent kopie', quick.isRbfa('  ' + quick.MARKER + JSON.stringify(data)), true);
  eq('rbfa: leest kopie', quick.readRbfa(quick.MARKER + JSON.stringify(data)).away.name, 'K. FC Marke A');
}

console.log(bad === 0 ? 'ALLE TESTS KLOPPEN' : bad + ' verschil(len)');
process.exit(bad ? 1 : 0);
