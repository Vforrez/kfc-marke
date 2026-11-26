/* KFC Marke statistieken: pagina's die iedereen kan bekijken. Elke functie geeft HTML terug. */
(function (root) {
  'use strict';
  var KFC = root.KFC = root.KFC || {};
  var E = KFC.engine, U = KFC.util, esc = U.esc;
  var V = KFC.views = {};

  var ui = KFC.ui = {
    seasonId: null,
    fantasySort: { key: 'total', dir: -1 }, fantasyPos: 'alle',
    playersView: 'kaarten', playersSort: { key: 'goals', dir: -1 },
    matchFilter: 'alle', matchSort: { key: 'minutes', dir: -1 }, cardsOnly: 'ja', cardsSort: { key: 'yellow', dir: -1 }, cardsStatus: 'alle',
    compareMode: 'n', compareN: null
  };

  /* ---------- hulpjes ---------- */
  function nrOf(r) { var v = parseInt(r.roster.number, 10); return isNaN(v) ? 1e6 : v; }
  function personHref(r) { return '#/speler/' + encodeURIComponent(r.person.id); }
  function sortRows(rows, get, dir) {
    return rows.slice().sort(function (a, b) {
      var x = get(a), y = get(b), c;
      if (typeof x === 'string' || typeof y === 'string') c = String(x).localeCompare(String(y), 'nl');
      else c = x - y;
      return c * dir || a.name.localeCompare(b.name, 'nl');
    });
  }
  function th(label, key, sortState, table, opt) {
    opt = opt || {};
    var on = sortState.key === key;
    return '<th class="' + (opt.cls || '') + '"' + (on ? ' aria-sort="' + (sortState.dir < 0 ? 'descending' : 'ascending') + '"' : '') + (opt.title ? ' title="' + esc(opt.title) + '"' : '') +
      '><button type="button" data-act="sort" data-table="' + table + '" data-key="' + key + '">' + esc(label) + '</button></th>';
  }
  /* Seizoenen vergelijken op een gelijk aantal gespeelde wedstrijden */
  function cmpLimit(c) {
    if (ui.compareMode === 'all') return null;
    var n = ui.compareN || c.S.team.played;
    return n > 0 ? n : null;
  }
  function compareControl(c) {
    var lim = cmpLimit(c), n = ui.compareN || c.S.team.played || 30;
    return '<div class="cmp"><div class="seg" role="group" aria-label="Hoe vergelijken">' +
      '<button type="button" data-set="compareMode=n" aria-pressed="' + (ui.compareMode !== 'all') + '">Even veel wedstrijden</button>' +
      '<button type="button" data-set="compareMode=all" aria-pressed="' + (ui.compareMode === 'all') + '">Volledig seizoen</button></div>' +
      (ui.compareMode !== 'all' ? '<label class="cmp-n">Eerste <input type="number" min="1" max="60" inputmode="numeric" data-ui="compareN" value="' + n + '" aria-label="Aantal wedstrijden"> wedstrijden</label>' : '') + '</div>' +
      '<p class="muted cmp-note">' + (lim ? 'Van elk seizoen tellen enkel de eerste ' + lim + ' gespeelde wedstrijden. Zo vergelijk je het lopende seizoen eerlijk met een volledig seizoen. Handmatige correcties tellen hier niet mee.' : 'Elk seizoen telt volledig mee, ook als het nog bezig is.') + '</p>';
  }
  function pts(n) { n = Number(n) || 0; return '<span class="' + (n > 0 ? 'pts-pos' : n < 0 ? 'pts-neg' : 'zero') + '">' + (n > 0 ? '+' + n : n) + '</span>'; }
  /* seizoenen met enkel de basis (geen assists, fantasy, man van de match, soorten doelpunten) */
  function isBasic(c) { return !!(c.S && c.S.rules && c.S.rules.basic); }
  function basicNote(c) { return '<div class="banner" style="margin-top:12px">In seizoen ' + esc(c.S.season.name) + ' werden enkel wedstrijden, minuten, doelpunten en kaarten bijgehouden. Assists, fantasypunten en man van de match bestaan voor dit seizoen niet.</div>'; }
  function hasStats(c) { return c.S.players.some(function (p) { return p.stats.apps > 0; }); }
  function emptyStats(c) {
    return '<div class="empty"><p>Voor dit seizoen zijn er nog geen spelersgegevens ingevoerd.</p>' +
      (c.canEdit ? '<a class="btn primary" href="#/beheer/wedstrijden">Wedstrijden invoeren</a>' : '') + '</div>';
  }
  function matchRow(m, c) {
    var played = E.result(m) != null;
    var noLines = played && !c.S.hasLines[m.id];
    var comp = m.competition && m.competition !== 'competitie' ? '<small>' + esc(E.COMPETITIONS[m.competition]) + '</small>' : '';
    return '<li><a class="row" href="#/wedstrijd/' + esc(m.id) + '"><div class="d">' + esc(U.dateShort(m.date)) + '<br>' + esc(m.kickoff || '') + '</div>' +
      '<div>' + U.resultChip(m) + '</div><div class="opp">' + esc(m.opponent) + '<small>' + (m.home ? 'Thuis' : 'Uit') + '</small>' + comp +
      (noLines && c.canEdit ? '<small>spelers ontbreken</small>' : '') + '</div>' +
      '<div class="sc' + (played ? '' : ' up') + '">' + (played ? esc(U.score(m)) : (c.canEdit ? 'Nog te spelen' : '')) + '</div></a></li>';
  }
  function rankList(rows, get, unit) {
    rows = rows.filter(function (r) { return get(r) > 0; }).sort(function (a, b) { return get(b) - get(a) || a.name.localeCompare(b.name, 'nl'); }).slice(0, 5);
    if (!rows.length) return '<p class="muted">Nog niets te tonen.</p>';
    var max = get(rows[0]);
    return '<ol class="rank">' + rows.map(function (r, i) {
      return '<li><span class="pl">' + (i + 1) + '</span><span class="nm"><a href="' + personHref(r) + '">' + esc(r.name) + '</a></span><span class="v num">' + get(r) + (unit ? ' <small class="muted">' + unit + '</small>' : '') + '</span>' +
        '<span class="bar"><i style="width:' + Math.max(4, Math.round(get(r) / max * 100)) + '%"></i></span></li>';
    }).join('') + '</ol>';
  }
  function ruleLines(r) {
    var g = r.goal, cs = r.cleanSheet, L = [];
    L.push(['Speelminuten', 'Vanaf ' + r.minutes.fullAt + ' minuten ' + r.minutes.full + ' punten, korter ' + r.minutes.partial + ' punt, niet gespeeld 0']);
    L.push(['Doelpunt', 'Keeper ' + g.keeper + ', verdediger ' + g.verdediger + ', middenvelder ' + g.middenvelder + ', aanvaller ' + g.aanvaller]);
    L.push(['Assist', String(r.assist)]);
    L.push(['Clean sheet', 'Keeper ' + cs.keeper + ', verdediger ' + cs.verdediger + ', middenvelder ' + cs.middenvelder + (cs.aanvaller ? ', aanvaller ' + cs.aanvaller : '') + ' (meer dan ' + r.csMinMinutes + ' minuten gespeeld)']);
    var ga = ['keeper', 'verdediger', 'middenvelder', 'aanvaller'].filter(function (p) { return r.goalsAgainst[p]; }).map(function (p) { return E.POS_LABEL[p].toLowerCase(); });
    L.push(['Tegendoelpunten', r.goalsAgainst.points + ' per ' + r.goalsAgainst.per + ' tegendoelpunten, enkel ' + ga.join(' en ')]);
    L.push(['Kaarten', 'Geel ' + r.yellow + ', rood ' + r.red + (r.twoYellowsIsRed ? '. Twee gele kaarten in dezelfde wedstrijd tellen als rood.' : '')]);
    L.push(['Man van de match', '1e plaats ' + r.motm[1] + ', 2e ' + r.motm[2] + ', 3e ' + r.motm[3] + (r.motmOnlyOnWin ? '. Enkel bij een zege van KFC Marke.' : '')]);
    L.push(['Bijzonder', 'Eigen doelpunt ' + r.ownGoal + ', gemiste strafschop ' + r.penMissed + ', gestopte strafschop (keeper) +' + r.penSaved]);
    var comps = Object.keys(r.countCompetitions).filter(function (k) { return r.countCompetitions[k]; }).map(function (k) { return E.COMPETITIONS[k].toLowerCase(); });
    L.push(['Telt mee', comps.join(' en ')]);
    return L;
  }
  V.ruleLines = ruleLines;

  /* ---------- Overzicht ---------- */
  V.overview = function (c) {
    var S = c.S, T = S.team, today = U.today();
    var next = T.upcoming.filter(function (m) { return m.date >= today; })[0] || null;
    var last = T.playedMatches[T.playedMatches.length - 1];
    var html = '<div class="page-head"><div><h1>Seizoen ' + esc(S.season.name) + '</h1><p>' + (T.played ? T.played + ' van ' + S.matches.length + ' wedstrijden gespeeld.' : 'Het seizoen moet nog beginnen.') + '</p></div></div>';

    html += '<div class="hero">';
    if (next) {
      var days = Math.round((new Date(next.date + 'T12:00:00') - new Date(today + 'T12:00:00')) / 864e5);
      html += '<a class="hero-card next" href="#/wedstrijd/' + esc(next.id) + '" style="color:inherit;text-decoration:none"><div class="lab">Volgende wedstrijd, ' + (days === 0 ? 'vandaag' : days === 1 ? 'morgen' : 'over ' + days + ' dagen') + '</div>' +
        '<div class="big">' + esc(next.opponent) + '</div><div class="sub">' + esc(U.dateLong(next.date)) + (next.kickoff ? ' om ' + esc(next.kickoff) : '') + '<br>' + (next.home ? 'Thuiswedstrijd' : 'Uitwedstrijd') + '</div></a>';
    } else {
      html += '<div class="hero-card next"><div class="lab">Volgende wedstrijd</div><div class="big">Geen</div><div class="sub">Er staan geen komende wedstrijden meer in dit seizoen.</div></div>';
    }
    if (last) {
      html += '<a class="hero-card" href="#/wedstrijd/' + esc(last.id) + '" style="color:inherit;text-decoration:none"><div class="lab">Laatste uitslag, ' + esc(U.dateShort(last.date)) + '</div>' +
        '<div class="score">' + esc(U.score(last)) + '</div><div class="sub">' + esc(U.matchTitle(last)) + ' ' + U.resultChip(last) + '</div></a>';
    } else {
      html += '<div class="hero-card"><div class="lab">Laatste uitslag</div><div class="big">Nog niets</div><div class="sub">Nog geen wedstrijd gespeeld.</div></div>';
    }
    html += '</div>';

    if (T.played) {
      html += '<dl class="stat-row">' +
        '<div><dt>Gespeeld</dt><dd class="num">' + T.played + '</dd></div>' +
        '<div><dt>Winst, gelijk, verlies</dt><dd class="num">' + T.W + '-' + T.G + '-' + T.V + '</dd></div>' +
        '<div><dt>Punten</dt><dd class="num">' + T.points + '</dd></div>' +
        '<div><dt>Doelpunten</dt><dd class="num">' + T.gf + '-' + T.ga + '</dd></div>' +
        '<div><dt>Clean sheets</dt><dd class="num">' + T.cleanSheets + '</dd></div></dl>';
      var f = T.form.slice(-8);
      html += '<div class="form-strip"><span class="muted" style="margin-right:6px">Laatste ' + f.length + '</span>' + f.map(function (x) {
        return '<a href="#/wedstrijd/' + esc(x.match.id) + '" title="' + esc(U.matchTitle(x.match) + ' ' + U.score(x.match)) + '">' + U.resultChip(x.match) + '</a>';
      }).join('') + '</div>';
    }

    if (c.canEdit) {
      var missing = T.playedMatches.filter(function (m) { return !S.hasLines[m.id]; }).length;
      if (missing) html += '<div class="banner" style="margin-top:18px">Bij ' + missing + ' gespeelde wedstrijden ontbreken nog de spelersgegevens. <a href="#/beheer/wedstrijden">Nu invullen</a></div>';
    }

    html += '<div class="sec"><div class="cols c3">';
    if (hasStats(c) && isBasic(c)) {
      html += '<div><div class="sec-head"><h2>Doelpunten</h2><a class="more" href="#/spelers">Alles</a></div>' + rankList(S.players, function (r) { return r.stats.goals; }) + '</div>' +
        '<div><div class="sec-head"><h2>Wedstrijden</h2><a class="more" href="#/spelers">Alles</a></div>' + rankList(S.players, function (r) { return r.stats.apps; }) + '</div>' +
        '<div><div class="sec-head"><h2>Minuten</h2><a class="more" href="#/spelers">Alles</a></div>' + rankList(S.players, function (r) { return r.stats.minutes; }) + '</div>';
    } else if (hasStats(c)) {
      html += '<div><div class="sec-head"><h2>Fantasy</h2><a class="more" href="#/fantasy">Alles</a></div>' + rankList(S.players, function (r) { return r.fantasy.total; }, 'pt') + '</div>' +
        '<div><div class="sec-head"><h2>Doelpunten</h2><a class="more" href="#/spelers">Alles</a></div>' + rankList(S.players, function (r) { return r.stats.goals; }) + '</div>' +
        '<div><div class="sec-head"><h2>Assists</h2><a class="more" href="#/spelers">Alles</a></div>' + rankList(S.players, function (r) { return r.stats.assists; }) + '</div>';
    } else {
      html += '<div style="grid-column:1/-1"><div class="sec-head"><h2>Spelers</h2></div>' + emptyStats(c) + '</div>';
    }
    html += '</div></div>';

    html += '<div class="sec"><div class="cols c2">';
    var up = T.upcoming.slice(0, 5);
    html += '<div><div class="sec-head"><h2>Komende wedstrijden</h2><a class="more" href="#/wedstrijden">Kalender</a></div>' +
      (up.length ? '<ul class="match-list">' + up.map(function (m) { return matchRow(m, c); }).join('') + '</ul>' : '<p class="muted">Geen komende wedstrijden.</p>') + '</div>';
    var rec = T.playedMatches.slice(-5).reverse();
    html += '<div><div class="sec-head"><h2>Laatste uitslagen</h2><a class="more" href="#/wedstrijden">Alle wedstrijden</a></div>' +
      (rec.length ? '<ul class="match-list">' + rec.map(function (m) { return matchRow(m, c); }).join('') + '</ul>' : '<p class="muted">Nog geen uitslagen.</p>') + '</div>';
    html += '</div></div>';
    return html;
  };

  /* ---------- Fantasy ---------- */
  V.fantasy = function (c) {
    var S = c.S, sort = ui.fantasySort;
    var html = '<div class="page-head"><div><h1>Fantasy</h1><p>Klassement seizoen ' + esc(S.season.name) + '. Klik op een kolom om te sorteren.</p></div></div>';
    if (isBasic(c)) return html + '<div class="empty"><p>In seizoen ' + esc(S.season.name) + ' werd er geen fantasy bijgehouden.</p><a class="btn" href="#/spelers">Naar de selectie</a></div>';
    if (!hasStats(c)) return html + emptyStats(c);
    var posOpts = [['alle', 'Iedereen']].concat(E.POSITIONS.map(function (p) { return [p, E.POS_LABEL[p] + 's']; })).concat([['geen', 'Zonder positie']]);
    html += '<div class="tools"><div class="seg" role="group" aria-label="Positie">' + posOpts.map(function (o) {
      return '<button type="button" data-set="fantasyPos=' + o[0] + '" aria-pressed="' + (ui.fantasyPos === o[0]) + '">' + esc(o[1]) + '</button>';
    }).join('') + '</div></div>';
    var rows = S.players.filter(function (r) {
      if (ui.fantasyPos === 'alle') return true;
      if (ui.fantasyPos === 'geen') return !r.roster.position;
      return r.roster.position === ui.fantasyPos;
    });
    var getters = {
      name: function (r) { return r.name; }, nr: nrOf, total: function (r) { return r.fantasy.total; }, minutes: function (r) { return r.fantasy.minutes; },
      goals: function (r) { return r.fantasy.goals; }, assists: function (r) { return r.fantasy.assists; }, cleanSheet: function (r) { return r.fantasy.cleanSheet; },
      goalsAgainst: function (r) { return r.fantasy.goalsAgainst; }, cards: function (r) { return r.fantasy.yellow + r.fantasy.red; },
      motm: function (r) { return r.fantasy.motm; }, other: function (r) { return r.fantasy.specials + r.fantasy.adjust; }, apps: function (r) { return r.stats.apps; }
    };
    rows = sortRows(rows, getters[sort.key] || getters.total, sort.dir);
    var cols = [['total', 'Totaal', 'Totaal aantal fantasypunten'], ['apps', 'Wed.', 'Aantal wedstrijden gespeeld'], ['minutes', 'Minuten', 'Punten voor speelminuten'], ['goals', 'Goals', 'Punten voor doelpunten'],
      ['assists', 'Assists', 'Punten voor assists'], ['cleanSheet', 'Clean sheet', 'Punten voor clean sheets'], ['goalsAgainst', 'Tegendoelp.', 'Puntenaftrek voor tegendoelpunten'],
      ['cards', 'Kaarten', 'Puntenaftrek voor gele en rode kaarten'], ['motm', 'Man v/d match', 'Punten voor man van de match'],
      ['other', 'Overig', 'Eigen doelpunten, gemiste of gestopte strafschoppen en handmatige correcties']];
    html += '<div class="table-wrap"><table class="t"><thead><tr>' + th('Speler', 'name', sort, 'fantasy', { cls: 'l sticky' }) + th('Nr', 'nr', sort, 'fantasy', { cls: 'hide-sm' }) + '<th>Pos.</th>' +
      cols.map(function (k) { return th(k[1], k[0], sort, 'fantasy', { title: k[2] }); }).join('') + '</tr></thead><tbody>';
    rows.forEach(function (r) {
      var f = r.fantasy;
      html += '<tr><td class="l sticky"><a href="' + personHref(r) + '">' + esc(r.name) + '</a></td><td class="nr hide-sm">' + esc(r.roster.number || '') + '</td><td>' + U.posBadge(r.roster.position) + '</td>' +
        '<td class="total num">' + f.total + '</td><td class="num">' + r.stats.apps + '</td><td class="num">' + pts(f.minutes) + '</td><td class="num">' + pts(f.goals) + '</td><td class="num">' + pts(f.assists) + '</td>' +
        '<td class="num">' + pts(f.cleanSheet) + '</td><td class="num">' + pts(f.goalsAgainst) + '</td><td class="num">' + pts(f.yellow + f.red) + '</td><td class="num">' + pts(f.motm) + '</td>' +
        '<td class="num" title="' + esc(r.roster.adjust_note || '') + '">' + pts(f.specials + f.adjust) + '</td></tr>';
    });
    html += '</tbody></table></div>';
    var unset = S.players.filter(function (r) { return !r.roster.position; }).length;
    if (unset) html += '<p class="muted" style="margin-top:10px">' + unset + ' speler' + (unset > 1 ? 's hebben' : ' heeft') + ' nog geen positie. Zonder positie rekenen we als middenvelder.' + (c.canEdit ? ' <a href="#/beheer/spelers">Posities kiezen</a>' : '') + '</p>';
    html += '<div class="sec"><details class="panel"><summary style="cursor:pointer;font-weight:600">Puntentelling van dit seizoen</summary><div class="table-wrap" style="margin-top:12px"><table class="t"><tbody>' +
      ruleLines(S.rules).map(function (l) { return '<tr><td class="l" style="white-space:normal;font-weight:600">' + esc(l[0]) + '</td><td class="l" style="white-space:normal">' + esc(l[1]) + '</td></tr>'; }).join('') +
      '</tbody></table></div></details></div>';
    return html;
  };

  /* ---------- Spelers ---------- */
  V.players = function (c) {
    var S = c.S, html = '<div class="page-head"><div><h1>Selectie</h1><p>Seizoen ' + esc(S.season.name) + ', ' + S.players.length + ' spelers en ' + S.staff.length + ' stafleden.</p></div>' +
      '<div class="seg" role="group" aria-label="Weergave"><button type="button" data-set="playersView=kaarten" aria-pressed="' + (ui.playersView === 'kaarten') + '">Kaarten</button>' +
      '<button type="button" data-set="playersView=tabel" aria-pressed="' + (ui.playersView === 'tabel') + '">Tabel</button></div></div>';
    if (!S.players.length) return html + '<div class="empty"><p>Nog geen spelers in dit seizoen.</p>' + (c.canEdit ? '<a class="btn primary" href="#/beheer/spelers">Spelers toevoegen</a>' : '') + '</div>';
    var any = hasStats(c), B = isBasic(c);
    if (B) html += basicNote(c);

    if (ui.playersView === 'tabel') {
      var sort = ui.playersSort;
      var g = {
        name: function (r) { return r.name; }, nr: nrOf, pos: function (r) { return E.POSITIONS.indexOf(r.roster.position) + 1 || 9; }, apps: function (r) { return r.stats.apps; },
        minutes: function (r) { return r.stats.minutes; }, goals: function (r) { return r.stats.goals; }, assists: function (r) { return r.stats.assists; },
        cs: function (r) { return r.stats.cleanSheets; }, conceded: function (r) { return r.stats.conceded; }, yellow: function (r) { return r.stats.yellow; }, red: function (r) { return r.stats.red; },
        motm: function (r) { return r.stats.motm1 * 100 + r.stats.motm2 * 10 + r.stats.motm3; }, fantasy: function (r) { return r.fantasy.total; }
      };
      var rows = sortRows(S.players, (B && (sort.key === 'assists' || sort.key === 'fantasy' || sort.key === 'motm') ? g.goals : g[sort.key]) || g.goals, sort.dir);
      html += '<div class="table-wrap"><table class="t"><thead><tr>' + th('Speler', 'name', sort, 'players', { cls: 'l sticky' }) + th('Nr', 'nr', sort, 'players', { cls: 'hide-sm' }) + th('Pos.', 'pos', sort, 'players') +
        th('Wed.', 'apps', sort, 'players', { title: 'Wedstrijden in de selectie die minuten speelden' }) + th('Minuten', 'minutes', sort, 'players') + th('Goals', 'goals', sort, 'players') + (B ? '' : th('Assists', 'assists', sort, 'players')) +
        th('Clean sheets', 'cs', sort, 'players', { title: 'Meer dan 60 minuten gespeeld zonder tegendoelpunt' }) + th('Tegendoelp.', 'conceded', sort, 'players', { title: 'Tegendoelpunten tijdens wedstrijden waarin hij meer dan 60 minuten speelde' }) +
        th('Geel', 'yellow', sort, 'players') + th('Rood', 'red', sort, 'players') + (B ? '' : th('Man v/d match', 'motm', sort, 'players', { title: 'Aantal keer 1e, 2e of 3e' }) + th('Fantasy', 'fantasy', sort, 'players')) + '</tr></thead><tbody>';
      rows.forEach(function (r) {
        var s = r.stats;
        html += '<tr><td class="l sticky"><a href="' + personHref(r) + '">' + esc(r.name) + '</a></td><td class="nr hide-sm">' + esc(r.roster.number || '') + '</td><td>' + U.posBadge(r.roster.position) + '</td>' +
          '<td class="num">' + U.dash(s.apps) + '</td><td class="num">' + U.dash(s.minutes) + '</td><td class="num">' + U.dash(s.goals) + '</td>' + (B ? '' : '<td class="num">' + U.dash(s.assists) + '</td>') + '<td class="num">' + U.dash(s.cleanSheets) + '</td>' +
          '<td class="num">' + (s.apps ? s.conceded : '<span class="zero">0</span>') + '</td><td class="num">' + U.dash(s.yellow) + '</td><td class="num">' + U.dash(s.red) + '</td>' +
          (B ? '' : '<td class="num">' + (s.motm ? s.motm1 + '/' + s.motm2 + '/' + s.motm3 : '<span class="zero">0</span>') + '</td><td class="total num">' + r.fantasy.total + '</td>') + '</tr>';
      });
      html += '</tbody></table></div>';
    } else {
      var groups = E.POSITIONS.map(function (p) { return { key: p, label: E.POS_LABEL[p] + 's', rows: S.players.filter(function (r) { return r.roster.position === p; }) }; });
      groups.push({ key: '', label: 'Positie nog niet gekozen', rows: S.players.filter(function (r) { return !r.roster.position; }) });
      groups.forEach(function (gr) {
        if (!gr.rows.length) return;
        var rows = gr.rows.slice().sort(function (a, b) { return nrOf(a) - nrOf(b) || a.name.localeCompare(b.name, 'nl'); });
        html += '<div class="grp"><h2>' + esc(gr.label) + ' <small>' + rows.length + '</small></h2><div class="pgrid">' + rows.map(function (r) {
          var s = r.stats;
          return '<a class="pcard" href="' + personHref(r) + '"><div class="jersey' + (r.roster.number ? '' : ' empty-n') + '">' + esc(r.roster.number || '-') + '</div><div><div class="nm">' + esc(r.name) + '</div>' +
            '<div class="meta">' + (any ? '<span><b>' + s.apps + '</b> wed.</span><span><b>' + s.goals + '</b> goals</span>' + (B ? '<span><b>' + U.int(s.minutes) + '</b> min.</span>' : '<span><b>' + s.assists + '</b> assists</span>') : '<span>Nog geen wedstrijden</span>') + '</div></div>' +
            (any && !B ? '<div class="pts" title="Fantasypunten">' + r.fantasy.total + '</div>' : '') + '</a>';
        }).join('') + '</div></div>';
      });
    }
    if (S.staff.length) {
      html += '<div class="grp"><h2>Staf <small>' + S.staff.length + '</small></h2><div class="pgrid staff-grid">' + S.staff.map(function (r) {
        return '<a class="pcard" href="' + personHref(r) + '"><div class="jersey empty-n">' + esc(r.roster.number || '') + '</div><div><div class="nm">' + esc(r.name) + '</div><div class="meta"><span>' + esc(E.STAFF_LABEL[r.roster.position] || '') + '</span>' +
          (r.stats.yellow || r.stats.red ? '<span><b>' + r.stats.yellow + '</b> geel</span><span><b>' + r.stats.red + '</b> rood</span>' : '') + '</div></div></a>';
      }).join('') + '</div></div>';
    }
    return html;
  };

  /* ---------- Speler ---------- */
  var CAT = [['minutes', 'Minuten', '#6f9b80'], ['goals', 'Goals', '#1fb457'], ['assists', 'Assists', '#7fe3a5'], ['cleanSheet', 'Clean sheets', '#5aa9ff'],
    ['motm', 'Man v/d match', '#f2c230'], ['specials', 'Bijzonder', '#a58bff']];
  V.player = function (c, personId) {
    var data = c.data, person = null;
    data.people.forEach(function (p) { if (p.id === personId) person = p; });
    if (!person) return '<div class="empty"><p>Deze speler bestaat niet.</p><a class="btn" href="#/spelers">Naar de selectie</a></div>';
    var myRows = data.roster.filter(function (r) { return r.person_id === personId; });
    var seasons = myRows.map(function (r) { return data.seasons.filter(function (s) { return s.id === r.season_id; })[0]; }).filter(Boolean)
      .sort(function (a, b) { return b.start_year - a.start_year; });
    var cur = seasons.filter(function (s) { return s.id === c.seasonId; })[0] || seasons[0];
    if (!cur) return '<div class="empty"><p>Deze persoon zit in geen enkel seizoen.</p></div>';
    var S = c.compute(cur.id);
    var row = S.players.concat(S.staff).filter(function (r) { return r.person.id === personId; })[0];
    var rs = row.roster, s = row.stats, f = row.fantasy;
    var html = '<div class="phero"><div class="jersey' + (rs.number ? '' : ' empty-n') + '">' + esc(rs.number || '-') + '</div><div><h1>' + esc(row.name) + '</h1><div class="sub">' +
      (row.isStaff ? '<span>' + esc(E.STAFF_LABEL[rs.position] || 'Staf') + '</span>' : U.posBadge(rs.position) + '<span>' + esc(rs.position ? E.POS_LABEL[rs.position] : 'Positie nog niet gekozen') + '</span>') +
      '<span>Seizoen ' + esc(cur.name) + '</span></div></div></div>';
    if (seasons.length > 1) html += '<div class="tabs" role="navigation" aria-label="Seizoen">' + seasons.map(function (x) {
      return '<a href="#/speler/' + encodeURIComponent(personId) + '" data-season="' + esc(x.id) + '" aria-current="' + (x.id === cur.id) + '">' + esc(x.name) + '</a>';
    }).join('') + '</div>';

    if (c.canEdit) html += '<div class="btn-row" style="margin-top:12px"><a class="btn small" href="#/beheer/spelers">' + U.icon('edit') + ' Nummer of positie wijzigen</a></div>';

    if (row.isStaff) {
      html += '<div class="sec"><dl class="kv"><div><dt>Gele kaarten</dt><dd>' + s.yellow + '</dd></div><div><dt>Rode kaarten</dt><dd>' + s.red + '</dd></div><div><dt>Schorsingen uitgezeten</dt><dd>' + s.suspended + '</dd></div></dl></div>';
      return html;
    }
    var gk = rs.position === 'keeper' || rs.position === 'verdediger', B = !!S.rules.basic;
    html += '<div class="sec"><dl class="kv"><div><dt>Wedstrijden</dt><dd>' + s.apps + '</dd></div><div><dt>Minuten</dt><dd>' + U.int(s.minutes) + '</dd></div><div><dt>Goals</dt><dd>' + s.goals + '</dd></div>' +
      (B ? '' : '<div><dt>Assists</dt><dd>' + s.assists + '</dd></div>') + (gk ? '<div><dt>Clean sheets</dt><dd>' + s.cleanSheets + '</dd></div>' : '') +
      '<div><dt>Gele kaarten</dt><dd>' + s.yellow + '</dd></div><div><dt>Rode kaarten</dt><dd>' + s.red + '</dd></div>' + (B ? '' : '<div><dt>Man van de match</dt><dd>' + s.motm + '</dd></div>' +
      '<div><dt>Fantasypunten</dt><dd style="color:var(--green-hi)">' + f.total + '</dd></div>') + '</dl></div>';

    /* puntenverdeling */
    var parts = CAT.map(function (k) { return { label: k[1], color: k[2], v: k[0] === 'specials' ? f.specials + f.adjust : f[k[0]] }; });
    var neg = f.goalsAgainst + f.yellow + f.red;
    var posSum = parts.reduce(function (a, p) { return a + Math.max(0, p.v); }, 0);
    if (posSum > 0 && !B) {
      html += '<div class="sec"><h2>Fantasypunten</h2><div class="stack" role="img" aria-label="Verdeling van de punten">' + parts.filter(function (p) { return p.v > 0; }).map(function (p) {
        return '<i style="width:' + (p.v / posSum * 100) + '%;background:' + p.color + '" title="' + esc(p.label + ': ' + p.v) + '"></i>';
      }).join('') + '</div><div class="legend">' + parts.filter(function (p) { return p.v !== 0; }).map(function (p) {
        return '<span style="--c:' + p.color + '">' + esc(p.label) + ' <b>' + U.plus(p.v) + '</b></span>';
      }).join('') + (neg ? '<span style="--c:#e5453b">Tegendoelpunten en kaarten <b>' + neg + '</b></span>' : '') + '</div>' +
        (rs.adjust ? '<p class="muted" style="margin-top:8px">Inbegrepen: handmatige correctie van ' + U.plus(rs.adjust) + (rs.adjust_note ? ' (' + esc(rs.adjust_note) + ')' : '') + '.</p>' : '') + '</div>';
    }

    /* per wedstrijd */
    if (row.perMatch.length) {
      html += '<div class="sec"><h2>Wedstrijd per wedstrijd</h2><div class="table-wrap" style="margin-top:12px"><table class="t"><thead><tr><th class="l sticky">Tegenstander</th><th>Uitslag</th><th>Min.</th><th>Goals</th>' + (B ? '' : '<th>Assists</th>') + '<th>Geel</th><th>Rood</th>' + (B ? '' : '<th>MvdM</th><th>Punten</th>') + '</tr></thead><tbody>';
      row.perMatch.forEach(function (pm) {
        var l = pm.line, m = pm.match, g = E.lineGoals(l);
        if (pm.b) {
          html += '<tr><td class="l sticky">B-ploeg <span class="muted">' + esc(U.dateShort(m.date)) + (m.opponent && m.opponent !== 'B-ploeg' ? ', ' + esc(m.opponent) : '') + '</span></td><td><span class="muted">kaarten enkel</span></td><td class="num"><span class="zero">-</span></td><td class="num"><span class="zero">-</span></td>' + (B ? '' : '<td class="num"><span class="zero">-</span></td>') +
            '<td class="num">' + (l.yellow ? '<span class="card-y"></span>' + l.yellow : '<span class="zero">0</span>') + '</td><td class="num">' + (l.red ? '<span class="card-r"></span>' + l.red : '<span class="zero">0</span>') + '</td>' + (B ? '' : '<td class="num"><span class="zero">-</span></td><td class="num total"></td>') + '</tr>';
          return;
        }
        var tip = pm.pts ? 'Minuten ' + pm.pts.minutes + ', goals ' + pm.pts.goals + ', assists ' + pm.pts.assists + ', clean sheet ' + pm.pts.cleanSheet + ', tegendoelpunten ' + pm.pts.goalsAgainst + ', kaarten ' + (pm.pts.yellow + pm.pts.red) + ', man van de match ' + pm.pts.motm + ', bijzonder ' + pm.pts.specials : '';
        html += '<tr><td class="l sticky"><a href="#/wedstrijd/' + esc(m.id) + '">' + esc(m.opponent) + '</a> <span class="muted">' + (m.home ? 'T' : 'U') + '</span></td><td>' + U.resultChip(m) + ' <span class="num">' + esc(U.score(m)) + '</span></td>' +
          '<td class="num">' + (l.minutes == null ? '<span class="zero">-</span>' : (l.minutes === 0 ? 'bank' : l.minutes)) + '</td><td class="num">' + U.dash(g) + '</td>' + (B ? '' : '<td class="num">' + U.dash(E.num(l.assists)) + '</td>') +
          '<td class="num">' + (l.yellow ? '<span class="card-y"></span>' + l.yellow : '<span class="zero">0</span>') + '</td><td class="num">' + (l.red ? '<span class="card-r"></span>' + l.red : '<span class="zero">0</span>') + '</td>' +
          (B ? '' : '<td class="num">' + (l.motm ? l.motm : '<span class="zero">-</span>') + '</td><td class="num total" title="' + esc(tip) + '">' + (pm.pts ? pm.pts.total : '') + '</td>') + '</tr>';
      });
      html += '</tbody></table></div></div>';
    }

    /* loopbaan */
    if (seasons.length > 1 || true) {
      var tot = { apps: 0, minutes: 0, goals: 0, assists: 0, yellow: 0, red: 0, fantasy: 0, fApps: 0 }, anyBasic = false;
      var body = seasons.map(function (sx) {
        var SS = c.compute(sx.id, cmpLimit(c)), rr = SS.players.concat(SS.staff).filter(function (r) { return r.person.id === personId; })[0];
        if (!rr) return '';
        var q = rr.stats, bs = !!SS.rules.basic; if (bs) anyBasic = true; tot.apps += q.apps; tot.minutes += q.minutes; tot.goals += q.goals; tot.yellow += q.yellow; tot.red += q.red; if (!bs) { tot.assists += q.assists; tot.fantasy += rr.fantasy.total; tot.fApps += q.apps; }
        return '<tr><td class="l sticky"><a href="#/speler/' + encodeURIComponent(personId) + '" data-season="' + esc(sx.id) + '">' + esc(sx.name) + '</a></td><td>' + (rr.isStaff ? '' : U.posBadge(rr.roster.position)) + '</td><td class="nr">' + esc(rr.roster.number || '') + '</td>' +
          '<td class="num">' + q.apps + '</td><td class="num">' + U.int(q.minutes) + '</td><td class="num">' + q.goals + '</td><td class="num">' + (bs ? '<span class="zero">-</span>' : q.assists) + '</td><td class="num">' + q.yellow + '</td><td class="num">' + q.red + '</td>' +
          '<td class="num total">' + (rr.isStaff ? '' : bs ? '<span class="zero">-</span>' : rr.fantasy.total) + '</td><td class="num">' + (rr.isStaff || bs || !q.apps ? '' : U.dec(rr.fantasy.total / q.apps)) + '</td></tr>';
      }).join('');
      html += '<div class="sec"><h2>Seizoenen vergelijken</h2>' + (seasons.length > 1 ? compareControl(c) : '') + '<div class="table-wrap" style="margin-top:12px"><table class="t"><thead><tr><th class="l sticky">Seizoen</th><th>Pos.</th><th>Nr</th><th>Wed.</th><th>Minuten</th><th>Goals</th><th>Assists</th><th>Geel</th><th>Rood</th><th>Fantasy</th><th>Per wed.</th></tr></thead><tbody>' + body + '</tbody>' +
        (seasons.length > 1 ? '<tfoot><tr><td class="l sticky">Totaal</td><td></td><td></td><td class="num">' + tot.apps + '</td><td class="num">' + U.int(tot.minutes) + '</td><td class="num">' + tot.goals + '</td><td class="num">' + tot.assists + '</td><td class="num">' + tot.yellow + '</td><td class="num">' + tot.red + '</td><td class="num">' + tot.fantasy + '</td><td class="num">' + (tot.fApps ? U.dec(tot.fantasy / tot.fApps) : '') + '</td></tr></tfoot>' : '') +
        '</table></div>' + (anyBasic ? '<p class="muted" style="margin-top:8px">Assists en fantasypunten werden niet in elk seizoen bijgehouden. Daar tellen alleen de seizoenen mee waarin dat wel gebeurde.</p>' : '') + '</div>';
    }
    return html;
  };

  /* ---------- Wedstrijden ---------- */
  V.matches = function (c) {
    var S = c.S, f = ui.matchFilter;
    var list = S.allMatches.filter(function (m) { var done = E.result(m) != null; return f === 'alle' || (f === 'gespeeld' ? done : !done); });
    var html = '<div class="page-head"><div><h1>Wedstrijden</h1><p>Seizoen ' + esc(S.season.name) + '.</p></div><div class="btn-row">' +
      '<div class="seg" role="group" aria-label="Filter">' + [['alle', 'Alle'], ['gespeeld', 'Gespeeld'], ['komend', 'Komend']].map(function (o) {
        return '<button type="button" data-set="matchFilter=' + o[0] + '" aria-pressed="' + (f === o[0]) + '">' + o[1] + '</button>';
      }).join('') + '</div>' + (c.canEdit ? '<a class="btn primary" href="#/beheer/wedstrijd/nieuw">' + U.icon('plus') + ' Wedstrijd</a>' : '') + '</div></div>';
    if (!list.length) return html + '<div class="empty"><p>Geen wedstrijden om te tonen.</p></div>';
    return html + '<ul class="match-list">' + list.map(function (m) { return matchRow(m, c); }).join('') + '</ul>';
  };

  /* ---------- Wedstrijd ---------- */
  V.match = function (c, id) {
    var S = c.S, m = S.matchById[id];
    if (!m) return '<div class="empty"><p>Deze wedstrijd bestaat niet.</p><a class="btn" href="#/wedstrijden">Naar de wedstrijden</a></div>';
    var done = E.result(m) != null;
    var us = '<div class="tm us">KFC Marke</div>', them = '<div class="tm">' + esc(m.opponent) + '</div>';
    var html = '<div class="mhero"><div class="teams">' + (m.home ? us : them) + '<div class="big num">' + (done ? esc(U.score(m)) : 'tegen') + '</div>' + (m.home ? them : us) + '</div>' +
      '<div class="when">' + esc(U.dateLong(m.date)) + (m.kickoff ? ' om ' + esc(m.kickoff) : '') + '<br>' + (E.COMPETITIONS[m.competition] || '') + (done ? ', ' + { W: 'gewonnen', G: 'gelijkgespeeld', V: 'verloren' }[E.result(m)] : '') + '</div></div>';
    if (c.canEdit) html += '<div class="btn-row" style="margin-top:12px"><a class="btn primary" href="#/beheer/wedstrijd/' + esc(m.id) + '">' + U.icon('edit') + ' ' + (S.hasLines[m.id] ? 'Wedstrijd bewerken' : 'Wedstrijd invullen') + '</a></div>';

    var lines = (S.linesByMatch[m.id] || []).map(function (l) {
      var r = S.rosterById[l.roster_id]; if (!r) return null;
      var row = S.players.concat(S.staff).filter(function (x) { return x.roster.id === r.id; })[0];
      return row ? { l: l, row: row } : null;
    }).filter(Boolean);
    var pl = lines.filter(function (x) { return !x.row.isStaff; });

    if (pl.length) {
      var scorers = pl.filter(function (x) { return E.lineGoals(x.l) > 0; });
      var assists = pl.filter(function (x) { return E.num(x.l.assists) > 0; }), B = isBasic(c);
      var yel = lines.filter(function (x) { return x.l.yellow || x.l.red; });
      var motm = pl.filter(function (x) { return x.l.motm; }).sort(function (a, b) { return a.l.motm - b.l.motm; });
      var gt = function (l) { var t = []; if (l.g_corner) t.push(l.g_corner > 1 ? l.g_corner + ' na corner' : 'na corner'); if (l.g_free) t.push(l.g_free > 1 ? l.g_free + ' vrije trap' : 'vrije trap'); if (l.g_pen) t.push(l.g_pen > 1 ? l.g_pen + ' strafschop' : 'strafschop'); return t.length ? ' <span class="muted">(' + t.join(', ') + ')</span>' : ''; };
      html += '<div class="sec"><div class="cols c2"><div><h2>Gebeurtenissen</h2><ul class="events">' +
        (scorers.length ? '<li><span class="k">Doelpunten</span><span>' + scorers.map(function (x) { var g = E.lineGoals(x.l); return '<a href="' + personHref(x.row) + '">' + esc(x.row.name) + '</a>' + (g > 1 ? ' ' + g : '') + gt(x.l); }).join('<br>') + '</span></li>' : '') +
        (assists.length ? '<li><span class="k">Assists</span><span>' + assists.map(function (x) { var a = E.num(x.l.assists); return '<a href="' + personHref(x.row) + '">' + esc(x.row.name) + '</a>' + (a > 1 ? ' ' + a : ''); }).join('<br>') + '</span></li>' : '') +
        (yel.length ? '<li><span class="k">Kaarten</span><span>' + yel.map(function (x) { return (x.l.yellow ? '<span class="card-y"></span>' + (x.l.yellow > 1 ? x.l.yellow + ' ' : '') : '') + (x.l.red ? '<span class="card-r"></span>' : '') + esc(x.row.name); }).join('<br>') + '</span></li>' : '') +
        (motm.length ? '<li><span class="k">Man van de match</span><span class="podium">' + motm.map(function (x) { return '<span><b>' + x.l.motm + '</b>' + esc(x.row.name) + '</span>'; }).join('') + '</span></li>' : '') +
        (!scorers.length && !assists.length && !yel.length && !motm.length ? '<li class="muted">Geen bijzonderheden.</li>' : '') + '</ul></div>';
      var own = pl.filter(function (x) { return x.l.own_goals || x.l.pen_missed || x.l.pen_saved; });
      var tpm = teamPairs(m);
      html += (tpm ? '<div><h2>Teamcijfers</h2>' + tpm + '</div>' : '') + '</div></div>';

      var ms = ui.matchSort, mp = {};
      pl.forEach(function (x) { mp[x.row.roster.id] = E.linePoints(x.l, m, x.row.roster.position, S.rules).total; });
      var mget = {
        name: function (x) { return x.row.name; },
        pos: function (x) { return E.POSITIONS.indexOf(x.row.roster.position) + 1 || 9; },
        minutes: function (x) { return x.l.minutes == null ? -1 : E.num(x.l.minutes); },
        goals: function (x) { return E.lineGoals(x.l); }, assists: function (x) { return E.num(x.l.assists); },
        yellow: function (x) { return E.num(x.l.yellow); }, red: function (x) { return E.num(x.l.red); },
        motm: function (x) { return x.l.motm ? 4 - x.l.motm : 0; },
        points: function (x) { return mp[x.row.roster.id]; }
      };
      var mg = mget[ms.key] || mget.minutes;
      html += '<div class="sec"><h2>' + (B ? 'Opstelling' : 'Opstelling en punten') + '</h2><p class="muted" style="margin-top:4px">Klik op een kolomtitel om te sorteren.</p><div class="table-wrap" style="margin-top:12px"><table class="t"><thead><tr>' +
        th('Speler', 'name', ms, 'match', { cls: 'l sticky' }) + th('Pos.', 'pos', ms, 'match') + th('Min.', 'minutes', ms, 'match') + th('Goals', 'goals', ms, 'match') +
        (B ? '' : th('Assists', 'assists', ms, 'match')) + th('Geel', 'yellow', ms, 'match') + th('Rood', 'red', ms, 'match') + (B ? '' : th('MvdM', 'motm', ms, 'match', { title: 'Man van de match (1e, 2e of 3e plaats)' }) +
        th('Punten', 'points', ms, 'match')) + '</tr></thead><tbody>';
      pl.sort(function (a, b) {
        var d = (mg(a) - mg(b)) * ms.dir; if (typeof mg(a) === 'string') d = String(mg(a)).localeCompare(String(mg(b)), 'nl') * ms.dir;
        return d || (E.num(b.l.minutes) - E.num(a.l.minutes)) || a.row.name.localeCompare(b.row.name, 'nl');
      }).forEach(function (x) {
        var p = { total: mp[x.row.roster.id] };
        html += '<tr><td class="l sticky"><a href="' + personHref(x.row) + '">' + esc(x.row.name) + '</a></td><td>' + U.posBadge(x.row.roster.position) + '</td><td class="num">' + (x.l.minutes === 0 ? 'bank' : x.l.minutes == null ? '<span class="zero">-</span>' : x.l.minutes) + '</td>' +
          '<td class="num">' + U.dash(E.lineGoals(x.l)) + '</td>' + (B ? '' : '<td class="num">' + U.dash(E.num(x.l.assists)) + '</td>') + '<td class="num">' + U.dash(E.num(x.l.yellow)) + '</td><td class="num">' + U.dash(E.num(x.l.red)) + '</td>' + (B ? '' : '<td class="num">' + (x.l.motm || '<span class="zero">-</span>') + '</td><td class="num total">' + p.total + '</td>') + '</tr>';
      });
      html += '</tbody></table></div>' + (own.length ? '<p class="muted" style="margin-top:8px">' + own.map(function (x) {
        var t = []; if (x.l.own_goals) t.push('eigen doelpunt'); if (x.l.pen_missed) t.push('gemiste strafschop'); if (x.l.pen_saved) t.push('gestopte strafschop');
        return esc(x.row.name) + ': ' + t.join(', ');
      }).join('. ') + '.</p>' : '') + '</div>';
    } else {
      html += '<div class="sec">' + (done ? '<div class="empty"><p>Voor deze wedstrijd zijn er nog geen spelersgegevens.</p>' + (c.canEdit ? '<a class="btn primary" href="#/beheer/wedstrijd/' + esc(m.id) + '">Spelers invullen</a>' : '') + '</div>' : '<div class="empty"><p>Deze wedstrijd moet nog gespeeld worden.</p></div>') + '</div>';
      var tp = teamPairs(m); if (tp) html += '<div class="sec"><h2>Teamcijfers</h2>' + tp + '</div>';
    }
    if (m.note) html += '<div class="sec"><h2>Notities</h2><p>' + esc(m.note) + '</p></div>';

    var i = S.allMatches.indexOf(m), prev = S.allMatches[i - 1], nxt = S.allMatches[i + 1];
    html += '<div class="pager">' + (prev ? '<a class="btn ghost" href="#/wedstrijd/' + esc(prev.id) + '">Vorige: ' + esc(prev.opponent) + '</a>' : '<span></span>') + (nxt ? '<a class="btn ghost" href="#/wedstrijd/' + esc(nxt.id) + '">Volgende: ' + esc(nxt.opponent) + '</a>' : '') + '</div>';
    return html;
  };
  function teamPairs(m) {
    function has(a, b) { return m[a] != null || m[b] != null; }
    var out = '';
    [['Hoekschoppen', 'sp_corners', 'opp_corners'], ['Vrije trappen', 'sp_free', 'opp_free'], ['Strafschoppen', 'sp_pens', 'opp_pens']].forEach(function (k) {
      if (has(k[1], k[2])) out += '<div class="pair"><b class="a num">' + E.num(m[k[1]]) + '</b><span class="c">' + k[0] + '</span><b class="num">' + E.num(m[k[2]]) + '</b></div>';
    });
    if (out) out = '<div class="pair muted"><span class="a">KFC Marke</span><span class="c"></span><span>' + esc(m.opponent) + '</span></div>' + out;
    var ga = [['ga_corner', 'na een corner'], ['ga_free', 'na een vrije trap'], ['ga_pen', 'strafschop'], ['ga_error', 'na eigen fout'], ['ga_quality', 'door kwaliteit tegenstander']].filter(function (k) { return E.num(m[k[0]]) > 0; });
    if (ga.length) out += '<p style="margin-top:12px"><span class="muted">Tegendoelpunten:</span> ' + ga.map(function (k) { return m[k[0]] + ' ' + k[1]; }).join(', ') + '</p>';
    return out;
  }

  /* ---------- Kaarten ---------- */
  function cardInfo(r, every) {
    var y = r.stats.yellow, rd = r.stats.red, earned = Math.floor(y / every) + rd, served = r.stats.suspended, open = earned - served, cs = E.cardStatus(y, every);
    var level = open > 0 ? 3 : cs.level === 2 ? 2 : cs.level === 1 ? 1 : 0;   /* 3 = schorsing open, 2 = volgende gele is schorsing, 1 = nog niet ver, 0 = niets */
    return { y: y, rd: rd, earned: earned, served: served, open: open, cs: cs, level: level };
  }
  V.cards = function (c) {
    var S = c.S, every = S.rules.suspensionEvery || 3;
    var html = '<div class="page-head"><div><h1>Kaarten en schorsingen</h1><p>Na elke ' + every + ' gele kaarten volgt een schorsing. Een rode kaart is een schorsing. Kaarten bij de B-ploeg tellen mee (aangeduid met B). Klik op een kolomtitel om te sorteren.</p></div>' +
      '<div class="btn-row"><div class="seg" role="group" aria-label="Wie tonen">' +
      '<button type="button" data-set="cardsOnly=ja" aria-pressed="' + (ui.cardsOnly === 'ja') + '">Met kaarten</button><button type="button" data-set="cardsOnly=nee" aria-pressed="' + (ui.cardsOnly === 'nee') + '">Iedereen</button></div>' +
      '<div class="seg" role="group" aria-label="Status">' + [['alle', 'Alle'], ['open', 'Schorsing open'], ['bijna', 'Bijna schorsing']].map(function (o) {
        return '<button type="button" data-set="cardsStatus=' + o[0] + '" aria-pressed="' + (ui.cardsStatus === o[0]) + '">' + o[1] + '</button>';
      }).join('') + '</div></div></div>';
    var all = S.players.concat(S.staff);
    if (!all.some(function (r) { return r.stats.yellow || r.stats.red || r.stats.suspended; }) && !hasStats(c)) return html + emptyStats(c);
    var rows = all.filter(function (r) { return ui.cardsOnly !== 'ja' || r.stats.yellow || r.stats.red || r.stats.suspended; });
    if (ui.cardsStatus === 'open') rows = rows.filter(function (r) { return cardInfo(r, every).level === 3; });
    if (ui.cardsStatus === 'bijna') rows = rows.filter(function (r) { return cardInfo(r, every).level === 2; });
    var get = { name: function (r) { return r.name; }, yellow: function (r) { return r.stats.yellow * 100 + r.stats.red; }, red: function (r) { return r.stats.red * 100 + r.stats.yellow; },
      status: function (r) { var i = cardInfo(r, every); return i.level * 100 + i.y; }, earned: function (r) { return cardInfo(r, every).earned; }, served: function (r) { return r.stats.suspended; } };
    rows = sortRows(rows, get[ui.cardsSort.key] || get.yellow, ui.cardsSort.dir);
    if (!rows.length) return html + '<div class="empty"><p>' + (ui.cardsStatus !== 'alle' ? 'Niemand met deze status.' : 'Nog geen kaarten dit seizoen.') + '</p></div>';
    var sk = ui.cardsSort;
    html += '<div class="table-wrap"><table class="t"><thead><tr>' + th('Naam', 'name', sk, 'cards', { cls: 'l sticky' }) + th('Geel', 'yellow', sk, 'cards') + th('Rood', 'red', sk, 'cards') + th('Status', 'status', sk, 'cards', { cls: 'l' }) +
      th('Verdiend', 'earned', sk, 'cards', { title: 'Verdiend: ' + every + ' gele of 1 rode kaart' }) + th('Uitgezeten', 'served', sk, 'cards', { title: 'Schorsingen waarna er al een wedstrijd gespeeld werd. Dit gaat automatisch.' }) + '</tr></thead><tbody>';
    rows.forEach(function (r) {
      var i = cardInfo(r, every), st;
      if (i.level === 3) st = '<span class="chip bad">Schorsing open</span>';
      else if (i.level === 2) st = '<span class="chip warn">Volgende gele is schorsing</span>';
      else if (i.level === 1) st = '<span class="chip">Nog ' + i.cs.left + ' geel tot schorsing</span>';
      else st = '<span class="muted">-</span>';
      html += '<tr><td class="l sticky"><a href="' + personHref(r) + '">' + esc(r.name) + '</a>' + (r.isStaff ? ' <span class="muted">staf</span>' : '') + '</td><td class="num">' + (i.y ? '<span class="card-y"></span>' + i.y : '<span class="zero">0</span>') + (r.stats.yellowB ? ' <small class="muted" title="Waarvan bij de B-ploeg">(' + r.stats.yellowB + ' B)</small>' : '') + '</td><td class="num">' + (i.rd ? '<span class="card-r"></span>' + i.rd : '<span class="zero">0</span>') + (r.stats.redB ? ' <small class="muted" title="Waarvan bij de B-ploeg">(' + r.stats.redB + ' B)</small>' : '') + '</td>' +
        '<td class="l">' + st + '</td><td class="num">' + U.dash(i.earned) + '</td><td class="num">' + U.dash(i.served) + '</td></tr>';
    });
    return html + '</tbody></table></div>';
  };

  /* ---------- Analyse ---------- */
  function hbars(items, cls) {
    var max = Math.max.apply(null, items.map(function (i) { return i[1]; }).concat([1]));
    return items.map(function (i) { return '<div class="hbar ' + (cls || '') + '"><span>' + esc(i[0]) + '</span><span class="tr"><i style="width:' + (i[1] / max * 100) + '%"></i></span><b class="num">' + i[1] + '</b></div>'; }).join('');
  }
  V.analysis = function (c) {
    var S = c.S, T = S.team;
    var html = '<div class="page-head"><div><h1>Analyse</h1><p>Teamcijfers van seizoen ' + esc(S.season.name) + '.</p></div></div>';
    if (!T.played) return html + '<div class="empty"><p>Er zijn nog geen gespeelde wedstrijden in dit seizoen.</p></div>' + seasonCompare(c);

    html += '<dl class="kv"><div><dt>Gemiddeld gescoord</dt><dd>' + U.dec(T.gf / T.played) + '</dd></div><div><dt>Gemiddeld tegen</dt><dd>' + U.dec(T.ga / T.played) + '</dd></div>' +
      '<div><dt>Punten per wedstrijd</dt><dd>' + U.dec(T.points / T.played, 2) + '</dd></div><div><dt>Clean sheets</dt><dd>' + T.cleanSheets + ' van ' + T.played + '</dd></div></dl>';

    html += '<div class="sec"><h2>Thuis en uit</h2><div class="table-wrap" style="margin-top:12px"><table class="t"><thead><tr><th class="l">Waar</th><th>Gespeeld</th><th>Winst</th><th>Gelijk</th><th>Verlies</th><th>Doelpunten</th><th>Punten</th></tr></thead><tbody>' +
      [['Thuis', T.home], ['Uit', T.away]].map(function (x) {
        var s = x[1]; return '<tr><td class="l">' + x[0] + '</td><td class="num">' + s.played + '</td><td class="num">' + s.W + '</td><td class="num">' + s.G + '</td><td class="num">' + s.V + '</td><td class="num">' + s.gf + '-' + s.ga + '</td><td class="num total">' + (s.W * 3 + s.G) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';

    /* gescoord en tegen per wedstrijd */
    var pm = T.playedMatches, bw = 28, W = pm.length * bw + 36, H = 170, base = 140, mx = Math.max.apply(null, pm.map(function (m) { return Math.max(E.num(m.score_for), E.num(m.score_against)); }).concat([3])), sc = (base - 14) / mx;
    var svg = '<svg width="' + W + '" height="' + H + '" role="img" aria-label="Doelpunten voor en tegen per wedstrijd"><line x1="30" y1="' + base + '" x2="' + W + '" y2="' + base + '" stroke="#2f4536"/>';
    for (var gy = 0; gy <= mx; gy += (mx > 6 ? 2 : 1)) svg += '<text x="22" y="' + (base - gy * sc + 4) + '" text-anchor="end">' + gy + '</text><line x1="30" x2="' + W + '" y1="' + (base - gy * sc) + '" y2="' + (base - gy * sc) + '" stroke="#1a2a1f"/>';
    pm.forEach(function (m, i) {
      var x = 36 + i * bw, a = E.num(m.score_for), b = E.num(m.score_against);
      svg += '<g><title>' + esc(U.matchTitle(m) + ' ' + U.score(m)) + '</title><a href="#/wedstrijd/' + esc(m.id) + '"><rect x="' + x + '" y="' + (base - a * sc) + '" width="10" height="' + a * sc + '" fill="#1fb457" rx="2"/>' +
        '<rect x="' + (x + 11) + '" y="' + (base - b * sc) + '" width="10" height="' + b * sc + '" fill="#ff7f5c" rx="2"/><text x="' + (x + 10) + '" y="' + (base + 15) + '" text-anchor="middle">' + esc(m.opponent.replace(/[^A-Za-zÀ-ÿ]/g, '').slice(0, 3)) + '</text></a></g>';
    });
    svg += '</svg>';
    html += '<div class="sec"><h2>Doelpunten per wedstrijd</h2><div class="legend" style="margin:8px 0"><span style="--c:#1fb457">Gescoord</span><span style="--c:#ff7f5c">Tegen</span></div><div class="chart">' + svg + '</div></div>';

    var gt = T.goalTypes, tot = gt.g_play + gt.g_corner + gt.g_free + gt.g_pen;
    if (isBasic(c)) return html + '<p class="muted" style="margin-top:18px">Voor dit seizoen werden geen soorten doelpunten of stilstaande fases bijgehouden.</p>' + seasonCompare(c);
    html += '<div class="sec"><div class="cols c2"><div><h2>Zo scoren we</h2>' + (tot ? hbars([['Uit het spel', gt.g_play], ['Na een corner', gt.g_corner], ['Vrije trap', gt.g_free], ['Strafschop', gt.g_pen]]) : '<p class="muted">Nog niet ingevuld.</p>') + '</div>' +
      '<div><h2>Zo krijgen we ze tegen</h2>' + (T.ga ? hbars([['Na een corner', T.gaTypes.corner], ['Vrije trap', T.gaTypes.free], ['Strafschop', T.gaTypes.pen], ['Eigen fout', T.gaTypes.error], ['Kwaliteit tegenstander', T.gaTypes.quality]], 'bad') : '<p class="muted">Geen tegendoelpunten.</p>') + '</div></div></div>';

    var sp = T.sp;
    if (sp.corners || sp.oppCorners || sp.free || sp.oppFree) {
      html += '<div class="sec"><h2>Stilstaande fases</h2><div class="pair muted"><span class="a">KFC Marke</span><span class="c"></span><span>Tegenstanders</span></div>' +
        [['Hoekschoppen', sp.corners, sp.oppCorners], ['Vrije trappen', sp.free, sp.oppFree], ['Strafschoppen', sp.pens, sp.oppPens]].map(function (k) { return '<div class="pair"><b class="a num">' + k[1] + '</b><span class="c">' + k[0] + '</span><b class="num">' + k[2] + '</b></div>'; }).join('') + '</div>';
    }
    return html + seasonCompare(c);
  };
  function seasonCompare(c) {
    var seasons = c.data.seasons.slice().sort(function (a, b) { return b.start_year - a.start_year; });
    if (seasons.length < 2) return '';
    return '<div class="sec"><h2>Seizoenen vergelijken</h2>' + compareControl(c) + '<div class="table-wrap" style="margin-top:12px"><table class="t"><thead><tr><th class="l sticky">Seizoen</th><th>Gespeeld</th><th>W-G-V</th><th>Punten</th><th>Doelpunten</th><th>Gem. gescoord</th><th>Gem. tegen</th><th>Clean sheets</th></tr></thead><tbody>' + seasons.map(function (s) {
      var T = c.compute(s.id, cmpLimit(c)).team;
      return '<tr><td class="l sticky">' + esc(s.name) + '</td><td class="num">' + T.played + '</td><td class="num">' + T.W + '-' + T.G + '-' + T.V + '</td><td class="num total">' + T.points + '</td><td class="num">' + T.gf + '-' + T.ga + '</td><td class="num">' + (T.played ? U.dec(T.gf / T.played) : '') + '</td><td class="num">' + (T.played ? U.dec(T.ga / T.played) : '') + '</td><td class="num">' + T.cleanSheets + '</td></tr>';
    }).join('') + '</tbody></table></div>' + (cmpLimit(c) ? '' : '<p class="muted" style="margin-top:8px">Seizoenen zijn niet altijd even ver. Kies hierboven "Even veel wedstrijden" om eerlijk te vergelijken.</p>') + '</div>';
  }

  /* ---------- Meer (mobiel) ---------- */
  V.more = function (c) {
    var items = [['#/fantasy', 'star', 'Fantasy', 'Klassement met fantasypunten'], ['#/analyse', 'chart', 'Analyse', 'Teamcijfers en seizoenen vergelijken']];
    items.push(c.canEdit ? ['#/beheer', 'gear', 'Beheer', 'Gegevens invoeren en aanpassen'] : ['#/login', 'gear', 'Inloggen', 'Enkel voor de beheerder']);
    return '<div class="page-head"><h1>Meer</h1></div><div class="menu-grid">' + items.map(function (i) { return '<a href="' + i[0] + '">' + U.icon(i[1]) + '<div><b>' + i[2] + '</b><span>' + i[3] + '</span></div></a>'; }).join('') + '</div>';
  };

  /* ---------- Inloggen ---------- */
  V.login = function (c) {
    if (c.mode === 'local') return '<div class="login"><div class="panel"><h2>Lokale versie</h2><p class="muted" style="margin-top:8px">Hier hoef je niet in te loggen. Gegevens die je invoert blijven in deze browser staan. Maak regelmatig een back-up.</p><a class="btn primary" href="#/beheer">Naar beheer</a></div></div>';
    if (c.canEdit) return '<div class="login"><div class="panel"><h2>Je bent ingelogd</h2><p class="muted" style="margin-top:8px">' + esc(c.user && c.user.email || '') + '</p><div class="btn-row"><a class="btn primary" href="#/beheer">Naar beheer</a><button class="btn" data-act="logout">Uitloggen</button></div></div></div>';
    return '<div class="login"><form class="panel" id="login-form" autocomplete="on"><h2>Inloggen</h2><p class="muted" style="margin:8px 0 14px">Enkel de beheerder kan gegevens wijzigen. Iedereen kan de statistieken bekijken zonder in te loggen.</p>' +
      '<label class="fld">E-mailadres<input type="email" name="email" autocomplete="username" required></label><label class="fld" style="margin-top:12px">Wachtwoord<input type="password" name="password" autocomplete="current-password" required></label>' +
      '<p class="err-text" id="login-err" role="alert"></p><button class="btn primary" type="submit" style="width:100%">Inloggen</button></form></div>';
  };

  V.notFound = function () { return '<div class="empty"><p>Deze pagina bestaat niet.</p><a class="btn" href="#/">Naar het overzicht</a></div>'; };
})(window);
