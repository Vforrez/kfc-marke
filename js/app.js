/* KFC Marke statistieken: opstart, routes en kader van de pagina. */
(function (root) {
  'use strict';
  var KFC = root.KFC, E = KFC.engine, U = KFC.util, Store = KFC.Store, V = KFC.views, ui = KFC.ui, esc = U.esc;
  var app = KFC.app = { holdRender: 0, onLeave: null, ready: false };
  var cache = { ver: -1, map: {} };
  var lastHash = null;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* niets */ } }

  function compute(id, limit) {
    if (cache.ver !== Store.version) cache = { ver: Store.version, map: {} };
    var key = limit == null ? id : id + '|' + limit;
    return cache.map[key] || (cache.map[key] = E.computeSeason(id, Store.data, limit == null ? undefined : { limit: limit }));
  }
  app.saveSeason = function () { lsSet('kfc.season', ui.seasonId || ''); };
  app.quiet = async function (fn) { app.holdRender++; try { return await fn(); } finally { app.holdRender--; } };

  function defaultSeason() {
    var seasons = Store.data.seasons.slice().sort(function (a, b) { return b.start_year - a.start_year; });
    var withPlayed = seasons.filter(function (s) { return Store.data.matches.some(function (m) { return m.season_id === s.id && E.result(m) != null; }); });
    return (withPlayed[0] || seasons[0] || {}).id || null;
  }
  function currentSeasonId() {
    var ids = Store.data.seasons.map(function (s) { return s.id; });
    if (ui.seasonId && ids.indexOf(ui.seasonId) >= 0) return ui.seasonId;
    var saved = lsGet('kfc.season');
    ui.seasonId = saved && ids.indexOf(saved) >= 0 ? saved : defaultSeason();
    return ui.seasonId;
  }

  /* ---------- kader ---------- */
  var NAV = [['#/', 'Overzicht', 'home', 'overzicht'], ['#/fantasy', 'Fantasy', 'star', 'fantasy'], ['#/spelers', 'Selectie', 'users', 'spelers'], ['#/wedstrijden', 'Wedstrijden', 'cal', 'wedstrijden'], ['#/kaarten', 'Kaarten', 'card', 'kaarten'], ['#/analyse', 'Analyse', 'chart', 'analyse']];
  var TAB = [['#/', 'Overzicht', 'home', 'overzicht'], ['#/fantasy', 'Fantasy', 'star', 'fantasy'], ['#/spelers', 'Selectie', 'users', 'spelers'], ['#/wedstrijden', 'Wedstrijden', 'cal', 'wedstrijden'], ['#/meer', 'Meer', 'more', 'meer']];
  function section(parts) {
    var r = parts[0] || 'overzicht';
    if (r === 'speler') return 'spelers';
    if (r === 'wedstrijd') return 'wedstrijden';
    return r;
  }
  function buildShell() {
    document.body.innerHTML =
      '<a class="sr" href="#view" id="skip">Naar de inhoud</a>' +
      '<header class="top"><div class="top-in"><a class="brand" href="#/" aria-label="KFC Marke, naar het overzicht"><span id="logo"><span class="mark">K</span></span><span>KFC Marke<small>Statistieken</small></span></a>' +
      '<nav class="nav" id="nav" aria-label="Hoofdmenu"></nav><div class="top-end"><label class="sr" for="season">Seizoen</label><select class="season-pick" id="season"></select></div></div></header>' +
      '<main id="view" tabindex="-1"></main><div class="foot" id="foot"></div><nav class="tabbar" id="tabbar" aria-label="Menu"></nav><div id="toasts" aria-live="polite"></div>';
    var img = new Image();
    img.onload = function () { var l = document.getElementById('logo'); if (l) l.innerHTML = '<img src="assets/logo.png" alt="">'; };
    img.src = 'assets/logo.png';
    document.getElementById('season').addEventListener('change', function (e) {
      ui.seasonId = e.target.value; app.saveSeason();
      var p = routeParts();
      if (p[0] === 'wedstrijd' || p[0] === 'beheer' && p[1] === 'wedstrijd') location.hash = p[0] === 'wedstrijd' ? '#/wedstrijden' : '#/beheer/wedstrijden';
      else render();
    });
    document.getElementById('view').addEventListener('click', onClick);
  }
  function routeParts() { return (location.hash || '#/').replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean); }

  function updateChrome(parts, canEdit) {
    var sec = section(parts), more = ['kaarten', 'analyse', 'beheer', 'login', 'meer'].indexOf(sec) >= 0;
    var items = NAV.slice(); if (canEdit) items.push(['#/beheer', 'Beheer', 'gear', 'beheer']);
    document.getElementById('nav').innerHTML = items.map(function (n) { return '<a href="' + n[0] + '"' + (sec === n[3] ? ' aria-current="page"' : '') + '>' + n[1] + '</a>'; }).join('');
    document.getElementById('tabbar').innerHTML = TAB.map(function (n) {
      var cur = sec === n[3] || (n[3] === 'meer' && more); return '<a href="' + n[0] + '"' + (cur ? ' aria-current="page"' : '') + '>' + U.icon(n[2]) + '<span>' + n[1] + '</span></a>';
    }).join('');
    var sel = document.getElementById('season'), seasons = Store.data.seasons.slice().sort(function (a, b) { return b.start_year - a.start_year; });
    sel.innerHTML = seasons.map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>'; }).join('');
    sel.value = ui.seasonId || ''; sel.hidden = !seasons.length;
    var foot = [];
    if (Store.mode === 'local') foot.push('<span>Lokale versie: gegevens staan in deze browser</span>');
    if (Store.mode === 'supabase') foot.push(canEdit ? '<a href="#/login">Ingelogd, uitloggen</a>' : '<a href="#/login">Beheerder? Inloggen</a>');
    document.getElementById('foot').innerHTML = foot.join('');
  }

  /* ---------- weergeven ---------- */
  function render() {
    if (app.onLeave) app.onLeave();
    var view = document.getElementById('view'); if (!view) return;
    var parts = routeParts(), hashNow = location.hash || '#/';
    var navigated = hashNow !== lastHash; lastHash = hashNow;

    if (Store.error) {
      view.innerHTML = '<div class="empty"><p>De gegevens konden niet geladen worden.</p><p class="muted">' + esc(Store.error.message || '') + '</p><button class="btn primary" data-act="retry">Opnieuw proberen</button></div>';
      updateChrome(parts, false); return;
    }

    var canEdit = Store.canEdit(), noData = !Store.data.seasons.length;
    var sid = noData ? null : currentSeasonId();

    /* sommige routes bepalen zelf het seizoen */
    var mid = parts[0] === 'wedstrijd' ? parts[1] : (parts[0] === 'beheer' && parts[1] === 'wedstrijd' ? parts[2] : null);
    if (mid && mid !== 'nieuw') {
      var mm = Store.by('matches', decodeURIComponent(mid));
      if (mm && mm.season_id !== sid) { ui.seasonId = sid = mm.season_id; app.saveSeason(); }
    }

    var c = { data: Store.data, canEdit: canEdit, mode: Store.mode, user: Store.user, compute: compute, seasonId: sid, S: sid ? compute(sid) : null };
    var html = '', after = null, title = 'Statistieken', sec = parts[0] || '';

    if (noData && sec !== 'login' && !(sec === 'beheer' && parts[1] === 'backup')) {
      html = '<div class="empty"><p>Er staan nog geen gegevens in de database.</p>' + (canEdit ? '<a class="btn primary" href="#/beheer/backup">Startdata uploaden</a>' : '<a class="btn" href="#/login">Inloggen</a>') + '</div>';
    } else if (sec === '') { html = V.overview(c); title = 'Overzicht'; }
    else if (sec === 'fantasy') { html = V.fantasy(c); title = 'Fantasy'; }
    else if (sec === 'spelers') { html = V.players(c); title = 'Selectie'; }
    else if (sec === 'speler') { html = V.player(c, decodeURIComponent(parts[1] || '')); title = 'Speler'; }
    else if (sec === 'wedstrijden') { html = V.matches(c); title = 'Wedstrijden'; }
    else if (sec === 'wedstrijd') { html = V.match(c, decodeURIComponent(parts[1] || '')); title = 'Wedstrijd'; }
    else if (sec === 'kaarten') { html = V.cards(c); title = 'Kaarten'; }
    else if (sec === 'analyse') { html = V.analysis(c); title = 'Analyse'; }
    else if (sec === 'meer') { html = V.more(c); title = 'Meer'; }
    else if (sec === 'login') { html = V.login(c); title = 'Inloggen'; after = bindLogin; }
    else if (sec === 'beheer') { var out = KFC.admin.page(parts, c); html = out.html; after = out.bind; title = 'Beheer'; }
    else html = V.notFound();

    var banner = '';
    if (Store.offline) banner = '<div class="banner">Geen verbinding met de database. Je ziet de laatst bewaarde kopie. Wijzigen kan nu niet.</div>';
    view.innerHTML = banner + '<div id="page">' + html + '</div>';
    if (after) after(view.querySelector('#page'));
    document.title = title + ' - KFC Marke';
    updateChrome(parts, canEdit);
    if (navigated) { window.scrollTo(0, 0); }
  }
  app.render = render;

  function bindLogin(view) {
    var form = view.querySelector('#login-form'); if (!form) return;
    form.addEventListener('submit', async function (e) {
      e.preventDefault(); var err = view.querySelector('#login-err'), btn = form.querySelector('button'); err.textContent = ''; btn.disabled = true;
      try { await Store.signIn(form.elements.email.value.trim(), form.elements.password.value); location.hash = '#/beheer'; }
      catch (x) { err.textContent = x.message; btn.disabled = false; }
    });
  }

  function onClick(e) {
    var t = e.target;
    var s = t.closest('[data-act="sort"]');
    if (s) {
      var tb = s.getAttribute('data-table'), st = tb === 'fantasy' ? ui.fantasySort : tb === 'cards' ? ui.cardsSort : ui.playersSort, k = s.getAttribute('data-key');
      if (st.key === k) st.dir = -st.dir; else { st.key = k; st.dir = (k === 'name' || k === 'nr' || k === 'pos') ? 1 : -1; }
      render(); return;
    }
    var set = t.closest('[data-set]');
    if (set) { var kv = set.getAttribute('data-set').split('='); ui[kv[0]] = kv[1]; if (kv[0] === 'playersView') lsSet('kfc.playersView', kv[1]); render(); return; }
    var se = t.closest('a[data-season]');
    if (se) { e.preventDefault(); ui.seasonId = se.getAttribute('data-season'); app.saveSeason(); render(); return; }
    if (t.closest('[data-act="logout"]')) { Store.signOut().then(function () { location.hash = '#/'; }); return; }
    if (t.closest('[data-act="retry"]')) { init(); }
  }

  /* ---------- opstart ---------- */
  async function init() {
    var v = document.getElementById('view'); if (v) v.innerHTML = '<div class="loading">Laden...</div>';
    await Store.init(root.KFC_CONFIG);
    app.ready = true; render();
  }
  buildShell();
  document.getElementById('view').innerHTML = '<div class="loading">Laden...</div>';
  var pv = lsGet('kfc.playersView'); if (pv === 'tabel' || pv === 'kaarten') ui.playersView = pv;
  Store.on(function () {
    if (!app.ready || app.holdRender) return;
    requestAnimationFrame(render);
  });
  document.addEventListener('change', function (e) {
    var i = e.target.closest && e.target.closest('[data-ui]');
    if (!i || !app.ready) return;
    var v = i.type === 'number' ? parseInt(i.value, 10) : i.value;
    ui[i.getAttribute('data-ui')] = isNaN(v) || v < 1 ? null : v; setTimeout(render, 0);
  });
  window.addEventListener('hashchange', function () { if (app.ready) render(); });
  init();
})(window);
