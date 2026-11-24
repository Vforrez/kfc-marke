/* KFC Marke statistieken: gegevenslaag.
   Twee werkwijzen achter dezelfde functies:
   - lokaal: alles staat in de browser (localStorage), vertrekt van js/seed.js
   - online: Supabase (Postgres + login). Iedereen kan lezen, enkel een ingelogde gebruiker kan schrijven. */
(function (root) {
  'use strict';
  var KFC = root.KFC = root.KFC || {};

  var TABLES = ['seasons', 'people', 'roster', 'matches', 'lines'];
  var COLS = {
    seasons: ['id', 'name', 'start_year', 'rules', 'note'],
    people: ['id', 'first_name', 'last_name'],
    roster: ['id', 'season_id', 'person_id', 'role', 'number', 'position', 'adjust', 'adjust_note'],
    matches: ['id', 'season_id', 'date', 'kickoff', 'opponent', 'home', 'competition', 'score_for', 'score_against',
      'ga_corner', 'ga_free', 'ga_pen', 'ga_error', 'ga_quality', 'sp_corners', 'sp_free', 'sp_pens',
      'opp_corners', 'opp_free', 'opp_pens', 'note'],
    lines: ['id', 'match_id', 'roster_id', 'minutes', 'g_play', 'g_corner', 'g_free', 'g_pen', 'assists', 'yellow', 'red',
      'motm', 'own_goals', 'pen_missed', 'pen_saved', 'suspended']
  };
  var LS_DATA = 'kfc.data.v1', LS_CACHE = 'kfc.cache.v1';
  var SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';

  var listeners = [];
  var st = { mode: 'local', data: empty(), user: null, sb: null, offline: false, error: null, version: 0 };

  function empty() { return { seasons: [], people: [], roster: [], matches: [], lines: [] }; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function emit() { st.version++; listeners.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } }); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

  function norm(table, row) {
    var o = {};
    COLS[table].forEach(function (c) { o[c] = row[c] === undefined || row[c] === '' ? null : row[c]; });
    if (table === 'seasons' && o.rules == null) o.rules = {};
    if (table === 'roster') { if (o.adjust == null) o.adjust = 0; if (!o.role) o.role = 'speler'; if (o.number != null) o.number = String(o.number); }
    if (table === 'matches') { o.home = o.home === false || o.home === 0 ? false : true; if (!o.competition) o.competition = 'competitie'; }
    if (table === 'lines' && o.suspended != null) o.suspended = o.suspended ? 1 : 0;
    return o;
  }
  function normAll(d) {
    var out = empty();
    TABLES.forEach(function (t) { out[t] = (d && d[t] || []).map(function (r) { return norm(t, r); }); });
    return out;
  }

  /* ---------- lokaal ---------- */
  function loadLocal() {
    var raw = lsGet(LS_DATA), d = null;
    if (raw) { try { d = JSON.parse(raw); } catch (e) { d = null; } }
    if (!d || !d.seasons || !d.seasons.length) d = clone(root.KFC_SEED || empty());
    st.data = normAll(d);
  }
  function saveLocal() { if (st.mode === 'local') { if (!lsSet(LS_DATA, JSON.stringify(st.data))) st.storageWarning = true; } }

  /* ---------- online ---------- */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = function () { rej(new Error('Kon de online bibliotheek niet laden. Controleer je internetverbinding.')); };
      document.head.appendChild(s);
    });
  }
  async function fetchAll() {
    var out = empty();
    for (var i = 0; i < TABLES.length; i++) {
      var t = TABLES[i], from = 0;
      for (;;) {
        var r = await st.sb.from(t).select('*').order('id').range(from, from + 999);
        if (r.error) throw r.error;
        out[t] = out[t].concat(r.data);
        if (r.data.length < 1000) break;
        from += 1000;
      }
    }
    st.data = normAll(out);
    lsSet(LS_CACHE, JSON.stringify(st.data));
  }

  async function init(cfg) {
    st.error = null;
    if (cfg && cfg.SUPABASE_URL && cfg.SUPABASE_KEY) {
      st.mode = 'supabase';
      try {
        if (!root.supabase) await loadScript(SUPABASE_CDN);
        st.sb = root.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
        var s = await st.sb.auth.getSession();
        st.user = s.data && s.data.session ? s.data.session.user : null;
        st.sb.auth.onAuthStateChange(function (ev, sess) { st.user = sess ? sess.user : null; emit(); });
        await fetchAll();
        st.offline = false;
      } catch (e) {
        console.error(e);
        var cached = lsGet(LS_CACHE);
        if (cached) { try { st.data = normAll(JSON.parse(cached)); st.offline = true; st.error = null; } catch (e2) { st.error = e; } }
        else st.error = e;
      }
    } else {
      st.mode = 'local';
      loadLocal();
    }
    emit();
  }

  /* ---------- lezen ---------- */
  function canEdit() { return st.mode === 'local' || (!!st.user && !st.offline); }
  function by(table, id) { var a = st.data[table]; for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }

  /* ---------- schrijven ---------- */
  function applyUpsert(table, rows) {
    var arr = st.data[table];
    rows.forEach(function (r) {
      var i = -1;
      for (var k = 0; k < arr.length; k++) if (arr[k].id === r.id) { i = k; break; }
      if (i >= 0) arr[i] = r; else arr.push(r);
    });
  }
  function applyRemove(table, ids) {
    var set = {}; ids.forEach(function (i) { set[i] = true; });
    var d = st.data;
    d[table] = d[table].filter(function (r) { return !set[r.id]; });
    // opruimen zoals de database het doet (on delete cascade)
    if (table === 'seasons') {
      var ms = d.matches.filter(function (m) { return set[m.season_id]; }).map(function (m) { return m.id; });
      d.roster = d.roster.filter(function (r) { return !set[r.season_id]; });
      d.matches = d.matches.filter(function (m) { return !set[m.season_id]; });
      var ms2 = {}; ms.forEach(function (i) { ms2[i] = true; });
      d.lines = d.lines.filter(function (l) { return !ms2[l.match_id]; });
    }
    if (table === 'matches') d.lines = d.lines.filter(function (l) { return !set[l.match_id]; });
    if (table === 'roster') d.lines = d.lines.filter(function (l) { return !set[l.roster_id]; });
  }
  function chunks(a, n) { var o = []; for (var i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; }
  function assertEdit() { if (!canEdit()) throw new Error('Je bent niet ingelogd. Log in om te wijzigen.'); }

  async function remoteFail(e) {
    try { await fetchAll(); } catch (x) { /* houd lokale kopie */ }
    emit();
    throw new Error(e && e.message ? e.message : 'Opslaan is mislukt.');
  }

  async function upsert(table, rows) {
    assertEdit();
    if (!Array.isArray(rows)) rows = [rows];
    rows = rows.map(function (r) { return norm(table, r); });
    if (!rows.length) return;
    applyUpsert(table, rows); saveLocal(); emit();
    if (st.mode !== 'supabase') return;
    try {
      var cs = chunks(rows, 400);
      for (var i = 0; i < cs.length; i++) { var r = await st.sb.from(table).upsert(cs[i]); if (r.error) throw r.error; }
      lsSet(LS_CACHE, JSON.stringify(st.data));
    } catch (e) { await remoteFail(e); }
  }
  async function remove(table, ids) {
    assertEdit();
    if (!Array.isArray(ids)) ids = [ids];
    if (!ids.length) return;
    applyRemove(table, ids); saveLocal(); emit();
    if (st.mode !== 'supabase') return;
    try {
      var cs = chunks(ids, 200);
      for (var i = 0; i < cs.length; i++) { var r = await st.sb.from(table).delete().in('id', cs[i]); if (r.error) throw r.error; }
      lsSet(LS_CACHE, JSON.stringify(st.data));
    } catch (e) { await remoteFail(e); }
  }

  /* Wedstrijd + spelersregels in één keer bewaren. */
  async function saveMatch(match, lines, removeLineIds) {
    await upsert('matches', [match]);
    if (removeLineIds && removeLineIds.length) await remove('lines', removeLineIds);
    if (lines && lines.length) await upsert('lines', lines);
  }

  function newId(prefix) {
    var id;
    do { id = prefix + '-' + Math.random().toString(36).slice(2, 8); } while (by('roster', id) || by('matches', id) || by('people', id) || by('seasons', id));
    return id;
  }

  /* ---------- login ---------- */
  async function signIn(email, password) {
    if (st.mode !== 'supabase') throw new Error('Inloggen is enkel nodig in de online versie.');
    var r = await st.sb.auth.signInWithPassword({ email: email, password: password });
    if (r.error) throw new Error(/invalid/i.test(r.error.message) ? 'E-mailadres of wachtwoord klopt niet.' : r.error.message);
    st.user = r.data.user; emit();
  }
  async function signOut() { if (st.sb) await st.sb.auth.signOut(); st.user = null; emit(); }

  /* ---------- back-up ---------- */
  function exportData() {
    return { format: 'kfc-marke-backup', version: 1, exportedAt: new Date().toISOString(), data: clone(st.data) };
  }
  async function importData(obj, opts) {
    assertEdit();
    var d = obj && obj.format === 'kfc-marke-backup' ? obj.data : obj;
    if (!d || !d.seasons || !d.matches || !d.roster || !d.lines || !d.people) throw new Error('Dit bestand is geen geldige KFC Marke back-up.');
    d = normAll(d);
    if (st.mode === 'local' || (opts && opts.replaceLocal)) { st.data = d; saveLocal(); emit(); if (st.mode === 'local') return; }
    for (var i = 0; i < TABLES.length; i++) await upsert(TABLES[i], d[TABLES[i]]);
  }
  async function loadSeedOnline() {
    if (!root.KFC_SEED) throw new Error('Geen startdata gevonden (js/seed.js).');
    // enkel rijen toevoegen die er nog niet zijn, zodat ingevulde nummers en wedstrijden nooit overschreven worden
    var seed = clone(root.KFC_SEED), add = empty(), added = 0;
    TABLES.forEach(function (t) {
      var have = {}; st.data[t].forEach(function (r) { have[r.id] = true; });
      add[t] = (seed[t] || []).filter(function (r) { return !have[r.id]; });
      added += add[t].length;
    });
    if (!added) return 0;
    for (var i = 0; i < TABLES.length; i++) await upsert(TABLES[i], normAll(add)[TABLES[i]]);
    return added;
  }
  function resetLocal() {
    if (st.mode !== 'local') return;
    try { localStorage.removeItem(LS_DATA); } catch (e) { /* niets */ }
    loadLocal(); emit();
  }
  async function reload() { if (st.mode === 'supabase') { await fetchAll(); emit(); } }

  KFC.Store = {
    init: init, state: st, on: function (fn) { listeners.push(fn); },
    get data() { return st.data; }, get mode() { return st.mode; }, get user() { return st.user; },
    get offline() { return st.offline; }, get error() { return st.error; }, get version() { return st.version; },
    canEdit: canEdit, by: by, upsert: upsert, remove: remove, saveMatch: saveMatch, newId: newId,
    signIn: signIn, signOut: signOut, exportData: exportData, importData: importData,
    loadSeedOnline: loadSeedOnline, resetLocal: resetLocal, reload: reload, COLS: COLS
  };
})(window);
