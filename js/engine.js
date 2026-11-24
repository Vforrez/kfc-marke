/* KFC Marke statistieken: rekenmotor.
   Pure functies, zonder DOM. Werkt in de browser (window.KFC.engine) en in Node (module.exports). */
(function (root) {
  'use strict';

  var POSITIONS = ['keeper', 'verdediger', 'middenvelder', 'aanvaller'];
  var POS_LABEL = { keeper: 'Keeper', verdediger: 'Verdediger', middenvelder: 'Middenvelder', aanvaller: 'Aanvaller' };
  var POS_SHORT = { keeper: 'K', verdediger: 'V', middenvelder: 'M', aanvaller: 'A' };
  var STAFF_ROLES = ['trainer', 'keeperstrainer', 'delegee', 'verzorger'];
  var STAFF_LABEL = { trainer: 'Trainer', keeperstrainer: 'Keeperstrainer', delegee: 'Delegee', verzorger: 'Verzorger' };
  var COMPETITIONS = { competitie: 'Competitie', beker: 'Beker', oefen: 'Oefenwedstrijd' };
  /* Wedstrijden van de B-ploeg: enkel de kaarten van A-spelers tellen mee voor de schorsing. */
  var B_COMP = 'b';

  /* Standaardregels = Fantasy_Marke_seizoen_2025-26.docx */
  var DEFAULT_RULES = {
    minutes: { fullAt: 60, full: 2, partial: 1 },
    goal: { keeper: 10, verdediger: 6, middenvelder: 5, aanvaller: 4 },
    assist: 3,
    cleanSheet: { keeper: 4, verdediger: 4, middenvelder: 1, aanvaller: 0 },
    csMinMinutes: 60,                       // meer dan dit aantal minuten gespeeld
    goalsAgainst: { per: 2, points: -1, keeper: true, verdediger: true, middenvelder: false, aanvaller: false },
    yellow: -1,
    red: -3,
    twoYellowsIsRed: true,
    motm: { 1: 3, 2: 2, 3: 1 },
    motmOnlyOnWin: true,
    ownGoal: -2,
    penMissed: -2,
    penSaved: 5,
    suspensionEvery: 3,
    countCompetitions: { competitie: true, beker: false, oefen: false }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function merge(base, over) {
    var out = clone(base);
    (function walk(t, s) {
      if (!s) return;
      Object.keys(s).forEach(function (k) {
        if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k]) && t[k] && typeof t[k] === 'object') walk(t[k], s[k]);
        else t[k] = s[k];
      });
    })(out, over);
    return out;
  }
  function rulesFor(season) { return merge(DEFAULT_RULES, season && season.rules); }
  function n(x) { var v = Number(x); return isFinite(v) ? v : 0; }
  function lineGoals(l) { return n(l.g_play) + n(l.g_corner) + n(l.g_free) + n(l.g_pen); }
  function fullName(p) { return p ? (p.first_name + ' ' + p.last_name).trim() : ''; }

  function result(m) {
    if (m.score_for == null || m.score_against == null || m.score_for === '' || m.score_against === '') return null;
    var a = n(m.score_for), b = n(m.score_against);
    return a > b ? 'W' : a < b ? 'V' : 'G';
  }
  function isCounted(m, rules) {
    var c = m.competition || 'competitie';
    return !!(rules.countCompetitions && rules.countCompetitions[c]);
  }

  /* Schorsing: elke rode kaart en elke 'every'-de gele kaart. Uitgezeten als er daarna nog een wedstrijd gespeeld werd. */
  function servedSuspensions(events, playedKeys, every) {
    var ev = events.slice().sort(function (a, b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : 0; }), cum = 0, served = 0;
    function later(key) { return playedKeys.some(function (k) { return k > key; }); }
    ev.forEach(function (e) {
      for (var i = 0; i < e.y; i++) { cum++; if (cum % every === 0 && later(e.key)) served++; }
      for (var j = 0; j < e.r; j++) { if (later(e.key)) served++; }
    });
    return served;
  }

  /* Fantasy-punten voor één speler in één wedstrijd. */
  function linePoints(line, match, pos, rules) {
    pos = POSITIONS.indexOf(pos) >= 0 ? pos : 'middenvelder';
    var p = { minutes: 0, goals: 0, assists: 0, cleanSheet: 0, goalsAgainst: 0, red: 0, yellow: 0, motm: 0, specials: 0, total: 0 };
    var min = line.minutes == null || line.minutes === '' ? null : n(line.minutes);
    if (min != null) {
      if (min >= rules.minutes.fullAt) p.minutes = rules.minutes.full;
      else if (min > 0) p.minutes = rules.minutes.partial;
    }
    p.goals = lineGoals(line) * rules.goal[pos];
    p.assists = n(line.assists) * rules.assist;
    var played = min != null && min > rules.csMinMinutes;
    var against = match.score_against == null || match.score_against === '' ? null : n(match.score_against);
    if (played && against != null) {
      if (against === 0) p.cleanSheet = rules.cleanSheet[pos];
      if (rules.goalsAgainst[pos]) p.goalsAgainst = Math.floor(against / rules.goalsAgainst.per) * rules.goalsAgainst.points;
    }
    var y = n(line.yellow), r = n(line.red);
    if (rules.twoYellowsIsRed) { var pairs = Math.floor(y / 2); y -= pairs * 2; r += pairs; }
    p.yellow = y * rules.yellow;
    p.red = r * rules.red;
    var rank = n(line.motm);
    if (rank >= 1 && rank <= 3 && (!rules.motmOnlyOnWin || result(match) === 'W')) p.motm = n(rules.motm[rank]);
    p.specials = n(line.own_goals) * rules.ownGoal + n(line.pen_missed) * rules.penMissed + n(line.pen_saved) * rules.penSaved;
    p.total = p.minutes + p.goals + p.assists + p.cleanSheet + p.goalsAgainst + p.red + p.yellow + p.motm + p.specials;
    return p;
  }

  function blankStats() {
    return { apps: 0, minutes: 0, goals: 0, g_play: 0, g_corner: 0, g_free: 0, g_pen: 0, assists: 0, yellow: 0, red: 0, yellowB: 0, redB: 0,
      motm1: 0, motm2: 0, motm3: 0, motm: 0, own_goals: 0, pen_missed: 0, pen_saved: 0, suspended: 0, cleanSheets: 0, conceded: 0 };
  }
  function blankFantasy() {
    return { minutes: 0, goals: 0, assists: 0, cleanSheet: 0, goalsAgainst: 0, red: 0, yellow: 0, motm: 0, specials: 0, adjust: 0, total: 0 };
  }

  /* Alles berekenen voor één seizoen. */
  /* opts.limit: tel enkel de eerste N gespeelde wedstrijden van het seizoen (om seizoenen eerlijk te vergelijken). */
  function computeSeason(seasonId, data, opts) {
    var limit = opts && opts.limit != null ? opts.limit : null;
    var season = data.seasons.filter(function (s) { return s.id === seasonId; })[0];
    if (!season) return null;
    var rules = rulesFor(season);
    var people = {}; data.people.forEach(function (p) { people[p.id] = p; });
    var everyMatch = data.matches.filter(function (m) { return m.season_id === seasonId; })
      .sort(function (a, b) { return (a.date || '').localeCompare(b.date || '') || (a.kickoff || '').localeCompare(b.kickoff || ''); });
    var allMatches = everyMatch.filter(function (m) { return m.competition !== B_COMP; });
    var bMatches = everyMatch.filter(function (m) { return m.competition === B_COMP; });
    var matches = allMatches.filter(function (m) { return isCounted(m, rules); });
    if (limit != null) { var seen = 0; matches = matches.filter(function (m) { return result(m) != null && ++seen <= limit; }); }
    var matchById = {}; everyMatch.forEach(function (m) { matchById[m.id] = m; });
    var counted = {}; matches.forEach(function (m) { counted[m.id] = true; });

    var linesByRoster = {}, linesByMatch = {};
    data.lines.forEach(function (l) {
      if (!matchById[l.match_id]) return;
      (linesByRoster[l.roster_id] = linesByRoster[l.roster_id] || []).push(l);
      (linesByMatch[l.match_id] = linesByMatch[l.match_id] || []).push(l);
    });

    /* Een schorsing is uitgezeten zodra er na de kaart nog een wedstrijd gespeeld is. Niets om aan te vinken. */
    var playedKeys = matches.filter(function (m) { return result(m) != null; }).map(function (m) { return (m.date || '') + ' ' + (m.kickoff || '00:00'); });
    var roster = data.roster.filter(function (r) { return r.season_id === seasonId; });
    var rows = roster.map(function (r) {
      var person = people[r.person_id] || { first_name: '?', last_name: '', id: r.person_id };
      var st = blankStats(), fa = blankFantasy(), per = [], cardEvents = [];
      (linesByRoster[r.id] || []).forEach(function (l) {
        var m = matchById[l.match_id];
        if (m.competition === B_COMP) {
          /* B-ploeg: alleen kaarten (en uitgezeten schorsing) voor de schorsingen, geen minuten, punten of statistieken */
          if (limit == null) {
            var by = n(l.yellow), br = n(l.red);
            st.yellow += by; st.red += br; st.yellowB += by; st.redB += br;
            if (by || br) cardEvents.push({ key: (m.date || '') + ' 00:00', y: by, r: br });
            per.push({ match: m, line: l, pts: null, b: true });
          }
          return;
        }
        if (!counted[m.id]) return;
        var played = l.minutes != null && l.minutes !== '';
        if (played) { st.apps++; st.minutes += n(l.minutes); }
        ['g_play', 'g_corner', 'g_free', 'g_pen', 'assists', 'yellow', 'red', 'own_goals', 'pen_missed', 'pen_saved'].forEach(function (k) { st[k] += n(l[k]); });
        if (n(l.yellow) || n(l.red)) cardEvents.push({ key: (m.date || '') + ' ' + (m.kickoff || '00:00'), y: n(l.yellow), r: n(l.red) });
        var rank = n(l.motm);
        if (rank >= 1 && rank <= 3) { st['motm' + rank]++; st.motm++; }
        if (played && n(l.minutes) > rules.csMinMinutes && m.score_against != null && m.score_against !== '') {
          if (n(m.score_against) === 0) st.cleanSheets++;
          st.conceded += n(m.score_against);
        }
        if (r.role !== 'staf') {
          var pts = linePoints(l, m, r.position, rules);
          ['minutes', 'goals', 'assists', 'cleanSheet', 'goalsAgainst', 'red', 'yellow', 'motm', 'specials'].forEach(function (k) { fa[k] += pts[k]; });
          per.push({ match: m, line: l, pts: pts });
        } else per.push({ match: m, line: l, pts: null });
      });
      st.suspended = servedSuspensions(cardEvents, playedKeys, rules.suspensionEvery || 3);
      st.goals = st.g_play + st.g_corner + st.g_free + st.g_pen;
      fa.adjust = limit != null ? 0 : n(r.adjust);
      fa.total = fa.minutes + fa.goals + fa.assists + fa.cleanSheet + fa.goalsAgainst + fa.red + fa.yellow + fa.motm + fa.specials + fa.adjust;
      per.sort(function (a, b) { return (a.match.date || '').localeCompare(b.match.date || ''); });
      return { roster: r, person: person, name: fullName(person), isStaff: r.role === 'staf', stats: st, fantasy: fa, perMatch: per };
    });

    var players = rows.filter(function (x) { return !x.isStaff; });
    var staff = rows.filter(function (x) { return x.isStaff; });

    /* Team */
    var T = { played: 0, W: 0, G: 0, V: 0, gf: 0, ga: 0, cleanSheets: 0, points: 0,
      home: { played: 0, W: 0, G: 0, V: 0, gf: 0, ga: 0 }, away: { played: 0, W: 0, G: 0, V: 0, gf: 0, ga: 0 },
      sp: { corners: 0, free: 0, pens: 0, oppCorners: 0, oppFree: 0, oppPens: 0 },
      gaTypes: { corner: 0, free: 0, pen: 0, error: 0, quality: 0 },
      goalTypes: { g_play: 0, g_corner: 0, g_free: 0, g_pen: 0 },
      form: [], upcoming: [], playedMatches: [] };
    matches.forEach(function (m) {
      var res = result(m);
      if (!res) { T.upcoming.push(m); return; }
      T.played++; T[res]++; T.playedMatches.push(m);
      T.points += res === 'W' ? 3 : res === 'G' ? 1 : 0;
      T.gf += n(m.score_for); T.ga += n(m.score_against);
      if (n(m.score_against) === 0) T.cleanSheets++;
      var side = m.home ? T.home : T.away;
      side.played++; side[res]++; side.gf += n(m.score_for); side.ga += n(m.score_against);
      T.form.push({ match: m, res: res });
      T.sp.corners += n(m.sp_corners); T.sp.free += n(m.sp_free); T.sp.pens += n(m.sp_pens);
      T.sp.oppCorners += n(m.opp_corners); T.sp.oppFree += n(m.opp_free); T.sp.oppPens += n(m.opp_pens);
      T.gaTypes.corner += n(m.ga_corner); T.gaTypes.free += n(m.ga_free); T.gaTypes.pen += n(m.ga_pen);
      T.gaTypes.error += n(m.ga_error); T.gaTypes.quality += n(m.ga_quality);
    });
    matches.forEach(function (m) {
      (linesByMatch[m.id] || []).forEach(function (l) {
        T.goalTypes.g_play += n(l.g_play); T.goalTypes.g_corner += n(l.g_corner);
        T.goalTypes.g_free += n(l.g_free); T.goalTypes.g_pen += n(l.g_pen);
      });
    });
    var hasLines = {}; matches.forEach(function (m) { hasLines[m.id] = (linesByMatch[m.id] || []).length > 0; });

    return { limited: limit != null, limit: limit, season: season, rules: rules, matches: matches, allMatches: allMatches, bMatches: bMatches, players: players, staff: staff,
      team: T, linesByMatch: linesByMatch, matchById: matchById, hasLines: hasLines, rosterById: roster.reduce(function (o, r) { o[r.id] = r; return o; }, {}) };
  }

  /* Status voor gele kaarten: hoeveel tot de volgende schorsing. */
  function cardStatus(yellow, every) {
    every = every || 3;
    var left = every - (yellow % every);
    return { left: left, level: left === every ? 0 : left === 1 ? 2 : 1 };
  }

  function sortBy(arr, fn, dir) {
    return arr.slice().sort(function (a, b) {
      var x = fn(a), y = fn(b);
      if (typeof x === 'string' || typeof y === 'string') return dir * String(x).localeCompare(String(y), 'nl');
      return dir * (x - y);
    });
  }

  var api = {
    POSITIONS: POSITIONS, POS_LABEL: POS_LABEL, POS_SHORT: POS_SHORT, STAFF_ROLES: STAFF_ROLES, STAFF_LABEL: STAFF_LABEL,
    COMPETITIONS: COMPETITIONS, B_COMP: B_COMP, DEFAULT_RULES: DEFAULT_RULES, merge: merge, rulesFor: rulesFor, clone: clone,
    linePoints: linePoints, lineGoals: lineGoals, result: result, computeSeason: computeSeason, cardStatus: cardStatus,
    fullName: fullName, num: n, sortBy: sortBy, isCounted: isCounted
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.KFC = root.KFC || {}; root.KFC.engine = api; }
})(typeof window !== 'undefined' ? window : globalThis);
