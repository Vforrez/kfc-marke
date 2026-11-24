/* KFC Marke statistieken: scherm voor "Snel invullen" (tekst en RBFA) in het wedstrijdformulier,
   het plakvak op de wedstrijdenlijst en de uitlegpagina voor de RBFA-knop. */
(function (root) {
  'use strict';
  var KFC = root.KFC = root.KFC || {};
  var Q = KFC.quick, U = KFC.util, esc = U.esc, Store = KFC.Store;
  var UI = KFC.quickui = { pending: null };

  function q(r, sel) { return r.querySelector(sel); }
  function qa(r, sel) { return Array.prototype.slice.call(r.querySelectorAll(sel)); }
  var CATS = {
    goals: ['g_play', 'g_corner', 'g_free', 'g_pen'], assists: ['assists'], cards: ['yellow', 'red'], motm: ['motm'],
    own_goals: ['own_goals'], pen_missed: ['pen_missed'], pen_saved: ['pen_saved']
  };
  var CAT_LABEL = { goals: 'doelpunten', assists: 'assists', cards: 'kaarten', motm: 'man van de match', own_goals: 'eigen doelpunten', pen_missed: 'gemiste strafschoppen', pen_saved: 'gestopte strafschoppen' };

  UI.playersFor = function (S) {
    return S.players.map(function (r) { return { rid: r.roster.id, first: r.person.first_name, last: r.person.last_name, number: r.roster.number, staff: false }; })
      .concat(S.staff.map(function (r) { return { rid: r.roster.id, first: r.person.first_name, last: r.person.last_name, number: '', staff: true }; }));
  };

  /* ---------------- paneel in het formulier ---------------- */
  UI.panelHtml = function () {
    return '<details class="panel quick" id="quick"><summary>Snel invullen met tekst of RBFA</summary><div class="quick-body">' +
      '<p class="muted">Typ in gewone woorden wat er gebeurde, of plak de gegevens uit de RBFA-knop (<a href="#/beheer/rbfa">hoe werkt dat?</a>). ' +
      'Je ziet eerst een voorbeeld en niets wordt bewaard voor je zelf op Opslaan klikt. Alles hieronder blijft ook gewoon invulbaar.</p>' +
      '<label class="fld" for="quick-text">Wat gebeurde er?</label>' +
      '<textarea id="quick-text" rows="5" placeholder="Bijvoorbeeld:&#10;Jelle scoort na een corner van Jarne. Bob scoort uit een strafschop.&#10;Geel voor Arne, rood voor Brecht.&#10;Man van de match: Jarne, Robbe, Emile.&#10;Lander viel in voor Arne na 70 minuten."></textarea>' +
      '<div id="quick-preview" aria-live="polite"></div>' +
      '<details class="quick-help"><summary>Wat begrijp ik?</summary><ul>' +
      '<li><b>Doelpunten:</b> "Jelle scoort", "Jelle scoort 2 keer", "hattrick van Jarne", "Jelle scoort uit een strafschop", "na een vrije trap", "na een corner van Thomas".</li>' +
      '<li><b>Assists:</b> "assist van Jarne", "op aangeven van Jarne", "voorzet van Jarne", "Jarne geeft de assist aan Jelle".</li>' +
      '<li><b>Lijsten:</b> "Doelpunten: Jarne (assist Jelle), Bob uit corner" of "12\' Jelle (assist Jarne)".</li>' +
      '<li><b>Kaarten:</b> "geel voor Arne en Bob", "rood voor Brecht", "Jarne twee keer geel".</li>' +
      '<li><b>Man van de match:</b> "Man van de match: Jarne, Robbe, Emile" (in volgorde 1e, 2e, 3e).</li>' +
      '<li><b>Minuten:</b> "Basis: Robbe, Emile, ... Bank: Lander, ...", "Arne 60 minuten", "Lander viel in voor Arne na 70 minuten", "Arne geblesseerd na 30 minuten".</li>' +
      '<li><b>Bijzonder:</b> "Robbe stopt een penalty", "Bob mist een penalty", "eigen doelpunt van Emile".</li>' +
      '<li><b>Hoekschoppen, vrije trappen en strafschoppen van het team:</b> "corners 5-3" (Marke eerst), "we hadden 4 corners en 2 vrije trappen, de tegenstander 1 corner", "strafschoppen: 1 voor, 0 tegen".</li>' +
      '<li><b>Uitslag en tegendoelpunten:</b> "Uitslag 3-1", "we verloren met 1-3", "tegendoelpunt na een corner" (of "door eigen fout").</li>' +
      '<li>Heten twee spelers hetzelfde, dan vraag ik welke je bedoelt. Je kan ook de achternaam, "Lucas C" of een rugnummer ("nr 9") gebruiken.</li></ul></details>' +
      '</div></details>';
  };

  /* api: {form, players, nameOf(rid), touch(), recalc(), setOn(row,on), isOn(row), guard(fn), isNew} */
  UI.attach = function (el, form, api) {
    var box = q(el, '#quick'), ta = q(el, '#quick-text'), prev = q(el, '#quick-preview');
    var st = { plan: null, mode: null, choices: {}, assign: {}, rbfa: null, parsed: null, opts: {} };
    var timer = null;

    function rowFor(rid) { return q(form, '.mrow[data-rid="' + rid + '"]'); }
    function fld(row, f) { return q(row, '[data-f="' + f + '"]'); }
    function curInt(row, f) { var i = row && fld(row, f); return i && i.value !== '' ? parseInt(i.value, 10) || 0 : 0; }
    function hasExisting(cat) {
      return qa(form, '.mrow').some(function (row) { return CATS[cat].some(function (f) { return curInt(row, f) > 0; }); });
    }
    function name(rid) { return api.nameOf(rid); }

    function run() {
      var t = ta.value;
      ta.classList.toggle('compact', Q.isRbfa(t));
      if (!t.trim()) { prev.innerHTML = ''; st.plan = null; return; }
      try {
        if (Q.isRbfa(t)) {
          st.rbfa = Q.readRbfa(t); st.mode = 'rbfa';
          st.plan = Q.rbfaPlan(st.rbfa, api.players);
          st.plan.unmatched.forEach(function (e, i) { var rid = st.assign[e.rbfa.name]; if (rid) Q.assignUnmatched(st.plan, i, rid); });
        } else {
          st.mode = 'tekst';
          st.parsed = Q.parseText(t, api.players);
          var ch = {}; st.parsed.mentions.forEach(function (m, i) { if (st.choices[m.key]) ch[i] = st.choices[m.key]; });
          st.plan = Q.textPlan(st.parsed, ch, api.players);
        }
      } catch (e) { st.plan = null; prev.innerHTML = '<div class="qbox bad">' + esc(e.message) + '</div>'; return; }
      render();
    }

    function nameList(rids) { return rids.map(name).join(', '); }
    function rowLine(rid, f) {
      var d = Q.describe(f);
      return '<li><b>' + esc(name(rid)) + '</b><span>' + (d.length ? esc(d.join(' · ')) : '<em class="muted">geen gegevens</em>') + '</span></li>';
    }
    function sortedRids(plan) {
      return Object.keys(plan.rows).sort(function (a, b) { return name(a).localeCompare(name(b), 'nl'); });
    }

    function render() {
      var plan = st.plan, h = '';
      if (st.mode === 'tekst') {
        plan.ambiguous.forEach(function (a) {
          h += '<div class="qbox warn"><label>Welke <b>' + esc(a.label) + '</b> bedoel je? <select data-amb="' + esc(st.parsed.mentions[a.m].key) + '"><option value="">Kies een speler</option>' +
            a.cands.map(function (r) { return '<option value="' + esc(r) + '">' + esc(name(r)) + '</option>'; }).join('') + '</select></label></div>';
        });
        var rids = sortedRids(plan);
        if (rids.length) h += '<p class="qh">Dit heb ik begrepen</p><ul class="qlist">' + rids.map(function (r) { return rowLine(r, plan.rows[r]); }).join('') + '</ul>';
        var t = plan.team, tl = [];
        if (t.score_for != null) tl.push('Uitslag: KFC Marke ' + t.score_for + ' - ' + t.score_against + ' tegenstander');
        if (t.ga) { var lab = { ga_corner: 'na een corner', ga_free: 'na een vrije trap', ga_pen: 'strafschop', ga_error: 'door eigen fout', ga_quality: 'door kwaliteit van de tegenstander', ga_onbekend: 'oorzaak onbekend' }; Object.keys(t.ga).forEach(function (k) { tl.push('Tegendoelpunt' + (t.ga[k] > 1 ? 'en' : '') + ': ' + t.ga[k] + ' ' + lab[k]); }); }
        if (t.counts) {
          var cl = [['corners', 'Hoekschoppen'], ['free', 'Vrije trappen'], ['pens', 'Strafschoppen']];
          cl.forEach(function (x) {
            var a = t.counts['sp_' + x[0]], b = t.counts['opp_' + x[0]];
            if (a != null || b != null) tl.push(x[1] + ': KFC Marke ' + (a == null ? '-' : a) + ', tegenstander ' + (b == null ? '-' : b));
          });
        }
        if (t.oppOwnGoals) tl.push('Eigen doelpunt van de tegenstander (telt enkel mee in de uitslag)');
        if (tl.length) h += '<ul class="qlist team">' + tl.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
        var replaced = plan.replace.filter(hasExisting);
        if (replaced.length) h += '<div class="qbox note">Wat al ingevuld staat bij ' + esc(replaced.map(function (c) { return CAT_LABEL[c]; }).join(', ')) + ' wordt vervangen door wat je typte.</div>';
        var noMin = rids.filter(function (r) {
          var f = plan.rows[r], row = rowFor(r); if (!row || f.minutes != null) return false;
          var active = Q.describe(f).length; var cur = row && fld(row, 'minutes');
          return active && (!cur || cur.value === '');
        });
        if (noMin.length) h += '<div class="qbox warn">Minuten ontbreken voor ' + esc(nameList(noMin)) + '. Vul ze zelf in, of typ bijvoorbeeld "Basis: ..." of "Jarne 90 minuten".</div>';
        plan.warnings.forEach(function (w) { h += '<div class="qbox warn">' + esc(w) + '</div>'; });
        if (plan.unparsed.length) h += '<div class="qbox warn"><b>Niet begrepen:</b> ' + plan.unparsed.map(function (x) { return '"' + esc(x) + '"'; }).join(', ') + '. Dit vul ik niet in. Pas de zin aan of vul het hieronder zelf in.</div>';
        var can = (rids.length || tl.length) && !plan.ambiguous.length;
        h += '<div class="btn-row"><button type="button" class="btn primary" data-q="apply"' + (can ? '' : ' disabled') + '>Toepassen op het formulier</button></div>';
        if (!rids.length && !tl.length && !plan.ambiguous.length) h += '<p class="muted">Ik heb nog niets herkend. Gebruik de naam, achternaam of rugnummer van een speler en zeg wat hij deed.</p>';
      } else {
        h += renderRbfa(plan);
      }
      prev.innerHTML = h;
    }

    function renderRbfa(plan) {
      var d = st.rbfa, m = plan.match, h = '';
      var f = form.elements, curDate = f.date.value, curOpp = f.opponent.value.trim();
      var title = esc(d.home.name) + (d.score ? ' <b>' + d.score[0] + ' - ' + d.score[1] + '</b> ' : ' tegen ') + esc(d.away.name);
      h += '<div class="qbox ok"><b>RBFA-gegevens gevonden:</b> ' + title + (d.date ? ' <span class="muted">(' + esc(U.dateShort(d.date)) + (d.kickoff ? ', ' + esc(d.kickoff) : '') + ')</span>' : '') + '</div>';
      if (curDate && d.date && curDate !== d.date && !api.isNew) h += '<div class="qbox warn">De datum in het formulier (' + esc(U.dateShort(curDate)) + ') is anders dan op RBFA (' + esc(U.dateShort(d.date)) + '). Controleer of dit de juiste wedstrijd is.</div>';
      if (curOpp && m.opponent) {
        var a = Q.fold(curOpp).split(/[^a-z0-9]+/).filter(Boolean), b = Q.fold(m.opponentRaw).split(/[^a-z0-9]+/).filter(Boolean);
        if (!a.some(function (x) { return b.indexOf(x) >= 0; })) h += '<div class="qbox warn">De tegenstander in het formulier (' + esc(curOpp) + ') lijkt niet op die van RBFA (' + esc(m.opponentRaw) + ').</div>';
      }
      var rids = sortedRids(plan).sort(function (a, b) { return (plan.rows[b].minutes || 0) - (plan.rows[a].minutes || 0) || name(a).localeCompare(name(b), 'nl'); });
      h += '<p class="qh">Spelers van KFC Marke (' + plan.matched.length + ' herkend)</p><ul class="qlist">' + rids.map(function (r) {
        var f2 = plan.rows[r], e = plan.matched.filter(function (x) { return x.rid === r; })[0];
        var how = e && e.how && e.how !== 'naam' ? ' <span class="chip warn" title="Gevonden op ' + esc(e.how) + '">via ' + esc(e.how) + '</span>' : '';
        var d2 = Q.describe(f2); if (f2.minutes === 0) d2[0] = 'op de bank';
        return '<li><b>' + esc(name(r)) + '</b>' + how + '<span>' + esc(d2.join(' · ')) + '</span></li>';
      }).join('') + '</ul>';
      if (plan.unmatched.length) {
        var free = api.players.filter(function (p) { return !p.staff && !plan.rows[p.rid]; });
        h += '<div class="qbox warn"><b>Niet herkend in jullie selectie</b><ul class="qlist">' + plan.unmatched.map(function (e, i) {
          if (e.rid) return '<li><b>' + esc(e.rbfa.name) + '</b><span>toegewezen aan ' + esc(name(e.rid)) + '</span></li>';
          return '<li><b>' + esc(e.rbfa.name) + ' <span class="muted">(' + esc(e.rbfa.nr) + ')</span></b><span>' + esc(Q.describe(e.f).join(' · ')) +
            ' <select data-unm="' + i + '"><option value="">Negeren</option>' + free.map(function (p) { return '<option value="' + esc(p.rid) + '">' + esc(p.first + ' ' + p.last) + '</option>'; }).join('') + '</select></span></li>';
        }).join('') + '</ul></div>';
      }
      plan.warnings.forEach(function (w) { h += '<div class="qbox warn">' + esc(w) + '</div>'; });
      var metaOn = st.opts.meta == null ? (api.isNew || !curOpp) : st.opts.meta;
      h += '<div class="qopts"><label class="check"><input type="checkbox" data-opt="meta"' + (metaOn ? ' checked' : '') + '> Datum, aanvangsuur, thuis/uit en tegenstander (' + esc(m.opponent) + ') ook overnemen</label>';
      var nn = Object.keys(plan.setNumbers).length;
      if (nn) h += '<label class="check"><input type="checkbox" data-opt="numbers" checked> Rugnummers invullen voor ' + nn + ' speler(s) zonder nummer (' + esc(Object.keys(plan.setNumbers).map(function (r) { return name(r) + ' ' + plan.setNumbers[r]; }).join(', ')) + ')</label>';
      h += '</div><p class="muted qnoteline">RBFA kent geen assists, geen man van de match en niet hoe een doelpunt viel. Die vul je aan met tekst ("Jelle scoort na een corner van Jarne") of in het formulier. Kaarten, minuten en doelpunten worden vervangen door wat RBFA toont.</p>';
      h += '<div class="btn-row"><button type="button" class="btn primary" data-q="apply">Toepassen op het formulier</button></div>';
      return h;
    }

    /* ---------- toepassen ---------- */
    function setVal(row, f, v) {
      var i = fld(row, f); if (!i) return;
      if (i.type === 'checkbox') return;
      i.value = v == null || v === 0 || v === '' ? '' : String(v);
    }
    function apply() {
      var plan = st.plan; if (!plan) return;
      var f = form.elements, nonStaff = qa(form, '.mrow:not(.staffrow)'), all = qa(form, '.mrow');
      if (plan.goalsMode === 'total') {
        nonStaff.forEach(function (row) {
          var rid = row.getAttribute('data-rid'), p = plan.rows[rid] || {}, n = (p.g_play || 0) + (p.g_pen || 0);
          var existing = CATS.goals.reduce(function (a, k) { return a + curInt(row, k); }, 0);
          if (existing === n) return;   /* hetzelfde aantal: de soorten (corner, vrije trap) blijven staan */
          CATS.goals.forEach(function (k) { setVal(row, k, ''); });
          setVal(row, 'g_play', p.g_play); setVal(row, 'g_pen', p.g_pen);
        });
      }
      plan.replace.forEach(function (cat) {
        if (cat === 'goals' && plan.goalsMode === 'total') return;
        all.forEach(function (row) { CATS[cat].forEach(function (k) { setVal(row, k, ''); }); });
      });
      Object.keys(plan.rows).forEach(function (rid) {
        var row = rowFor(rid), p = plan.rows[rid]; if (!row) return;
        var staff = row.classList.contains('staffrow');
        Object.keys(p).forEach(function (k) {
          if (k === 'minutes') { if (!staff && p.minutes != null) { setVal(row, 'minutes', p.minutes); if (p.minutes === 0) fld(row, 'minutes').value = '0'; } return; }
          if (plan.goalsMode === 'total' && /^g_/.test(k)) return;
          setVal(row, k, p[k]);
        });
        if (!staff) api.setOn(row, true);
      });
      var t = plan.team || {};
      if (t.score_for != null) { f.score_for.value = t.score_for; f.score_against.value = t.score_against; }
      if (plan.match && plan.match.score_for != null) { f.score_for.value = plan.match.score_for; f.score_against.value = plan.match.score_against; }
      if (t.counts) {
        Object.keys(t.counts).forEach(function (k) { if (f[k]) f[k].value = t.counts[k]; });
        var det = f.sp_corners && f.sp_corners.closest('details'); if (det) det.open = true;
      }
      if (t.ga) {
        ['ga_corner', 'ga_free', 'ga_pen', 'ga_error', 'ga_quality'].forEach(function (k) { f[k].value = t.ga[k] ? t.ga[k] : ''; });
      }
      var meta = q(prev, '[data-opt="meta"]');
      if (st.mode === 'rbfa' && meta && meta.checked) {
        var m = plan.match;
        if (m.date) f.date.value = m.date; if (m.kickoff) f.kickoff.value = m.kickoff;
        f.home.value = m.home ? '1' : '0'; if (m.opponent) f.opponent.value = m.opponent;
        if (m.competition && /beker/i.test(m.competition)) f.competition.value = 'beker';
      }
      var nb = q(prev, '[data-opt="numbers"]'), nums = nb && nb.checked ? plan.setNumbers : null;
      var summary = st.mode === 'rbfa' ? 'RBFA-gegevens ingevuld.' : 'Je tekst is ingevuld.';
      api.touch(); api.recalc();
      if (nums && Object.keys(nums).length) {
        api.guard(async function () {
          var rows = Object.keys(nums).map(function (rid) { var r = Store.by('roster', rid); return Object.assign({}, r, { number: nums[rid] }); });
          await Store.upsert('roster', rows);
          rows.forEach(function (r) { var row = rowFor(r.id), n = row && q(row, '.nr'); if (n) n.textContent = r.number; });
        });
      }
      prev.innerHTML = '<div class="qbox ok"><b>' + summary + '</b> Controleer hieronder en klik op <b>Opslaan</b> om te bewaren.</div>';
      ta.value = ''; ta.classList.remove('compact'); st.plan = null; st.assign = {}; st.opts = {};
      U.toast('Ingevuld. Klik op Opslaan om te bewaren.');
      var first = q(form, '#checks'); if (first && first.scrollIntoView) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    ta.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 350); });
    ta.addEventListener('paste', function () { clearTimeout(timer); timer = setTimeout(run, 30); });
    prev.addEventListener('change', function (e) {
      var amb = e.target.getAttribute && e.target.getAttribute('data-amb');
      if (amb != null && amb !== '') { st.choices[amb] = e.target.value || null; run(); return; }
      var unm = e.target.getAttribute && e.target.getAttribute('data-unm');
      if (unm != null) { var en = st.plan.unmatched[+unm]; if (e.target.value) { st.assign[en.rbfa.name] = e.target.value; } else delete st.assign[en.rbfa.name]; run(); return; }
      var opt = e.target.getAttribute && e.target.getAttribute('data-opt');
      if (opt) st.opts[opt] = e.target.checked;
    });
    prev.addEventListener('click', function (e) {
      var b = e.target.closest('[data-q]'); if (!b) return;
      if (b.getAttribute('data-q') === 'apply') apply();
    });
    if (UI.pending) { var txt = UI.pending; UI.pending = null; box.open = true; ta.value = txt; run(); }
    UI.run = run;
  };

  /* ---------------- plakvak op de wedstrijdenlijst ---------------- */
  UI.listPanelHtml = function () {
    return '<details class="panel quick"><summary>Wedstrijd importeren uit RBFA</summary><div class="quick-body">' +
      '<p class="muted">Klik op de RBFA-knop op de pagina van de wedstrijd (<a href="#/beheer/rbfa">uitleg</a>) en plak de gegevens hier. Ik zoek de juiste wedstrijd in de kalender en open het formulier met een voorbeeld.</p>' +
      '<textarea id="rbfa-paste" rows="3" placeholder="Plak hier de gekopieerde RBFA-gegevens"></textarea>' +
      '<div class="btn-row" style="margin-top:10px"><button type="button" class="btn primary" data-q="find">Wedstrijd zoeken</button></div></div></details>';
  };
  UI.bindList = function (el, c) {
    var b = q(el, '[data-q="find"]'); if (!b) return;
    b.addEventListener('click', function () {
      var t = q(el, '#rbfa-paste').value;
      if (!Q.isRbfa(t)) { U.toast('Plak eerst de gegevens die de RBFA-knop kopieerde.', 'err'); return; }
      var d; try { d = Q.readRbfa(t); } catch (e) { U.toast(e.message, 'err'); return; }
      var opp = Q.fold(((/marke/i.test(d.home.name) ? d.away : d.home).name) || '').split(/[^a-z0-9]+/).filter(Boolean);
      var cand = c.S.allMatches.filter(function (m) { return m.date === d.date; });
      if (!cand.length) cand = c.S.allMatches.filter(function (m) { var w = Q.fold(m.opponent).split(/[^a-z0-9]+/).filter(Boolean); return w.some(function (x) { return opp.indexOf(x) >= 0; }); });
      if (cand.length > 1) cand = cand.filter(function (m) { var w = Q.fold(m.opponent).split(/[^a-z0-9]+/).filter(Boolean); return w.some(function (x) { return opp.indexOf(x) >= 0; }); }).concat(cand).slice(0, 1);
      UI.pending = t;
      if (cand.length) { U.toast('Wedstrijd gevonden: ' + cand[0].opponent); location.hash = '#/beheer/wedstrijd/' + encodeURIComponent(cand[0].id); }
      else { U.toast('Geen wedstrijd met die datum gevonden. Ik open een nieuwe.'); location.hash = '#/beheer/wedstrijd/nieuw'; }
    });
  };

  /* ---------------- uitlegpagina voor de RBFA-knop ---------------- */
  UI.helpPage = function () {
    var href = Q.bookmarkletHref();
    var html = '<div class="crumbs"><a href="#/beheer">Beheer</a> / <span class="muted">RBFA-knop</span></div>' +
      '<div class="page-head"><div><h1>RBFA-knop</h1><p>Haal minuten, doelpunten en kaarten van de RBFA-wedstrijdpagina in één klik naar de app.</p></div></div>' +
      '<div class="panel"><h3>1. Zet de knop in je browser (één keer)</h3>' +
      '<p>Sleep deze knop naar je favorietenbalk (Ctrl+Shift+B toont die balk):</p>' +
      '<p><a class="btn primary" id="rbfa-bm" draggable="true" href="' + href + '" title="Sleep mij naar je favorietenbalk">KFC Marke: kopieer wedstrijd</a></p>' +
      '<p class="muted">Lukt slepen niet, of werk je op een telefoon? Maak dan zelf een nieuwe favoriet (bladwijzer) met als naam "KFC Marke" en plak de code hieronder bij het adres (URL).</p>' +
      '<div class="btn-row"><button type="button" class="btn" data-q="copycode">Code kopiëren</button></div></div>' +
      '<div class="panel"><h3>2. Gebruik hem bij elke wedstrijd</h3><ol class="steps">' +
      '<li>Open op <b>rbfa.be</b> de pagina van de wedstrijd (de opstelling moet zichtbaar zijn, dus na de match).</li>' +
      '<li>Klik op je favoriet <b>KFC Marke: kopieer wedstrijd</b>. Bovenaan verschijnt kort "wedstrijd gekopieerd".</li>' +
      '<li>Open hier <a href="#/beheer/wedstrijden">Beheer, Wedstrijden</a> en plak de gegevens in <b>Wedstrijd importeren uit RBFA</b>. Of open de wedstrijd zelf en plak ze in <b>Snel invullen</b>.</li>' +
      '<li>Controleer het voorbeeld, klik <b>Toepassen</b> en daarna <b>Opslaan</b>.</li></ol></div>' +
      '<div class="panel"><h3>Wat je krijgt en wat niet</h3><ul class="steps plain">' +
      '<li><b>Van RBFA:</b> wie in de basis stond of op de bank, wissels (dus de speelminuten), doelpunten, gele en rode kaarten, de uitslag, datum en aftrap, en de rugnummers.</li>' +
      '<li><b>Niet op RBFA:</b> assists, hoe een doelpunt viel, man van de match, hoekschoppen. Die vul je aan met de tekstoptie of in het formulier.</li>' +
      '<li>Er gebeurt niets automatisch of op de achtergrond: de knop leest enkel de pagina die jij zelf geopend hebt.</li>' +
      '<li>Als RBFA zijn pagina verandert kan de knop stoppen met werken. Je krijgt dan een melding en kan alles nog gewoon invullen.</li></ul></div>';
    function bind(el) {
      var b = q(el, '[data-q="copycode"]');
      if (b) b.addEventListener('click', function () {
        var code = Q.bookmarkletHref();
        function ok() { U.toast('Code gekopieerd'); }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(ok, function () { U.toast('Kopiëren lukte niet', 'err'); });
        else { var t = document.createElement('textarea'); t.value = code; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); ok(); } catch (e) { U.toast('Kopiëren lukte niet', 'err'); } t.remove(); }
      });
    }
    return { html: html, bind: bind };
  };
})(window);
