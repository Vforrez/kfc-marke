/* KFC Marke statistieken: kleine hulpfuncties voor de weergave. */
(function (root) {
  'use strict';
  var KFC = root.KFC = root.KFC || {};
  var E = KFC.engine;
  var U = {};

  U.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  var esc = U.esc;

  function parse(d) { return d ? new Date(d + 'T12:00:00') : null; }
  U.dateShort = function (d) {
    var x = parse(d); if (!x) return '';
    return x.toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');
  };
  U.dateLong = function (d) {
    var x = parse(d); if (!x) return '';
    return x.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };
  U.dayMonth = function (d) {
    var x = parse(d); if (!x) return '';
    return x.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' }).replace('.', '');
  };
  U.today = function () { var t = new Date(); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); };
  U.plus = function (n) { n = Number(n) || 0; return n > 0 ? '+' + n : String(n); };
  U.int = function (n) { return (Number(n) || 0).toLocaleString('nl-BE'); };
  U.dec = function (n, d) { return (Number(n) || 0).toLocaleString('nl-BE', { minimumFractionDigits: d == null ? 1 : d, maximumFractionDigits: d == null ? 1 : d }); };
  U.dash = function (n) { return n ? String(n) : '<span class="zero">0</span>'; };

  U.posBadge = function (pos) {
    if (!pos) return '<span class="pos pos-none" title="Positie nog niet gekozen">?</span>';
    return '<span class="pos pos-' + esc(pos) + '" title="' + esc(E.POS_LABEL[pos] || pos) + '">' + esc(E.POS_SHORT[pos] || '?') + '</span>';
  };
  U.resultChip = function (m) {
    var r = E.result(m);
    if (!r) return '<span class="res res-none" title="Nog niet gespeeld">&ndash;</span>';
    return '<span class="res res-' + r + '" title="' + { W: 'Gewonnen', G: 'Gelijk', V: 'Verloren' }[r] + '">' + r + '</span>';
  };
  U.score = function (m) {
    if (E.result(m) == null) return '';
    return m.home ? m.score_for + '-' + m.score_against : m.score_against + '-' + m.score_for;
  };
  U.matchTitle = function (m) { return m.home ? 'KFC Marke - ' + m.opponent : m.opponent + ' - KFC Marke'; };

  U.icon = function (name) {
    var p = {
      home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
      star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
      users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M18 14.8c1.8.7 3 2.4 3 5.2"/>',
      cal: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
      more: '<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>',
      card: '<rect x="7" y="3.5" width="10" height="17" rx="1.5"/>',
      chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
      gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
      close: '<path d="M6 6l12 12M18 6L6 18"/>',
      edit: '<path d="M4 20l4.2-1 10.6-10.6a1.6 1.6 0 0 0 0-2.3l-.9-.9a1.6 1.6 0 0 0-2.3 0L5 15.8z"/>',
      trash: '<path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/>',
      logout: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>'
    }[name] || '';
    return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  };

  /* Meldingen */
  U.toast = function (msg, kind) {
    var box = document.getElementById('toasts'); if (!box) return;
    var t = document.createElement('div');
    t.className = 'toast ' + (kind || 'ok'); t.setAttribute('role', kind === 'err' ? 'alert' : 'status');
    t.textContent = msg; box.appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 300); }, kind === 'err' ? 6000 : 2200);
  };

  /* Bevestigingsvenster dat een belofte teruggeeft. */
  U.confirm = function (o) {
    return new Promise(function (resolve) {
      var back = document.createElement('div'); back.className = 'modal-back';
      back.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt"><h2 id="mt">' + esc(o.title || 'Zeker?') + '</h2><p>' + esc(o.text || '') + '</p>' +
        '<div class="modal-actions"><button class="btn ghost" data-r="0">' + esc(o.cancel || 'Annuleren') + '</button><button class="btn ' + (o.danger ? 'danger' : 'primary') + '" data-r="1">' + esc(o.ok || 'Bevestigen') + '</button></div></div>';
      document.body.appendChild(back);
      var prev = document.activeElement;
      function done(v) { back.remove(); document.removeEventListener('keydown', key); if (prev && prev.focus) prev.focus(); resolve(v); }
      function key(e) { if (e.key === 'Escape') done(false); }
      back.addEventListener('click', function (e) { var b = e.target.closest('[data-r]'); if (b) done(b.getAttribute('data-r') === '1'); else if (e.target === back) done(false); });
      document.addEventListener('keydown', key);
      back.querySelector('[data-r="0"]').focus();
    });
  };

  /* Eenvoudig invoerveld in een venster (bv. nieuwe naam). */
  U.download = function (name, text, type) {
    var blob = new Blob([text], { type: type || 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  U.n = E.num;
  KFC.util = U;
})(window);
