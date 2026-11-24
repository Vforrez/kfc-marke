/* KFC Marke statistieken: snel invullen.
   1. parseText: haalt uit een getypte tekst (Nederlands) wie scoorde, wie de assist gaf, hoe het doelpunt viel,
      kaarten, man van de match, minuten, strafschoppen en de uitslag.
   2. rbfaPlan: zet de gegevens van een RBFA-wedstrijdpagina (via de knop in de browser) om naar dezelfde invulling.
   Dit bestand bevat enkel berekeningen (geen scherm) en werkt zowel in de browser als in Node (voor de tests). */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.KFC = root.KFC || {}; root.KFC.quick = api; }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  /* ---------------- hulpfuncties ---------------- */
  function fold(s) {
    return String(s == null ? '' : s).replace(/[‘’′´`]/g, "'").replace(/×/g, 'x')
      .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }
  function words(s) { return fold(s).split(/[^a-z0-9]+/).filter(Boolean); }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function cap(s) { return s.replace(/(^|\s)([a-z])/g, function (a, b, c) { return b + c.toUpperCase(); }); }
  var M = '@([a-z]{2})@';
  function rx(src, flags) { return new RegExp(src.replace(/\{M\}/g, M), flags || ''); }
  function ph(i) { return '@' + String.fromCharCode(97 + Math.floor(i / 26)) + String.fromCharCode(97 + i % 26) + '@'; }
  function dec(g) { return (g.charCodeAt(0) - 97) * 26 + (g.charCodeAt(1) - 97); }
  function int(v) { return typeof v === 'number' ? v : (parseInt(v, 10) || 0); }

  /* ---------------- namen herkennen ---------------- */
  /* players: [{rid, first, last, number, staff}] */
  function buildIndex(players) {
    var idx = {};
    function add(key, rid) { if (!key) return; (idx[key] = idx[key] || []); if (idx[key].indexOf(rid) < 0) idx[key].push(rid); }
    players.forEach(function (p) {
      var f = words(p.first), l = words(p.last);
      if (l.length) {
        add(l.join(' '), p.rid); if (l.length > 1) add(l.join(''), p.rid);
        if (f.length) {
          add(f[0] + ' ' + l.join(' '), p.rid); add(f.join(' ') + ' ' + l.join(' '), p.rid);
          add(f[0] + ' ' + l[0].charAt(0), p.rid);
          add(f[0] + ' ' + l.join(''), p.rid);
        }
      }
      if (f.length) { add(f[0], p.rid); if (f.length > 1) add(f.join(' '), p.rid); }
      var n = String(p.number == null ? '' : p.number).trim();
      if (/^\d{1,3}$/.test(n)) add('nr ' + parseInt(n, 10), p.rid);
    });
    return idx;
  }
  function mentionize(norm, index) {
    var keys = Object.keys(index).sort(function (a, b) { return b.length - a.length; });
    var mentions = [], byKey = {};
    if (!keys.length) return { s: norm, mentions: mentions };
    var re = new RegExp('(^|[^a-z0-9@])(' + keys.map(function (k) { return escRe(k).replace(/ /g, '\\s+'); }).join('|') + ')(?![a-z0-9])', 'g');
    var s = norm.replace(re, function (all, pre, hit) {
      var key = hit.replace(/\s+/g, ' ');
      if (byKey[key] == null) { byKey[key] = mentions.length; mentions.push({ key: key, label: /^nr /.test(key) ? '#' + key.slice(3) : cap(key), cands: index[key].slice() }); }
      return pre + ph(byKey[key]);
    });
    return { s: s, mentions: mentions };
  }

  /* ---------------- trefwoorden ---------------- */
  var KW = {
    goal: /\b(scoor\w*|doelpunt\w*|goals?|treffer\w*|trefzeker\w*|hattrick|dubbelslag|netten)\b/g,
    ga: /\btegen\s?(?:doelpunt\w*|goals?|treffer\w*)|\b(?:tegenstander|tegenpartij|zij|ze|hun|thuisploeg|bezoekers)\b[^@]*?\b(?:scoor\w*|maakt\w*|maakte|trof|raak)\b|\b(?:we|wij) kregen\b|\bkregen we\b|\bincasseer\w*/g,
    own: /\beigen\s*(?:doelpunt\w*|goals?)|\bown\s?goals?/g,
    yellow: /\b(?:geel|gele)\b/g,
    red: /\b(?:rood|rode)\b/g,
    motm: /man van de (?:match|wedstrijd)|\bmotm\b|\bmvdm\b|\bmvdw\b/g,
    pen: /\b(?:strafschop\w*|penalty\w*|pen)\b/,
    penSave: /\b(?:stop\w*|pakt\w*|pakte|keert\w*|redt\w*|redde|gered|tegengehouden|hield|houdt|verijdel\w*)\b/,
    penMiss: /\b(?:mist\w*|miste|mistte|gemist|naast|over|paal|lat)\b/,
    assist: /\b(?:assists?|assisten|aangegeven|aangeven|voorzet\w*|voorbereid\w*|bediend\w*|dankzij|doorgegeven|steekpass\w*|pass|combinatie\w*)\b/,
    sub: /\b(?:viel\w*|valt|kwam\w*|komt|invaller\w*|ingevallen|gewisseld|vervangen|afgelost|geblesseerd|uitgevallen|eruit|erin|in\s+voor|ging\s+(?:er\s+)?af)\b/g,
    mins: /\d{1,3}\s*(?:min\w*|')|\b(?:volledige|hele|ganse)\s+(?:wedstrijd|match)\b|\bop de bank\b|\bniet gespeeld\b/g,
    corner: /\b(?:corner\w*|hoekschop\w*)\b/,
    free: /\b(?:vrije\s*trap\w*|vrijetrap\w*|vrije\s*schop\w*|vrijschop\w*|free\s*kick)\b/,
    lineup: /^\W*(?:basis\w*|opstelling|startelf|starters|startte\w*|begon\w*)\b/,
    bench: /^\W*(?:bank\w*|wissels?|wisselspelers|reserves?|invallers)\b/
  };
  function count(re, s) { var m = s.match(re); return m ? m.length : 0; }
  function anchors(s) {
    var n = 0, ga = count(KW.ga, s), own = count(KW.own, s);
    n += ga + own;
    var g = count(KW.goal, s.replace(KW.own, ' ').replace(KW.ga, ' '));
    n += g;
    n += count(KW.yellow, s) + count(KW.red, s) + (KW.motm.test(s) ? 1 : 0); KW.motm.lastIndex = 0;
    n += count(KW.sub, s) ? 1 : 0;
    n += count(KW.mins, s);
    return n;
  }

  /* ---------------- zinnen en deelzinnen ---------------- */
  function sentencesOf(s) {
    s = s.replace(/(^|[\n,:]\s*)([1-3])\.\s*(?=@)/g, '$1$2e ');
    return s.replace(/\r/g, '\n').replace(/^[\s\-*•]+/gm, '').split(/[.!?;\n]+/).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function splitTop(s) {
    var out = [], cur = '', depth = 0, i = 0;
    var sep = /^(?:\s*,\s*|\s+en\s+|\s+daarna\s+|\s+vervolgens\s+|\s+waarna\s+|\s+maar\s+|\s+terwijl\s+|\s+later\s+)/;
    while (i < s.length) {
      var ch = s.charAt(i);
      if (ch === '(') depth++; if (ch === ')') depth = Math.max(0, depth - 1);
      if (depth === 0) { var m = sep.exec(s.slice(i)); if (m && cur.trim()) { out.push(cur.trim()); cur = ''; i += m[0].length; continue; } }
      cur += ch; i++;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function mentionOnly(c) {
    return !/[a-z0-9]/.test(c.replace(/@[a-z]{2}@/g, ' ').replace(/\b(?:en|ook|door|van|de|het|een|met|nr|ze|zij)\b/g, ' ')) && /@[a-z]{2}@/.test(c);
  }
  function kindOf(c) {
    if (/man van de (?:match|wedstrijd)|\bmotm\b|\bmvdm\b|\bmvdw\b/.test(c)) return 'motm';
    if (KW.lineup.test(c)) return 'lineup';
    if (KW.bench.test(c)) return 'bench';
    var own = new RegExp(KW.own.source).test(c); if (own) return 'own';
    var goalWord = new RegExp(KW.goal.source).test(c);
    if (new RegExp(KW.ga.source).test(c) && !/@[a-z]{2}@\W+(?:\w+\W+){0,2}scoor/.test(c)) return 'ga';
    if (KW.pen.test(c) && !goalWord) { if (KW.penSave.test(c)) return 'pensave'; if (KW.penMiss.test(c)) return 'penmiss'; }
    if (new RegExp(KW.yellow.source).test(c) || new RegExp(KW.red.source).test(c)) return 'card';
    if (new RegExp(KW.sub.source).test(c)) return 'sub';
    if (/^\W*@[a-z]{2}@\W*\d{2,3}\W*$/.test(c)) return 'mins';
    if (goalWord || KW.assist.test(c) || /^\W*\d+\s*-\s*\d+\W*@/.test(c) || /^\W*\d+(?:\+\d+)?\s*'\W*@/.test(c) || KW.corner.test(c) || KW.free.test(c) || KW.pen.test(c)) return 'goal';
    if (new RegExp(KW.mins.source).test(c)) return 'mins';
    return null;
  }

  /* ---------------- parseText ---------------- */
  function parseText(text, players) {
    var index = buildIndex(players);
    var norm = fold(text).replace(/#\s*(\d+)/g, 'nr $1').replace(/\bnr\.?\s*(\d+)/g, 'nr $1').replace(/\bnummer\s*(\d+)/g, 'nr $1');
    var mz = mentionize(norm, index), mentions = mz.mentions;
    var events = [], team = {}, unparsed = [], notes = [], lastSubject = null, lastOut = null;
    function labelize(s) { return s.replace(/@([a-z]{2})@/g, function (a, g) { var m = mentions[dec(g)]; return m ? m.label : ''; }).replace(/\s+/g, ' ').trim(); }
    function mIn(c) { var r = [], re = rx('{M}', 'g'), m; while ((m = re.exec(c))) r.push(dec(m[1])); return r; }
    function ev(o) { events.push(o); }

    /* Teamtellingen (los van spelers): hoekschoppen, vrije trappen en strafschoppen voor en tegen.
       Werkt per deelzin; wat geen speler, doelpunt of kaart bevat en wel een aantal heeft, wordt hier opgeraapt. */
    var NUMW = { een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9, tien: 10 };
    var TYPE_RE = '(corner\\w*|hoekschop\\w*|vrije\\W*trap\\w*|vrijetrap\\w*|vrije\\W*schop\\w*|vrijschop\\w*|strafschop\\w*|penalt\\w*)';
    function teamKey(t) { return /^(?:corner|hoekschop)/.test(t) ? 'corners' : /^(?:vrije|vrijetrap|vrijschop)/.test(t) ? 'free' : 'pens'; }
    function teamAdd(kind, side, n) {
      var k = (side === 'opp' ? 'opp_' : 'sp_') + kind; team.counts = team.counts || {};
      team.counts[k] = (team.counts[k] || 0) + n;
    }
    function teamCounts(sent) {
      if (!new RegExp(TYPE_RE).test(sent) && !/\b\d+\s+tegen\b/.test(sent)) return sent;
      var bits = sent.split(/(\s*,\s*|\s*;\s*|\s+en\s+|\s+terwijl\s+|\s+maar\s+)/), out = [], side = 'sp', lastKind = null, lastSide = 'sp', sepBefore = '';
      for (var i = 0; i < bits.length; i += 2) {
        var c = bits[i], sep = i > 0 ? bits[i - 1] : '', eaten = false;
        var cueOpp = /\b(?:tegenstander\w*|tegenpartij|zij|ze|hun|thuisploeg|bezoekers|tegenpartij)\b/.test(c), cueUs = /\b(?:we|wij|ons|onze|marke|kfc)\b/.test(c);
        if (cueOpp) side = 'opp'; else if (cueUs) side = 'sp';
        var blocked = /@[a-z]{2}@/.test(c) || new RegExp(KW.goal.source).test(c) || new RegExp(KW.own.source).test(c) || /tegen\s?(?:doelpunt|goal)/.test(c) ||
          KW.penSave.test(c) || KW.penMiss.test(c) || KW.assist.test(c) || KW.yellow.test(c) || KW.red.test(c);
        if (!blocked) {
          var mt = new RegExp(TYPE_RE).exec(c), n = null, sd = side;
          if (mt) {
            var kind = teamKey(mt[1]), pair = new RegExp('\\b(\\d{1,2})\\s*[-:\\u2013]\\s*(\\d{1,2})\\b').exec(c);
            if (pair) {
              var a = parseInt(pair[1], 10), b = parseInt(pair[2], 10);
              if (/\btegen\b/.test(c) && /\bvoor\b/.test(c) && c.search(/\btegen\b/) < c.search(/\bvoor\b/)) { var tmp = a; a = b; b = tmp; }
              teamAdd(kind, 'sp', a); teamAdd(kind, 'opp', b); lastKind = kind; eaten = true;
            } else {
              var nm = new RegExp('(?:\\b(\\d{1,2}|' + Object.keys(NUMW).join('|') + ')\\s*(?:x\\s*)?' + TYPE_RE + '|' + TYPE_RE + '\\W{0,3}(\\d{1,2})\\b)').exec(c);
              if (nm) {
                n = nm[1] ? (NUMW[nm[1]] || parseInt(nm[1], 10)) : parseInt(nm[4], 10);
                var after = c.slice(nm.index + nm[0].length);
                if (/^\s*(?:voor|door)\s+(?:de\s+)?(?:tegenstander|tegenpartij|zij|hun)\b|^\s*tegen\s+(?:ons|marke)\b/.test(after) || (/^\s*(?:tegen)\b(?!\s+\w)/.test(after) && cueOpp === false && /^\s*tegen\s*$/.test(after))) sd = 'opp';
                else if (/^\s*voor\s+(?:ons|marke|kfc)\b|^\s*voor\s*$/.test(after)) sd = 'sp';
                teamAdd(kind, sd, n); lastKind = kind; lastSide = sd; eaten = true;
              }
            }
          } else {
            /* "1 tegen" of "3 voor": zelfde soort als de vorige deelzin */
            var el = /^\W*(?:en\s+)?(\d{1,2}|een|twee|drie|vier|vijf|zes)\s+(tegen|voor)\W*$/.exec(c);
            if (el && lastKind) { teamAdd(lastKind, el[2] === 'tegen' ? 'opp' : 'sp', NUMW[el[1]] || parseInt(el[1], 10)); eaten = true; }
            /* "de tegenstander 3" of "wij 5": zelfde soort als de vorige deelzin */
            var el2 = /^\W*(?:en\s+)?(?:de\s+)?(tegenstander\w*|tegenpartij|zij|ze|hun|wij|we|ons|marke|kfc)\W+(?:met\W+)?(\d{1,2}|een|twee|drie|vier|vijf|zes)\W*$/.exec(c);
            if (!eaten && el2 && lastKind) { teamAdd(lastKind, /^(?:wij|we|ons|marke|kfc)$/.test(el2[1]) ? 'sp' : 'opp', NUMW[el2[2]] || parseInt(el2[2], 10)); eaten = true; }
          }
        }
        if (!eaten) { out.push((out.length ? sep : '') + c); }
        else if (!out.length) { sepBefore = ''; }
      }
      return out.join('').replace(/^[\s,;]+|[\s,;]+$/g, '');
    }

    sentencesOf(mz.s).forEach(function (sent) {
      /* teamtellingen: "hoekschoppen 5-3", "we hadden 4 corners en 2 vrije trappen, zij 1 corner" */
      sent = teamCounts(sent); if (!sent) return;
      /* uitslag */
      var sc = /(?:uitslag|eindstand|eindscore|score|wint|winnen|wonnen|won|gewonnen|verliest|verliezen|verloren|verloor|verlies|gelijkgespeeld|gelijk|gelijkspel|winst|nederlaag|zege)\b[^0-9]{0,25}?(\d+)\s*[-:]\s*(\d+)/.exec(sent) || /^\s*(\d+)\s*[-:]\s*(\d+)\s*$/.exec(sent);
      if (sc) {
        var a = parseInt(sc[1], 10), b = parseInt(sc[2], 10), w = sent;
        if (/\b(?:won\w*|wint|winnen|gewonnen|winst|zege)\b/.test(w)) { team.score_for = Math.max(a, b); team.score_against = Math.min(a, b); }
        else if (/\b(?:verlo\w*|verlies\w*|verliez\w*|nederlaag)\b/.test(w)) { team.score_for = Math.min(a, b); team.score_against = Math.max(a, b); }
        else { team.score_for = a; team.score_against = b; }
        sent = sent.replace(sc[0], ' ').replace(/^[\s,;:\-]+|[\s,;:\-]+$/g, '');
        if (!sent) return;
      }
      /* lijsten: "Doelpunten: Jarne (assist Jelle), Bob uit corner" en "Assists: Jelle, Thomas" */
      var hd = /^\s*(goals?|doelpunten|doelpuntenmakers|scorers?)\s*[:\-]\s*(.+)$/.exec(sent);
      if (hd) { splitTop(hd[2]).forEach(function (part) { handle(part.replace(/[()]/g, ', '), 'goal'); }); return; }
      hd = /^\s*(assists?|assisten)\s*[:\-]\s*(.+)$/.exec(sent);
      if (hd) {
        var ar = rx('{M}\\s*\\(?\\s*(\\d+)?', 'g'), am;
        while ((am = ar.exec(hd[2]))) { for (var q = 0, nn = am[2] ? Math.min(9, parseInt(am[2], 10)) : 1; q < nn; q++) ev({ k: 'assist', m: dec(am[1]) }); }
        return;
      }
      /* opsplitsen */
      var parts = anchors(sent) > 1 ? splitTop(sent) : [sent], merged = [];
      var pending = '';
      parts.forEach(function (p) {
        var k = kindOf(p), prev = merged[merged.length - 1];
        if (mentionOnly(p)) {
          if (prev && (prev.kind === 'card' || prev.kind === 'motm' || prev.kind === 'lineup' || prev.kind === 'bench' || prev.kind === 'mins')) prev.text += ', ' + p; else pending += p + ', ';
          return;
        }
        if ((k === null || (k === 'goal' && !new RegExp(KW.goal.source).test(p) && !/@[a-z]{2}@/.test(p))) && prev) { prev.text += ', ' + p; return; }
        merged.push({ text: pending + p, kind: null }); pending = '';
        merged[merged.length - 1].kind = kindOf(merged[merged.length - 1].text);
      });
      if (pending && merged.length) merged[merged.length - 1].text += ', ' + pending;
      else if (pending) merged.push({ text: pending, kind: kindOf(pending) });
      merged.forEach(function (cl) { handle(cl.text.replace(/[()]/g, ', '), kindOf(cl.text)); });
    });

    function handle(c, kind) {
      var ms = mIn(c);
      if (!kind) { if (ms.length || labelize(c).split(' ').length > 2) unparsed.push(labelize(c)); return; }
      if (!ms.length && (kind === 'card' || kind === 'sub' || kind === 'mins') && lastSubject != null) { c += ' ' + ph(lastSubject); ms = [lastSubject]; }
      if (kind === 'motm') {
        var rank = 0;
        var re = rx('(?:(?:^|[\\s,:(])(?:([1-3])e|(eerste|tweede|derde)(?:\\s+plaats)?|plaats\\s+([1-3]))\\W+)?{M}', 'g'), m, used = {};
        while ((m = re.exec(c))) {
          var r = m[1] ? parseInt(m[1], 10) : m[2] ? { eerste: 1, tweede: 2, derde: 3 }[m[2]] : m[3] ? parseInt(m[3], 10) : ++rank;
          if (m[1] || m[2] || m[3]) rank = r;
          if (r >= 1 && r <= 3 && !used[r]) { used[r] = 1; ev({ k: 'motm', m: dec(m[4]), rank: r }); }
        }
        if (!ms.length) unparsed.push(labelize(c));
        return;
      }
      if (kind === 'lineup' || kind === 'bench') {
        ms.forEach(function (m) { ev({ k: 'minutes', m: m, v: kind === 'lineup' ? 90 : 0, weak: true }); });
        /* uitgeschreven minuten in dezelfde lijst */
        directMinutes(c);
        return;
      }
      if (kind === 'own') {
        if (ms.length && !/\b(?:tegenstander|hun|zij|ze)\b/.test(c)) ms.forEach(function (m) { ev({ k: 'own_goals', m: m }); });
        else team.oppOwnGoals = (team.oppOwnGoals || 0) + 1;
        return;
      }
      if (kind === 'ga') {
        var cause = KW.corner.test(c) ? 'ga_corner' : KW.free.test(c) ? 'ga_free' : KW.pen.test(c) ? 'ga_pen' :
          /\b(?:fout\w*|balverlies|slordig\w*|misverstand|cadeau)\b/.test(c) ? 'ga_error' : /\b(?:kwaliteit|mooi\w*|prachtig\w*|schitterend\w*|afstandsschot|knap\w*)\b/.test(c) ? 'ga_quality' : 'ga_onbekend';
        var n = numberIn(c) || 1;
        team.ga = team.ga || {}; team.ga[cause] = (team.ga[cause] || 0) + n;
        return;
      }
      if (kind === 'pensave') { (ms.length ? [ms[0]] : []).forEach(function (m) { ev({ k: 'pen_saved', m: m }); }); if (!ms.length) unparsed.push(labelize(c)); return; }
      if (kind === 'penmiss') { (ms.length ? [ms[0]] : []).forEach(function (m) { ev({ k: 'pen_missed', m: m }); }); if (!ms.length) unparsed.push(labelize(c)); return; }
      if (kind === 'card') {
        var two = /\b(?:2|twee)\s*(?:x|keer|maal)?\s*(?:geel|gele)\b|\bdubbel\w*\s*(?:geel|gele)\b|\btweede\s+(?:geel|gele)\b|\b2e\s+(?:geel|gele)\b/.test(c);
        var isRed = new RegExp(KW.red.source).test(c), isYellow = new RegExp(KW.yellow.source).test(c);
        if (!ms.length) { unparsed.push(labelize(c)); return; }
        ms.forEach(function (m) {
          if (isRed && !(isYellow && two)) ev({ k: 'red', m: m });
          if (isYellow) ev({ k: 'yellow', m: m, n: two ? 2 : 1 });
        });
        return;
      }
      if (kind === 'sub') { if (!subs(c, ms)) { if (!directMinutes(c)) unparsed.push(labelize(c)); } return; }
      if (kind === 'mins') { if (!directMinutes(c)) unparsed.push(labelize(c)); return; }
      goal(c, ms);
    }

    function numberIn(c) {
      var m = /(?:^|[^@a-z0-9])(\d{1,2})(?![\d'a-z])/.exec(c.replace(/@[a-z]{2}@/g, ' ')); if (m) return parseInt(m[1], 10);
      m = /\b(twee|drie|vier)\b/.exec(c); return m ? { twee: 2, drie: 3, vier: 4 }[m[1]] : 0;
    }
    function directMinutes(c) {
      var found = false, re = rx('{M}(?:\\s+\\w+){0,2}?\\s*(\\d{1,3})\\s*(?:min\\w*|\')', 'g'), m;
      while ((m = re.exec(c))) { ev({ k: 'minutes', m: dec(m[1]), v: Math.min(130, parseInt(m[2], 10)) }); found = true; }
      re = rx('{M}(?:\\s+\\w+){0,2}?\\s+(?:volledig\\w*|(?:de\\s+)?(?:hele|volledige|ganse)\\s+(?:wedstrijd|match)|90\\s*min\\w*)', 'g');
      while ((m = re.exec(c))) { ev({ k: 'minutes', m: dec(m[1]), v: 90 }); found = true; }
      re = rx('^\\W*{M}\\W*(\\d{2,3})\\W*$', 'g');
      while ((m = re.exec(c))) { ev({ k: 'minutes', m: dec(m[1]), v: Math.min(130, parseInt(m[2], 10)) }); found = true; }
      re = rx('{M}[^@]*?\\b(?:op de bank|bank gebleven|niet gespeeld|niet ingevallen|geen minuten)\\b', 'g');
      while ((m = re.exec(c))) { ev({ k: 'minutes', m: dec(m[1]), v: 0 }); found = true; }
      return found;
    }
    function subs(c, ms) {
      var cl = c.replace(/@[a-z]{2}@/g, function (x) { return x; });
      var minute = null, nm = /(?:^|[^@a-z0-9])(\d{1,3})(?![\d])/.exec(cl.replace(/@[a-z]{2}@/g, ' '));
      if (nm) minute = Math.min(120, parseInt(nm[1], 10));
      var done = false, handled = {};
      var pron = /\b(?:hem|haar|hen)\b/.test(cl);
      if (minute == null && pron && lastOut) minute = lastOut.minute;
      function pushIn(m) { if (handled[m]) return; handled[m] = 1; ev({ k: 'minutes', m: m, v: minute == null ? null : Math.max(0, 90 - minute), sub: 'in' }); done = true; }
      function pushOut(m) { if (handled[m]) return; handled[m] = 1; lastOut = { m: m, minute: minute }; ev({ k: 'minutes', m: m, v: minute == null ? null : minute, sub: 'uit' }); done = true; }
      var r, m;
      r = rx('{M}\\W+(?:\\w+\\W+){0,2}?in\\b[^@]{0,40}?\\bvoor\\W+{M}', 'g'); while ((m = r.exec(cl))) { pushIn(dec(m[1])); pushOut(dec(m[2])); }
      r = rx('{M}\\W+(?:\\w+\\W+){0,3}?(?:vervangen|gewisseld|afgelost|vervanging|eruit|af)\\W+(?:door|voor|met)\\W+{M}', 'g'); while ((m = r.exec(cl))) { pushOut(dec(m[1])); pushIn(dec(m[2])); }
      r = rx('{M}\\W+(?:\\w+\\W+){0,2}?(?:viel\\w*|valt|kwam\\w*|komt|gaat)\\s+(?:er\\s*)?(?:\\w+\\s+)?in\\b', 'g'); while ((m = r.exec(cl))) { pushIn(dec(m[1])); if (pron && lastOut && lastOut.m !== dec(m[1]) && !handled[lastOut.m]) { var lo = lastOut; handled[lo.m] = 1; ev({ k: 'minutes', m: lo.m, v: minute, sub: 'uit' }); } }
      r = rx('(?:geblesseerd|uitgevallen|vervangen|gewisseld|afgelost)\\W+(?:\\w+\\W+){0,1}?{M}', 'g'); while ((m = r.exec(cl))) pushOut(dec(m[1]));
      r = rx('invaller\\w*\\W+{M}', 'g'); while ((m = r.exec(cl))) pushIn(dec(m[1]));
      r = rx('{M}\\W+(?:\\w+\\W+){0,2}?(?:geblesseerd|uitgevallen|eruit|ging\\s+(?:er\\s+)?af|gewisseld|vervangen|afgelost)', 'g'); while ((m = r.exec(cl))) pushOut(dec(m[1]));
      ms.forEach(function (x) { if (!handled[x] && done === false && /\b(?:erin|in)\b/.test(cl)) pushIn(x); });
      return done;
    }

    function goal(c, ms) {
      var text = c.replace(/\d+(?:\+\d+)?\s*'/g, ' ').replace(/\b(?:na|in|rond|op)\s+(?:de\s+)?\d+\w*\s*(?:min\w*)?/g, function (x) { return /min/.test(x) ? ' ' : x; }).replace(/\b\d+\s*-\s*\d+\b/g, ' ');
      var assists = [], type = null, m, r;
      r = rx('{M}\\W+(?:\\w+\\W+){0,1}?(?:geeft|gaf|geven|levert\\w*|leverde)\\W+(?:de\\W+|een\\W+)?assist\\W+(?:aan|op|voor|bij)\\W+{M}', 'g');
      var giver = [];
      text = text.replace(r, function (all, a, b) { assists.push(dec(a)); giver.push(dec(b)); return ' ' + ph(dec(b)) + ' '; });
      r = rx('(corner\\w*|hoekschop\\w*|vrije\\W*trap\\w*|vrijetrap\\w*|vrije\\W*schop\\w*|vrijschop\\w*)\\W+(?:genomen\\W+)?(?:van|door)\\W+{M}', 'g');
      text = text.replace(r, function (all, t, a) { assists.push(dec(a)); type = /corner|hoekschop/.test(t) ? 'g_corner' : 'g_free'; return ' '; });
      r = rx('\\b(?:assists?|assisten|aangegeven|aangeven|voorzet\\w*|voorbereid\\w*|bediend\\w*|dankzij|doorgegeven|steekpass\\w*|pass|combinatie\\w*)(?:\\W+(?:van|door|bij|aan|met|een|de|op|vanwege|vd))*\\W*{M}(?:\\s*(?:,|en|of)\\s*{M})*', 'g');
      text = text.replace(r, function (all) { mIn(all).forEach(function (x) { assists.push(x); }); return ' '; });
      var scorers = mIn(text);
      if (type == null) type = KW.pen.test(text) ? 'g_pen' : KW.free.test(text) ? 'g_free' : KW.corner.test(text) ? 'g_corner' : 'g_play';
      var globalN = 1, t2 = text.replace(/@[a-z]{2}@/g, ' ');
      var gm = /(\d+)\s*(?:x|keer|maal|goals?|doelpunt\w*|treffers?)\b/.exec(t2);
      if (gm) globalN = parseInt(gm[1], 10); else if (/\b(?:twee|2)\s*(?:keer|maal|x)\b|\bdubbelslag\b|\bdubbel\b/.test(t2)) globalN = 2; else if (/\bhattrick\b|\bdrie\s*(?:keer|maal)\b/.test(t2)) globalN = 3;
      scorers.forEach(function (s) {
        var n = globalN, pm = rx(ph(s).replace(/[@]/g, '@') + '\\s*\\(?\\s*(\\d+)\\s*(?:x|keer|maal|goals?|doelpunt\\w*)?\\s*\\)?(?![\\d\'])').exec(text);
        if (scorers.length > 1) n = pm ? parseInt(pm[1], 10) : 1;
        else if (pm && !gm) n = parseInt(pm[1], 10);
        ev({ k: 'goal', m: s, type: type, n: Math.max(1, Math.min(9, n)) });
      });
      assists.forEach(function (a) { ev({ k: 'assist', m: a }); });
      if (scorers.length) lastSubject = scorers[0];
      if (!scorers.length && !assists.length) unparsed.push(labelize(c));
    }

    return { mentions: mentions, events: events, team: team, unparsed: unparsed, notes: notes, text: text };
  }

  /* ---------------- plan bouwen uit tekst ---------------- */
  function resolveMention(mentions, m, choices, isCard, staffSet) {
    var mm = mentions[m]; if (!mm) return null;
    if (choices && choices[m]) return choices[m];
    var c = mm.cands.filter(function (r) { return isCard || !staffSet[r]; });
    return c.length === 1 ? c[0] : null;
  }
  function textPlan(parsed, choices, players) {
    var staffSet = {}; players.forEach(function (p) { if (p.staff) staffSet[p.rid] = true; });
    var rows = {}, replace = {}, warnings = [], team = {}, ambiguous = [];
    function row(rid) { return rows[rid] = rows[rid] || {}; }
    parsed.mentions.forEach(function (mm, i) {
      var used = parsed.events.some(function (e) { return e.m === i; });
      var cardUse = parsed.events.some(function (e) { return e.m === i && (e.k === 'yellow' || e.k === 'red'); });
      var cands = mm.cands.filter(function (r) { return cardUse || !staffSet[r]; });
      if (used && cands.length > 1 && !(choices && choices[i])) ambiguous.push({ m: i, label: mm.label, cands: cands });
      else if (used && !cands.length) warnings.push(mm.label + ' is geen speler van deze selectie.');
    });
    parsed.events.forEach(function (e) {
      var isCard = e.k === 'yellow' || e.k === 'red';
      var rid = resolveMention(parsed.mentions, e.m, choices, isCard, staffSet);
      if (!rid) return;
      var r = row(rid);
      if (e.k === 'goal') { replace.goals = 1; r[e.type] = (r[e.type] || 0) + e.n; }
      else if (e.k === 'assist') { replace.assists = 1; r.assists = (r.assists || 0) + 1; }
      else if (e.k === 'yellow') { replace.cards = 1; r.yellow = Math.max(r.yellow || 0, e.n || 1); }
      else if (e.k === 'red') { replace.cards = 1; r.red = 1; }
      else if (e.k === 'motm') { replace.motm = 1; r.motm = e.rank; }
      else if (e.k === 'own_goals') { replace.own_goals = 1; r.own_goals = (r.own_goals || 0) + 1; }
      else if (e.k === 'pen_missed') { replace.pen_missed = 1; r.pen_missed = (r.pen_missed || 0) + 1; }
      else if (e.k === 'pen_saved') { replace.pen_saved = 1; r.pen_saved = (r.pen_saved || 0) + 1; }
      else if (e.k === 'minutes') {
        if (e.v == null) { warnings.push('Geen minuut gevonden bij ' + parsed.mentions[e.m].label + ' (wissel). Vul de minuten zelf in.'); return; }
        var prio = e.weak ? 1 : 2;
        if (r._mp == null || prio >= r._mp) { r.minutes = e.v; r._mp = prio; }
      }
    });
    Object.keys(rows).forEach(function (k) { delete rows[k]._mp; });
    var t = parsed.team;
    if (t.score_for != null) { team.score_for = t.score_for; team.score_against = t.score_against; }
    if (t.ga) team.ga = t.ga;
    if (t.oppOwnGoals) team.oppOwnGoals = t.oppOwnGoals;
    if (t.counts) team.counts = t.counts;
    return { rows: rows, replace: Object.keys(replace), goalsMode: 'exact', team: team, ambiguous: ambiguous, warnings: warnings, unparsed: parsed.unparsed, source: 'tekst' };
  }

  /* ---------------- RBFA ---------------- */
  var MARKER = 'KFC-RBFA:';
  function isRbfa(text) { return String(text || '').replace(/^\s+/, '').indexOf(MARKER) === 0; }
  function readRbfa(text) {
    var t = String(text || '').replace(/^\s+/, '');
    if (t.indexOf(MARKER) !== 0) throw new Error('Dit zijn geen RBFA-gegevens.');
    var d; try { d = JSON.parse(t.slice(MARKER.length)); } catch (e) { throw new Error('De RBFA-gegevens zijn onvolledig gekopieerd. Klik de knop op rbfa.be opnieuw.'); }
    if (!d || !d.home || !d.away) throw new Error('De RBFA-gegevens zijn onvolledig.');
    return d;
  }
  /* event van RBFA omzetten naar een soort */
  function eventKind(ev) {
    var c = fold(ev.c || ''), t = fold(ev.t || '');
    if (/\bin\b/.test(c) || /ingebracht/.test(t)) return 'in';
    if (/\bout\b/.test(c) || /gewisseld/.test(t)) return 'out';
    if (/eigen/.test(t) || /own/.test(c)) return 'own';
    if (/strafschop|penalty/.test(t) || /\bpen/.test(c)) return /gemist|miss/.test(t) ? 'penmiss' : 'pen';
    if (/\bred\b|\brood\b/.test(c) || /\brode\b/.test(t)) return 'red';
    if (/tweede|2e|geel-rood|dubbel/.test(t) && /gele|geel|yellow/.test(t + c)) return 'yellow2';
    if (/yellow|gele|geel/.test(c + ' ' + t)) return 'yellow';
    if (/goal|doelpunt/.test(c + ' ' + t)) return 'goal';
    return null;
  }
  function splitName(name) { return words(name); }
  /* RBFA-speler zoeken in de selectie */
  function matchPlayer(rb, players) {
    var t = splitName(rb.name), nr = String(rb.nr == null ? '' : rb.nr).trim();
    if (!t.length) return null;
    var best = null;
    players.forEach(function (p) {
      var f = words(p.first), l = words(p.last); if (!f.length || !l.length) return;
      var tail = t.slice(t.length - l.length).join(' ') === l.join(' ') || t.slice(t.length - l.length).join('') === l.join('');
      var score = 0;
      if (tail && t[0] === f[0]) score = 3;
      else if (tail && t.indexOf(f[0]) >= 0) score = 3;
      else if (tail && f[0].charAt(0) === t[0].charAt(0) && nr && String(p.number) === nr) score = 2.5;
      else if (nr && String(p.number) === nr && (tail || t[0] === f[0])) score = 2;
      else if (tail) score = 1;
      if (score && (!best || score > best.score)) best = { rid: p.rid, score: score, how: score >= 3 ? 'naam' : score >= 2 ? 'nummer' : 'achternaam' };
      else if (score && best && score === best.score) best.dupe = true;
    });
    if (best && best.dupe) return { rid: null, how: 'dubbel' };
    return best && best.score >= 2 ? best : (best ? { rid: best.rid, how: 'achternaam', weak: true } : null);
  }
  /* data: RBFA-gegevens, players: speler- en staflijst van het seizoen, ctx: {} */
  function rbfaPlan(data, players, ctx) {
    ctx = ctx || {};
    var teamName = function (s) { return fold(s.name || ''); };
    var home = data.home, away = data.away, kfcSide = null;
    var hm = /marke/.test(teamName(home)), am = /marke/.test(teamName(away));
    if (hm && !am) kfcSide = 'home'; else if (am && !hm) kfcSide = 'away';
    else if (ctx.forceSide) kfcSide = ctx.forceSide;
    if (!kfcSide) throw new Error('Ik vind KFC Marke niet in deze wedstrijd (' + (home.name || '?') + ' tegen ' + (away.name || '?') + ').');
    var us = data[kfcSide], them = data[kfcSide === 'home' ? 'away' : 'home'];
    var playersOnly = players.filter(function (p) { return !p.staff; }), staffOnly = players.filter(function (p) { return p.staff; });
    var plan = { rows: {}, replace: ['cards', 'goals', 'own_goals'], goalsMode: 'total', team: {}, match: {}, warnings: [], unmatched: [], matched: [], setNumbers: {}, source: 'rbfa', staffCards: [] };
    var end = 90;
    function minutesOf(list) { var mx = 0; list.forEach(function (p) { (p.ev || []).forEach(function (e) { if (e.m > mx) mx = e.m; }); }); return mx; }
    var all = (us.players || []).concat(us.bench || []);
    var maxMin = minutesOf(all); if (maxMin > 90 && maxMin <= 125) end = Math.max(90, maxMin);
    /* score en wedstrijdgegevens */
    if (data.score && data.score.length === 2) {
      var h = int(data.score[0]), a = int(data.score[1]);
      plan.match.score_for = kfcSide === 'home' ? h : a; plan.match.score_against = kfcSide === 'home' ? a : h;
    }
    if (data.date) plan.match.date = data.date;
    if (data.kickoff) plan.match.kickoff = data.kickoff;
    plan.match.home = kfcSide === 'home';
    plan.match.opponent = cleanOpponent(them.name || '');
    plan.match.opponentRaw = them.name || '';
    plan.match.competition = data.competition || '';

    function handle(rb, starter) {
      var evs = (rb.ev || []).map(function (e) { return { k: eventKind(e), m: e.m, raw: e }; });
      var inE = evs.filter(function (e) { return e.k === 'in'; })[0], outE = evs.filter(function (e) { return e.k === 'out'; })[0];
      var red = evs.filter(function (e) { return e.k === 'red' || e.k === 'yellow2'; })[0];
      var minutes;
      var from = starter ? 0 : (inE ? inE.m : null);
      if (from == null) minutes = 0;
      else {
        var to = outE ? outE.m : end;
        if (red && red.k === 'red' && (!outE || red.m < to)) to = red.m;
        minutes = Math.max(0, Math.min(130, to - from));
      }
      var f = { minutes: minutes, g_play: 0, g_pen: 0, yellow: 0, red: 0, own_goals: 0 };
      evs.forEach(function (e) {
        if (e.k === 'goal') f.g_play++; else if (e.k === 'pen') f.g_pen++; else if (e.k === 'own') f.own_goals++;
        else if (e.k === 'yellow') f.yellow++; else if (e.k === 'yellow2') f.yellow = Math.max(f.yellow, 2); else if (e.k === 'red') f.red = 1;
      });
      if (f.yellow > 2) f.yellow = 2;
      var unknown = evs.filter(function (e) { return e.k == null; }).map(function (e) { return (e.raw.t || e.raw.c || '?') + ' ' + e.m + "'"; });
      return { f: f, unknown: unknown, starter: starter };
    }
    var seen = {};
    function addPlayer(rb, starter) {
      var r = handle(rb, starter), mp = matchPlayer(rb, playersOnly);
      var entry = { rbfa: rb, f: r.f, starter: starter, unknown: r.unknown };
      if (mp && mp.rid && !seen[mp.rid]) {
        seen[mp.rid] = 1; entry.rid = mp.rid; entry.how = mp.how; entry.weak = !!mp.weak;
        plan.rows[mp.rid] = r.f; plan.matched.push(entry);
        var pl = playersOnly.filter(function (p) { return p.rid === mp.rid; })[0];
        if (pl && !String(pl.number || '').trim() && rb.nr != null && String(rb.nr).trim() !== '') plan.setNumbers[mp.rid] = String(rb.nr).trim();
      } else { entry.rid = null; plan.unmatched.push(entry); }
      if (r.unknown.length) plan.warnings.push(rb.name + ': onbekende gebeurtenis (' + r.unknown.join(', ') + '). Controleer zelf.');
    }
    (us.players || []).forEach(function (p) { if (p.name) addPlayer(p, true); });
    (us.bench || []).forEach(function (p) { if (p.name) addPlayer(p, false); });
    /* staf: enkel kaarten */
    (us.staff || []).forEach(function (s) {
      var evs = (s.ev || []).map(function (e) { return eventKind(e); }).filter(Boolean);
      var y = evs.filter(function (k) { return k === 'yellow'; }).length, rd = evs.filter(function (k) { return k === 'red' || k === 'yellow2'; }).length;
      if (!y && !rd) return;
      var mp = matchPlayer({ name: s.name, nr: '' }, staffOnly);
      if (mp && mp.rid) { plan.rows[mp.rid] = { yellow: Math.min(2, y), red: rd ? 1 : 0 }; plan.staffCards.push({ rid: mp.rid, name: s.name }); }
      else plan.warnings.push('Staf ' + s.name + ' kreeg een kaart maar zit niet in de selectie.');
    });
    /* controles */
    var goals = 0; Object.keys(plan.rows).forEach(function (k) { goals += (plan.rows[k].g_play || 0) + (plan.rows[k].g_pen || 0); });
    plan.goalsFound = goals;
    if (plan.match.score_for != null && goals !== plan.match.score_for) plan.warnings.push('RBFA toont ' + goals + ' doelpunt(en) van KFC Marke bij de spelers, de uitslag is ' + plan.match.score_for + '. Eigen doelpunten van de tegenstander tellen enkel in de uitslag.');
    if (!(us.players || []).length) plan.warnings.push('Er staat nog geen opstelling op de RBFA-pagina.');
    plan.ambiguous = [];
    return plan;
  }
  /* toewijzen van een niet herkende RBFA-speler aan iemand uit de selectie (keuze van de gebruiker) */
  function assignUnmatched(plan, index, rid) {
    var e = plan.unmatched[index]; if (!e || !rid || plan.rows[rid]) return false;
    e.rid = rid; plan.rows[rid] = e.f; return true;
  }
  function cleanOpponent(n) {
    var s = String(n || '').replace(/\s+/g, ' ').trim(), prev;
    var pre = /^(?:(?:[A-Za-z]\.){2,4}\s*|KFC|KSK|KSV|KVK|KVC|KRC|KVV|KVO|KV|VK|SK|FC|RC|VC|SV|VV|AFC|RSC|R|K)\.?\s+/i;
    do { prev = s; s = s.replace(pre, ''); } while (s !== prev && s.length > 3);
    return s.replace(/\s+[A-C]$/, '').trim();
  }

  /* ---------------- omschrijving voor het voorbeeld ---------------- */
  function describe(f) {
    var out = [];
    if (f.minutes != null) out.push(f.minutes + ' min');
    var g = (f.g_play || 0) + (f.g_corner || 0) + (f.g_free || 0) + (f.g_pen || 0);
    if (g) {
      var parts = []; if (f.g_corner) parts.push(f.g_corner + ' na corner'); if (f.g_free) parts.push(f.g_free + ' vrije trap'); if (f.g_pen) parts.push(f.g_pen + ' strafschop');
      out.push(g + (g === 1 ? ' doelpunt' : ' doelpunten') + (parts.length ? ' (' + parts.join(', ') + ')' : ''));
    }
    if (f.assists) out.push(f.assists + (f.assists === 1 ? ' assist' : ' assists'));
    if (f.yellow) out.push(f.yellow === 2 ? '2 gele kaarten' : 'gele kaart');
    if (f.red) out.push('rode kaart');
    if (f.motm) out.push('man van de match: ' + f.motm + 'e');
    if (f.own_goals) out.push('eigen doelpunt');
    if (f.pen_missed) out.push('gemiste strafschop');
    if (f.pen_saved) out.push('strafschop gestopt');
    return out;
  }

  /* ---------------- de knop voor op rbfa.be (bookmarklet) ----------------
     Deze functie moet volledig op zichzelf staan: ze wordt als tekst in de knop gezet en draait op de pagina van rbfa.be. */
  function rbfaExtract(doc) {
    function txt(e) { return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }
    var MONTHS = { januari: 1, februari: 2, maart: 3, april: 4, mei: 5, juni: 6, juli: 7, augustus: 8, september: 9, oktober: 10, november: 11, december: 12 };
    var table = doc.querySelector('.opstelling-tabel');
    if (!table) throw new Error('Geen opstelling gevonden. Open eerst de pagina van één wedstrijd op rbfa.be.');
    function events(cell) {
      var r = [], items = cell.querySelectorAll('.extra-info .item');
      for (var i = 0; i < items.length; i++) {
        var it = items[i], cls = String(it.className || '');
        if (/staff-function/.test(cls)) continue;
        var m = /(\d+)(?:\s*\+\s*(\d+))?/.exec(it.textContent || '');
        r.push({ c: cls.replace(/\bitem\b|\bng-star-inserted\b/g, '').replace(/\s+/g, ' ').trim(), t: it.getAttribute('title') || '', m: m ? parseInt(m[1], 10) : null });
      }
      return r;
    }
    function nameOf(cell) {
      var n = cell.querySelector('.name');
      var s = txt(n || cell);
      return s.replace(/\((?:GK|C|K|CAP)\)/gi, ' ').replace(/\s+/g, ' ').trim();
    }
    function fn(cell) { var f = cell.querySelector('.extra-info .item[class*="staff-function"]'); return txt(f); }
    var res = { home: { name: '', players: [], bench: [], staff: [] }, away: { name: '', players: [], bench: [], staff: [] } };
    var wrap = table.querySelectorAll('table');
    function rows(t, kind) {
      if (!t) return;
      var trs = t.querySelectorAll('tr');
      for (var i = 0; i < trs.length; i++) {
        var tr = trs[i], cells = tr.children;
        if (/\bgame\b/.test(tr.className || '')) {
          var l = tr.querySelector('.team.left h4, .left h4'), r = tr.querySelector('.team.right h4, .right h4');
          if (l) res.home.name = txt(l); if (r) res.away.name = txt(r);
          continue;
        }
        if (kind === 'staff') {
          for (var c = 0; c < cells.length; c++) {
            if (!/\bstaff\b/.test(cells[c].className || '') || !nameOf(cells[c])) continue;
            var right = /text-align-right/.test(cells[c].className || '');
            (right ? res.away : res.home).staff.push({ name: nameOf(cells[c]), fn: fn(cells[c]), ev: events(cells[c]) });
          }
          continue;
        }
        var ln = null, lp = null, rp = null, rn = null;
        for (var k = 0; k < cells.length; k++) {
          var td = cells[k], cl = String(td.className || '');
          if (/\bplayer\b/.test(cl)) { if (/text-align-right/.test(cl)) rp = td; else lp = td; }
          else if (/\bdigit\b/.test(cl)) { if (rp) rn = td; else if (!lp) ln = td; else if (!rp) rn = td; }
        }
        function add(cell, nrCell, side) {
          if (!cell || !nameOf(cell)) return;
          var raw = txt(cell.querySelector('.name') || cell);
          (kind === 'bench' ? side.bench : side.players).push({ nr: txt(nrCell), name: nameOf(cell), gk: /\(GK\)/i.test(raw), ev: events(cell) });
        }
        add(lp, ln, res.home); add(rp, rn, res.away);
      }
    }
    rows(wrap[0], 'starters'); rows(wrap[1], 'bench'); rows(wrap[2], 'staff');
    if (!res.home.name) { var h4 = doc.querySelectorAll('.team h4'); if (h4.length > 1) { res.home.name = txt(h4[0]); res.away.name = txt(h4[1]); } }
    var info = txt(doc.querySelector('.event-summery-info p')), dm = /(\d{1,2})\s+([a-zA-Zéû]+)\s+(\d{4})(?:\s*-\s*(\d{1,2}):(\d{2}))?/.exec(info);
    var out = { v: 1, url: String(doc.location && doc.location.href || ''), competition: txt(doc.querySelector('h1')), home: res.home, away: res.away };
    if (dm && MONTHS[dm[2].toLowerCase()]) {
      var mo = MONTHS[dm[2].toLowerCase()];
      out.date = dm[3] + '-' + (mo < 10 ? '0' : '') + mo + '-' + (dm[1].length < 2 ? '0' : '') + dm[1];
      if (dm[4]) out.kickoff = (dm[4].length < 2 ? '0' : '') + dm[4] + ':' + dm[5];
    }
    var sm = /(\d+)\s*-\s*(\d+)/.exec(txt(doc.querySelector('h3.score')));
    if (sm) out.score = [parseInt(sm[1], 10), parseInt(sm[2], 10)];
    return out;
  }
  function bookmarkletSource() {
    var code = '(function(){try{var ex=' + rbfaExtract.toString() + ';var d=ex(document);var s="' + MARKER + '"+JSON.stringify(d);' +
      'function done(){var b=document.createElement("div");b.textContent="KFC Marke: wedstrijd gekopieerd. Ga naar de app en plak de gegevens.";b.style.cssText="position:fixed;z-index:2147483647;top:12px;left:50%;transform:translateX(-50%);background:#1fb457;color:#031a0c;font:600 15px sans-serif;padding:12px 18px;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.4)";document.body.appendChild(b);setTimeout(function(){b.remove()},5000)}' +
      'function fb(){var t=document.createElement("textarea");t.value=s;t.style.cssText="position:fixed;top:0;left:0;width:80%;height:120px;z-index:2147483647";document.body.appendChild(t);t.select();try{document.execCommand("copy");done()}catch(e){alert("Selecteer en kopieer de tekst bovenaan zelf (Ctrl+C).")}setTimeout(function(){t.remove()},8000)}' +
      'if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(s).then(done,fb)}else{fb()}}catch(e){alert("KFC Marke: "+e.message)}})()';
    return code;
  }
  function bookmarkletHref() { return 'javascript:' + encodeURIComponent(bookmarkletSource()); }

  return {
    fold: fold, parseText: parseText, textPlan: textPlan, rbfaPlan: rbfaPlan, readRbfa: readRbfa, isRbfa: isRbfa, MARKER: MARKER,
    assignUnmatched: assignUnmatched, describe: describe, rbfaExtract: rbfaExtract, bookmarkletSource: bookmarkletSource, bookmarkletHref: bookmarkletHref,
    matchPlayer: matchPlayer, eventKind: eventKind, cleanOpponent: cleanOpponent
  };
});
