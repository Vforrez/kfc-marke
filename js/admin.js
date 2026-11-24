/* KFC Marke statistieken: beheer (enkel voor wie mag wijzigen). */
(function (root) {
  'use strict';
  var KFC = root.KFC = root.KFC || {};
  var E = KFC.engine, U = KFC.util, esc = U.esc, Store = KFC.Store;
  var A = KFC.admin = {};

  function slug(s) { return String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function go(h) { location.hash = h; }
  function intOrNull(v) { v = String(v == null ? '' : v).trim(); if (v === '') return null; var n = parseInt(v, 10); return isNaN(n) ? null : n; }
  function numOrNull(v) { v = String(v == null ? '' : v).trim().replace(',', '.'); if (v === '') return null; var n = parseFloat(v); return isNaN(n) ? null : n; }
  function q(root, sel) { return root.querySelector(sel); }
  function qa(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
  function quiet(fn) { return KFC.app.quiet(fn); }
  async function guard(fn) {
    try { await quiet(fn); } catch (e) { console.error(e); U.toast(e.message || 'Er ging iets mis.', 'err'); }
  }
  function crumbs(parts) {
    return '<div class="crumbs"><a href="#/beheer">Beheer</a>' + parts.map(function (p) { return ' / ' + (p[1] ? '<a href="' + p[1] + '">' + esc(p[0]) + '</a>' : '<span class="muted">' + esc(p[0]) + '</span>'); }).join('') + '</div>';
  }
  function locked() {
    return { html: '<div class="empty"><p>Je moet ingelogd zijn om te kunnen wijzigen.</p><a class="btn primary" href="#/login">Inloggen</a></div>' };
  }

  /* ================= Back-up herinnering ================= */
  var BK_KEY = 'kfc.lastBackup', BK_DAYS = 30;
  function lastBackup() { try { var v = localStorage.getItem(BK_KEY); return v ? new Date(v) : null; } catch (e) { return null; } }
  function markBackup() { try { localStorage.setItem(BK_KEY, new Date().toISOString()); } catch (e) {} }
  function backupAge() {
    var d = lastBackup(); if (!d || isNaN(d)) return null;
    return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
  }
  function ageText(days) {
    if (days === null) return 'nog geen back-up gemaakt op dit toestel';
    if (days === 0) return 'vandaag';
    if (days === 1) return 'gisteren';
    if (days < 14) return days + ' dagen geleden';
    return Math.round(days / 7) + ' weken geleden';
  }
  function backupBanner(noLink) {
    var days = backupAge(), late = days === null || days >= BK_DAYS;
    return '<div class="banner' + (late ? '' : ' ok') + '">Laatste back-up: <b>' + ageText(days) + '</b>. ' +
      (late ? 'Het is tijd voor een nieuwe. ' : '') + (noLink ? '' : '<a href="#/beheer/backup">' + (late ? 'Nu back-up maken' : 'Naar back-up') + '</a>') + '</div>';
  }

  /* ================= Menu ================= */
  function menu(c) {
    var S = c.S, missing = S.team.playedMatches.filter(function (m) { return !S.hasLines[m.id]; }).length;
    var items = [
      ['#/beheer/wedstrijden', 'cal', 'Wedstrijden', missing ? missing + ' gespeeld zonder spelersgegevens' : 'Uitslagen en spelersgegevens invoeren'],
      ['#/beheer/spelers', 'users', 'Selectie', 'Rugnummers, posities en spelers toevoegen'],
      ['#/beheer/rbfa', 'cal', 'RBFA-knop', 'Wedstrijden uit RBFA overnemen'],
      ['#/beheer/regels', 'star', 'Puntentelling', 'Fantasyregels van dit seizoen'],
      ['#/beheer/seizoen', 'plus', 'Seizoen', 'Nieuw seizoen starten of dit seizoen aanpassen'],
      ['#/beheer/backup', 'chart', 'Back-up', 'Bewaren, terugzetten en online zetten']
    ];
    var info = Store.mode === 'local'
      ? '<div class="banner">Je werkt in de lokale versie. Wat je invoert blijft in deze browser staan. Maak daarom af en toe een <a href="#/beheer/backup">back-up</a>.</div>'
      : '<div class="banner ok">Ingelogd als ' + esc(Store.user && Store.user.email || '') + '. Wijzigingen zijn meteen voor iedereen zichtbaar.</div>' + backupBanner();
    return { html: '<div class="page-head"><div><h1>Beheer</h1><p>Seizoen ' + esc(S.season.name) + '.</p></div></div>' + info +
      '<div class="menu-grid">' + items.map(function (i) { return '<a href="' + i[0] + '">' + U.icon(i[1]) + '<div><b>' + i[2] + '</b><span>' + esc(i[3]) + '</span></div></a>'; }).join('') + '</div>' };
  }

  /* ================= Selectie ================= */
  function rosterPage(c) {
    var S = c.S;
    var rows = S.players.slice().sort(function (a, b) { return (parseInt(a.roster.number, 10) || 999) - (parseInt(b.roster.number, 10) || 999) || a.name.localeCompare(b.name, 'nl'); });
    function rowHtml(r) {
      var st = r.isStaff, p = r.person;
      return '<div class="ed-row' + (r.roster.adjust ? ' has-adj' : '') + '" data-rid="' + esc(r.roster.id) + '">' +
        '<input class="nrin" data-f="number" value="' + esc(r.roster.number || '') + '" placeholder="Nr" maxlength="3" aria-label="Rugnummer van ' + esc(r.name) + '" inputmode="' + (st ? 'text' : 'numeric') + '">' +
        '<div class="namecell"><input data-f="first_name" value="' + esc(p.first_name) + '" aria-label="Voornaam" placeholder="Voornaam"><input data-f="last_name" value="' + esc(p.last_name) + '" aria-label="Achternaam" placeholder="Achternaam"></div>' +
        '<div class="f"><label><span class="lbl">' + (st ? 'Functie' : 'Positie') + '</span><select data-f="position" aria-label="' + (st ? 'Functie' : 'Positie') + ' van ' + esc(r.name) + '">' +
        (st ? '' : '<option value="">Kies positie</option>') + (st ? E.STAFF_ROLES : E.POSITIONS).map(function (o) { return '<option value="' + o + '"' + (r.roster.position === o ? ' selected' : '') + '>' + esc(st ? E.STAFF_LABEL[o] : E.POS_LABEL[o]) + '</option>'; }).join('') + '</select></label>' +
        (st ? '<span></span><span></span>' : '<label class="adj"><span class="lbl">Correctie (punten)</span><input data-f="adjust" type="number" step="1" value="' + (r.roster.adjust || '') + '" placeholder="0" aria-label="Handmatige correctie voor ' + esc(r.name) + '"></label>' +
          '<label class="span2 adj"><span class="lbl">Reden van correctie</span><input data-f="adjust_note" value="' + esc(r.roster.adjust_note || '') + '" placeholder="Reden" aria-label="Reden van correctie"></label>') +
        '<button type="button" class="btn ghost small" data-act="remove-roster" aria-label="' + esc(r.name) + ' uit dit seizoen halen" title="Uit dit seizoen halen">' + U.icon('trash') + '</button></div></div>';
    }
    var inSeason = {}; S.players.concat(S.staff).forEach(function (r) { inSeason[r.person.id] = true; });
    var others = c.data.people.filter(function (p) { return !inSeason[p.id]; }).sort(function (a, b) { return E.fullName(a).localeCompare(E.fullName(b), 'nl'); });
    var html = crumbs([['Selectie']]) + '<div class="page-head"><div><h1>Selectie ' + esc(S.season.name) + '</h1><p>Vul het rugnummer in en kies de positie. Elke wijziging wordt meteen bewaard. De positie bepaalt hoeveel een doelpunt waard is in de fantasy.</p></div></div>' +
      '<div class="panel"><h3>Spelers <span class="muted" style="font:400 1rem var(--f-body)">' + rows.length + '</span></h3><div class="ed-head" aria-hidden="true"><span>Nr</span><span>Naam</span><span>Positie</span><span>Correctie</span><span>Reden</span><span></span></div>' + (rows.map(rowHtml).join('') || '<p class="muted">Nog geen spelers.</p>') + '</div>' +
      '<div class="panel"><h3>Staf <span class="muted" style="font:400 1rem var(--f-body)">' + S.staff.length + '</span></h3>' + (S.staff.map(rowHtml).join('') || '<p class="muted">Nog geen staf.</p>') + '</div>' +
      '<div class="panel"><h3>Toevoegen</h3><form id="add-form" class="form-grid">' +
      '<label class="fld">Voornaam<input name="first" required></label><label class="fld">Achternaam<input name="last" required></label>' +
      '<label class="fld">Nummer<input name="number" maxlength="3" inputmode="numeric"></label>' +
      '<label class="fld">Positie of functie<select name="position"><option value="">Kies positie</option>' + E.POSITIONS.map(function (p) { return '<option value="' + p + '">' + E.POS_LABEL[p] + '</option>'; }).join('') + '<optgroup label="Staf">' + E.STAFF_ROLES.map(function (p) { return '<option value="' + p + '">' + E.STAFF_LABEL[p] + '</option>'; }).join('') + '</optgroup></select></label>' +
      '<div style="align-self:end"><button class="btn primary" type="submit">' + U.icon('plus') + ' Toevoegen</button></div></form>' +
      (others.length ? '<hr style="border:0;border-top:1px solid var(--line);margin:18px 0"><form id="reuse-form" class="form-grid"><label class="fld" style="grid-column:span 2">Terug uit een ander seizoen<select name="person"><option value="">Kies een speler</option>' + others.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(E.fullName(p)) + '</option>'; }).join('') + '</select></label><div style="align-self:end"><button class="btn" type="submit">Toevoegen aan dit seizoen</button></div></form>' : '') + '</div>';

    function bind(el) {
      el.addEventListener('change', function (e) {
        var inp = e.target.closest('[data-f]'); if (!inp) return;
        var rowEl = inp.closest('.ed-row'); var rid = rowEl.getAttribute('data-rid');
        var ros = Store.by('roster', rid); if (!ros) return;
        var f = inp.getAttribute('data-f'), v = inp.value.trim();
        guard(async function () {
          if (f === 'first_name' || f === 'last_name') {
            var p = Store.by('people', ros.person_id), np = Object.assign({}, p); np[f] = v;
            if (!np.first_name) { inp.value = p[f]; throw new Error('De naam mag niet leeg zijn.'); }
            await Store.upsert('people', [np]);
          } else {
            var nr = Object.assign({}, ros);
            if (f === 'adjust') nr.adjust = intOrNull(v) || 0;
            else if (f === 'number') { nr.number = v; }
            else nr[f] = v || null;
            if (f === 'number' && v) {
              var dup = c.data.roster.filter(function (x) { return x.season_id === ros.season_id && x.id !== rid && x.number === v && x.role === ros.role; })[0];
              if (dup) { var dp = Store.by('people', dup.person_id); U.toast('Let op: nummer ' + v + ' heeft ook ' + E.fullName(dp) + '.', 'err'); }
            }
            await Store.upsert('roster', [nr]);
          }
          U.toast('Opgeslagen');
        });
      });
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act="remove-roster"]'); if (!b) return;
        var rid = b.closest('.ed-row').getAttribute('data-rid'), ros = Store.by('roster', rid), p = Store.by('people', ros.person_id);
        U.confirm({ title: E.fullName(p) + ' uit ' + S.season.name + ' halen?', text: 'Alle wedstrijdgegevens van deze persoon in dit seizoen worden verwijderd. In andere seizoenen verandert niets.', ok: 'Verwijderen', danger: true }).then(function (ok) {
          if (!ok) return;
          guard(async function () { await Store.remove('roster', [rid]); U.toast('Verwijderd'); KFC.app.render(); });
        });
      });
      q(el, '#add-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var fd = new FormData(e.target), first = fd.get('first').trim(), last = fd.get('last').trim(), pos = fd.get('position'), nr = String(fd.get('number') || '').trim();
        var isStaff = E.STAFF_ROLES.indexOf(pos) >= 0;
        guard(async function () {
          var name = (first + ' ' + last).trim(), pid = 'p-' + slug(name), existing = Store.by('people', pid);
          if (!existing) await Store.upsert('people', [{ id: pid, first_name: first, last_name: last }]);
          if (c.data.roster.some(function (r) { return r.season_id === S.season.id && r.person_id === pid; })) throw new Error(name + ' zit al in deze selectie.');
          var rid = 'r' + S.season.start_year + '-' + slug(name); if (Store.by('roster', rid)) rid += '-' + Math.random().toString(36).slice(2, 5);
          await Store.upsert('roster', [{ id: rid, season_id: S.season.id, person_id: pid, role: isStaff ? 'staf' : 'speler', number: nr, position: pos || null, adjust: 0 }]);
          U.toast(existing ? name + ' toegevoegd (bestond al in een ander seizoen)' : name + ' toegevoegd'); KFC.app.render();
        });
      });
      var rf = q(el, '#reuse-form');
      if (rf) rf.addEventListener('submit', function (e) {
        e.preventDefault(); var pid = new FormData(e.target).get('person'); if (!pid) return;
        guard(async function () {
          var p = Store.by('people', pid), prev = c.data.roster.filter(function (r) { return r.person_id === pid; }).map(function (r) { return { r: r, s: Store.by('seasons', r.season_id) }; }).sort(function (a, b) { return b.s.start_year - a.s.start_year; })[0];
          var name = E.fullName(p), rid = 'r' + S.season.start_year + '-' + slug(name); if (Store.by('roster', rid)) rid += '-' + Math.random().toString(36).slice(2, 5);
          await Store.upsert('roster', [{ id: rid, season_id: S.season.id, person_id: pid, role: prev ? prev.r.role : 'speler', number: '', position: prev ? prev.r.position : null, adjust: 0 }]);
          U.toast(name + ' toegevoegd'); KFC.app.render();
        });
      });
    }
    return { html: html, bind: bind };
  }

  /* ================= Wedstrijdenlijst ================= */
  function matchesPage(c) {
    var S = c.S;
    var html = crumbs([['Wedstrijden']]) + '<div class="page-head"><div><h1>Wedstrijden invoeren</h1><p>Seizoen ' + esc(S.season.name) + '. Kies een wedstrijd om de uitslag en de spelersgegevens in te vullen.</p></div><a class="btn primary" href="#/beheer/wedstrijd/nieuw">' + U.icon('plus') + ' Nieuwe wedstrijd</a></div>';
    html += KFC.quickui.listPanelHtml();
    function bindList(el) { KFC.quickui.bindList(el, c); }
    if (!S.allMatches.length) return { html: html + '<div class="empty"><p>Dit seizoen heeft nog geen wedstrijden.</p></div>', bind: bindList };
    html += '<ul class="match-list">' + S.allMatches.map(function (m) {
      var done = E.result(m) != null, has = S.hasLines[m.id] || (S.linesByMatch[m.id] || []).length > 0;
      return '<li><a class="row" href="#/beheer/wedstrijd/' + esc(m.id) + '"><div class="d">' + esc(U.dateShort(m.date)) + '<br>' + esc(m.kickoff || '') + '</div><div>' + U.resultChip(m) + '</div>' +
        '<div class="opp">' + esc(m.opponent) + '<small>' + (m.home ? 'Thuis' : 'Uit') + '</small>' + (m.competition !== 'competitie' ? '<small>' + esc(E.COMPETITIONS[m.competition]) + '</small>' : '') + '</div>' +
        '<div class="sc' + (done ? '' : ' up') + '">' + (done ? esc(U.score(m)) : '') + (done && !has ? ' <span class="chip warn">Spelers invullen</span>' : (has ? ' <span class="chip good">Ingevuld</span>' : '')) + '</div></a></li>';
    }).join('') + '</ul>';
    return { html: html, bind: bindList };
  }

  /* ================= Wedstrijdformulier ================= */
  var LINE_FIELDS = ['minutes', 'g_play', 'assists', 'yellow', 'red', 'motm', 'g_corner', 'g_free', 'g_pen', 'own_goals', 'pen_missed', 'pen_saved', 'suspended'];

  function matchForm(c, id) {
    var S = c.S, isNew = id === 'nieuw';
    var m = isNew ? { date: U.today(), kickoff: '15:00', opponent: '', home: true, competition: 'competitie', score_for: null, score_against: null } : S.matchById[id];
    if (!m) return { html: '<div class="empty"><p>Deze wedstrijd bestaat niet.</p><a class="btn" href="#/beheer/wedstrijden">Terug</a></div>' };
    var lineOf = {}; (isNew ? [] : (S.linesByMatch[m.id] || [])).forEach(function (l) { lineOf[l.roster_id] = l; });
    var players = S.players.slice().sort(function (a, b) { return (parseInt(a.roster.number, 10) || 999) - (parseInt(b.roster.number, 10) || 999) || a.name.localeCompare(b.name, 'nl'); });
    function val(v) { return v == null || v === 0 ? '' : v; }
    function inp(f, v, extra) { return '<input type="number" inputmode="numeric" min="0" data-f="' + f + '" value="' + esc(v) + '" ' + (extra || '') + '>'; }

    function playerRow(r) {
      var l = lineOf[r.roster.id] || {}, on = l.minutes != null;
      var pos = r.roster.position;
      return '<div class="mrow' + (on ? '' : ' off') + ' hide-more" data-rid="' + esc(r.roster.id) + '" data-on="' + (on ? 1 : 0) + '">' +
        '<div class="mhead"><button type="button" class="pickname" data-act="toggle-squad" aria-pressed="' + on + '" aria-label="' + esc(r.name) + ' in selectie"><span class="nr">' + esc(r.roster.number || '-') + '</span><span class="nmx">' + esc(r.name) + '</span>' + U.posBadge(pos) + '</button>' +
        '<button type="button" class="btn small ghost" data-act="min90" title="90 minuten gespeeld">90</button><span class="live" aria-label="Fantasypunten"></span></div>' +
        '<div class="mfields">' +
        '<label>Min.' + inp('minutes', l.minutes == null ? '' : l.minutes, 'max="130" placeholder="0"') + '</label>' +
        '<label>Goals' + inp('g_play', val(l.g_play)) + '</label><label>Assists' + inp('assists', val(l.assists)) + '</label>' +
        '<label>Geel' + inp('yellow', val(l.yellow), 'max="2"') + '</label><label>Rood' + inp('red', val(l.red), 'max="1"') + '</label>' +
        '<label>Man v/d match<select data-f="motm"><option value="">-</option>' + [1, 2, 3].map(function (k) { return '<option value="' + k + '"' + (l.motm === k ? ' selected' : '') + '>' + k + 'e</option>'; }).join('') + '</select></label>' +
        '<button type="button" class="moretoggle" data-act="more">Meer</button></div>' +
        '<div class="mmore"><label>Goal na corner' + inp('g_corner', val(l.g_corner)) + '</label><label>Goal vrije trap' + inp('g_free', val(l.g_free)) + '</label><label>Goal strafschop' + inp('g_pen', val(l.g_pen)) + '</label>' +
        '<label>Eigen doelp.' + inp('own_goals', val(l.own_goals)) + '</label><label>Gemiste pen.' + inp('pen_missed', val(l.pen_missed)) + '</label><label>Gestopte pen.' + inp('pen_saved', val(l.pen_saved)) + '</label>' +
        '<label class="check"><input type="checkbox" data-f="suspended"' + (l.suspended ? ' checked' : '') + '> Geschorst</label></div></div>';
    }
    function staffRow(r) {
      var l = lineOf[r.roster.id] || {};
      return '<div class="mrow staffrow" data-rid="' + esc(r.roster.id) + '" data-on="1"><div class="mhead"><span class="pickname" style="cursor:default"><span class="nr">' + esc(r.roster.number || '') + '</span><span class="nmx">' + esc(r.name) + '</span></span></div>' +
        '<div class="mfields" style="grid-template-columns:repeat(3,1fr)"><label>Geel' + inp('yellow', val(l.yellow), 'max="2"') + '</label><label>Rood' + inp('red', val(l.red), 'max="1"') + '</label>' +
        '<label class="check" style="margin-top:14px"><input type="checkbox" data-f="suspended"' + (l.suspended ? ' checked' : '') + '> Geschorst</label></div></div>';
    }
    function mf(f, label, v, extra) { return '<label class="fld">' + label + '<input type="number" inputmode="numeric" min="0" name="' + f + '" value="' + esc(v == null ? '' : v) + '" ' + (extra || '') + '></label>'; }

    var html = crumbs([['Wedstrijden', '#/beheer/wedstrijden'], [isNew ? 'Nieuwe wedstrijd' : m.opponent]]) +
      '<div class="page-head"><div><h1>' + (isNew ? 'Nieuwe wedstrijd' : esc(U.matchTitle(m))) + '</h1><p>Seizoen ' + esc(S.season.name) + '. Tik op een speler om hem in de selectie te zetten en vul de minuten in.</p></div>' +
      (isNew ? '' : '<a class="btn ghost" href="#/wedstrijd/' + esc(m.id) + '">Wedstrijd bekijken</a>') + '</div>' +
      '<form id="match-form" class="mform" autocomplete="off"><div class="panel"><h3>Wedstrijd</h3><div class="top-fields">' +
      '<label class="fld">Datum<input type="date" name="date" value="' + esc(m.date || '') + '" required></label><label class="fld">Aftrap<input type="time" name="kickoff" value="' + esc(m.kickoff || '') + '"></label>' +
      '<label class="fld">Tegenstander<input name="opponent" value="' + esc(m.opponent || '') + '" required></label>' +
      '<label class="fld">Thuis of uit<select name="home"><option value="1"' + (m.home ? ' selected' : '') + '>Thuis</option><option value="0"' + (m.home ? '' : ' selected') + '>Uit</option></select></label>' +
      '<label class="fld">Competitie<select name="competition">' + Object.keys(E.COMPETITIONS).map(function (k) { return '<option value="' + k + '"' + (m.competition === k ? ' selected' : '') + '>' + E.COMPETITIONS[k] + '</option>'; }).join('') + '</select></label>' +
      mf('score_for', 'Doelpunten KFC Marke', m.score_for) + mf('score_against', 'Doelpunten tegenstander', m.score_against) + '</div>' +
      '<p class="legend-note" id="comp-note" style="margin:10px 0 0" hidden>Beker en oefenwedstrijden tellen standaard niet mee in de statistieken. Je kan dat aanpassen bij Puntentelling.</p></div>' +
      KFC.quickui.panelHtml() +
      '<div class="checkline" id="checks" role="status" aria-live="polite"></div>' +
      '<div class="panel"><h3>Spelers</h3><div class="mhead-cols" aria-hidden="true"><span>Speler</span><span>Min.</span><span>Goals</span><span>Assists</span><span>Geel</span><span>Rood</span><span>MvdM</span><span>Corner</span><span>Vrije trap</span><span>Pen.</span><span>Eigen</span><span>Gemist</span><span>Gestopt</span><span>Geschorst</span></div>' +
      (players.length ? players.map(playerRow).join('') : '<p class="muted">Er zijn nog geen spelers in dit seizoen. <a href="#/beheer/spelers">Spelers toevoegen</a></p>') + '</div>' +
      (S.staff.length ? '<details class="panel"' + (S.staff.some(function (r) { return lineOf[r.roster.id]; }) ? ' open' : '') + '><summary style="cursor:pointer;font-weight:600">Staf (kaarten en schorsingen)</summary><div style="margin-top:10px">' + S.staff.map(staffRow).join('') + '</div></details>' : '') +
      '<details class="panel"><summary style="cursor:pointer;font-weight:600">Teamcijfers (hoekschoppen, vrije trappen, tegendoelpunten)</summary><div style="margin-top:12px"><p class="muted">Hoe viel ons doelpunt of hoe kregen we er een tegen? Dit gebruiken we voor de analyse.</p>' +
      '<h3 style="margin:10px 0">Tegendoelpunten volgens oorzaak</h3><div class="form-grid">' + mf('ga_corner', 'Na een corner', m.ga_corner) + mf('ga_free', 'Na een vrije trap', m.ga_free) + mf('ga_pen', 'Strafschop', m.ga_pen) + mf('ga_error', 'Eigen fout', m.ga_error) + mf('ga_quality', 'Kwaliteit tegenstander', m.ga_quality) + '</div>' +
      '<h3 style="margin:16px 0 10px">Stilstaande fases</h3><div class="form-grid">' + mf('sp_corners', 'Hoekschoppen KFC Marke', m.sp_corners) + mf('sp_free', 'Vrije trappen KFC Marke', m.sp_free) + mf('sp_pens', 'Strafschoppen KFC Marke', m.sp_pens) +
      mf('opp_corners', 'Hoekschoppen tegenstander', m.opp_corners) + mf('opp_free', 'Vrije trappen tegenstander', m.opp_free) + mf('opp_pens', 'Strafschoppen tegenstander', m.opp_pens) + '</div></div></details>' +
      '<div class="panel"><label class="fld">Notities<textarea name="note" rows="3">' + esc(m.note || '') + '</textarea></label></div>' +
      '<div class="sticky-save"><span class="muted" id="save-hint">Nog niet bewaard</span><div class="btn-row">' + '<button class="btn primary" type="submit">' + U.icon('check') + ' Opslaan</button></div></div>' +
      (isNew ? '' : '<div class="danger-zone"><button type="button" class="btn ghost" data-act="delete-match" style="color:var(--coral)">' + U.icon('trash') + ' Wedstrijd verwijderen</button></div>') + '</form>';

    function bind(el) {
      var form = q(el, '#match-form'), rules = S.rules;
      function num(row, f) { var i = q(row, '[data-f="' + f + '"]'); return i ? intOrNull(i.value) : null; }
      function rowData(row) {
        var d = {}; LINE_FIELDS.forEach(function (f) { var i = q(row, '[data-f="' + f + '"]'); if (!i) return; d[f] = i.type === 'checkbox' ? (i.checked ? 1 : 0) : intOrNull(i.value); });
        return d;
      }
      function isOn(row) { return row.getAttribute('data-on') === '1'; }
      function setOn(row, on) {
        row.setAttribute('data-on', on ? 1 : 0); row.classList.toggle('off', !on);
        var b = q(row, '[data-act="toggle-squad"]'); if (b) b.setAttribute('aria-pressed', on);
      }
      function tempMatch() {
        var f = form.elements;
        return { score_for: intOrNull(f.score_for.value), score_against: intOrNull(f.score_against.value), competition: f.competition.value };
      }
      function recalc() {
        var tm = tempMatch(), goals = 0, assists = 0, sel = 0, playedN = 0, motm = {}, problems = [], noPos = [];
        qa(form, '.mrow:not(.staffrow)').forEach(function (row) {
          var live = q(row, '.live'), d = rowData(row), rid = row.getAttribute('data-rid');
          if (!isOn(row)) { live.textContent = ''; return; }
          sel++; if ((d.minutes || 0) > 0) playedN++;
          var g = (d.g_play || 0) + (d.g_corner || 0) + (d.g_free || 0) + (d.g_pen || 0); goals += g; assists += d.assists || 0;
          if (d.motm) { (motm[d.motm] = motm[d.motm] || []).push(rid); }
          var ros = Store.by('roster', rid), person = Store.by('people', ros.person_id);
          if (!ros.position) noPos.push(E.fullName(person));
          var line = { minutes: d.minutes == null ? 0 : d.minutes, g_play: d.g_play, g_corner: d.g_corner, g_free: d.g_free, g_pen: d.g_pen, assists: d.assists, yellow: d.yellow, red: d.red, motm: d.motm, own_goals: d.own_goals, pen_missed: d.pen_missed, pen_saved: d.pen_saved };
          var p = E.linePoints(line, tm, ros.position, rules);
          live.textContent = (p.total > 0 ? '+' : '') + p.total;
          live.title = 'Minuten ' + p.minutes + ', goals ' + p.goals + ', assists ' + p.assists + ', clean sheet ' + p.cleanSheet + ', tegendoelpunten ' + p.goalsAgainst + ', kaarten ' + (p.yellow + p.red) + ', man van de match ' + p.motm + ', bijzonder ' + p.specials;
        });
        var out = [];
        out.push('<span>' + sel + ' in selectie, ' + playedN + ' speelden</span>');
        if (tm.score_for != null) out.push(goals === tm.score_for ? '<span class="ok">Doelpunten kloppen (' + goals + ')</span>' : '<span class="warn">Spelers scoorden ' + goals + ', uitslag zegt ' + tm.score_for + ' (eigen doelpunten van de tegenstander?)</span>');
        else if (goals) out.push('<span class="warn">Spelers scoorden ' + goals + '. Vul de uitslag in.</span>');
        if (tm.score_for != null && assists > tm.score_for) out.push('<span class="warn">Meer assists (' + assists + ') dan doelpunten</span>');
        Object.keys(motm).forEach(function (k) { if (motm[k].length > 1) out.push('<span class="warn">Man van de match ' + k + 'e is twee keer gekozen</span>'); });
        if (noPos.length) out.push('<span class="warn">Positie ontbreekt: ' + esc(noPos.join(', ')) + ' (<a href="#/beheer/spelers">kiezen</a>)</span>');
        var gaSum = ['ga_corner', 'ga_free', 'ga_pen', 'ga_error', 'ga_quality'].reduce(function (a, k) { return a + (intOrNull(form.elements[k].value) || 0); }, 0);
        if (gaSum && tm.score_against != null && gaSum !== tm.score_against) out.push('<span class="warn">Tegendoelpunten per oorzaak (' + gaSum + ') komen niet overeen met de uitslag (' + tm.score_against + ')</span>');
        q(el, '#checks').innerHTML = out.join('');
        q(el, '#comp-note').hidden = form.elements.competition.value === 'competitie';
      }
      recalc();
      var dirty = false;
      function touch() { dirty = true; q(el, '#save-hint').textContent = 'Wijzigingen nog niet bewaard'; }

      var qplayers = KFC.quickui.playersFor(S), qnames = {};
      qplayers.forEach(function (p) { qnames[p.rid] = p.first + ' ' + p.last; });
      KFC.quickui.attach(el, form, { players: qplayers, nameOf: function (rid) { return qnames[rid] || rid; }, touch: touch, recalc: recalc, setOn: setOn, isOn: isOn, guard: guard, isNew: isNew });

      form.addEventListener('input', function (e) {
        if (e.target.closest('#quick')) return;
        var row = e.target.closest('.mrow');
        if (row && !isOn(row) && e.target.matches('[data-f]')) setOn(row, true);
        touch(); recalc();
      });
      form.addEventListener('change', function (e) { if (e.target.closest('#quick')) return; touch(); recalc(); });
      form.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]'); if (!b) return;
        var row = b.closest('.mrow'), act = b.getAttribute('data-act');
        if (act === 'toggle-squad') { setOn(row, !isOn(row)); if (isOn(row)) { var mi = q(row, '[data-f="minutes"]'); if (mi && mi.value === '') mi.focus(); } touch(); recalc(); }
        if (act === 'min90') { setOn(row, true); q(row, '[data-f="minutes"]').value = 90; touch(); recalc(); }
        if (act === 'more') { row.classList.toggle('hide-more'); b.textContent = row.classList.contains('hide-more') ? 'Meer' : 'Minder'; }
        if (act === 'delete-match') {
          U.confirm({ title: 'Wedstrijd tegen ' + m.opponent + ' verwijderen?', text: 'Ook alle spelersgegevens van deze wedstrijd verdwijnen. Dit kan niet ongedaan gemaakt worden.', ok: 'Verwijderen', danger: true }).then(function (ok) {
            if (!ok) return; dirty = false;
            guard(async function () { await Store.remove('matches', [m.id]); U.toast('Wedstrijd verwijderd'); go('#/beheer/wedstrijden'); });
          });
        }
      });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var f = form.elements;
        var match = {
          id: isNew ? 'm' + S.season.start_year + '-' + Math.random().toString(36).slice(2, 7) : m.id, season_id: S.season.id,
          date: f.date.value, kickoff: f.kickoff.value || null, opponent: f.opponent.value.trim(), home: f.home.value === '1', competition: f.competition.value,
          score_for: intOrNull(f.score_for.value), score_against: intOrNull(f.score_against.value), note: f.note.value.trim() || null
        };
        ['ga_corner', 'ga_free', 'ga_pen', 'ga_error', 'ga_quality', 'sp_corners', 'sp_free', 'sp_pens', 'opp_corners', 'opp_free', 'opp_pens'].forEach(function (k) { match[k] = intOrNull(f[k].value); });
        if (!match.opponent || !match.date) { U.toast('Vul de datum en de tegenstander in.', 'err'); return; }
        var lines = [], remove = [], goals = 0;
        qa(form, '.mrow').forEach(function (row) {
          var rid = row.getAttribute('data-rid'), d = rowData(row), staff = row.classList.contains('staffrow'), lid = match.id + ':' + rid, had = !!lineOf[rid];
          var any = LINE_FIELDS.some(function (k) { return k !== 'minutes' && d[k]; });
          if (staff) { if (!any) { if (had) remove.push(lineOf[rid].id); return; } }
          else if (!isOn(row) && !any) { if (had) remove.push(lineOf[rid].id); return; }
          var line = { id: lineOf[rid] ? lineOf[rid].id : lid, match_id: match.id, roster_id: rid };
          line.minutes = staff ? null : (d.minutes == null ? 0 : d.minutes);
          ['g_play', 'g_corner', 'g_free', 'g_pen', 'assists', 'yellow', 'red', 'motm', 'own_goals', 'pen_missed', 'pen_saved'].forEach(function (k) { line[k] = d[k] || null; });
          line.suspended = d.suspended ? 1 : null;
          goals += (d.g_play || 0) + (d.g_corner || 0) + (d.g_free || 0) + (d.g_pen || 0);
          lines.push(line);
        });
        if (match.score_for == null && match.score_against != null) match.score_for = goals;
        var btn = q(form, 'button[type=submit]'); btn.disabled = true;
        guard(async function () {
          await Store.saveMatch(match, lines, remove);
          dirty = false; U.toast('Wedstrijd opgeslagen'); go('#/wedstrijd/' + match.id);
        }).then(function () { btn.disabled = false; });
      });
      window.onbeforeunload = function () { return dirty ? 'Niet-bewaarde wijzigingen' : undefined; };
      KFC.app.onLeave = function () { window.onbeforeunload = null; KFC.app.onLeave = null; };
    }
    return { html: html, bind: bind };
  }

  /* ================= Regels ================= */
  var RULE_FIELDS = [
    ['Speelminuten', [['minutes.fullAt', 'Volle punten vanaf (minuten)'], ['minutes.full', 'Punten voor volle minuten'], ['minutes.partial', 'Punten voor minder minuten']]],
    ['Doelpunt', [['goal.keeper', 'Keeper'], ['goal.verdediger', 'Verdediger'], ['goal.middenvelder', 'Middenvelder'], ['goal.aanvaller', 'Aanvaller']]],
    ['Assist en clean sheet', [['assist', 'Assist'], ['cleanSheet.keeper', 'Clean sheet keeper'], ['cleanSheet.verdediger', 'Clean sheet verdediger'], ['cleanSheet.middenvelder', 'Clean sheet middenvelder'], ['cleanSheet.aanvaller', 'Clean sheet aanvaller'], ['csMinMinutes', 'Clean sheet en tegendoelpunten tellen bij meer dan (minuten)']]],
    ['Tegendoelpunten', [['goalsAgainst.per', 'Per hoeveel tegendoelpunten'], ['goalsAgainst.points', 'Punten per groep'], ['goalsAgainst.keeper', 'Geldt voor keeper', 'bool'], ['goalsAgainst.verdediger', 'Geldt voor verdediger', 'bool'], ['goalsAgainst.middenvelder', 'Geldt voor middenvelder', 'bool'], ['goalsAgainst.aanvaller', 'Geldt voor aanvaller', 'bool']]],
    ['Kaarten', [['yellow', 'Gele kaart'], ['red', 'Rode kaart'], ['twoYellowsIsRed', 'Twee gele kaarten in één wedstrijd tellen als rood', 'bool'], ['suspensionEvery', 'Schorsing na zoveel gele kaarten']]],
    ['Man van de match', [['motm.1', '1e plaats'], ['motm.2', '2e plaats'], ['motm.3', '3e plaats'], ['motmOnlyOnWin', 'Enkel bij een zege van KFC Marke', 'bool']]],
    ['Bijzonder', [['ownGoal', 'Eigen doelpunt'], ['penMissed', 'Gemiste strafschop'], ['penSaved', 'Gestopte strafschop (keeper)']]],
    ['Wat telt mee', [['countCompetitions.competitie', 'Competitie', 'bool'], ['countCompetitions.beker', 'Beker', 'bool'], ['countCompetitions.oefen', 'Oefenwedstrijden', 'bool']]]
  ];
  function getPath(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function setPath(o, p, v) { var k = p.split('.'), last = k.pop(); var t = k.reduce(function (a, x) { return a[x]; }, o); t[last] = v; }

  function rulesPage(c) {
    var S = c.S, r = S.rules;
    var html = crumbs([['Puntentelling']]) + '<div class="page-head"><div><h1>Puntentelling ' + esc(S.season.name) + '</h1><p>Elk seizoen heeft zijn eigen regels. Pas je hier iets aan, dan worden alle punten van dit seizoen meteen opnieuw berekend. Andere seizoenen veranderen niet.</p></div></div><form id="rules-form">' +
      RULE_FIELDS.map(function (sec) {
        return '<div class="panel"><h3>' + esc(sec[0]) + '</h3><div class="form-grid">' + sec[1].map(function (f) {
          var v = getPath(r, f[0]);
          if (f[2] === 'bool') return '<label class="check"><input type="checkbox" data-path="' + f[0] + '"' + (v ? ' checked' : '') + '> ' + esc(f[1]) + '</label>';
          return '<label class="fld">' + esc(f[1]) + '<input type="number" step="1" data-path="' + f[0] + '" value="' + esc(v) + '"></label>';
        }).join('') + '</div></div>';
      }).join('') + '<div class="sticky-save"><button type="button" class="btn ghost" data-act="reset-rules">Standaardregels terugzetten</button><button class="btn primary" type="submit">' + U.icon('check') + ' Opslaan</button></div></form>';
    function bind(el) {
      q(el, '#rules-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var nr = E.clone(E.DEFAULT_RULES);
        qa(el, '[data-path]').forEach(function (i) {
          var v = i.type === 'checkbox' ? i.checked : numOrNull(i.value);
          if (v == null) v = getPath(E.DEFAULT_RULES, i.getAttribute('data-path'));
          setPath(nr, i.getAttribute('data-path'), v);
        });
        guard(async function () { await Store.upsert('seasons', [Object.assign({}, S.season, { rules: nr })]); U.toast('Regels opgeslagen'); KFC.app.render(); });
      });
      q(el, '[data-act="reset-rules"]').addEventListener('click', function () {
        U.confirm({ title: 'Standaardregels terugzetten?', text: 'Alle aangepaste regels van ' + S.season.name + ' worden vervangen door de standaardregels van het nieuwe seizoen.', ok: 'Terugzetten' }).then(function (ok) {
          if (ok) guard(async function () { await Store.upsert('seasons', [Object.assign({}, S.season, { rules: {} })]); U.toast('Standaardregels actief'); KFC.app.render(); });
        });
      });
    }
    return { html: html, bind: bind };
  }

  /* ================= Seizoen ================= */
  function seasonPage(c) {
    var S = c.S, seasons = c.data.seasons.slice().sort(function (a, b) { return b.start_year - a.start_year; });
    var next = seasons[0].start_year + 1, nm = next + '-' + (next + 1);
    var html = crumbs([['Seizoen']]) + '<div class="page-head"><div><h1>Seizoenen</h1><p>Oude seizoenen blijven bewaard, zodat je spelers over de jaren heen kan vergelijken.</p></div></div>' +
      '<div class="panel"><h3>Nieuw seizoen starten</h3><form id="new-season" class="form-grid">' +
      '<label class="fld">Naam<input name="name" value="' + nm + '" required></label><label class="fld">Beginjaar<input name="year" type="number" value="' + next + '" required></label>' +
      '<label class="fld">Selectie overnemen van<select name="from"><option value="">Niemand (leeg beginnen)</option>' + seasons.map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === S.season.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select></label>' +
      '<label class="fld">Puntentelling<select name="rules"><option value="">Standaardregels</option>' + seasons.map(function (s) { return '<option value="' + esc(s.id) + '">Regels van ' + esc(s.name) + '</option>'; }).join('') + '</select></label>' +
      '<div style="align-self:end"><button class="btn primary" type="submit">' + U.icon('plus') + ' Seizoen aanmaken</button></div></form>' +
      '<p class="muted" style="margin-top:10px">Bij het overnemen blijven de posities behouden. Rugnummers laten we leeg, zodat je ze zelf kan invullen. Je kan daarna spelers toevoegen of weghalen.</p></div>' +
      '<div class="panel"><h3>Dit seizoen aanpassen</h3><form id="edit-season" class="form-grid"><label class="fld">Naam<input name="name" value="' + esc(S.season.name) + '" required></label>' +
      '<label class="fld" style="grid-column:span 2">Notitie<input name="note" value="' + esc(S.season.note || '') + '"></label><div style="align-self:end"><button class="btn" type="submit">Opslaan</button></div></form></div>' +
      '<div class="panel"><h3>Seizoen verwijderen</h3><p class="muted">Verwijdert ' + esc(S.season.name) + ' met alle wedstrijden en spelersgegevens. Maak eerst een back-up.</p>' +
      '<button class="btn danger" data-act="delete-season"' + (seasons.length < 2 ? ' disabled' : '') + '>' + U.icon('trash') + ' ' + esc(S.season.name) + ' verwijderen</button></div>';
    function bind(el) {
      q(el, '#new-season').addEventListener('submit', function (e) {
        e.preventDefault(); var fd = new FormData(e.target), year = intOrNull(fd.get('year')), name = fd.get('name').trim(), from = fd.get('from'), rf = fd.get('rules');
        guard(async function () {
          var sid = 's' + year; if (Store.by('seasons', sid)) throw new Error('Het seizoen ' + year + ' bestaat al.');
          var src = rf ? Store.by('seasons', rf) : null;
          await Store.upsert('seasons', [{ id: sid, name: name, start_year: year, rules: src ? E.clone(src.rules || {}) : {}, note: null }]);
          if (from) {
            var rows = c.data.roster.filter(function (r) { return r.season_id === from; }).map(function (r) {
              var p = Store.by('people', r.person_id), rid = 'r' + year + '-' + slug(E.fullName(p));
              return { id: rid, season_id: sid, person_id: r.person_id, role: r.role, number: r.role === 'staf' ? r.number : '', position: r.position, adjust: 0 };
            });
            await Store.upsert('roster', rows);
          }
          KFC.ui.seasonId = sid; KFC.app.saveSeason(); U.toast('Seizoen ' + name + ' aangemaakt'); go('#/beheer/spelers');
        });
      });
      q(el, '#edit-season').addEventListener('submit', function (e) {
        e.preventDefault(); var fd = new FormData(e.target);
        guard(async function () { await Store.upsert('seasons', [Object.assign({}, S.season, { name: fd.get('name').trim(), note: fd.get('note').trim() || null })]); U.toast('Opgeslagen'); KFC.app.render(); });
      });
      var del = q(el, '[data-act="delete-season"]');
      del.addEventListener('click', function () {
        U.confirm({ title: S.season.name + ' definitief verwijderen?', text: 'Alle wedstrijden, spelersgegevens en de selectie van dit seizoen verdwijnen. Dit kan niet ongedaan gemaakt worden.', ok: 'Definitief verwijderen', danger: true }).then(function (ok) {
          if (!ok) return;
          guard(async function () {
            await Store.remove('seasons', [S.season.id]);
            KFC.ui.seasonId = null; KFC.app.saveSeason(); U.toast('Seizoen verwijderd'); go('#/beheer');
          });
        });
      });
    }
    return { html: html, bind: bind };
  }

  /* ================= Back-up ================= */
  function backupPage(c) {
    var d = c.data, online = Store.mode === 'supabase';
    var html = crumbs([['Back-up']]) + '<div class="page-head"><div><h1>Back-up en online zetten</h1><p>Bewaar een kopie van alle gegevens in één bestand.</p></div></div>' +
      backupBanner(true) + '<div class="panel"><h3>Back-up maken</h3><p class="muted">Bevat ' + d.seasons.length + ' seizoenen, ' + d.matches.length + ' wedstrijden en ' + d.lines.length + ' spelersregels.</p><button class="btn primary" data-act="export">Back-up downloaden</button></div>' +
      '<div class="panel"><h3>Back-up terugzetten</h3><p class="muted">' + (online ? 'Gegevens uit het bestand worden toegevoegd of overschreven in de online database. Niets wordt gewist.' : 'Alle huidige gegevens in deze browser worden vervangen door de gegevens uit het bestand.') + '</p><input type="file" id="import-file" accept=".json,application/json"></div>';
    if (online) {
      html += '<div class="panel"><h3>Startdata uploaden</h3><p class="muted">Zet het seizoen 2025-2026 uit de oude spreadsheet en de selectie en kalender van 2026-2027 in de online database. Doe dit één keer, bij de eerste installatie.</p><button class="btn" data-act="seed">Startdata uploaden</button></div>';
    } else {
      html += '<div class="panel"><h3>Terug naar de startdata</h3><p class="muted">Wist alles wat je in deze browser hebt ingevoerd en zet de gegevens van bij de installatie terug.</p><button class="btn danger" data-act="reset">Alles terugzetten</button></div>' +
        '<div class="panel"><h3>Online zetten</h3><p class="muted">Wil je de statistieken online delen met een kijklink? Volg dan de stappen in <b>INSTALLATIE.md</b>. Daarna zet je hier je back-up online.</p></div>';
    }
    function bind(el) {
      q(el, '[data-act="export"]').addEventListener('click', function () {
        U.download('kfc-marke-backup-' + U.today() + '.json', JSON.stringify(Store.exportData(), null, 1)); markBackup(); U.toast('Back-up gedownload'); KFC.app.render();
      });
      q(el, '#import-file').addEventListener('change', function (e) {
        var file = e.target.files[0]; if (!file) return;
        var rd = new FileReader();
        rd.onload = function () {
          var obj; try { obj = JSON.parse(rd.result); } catch (x) { U.toast('Dit bestand kan niet gelezen worden.', 'err'); return; }
          U.confirm({ title: 'Back-up terugzetten?', text: online ? 'De gegevens uit dit bestand worden online toegevoegd of overschreven.' : 'Alle huidige gegevens worden vervangen.', ok: 'Terugzetten', danger: !online }).then(function (ok) {
            if (ok) guard(async function () { await Store.importData(obj); KFC.ui.seasonId = null; U.toast('Back-up teruggezet'); KFC.app.render(); });
          });
        };
        rd.readAsText(file);
      });
      var seed = q(el, '[data-act="seed"]');
      if (seed) seed.addEventListener('click', function () {
        U.confirm({ title: 'Startdata uploaden?', text: 'Alleen wat er nog niet staat wordt toegevoegd. Bestaande gegevens blijven ongewijzigd.', ok: 'Uploaden' }).then(function (ok) {
          if (ok) { seed.disabled = true; guard(async function () { var n = await Store.loadSeedOnline(); U.toast(n ? 'Startdata toegevoegd (' + n + ' rijen)' : 'Er was niets toe te voegen'); KFC.app.render(); }).then(function () { seed.disabled = false; }); }
        });
      });
      var rs = q(el, '[data-act="reset"]');
      if (rs) rs.addEventListener('click', function () {
        U.confirm({ title: 'Alles terugzetten?', text: 'Alles wat je zelf invoerde in deze browser verdwijnt. Maak eerst een back-up als je twijfelt.', ok: 'Terugzetten', danger: true }).then(function (ok) {
          if (ok) { Store.resetLocal(); KFC.ui.seasonId = null; U.toast('Startdata teruggezet'); KFC.app.render(); }
        });
      });
    }
    return { html: html, bind: bind };
  }

  /* ================= Router voor beheer ================= */
  A.page = function (parts, c) {
    if (!c.canEdit) return locked();
    var sub = parts[1];
    if (!sub) return menu(c);
    if (sub === 'spelers') return rosterPage(c);
    if (sub === 'wedstrijden') return matchesPage(c);
    if (sub === 'wedstrijd') return matchForm(c, decodeURIComponent(parts[2] || 'nieuw'));
    if (sub === 'rbfa') return KFC.quickui.helpPage(c);
    if (sub === 'regels') return rulesPage(c);
    if (sub === 'seizoen') return seasonPage(c);
    if (sub === 'backup') return backupPage(c);
    return { html: KFC.views.notFound() };
  };
})(window);
