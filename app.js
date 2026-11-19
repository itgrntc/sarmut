/* SARMUT © 2026 PT Persada Medika Utama.
 * Dibangun oleh Tim IT PT Persada Medika Utama. Dirancang oleh Deiky Catur Hadi.
 * Seluruh hak cipta dilindungi.
 */
/* SARMUT — aplikasi frontend (vanilla JS). API = MockAPI di mockup, ApiClient (Apps Script) di produksi. */
(function () {
  var API = window.SARMUT_API || MockAPI;
  var L = Sarmut;
  var root = document.getElementById("app");
  var S = { view: "beranda", user: null, roles: null, ctx: null, all: null, unit: null, bulan: null, form: {}, rtlDraft: {}, carryEdit: {}, drawer: null, modal: null, toast: null, inbox: [], usulan: [], usulanF: { status: "DIAJUKAN", unit: "ALL" }, usulanUnit: null, reply: null, review: null, admin: { tab: "unit", unit: "HR", q: "", logQ: "", logA: "ALL" }, rtlFilter: { status: "TERBUKA", unit: "ALL" }, cetak: { unit: null, bulan: null }, openNote: {}, kep: { unit: "ALL" }, per: { tab: "minta" }, dok: { unit: "ALL", bulan: 0, q: "" } };

  /* ---------------- util ---------------- */
  function esc(s) { return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(sel, el) { return (el || root).querySelector(sel); }
  function fmtDate(iso, withTime) {
    if (!iso) return "";
    var d = new Date(iso);
    var s = d.getDate() + " " + L.BULAN[d.getMonth()] + " " + d.getFullYear();
    if (withTime) s += " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    return s;
  }
  function today() { return new Date(S.ctx.today); }
  function daysBetween(a, b) { return Math.round((b - a) / 864e5); }
  function unitOf(k) { return S.ctx.units.filter(function (u) { return u.kode === k; })[0]; }
  function person(nik) { return S.ctx.people.filter(function (p) { return p.nik === nik; })[0] || { nik: nik, ini: nik, nama: nik }; }
  function indsOf(unit) { return S.all.indikator.filter(function (i) { return i.unit === unit; }).sort(function (a, b) { return a.urutan - b.urutan; }); }
  function capOf(id) { return S.all.capaian[id] || {}; }
  function lapOf(unit, m) { return S.all.laporan.filter(function (x) { return x.unit === unit && x.bulan === m; })[0]; }
  function cs(ind, m, capm) { return L.cellStatus(ind, capm || capOf(ind.id), m, { lastDue: S.ctx.lastDue, openMonth: S.ctx.openMonth }); }
  function visibleUnits() { return S.ctx.units.filter(function (u) { return S.roles.units.indexOf(u.kode) >= 0; }); }
  function rtlOpen(unit) { return S.all.rtl.filter(function (r) { return r.status === "TERBUKA" && (!unit || r.unit === unit); }); }

  function pctx() { return { tahun: S.ctx.tahun, today: today(), tglBatas: S.ctx.settings.tgl_batas, overrides: S.all ? (S.all.periode || []) : [] }; }
  function pstate(unit, m) { return L.periodState(pctx(), unit, m); }
  function lapState(unit, m) {
    var x = lapOf(unit, m);
    if (x && x.status !== "DRAFT") return { key: x.status, lap: x };
    var ps = pstate(unit, m);
    var map = { BERJALAN: x ? "DRAFT" : "BERJALAN", JENDELA: x ? "DRAFT" : "JENDELA", DIBUKA: "DIBUKA", MINTA: "MINTA", DITUTUP: "DITUTUP", BELUM: "BELUM" };
    return { key: map[ps.state], lap: x, ps: ps };
  }
  var LAP_UI = {
    DISETUJUI: { cls: "m-ok", pill: "pill-ok", t: "Disetujui", short: "✓" },
    MENUNGGU_MANAJER: { cls: "m-proc", pill: "pill-prog", t: "Menunggu Manajer", short: "MGR" },
    MENUNGGU_TIM_MUTU: { cls: "m-proc", pill: "pill-prog", t: "Menunggu Tim Mutu", short: "MUTU" },
    MENUNGGU_DIREKTUR: { cls: "m-proc", pill: "pill-prog", t: "Menunggu Direktur", short: "DIR" },
    DIKEMBALIKAN: { cls: "m-draft", pill: "pill-warn", t: "Dikembalikan", short: "↩" },
    DRAFT: { cls: "m-draft", pill: "pill-warn", t: "Draf", short: "DRAF" },
    JENDELA: { cls: "m-draft", pill: "pill-warn", t: "Menunggu laporan (masih dalam batas)", short: "•" },
    DITUTUP: { cls: "m-late", pill: "pill-fail", t: "Ditutup · belum lapor", short: "🔒" },
    DIBUKA: { cls: "m-draft", pill: "pill-warn", t: "Dibuka khusus oleh Tim Mutu", short: "BUKA" },
    MINTA: { cls: "m-proc", pill: "pill-prog", t: "Menunggu pembukaan", short: "?" },
    BERJALAN: { cls: "m-none", pill: "pill-na", t: "Periode berjalan", short: "•" },
    BELUM: { cls: "m-future", pill: "pill-na", t: "Belum jatuh tempo", short: "" }
  };
  var CELL_TXT = { ok: "Tercapai", fail: "Tidak tercapai", prog: "Progres (belum dinilai)", note: "Catatan kegiatan", empty: "Belum diisi", na: "Tidak dijadwalkan", tba: "Belum tersedia", future: "Belum jatuh tempo", lock: "Data rahasia" };

  var IC = {
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    upload: '<path d="M12 16V4m0 0-4 4m4-4 4 4M4 20h16"/>',
    download: '<path d="M12 4v12m0 0-4-4m4 4 4-4M4 20h16"/>',
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    inbox: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
    doc: '<path d="M6 2h9l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    out: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 17l5-5-5-5M15 12H3"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    msg: '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
    clip: '<path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.3 3.3 0 0 1 4.7 4.7L9.2 17.2a1.7 1.7 0 0 1-2.4-2.4L14.5 7"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  };
  function ic(n, extra) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || "") + ">" + IC[n] + "</svg>"; }
  var MARK = '<svg class="brand-mark" viewBox="0 0 36 36" aria-hidden="true"><rect x="1" y="1" width="34" height="34" rx="8" fill="var(--brand)"/><rect x="8" y="8" width="8.5" height="8.5" rx="1.5" fill="var(--brand-ink)" opacity=".95"/><rect x="19.5" y="8" width="8.5" height="8.5" rx="1.5" fill="var(--brand-ink)" opacity=".55"/><rect x="8" y="19.5" width="8.5" height="8.5" rx="1.5" fill="var(--brand-ink)" opacity=".55"/><path d="m20 24 3 3 5.5-6" stroke="var(--brand-ink)" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function toast(msg) {
    S.toast = msg; renderToast();
    clearTimeout(toast._t); toast._t = setTimeout(function () { S.toast = null; renderToast(); }, 2600);
  }
  function renderToast() {
    var t = document.getElementById("toast");
    if (!S.toast) { if (t) t.remove(); return; }
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.innerHTML = ic("check", ' width="16" height="16"') + esc(S.toast);
  }
  function errToast(e) { toast(e && e.message ? e.message : String(e)); }

  /* ---------------- data load ---------------- */
  function loadAll() {
    return Promise.all([API.allData(), API.inbox(), API.usulan()]).then(function (r) { S.all = r[0]; S.inbox = r[1]; S.usulan = r[2]; });
  }

  /* ---------------- LOGIN ---------------- */
  var COPY_LINES = ["SARMUT © 2026 PT Persada Medika Utama.", "Dibangun oleh Tim IT PT Persada Medika Utama. Dirancang oleh Deiky Catur Hadi.", "Seluruh hak cipta dilindungi."];
  function copyHtml() { return COPY_LINES.map(function (l) { return esc(l); }).join("<br>"); }
  function viewLogin() {
    var personas = API.real ? [] : (API.personas || []);
    var modeCorner = API.real ? '<div class="mode-corner" id="modeBox">' +
      '<button type="button" class="mode-toggle" data-act="setMode" aria-pressed="false">Login simulasi</button>' +
      '<input type="hidden" id="loginMode" value="RIIL"><span class="hint" id="modeHint" hidden>Data latihan, terpisah dari data riil dan dihapus otomatis setiap 30 hari.</span></div>' : '';
    return '<div class="login">' +
      '<section class="login-art"><canvas id="lj" aria-hidden="true"></canvas>' +
      '<div style="display:flex;align-items:center;gap:10px">' + MARK + '<div><div class="brand-name" style="color:inherit">SARMUT</div><div class="brand-sub" style="color:inherit;opacity:.7">PT Persada Medika Utama · Granostic Center</div></div></div>' +
      '<div style="display:flex;flex-direction:column;gap:14px"><h1>Laporan sasaran mutu, satu alur untuk semua unit.</h1>' +
      '<p>Isi capaian bulanan, tindak lanjuti yang belum tercapai, dan ajukan ke Manajer, Tim Mutu, lalu Direktur. Tanpa salin-tempel antar file.</p></div>' +
      '<div class="bsc-legend">' + L.PERSP_ORDER.map(function (p) { return '<div><span class="persp-code persp-' + p + '">' + p + "</span>" + L.PERSP[p] + "</div>"; }).join("") + "</div></section>" +
      '<section class="login-form"><form id="loginForm" novalidate>' +
      '<div><div class="eyebrow">Masuk</div><h2 style="margin-top:4px">Gunakan NIK karyawan</h2></div>' +
      '<div class="field"><label for="nik">NIK</label><input class="inp mono" id="nik" inputmode="numeric" autocomplete="username" placeholder="mis. 220116"></div>' +
      '<div class="field"><label for="pw">Password</label><input class="inp" id="pw" type="password" autocomplete="current-password" placeholder="••••"><span class="hint">Login pertama memakai password dari MasterDatabase, lalu wajib diganti.</span></div>' +
      '<p id="loginErr" class="muted" style="color:var(--fail);min-height:1.2em;font-size:.82rem"></p>' +
      '<button class="btn btn-primary" type="submit">Masuk</button>' +
      (personas.length ? '<div style="margin-top:10px;display:flex;flex-direction:column;gap:8px"><div class="eyebrow">Mockup · masuk cepat sebagai</div>' : '<div style="display:none">') +
      personas.map(function (p) {
        var u = (window.__MASTER__.users.filter(function (x) { return x.nik === p.nik; })[0]) || {};
        return '<button type="button" class="persona" data-act="persona" data-nik="' + p.nik + '"><span class="avatar">' + esc(u.ini) + '</span><span><span class="who-name">' + esc(u.ini) + " · " + esc(u.jabatan) + '</span><span class="who-role" style="display:block">' + esc(p.note) + "</span></span></button>";
      }).join("") + "</div></form><footer class=\"copy-login\">" + copyHtml() + "</footer></section>" + modeCorner + "</div>";
  }
  function drawLJ() {
    var c = document.getElementById("lj"); if (!c) return;
    var r = c.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    c.width = r.width * dpr; c.height = r.height * dpr;
    var g = c.getContext("2d"); g.scale(dpr, dpr);
    var cs2 = getComputedStyle(document.documentElement);
    var line = "rgba(255,255,255,.18)", brand = "#b9a6f5";
    var mid = r.height * 0.62, sd = r.height * 0.07, w = r.width;
    [-3, -2, -1, 0, 1, 2, 3].forEach(function (k) {
      g.beginPath(); g.setLineDash(k === 0 ? [] : [4, 6]); g.strokeStyle = k === 0 ? "rgba(255,255,255,.35)" : line; g.lineWidth = 1;
      g.moveTo(0, mid - k * sd); g.lineTo(w, mid - k * sd); g.stroke();
      g.setLineDash([]); g.fillStyle = "rgba(255,255,255,.35)"; g.font = "10px IBM Plex Mono, monospace";
      g.fillText(k === 0 ? "x̄" : (k > 0 ? "+" : "−") + Math.abs(k) + "SD", w - 40, mid - k * sd - 3);
    });
    var pts = [0.2, -0.6, 0.9, 0.4, -1.1, 0.3, 1.4, -0.2, 0.6, -0.8, 0.1, 1.1, -0.4, 0.5, 2.3, 0.2, -0.9, 0.7, -0.3, 0.4, 1.0, -0.5, 0.2, -1.4];
    var step = (w - 60) / (pts.length - 1);
    g.beginPath(); g.strokeStyle = brand; g.lineWidth = 1.6;
    pts.forEach(function (p, i) { var x = 10 + i * step, y = mid - p * sd; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
    pts.forEach(function (p, i) { var x = 10 + i * step, y = mid - p * sd; g.beginPath(); g.arc(x, y, Math.abs(p) > 2 ? 4 : 2.6, 0, 7); g.fillStyle = Math.abs(p) > 2 ? "#f08a7d" : brand; g.fill(); });
  }
  function doLogin(nik, pw, mode) {
    var mustPw = false;
    return API.login(nik, pw, mode).then(function (r) {
      S.user = r.user; S.roles = r.roles; S.mode = r.mode || "RIIL"; S.simSampai = r.simSampai || null; mustPw = !!r.wajibGanti && !!API.real;
      return Promise.all([API.context(), API.masterUsers ? API.masterUsers() : null]);
    }).then(function (x) {
      S.ctx = x[0]; if (x[1]) window.__MASTER__ = { users: x[1], hirarki: [] };
      return loadAll();
    }).then(function () {
      S.view = S.roles.penyusun.length ? "isi" : (S.inbox.length ? "inbox" : "beranda");
      S.unit = S.roles.penyusun[0] || S.roles.units[0];
      S.bulan = null;
      if (mustPw) S.modal = pwModal(true);
      render();
    });
  }
  function pwModal(wajib) {
    return { title: wajib ? "Ganti password dulu ya" : "Ganti password", wajib: !!wajib,
      body: (wajib ? '<p style="font-size:.86rem;margin-bottom:12px">Ini login pertama kamu. Demi keamanan, buat password baru (min. 8 karakter). Password di MasterDatabase tidak diubah.</p>' : "") +
        '<div class="field"><label for="pwOld">Password saat ini</label><input class="inp" id="pwOld" type="password" autocomplete="current-password"></div>' +
        '<div class="field" style="margin-top:12px"><label for="pwNew">Password baru</label><input class="inp" id="pwNew" type="password" autocomplete="new-password"></div>' +
        '<div class="field" style="margin-top:12px"><label for="pwNew2">Ulangi password baru</label><input class="inp" id="pwNew2" type="password" autocomplete="new-password"></div><p id="pwErr" style="color:var(--fail);font-size:.82rem;min-height:1.2em;margin-top:8px"></p>',
      foot: (wajib ? "" : '<button class="btn" data-act="closeModal">Batal</button>') + '<button class="btn btn-primary" data-act="doPw">Simpan password</button>' };
  }

  /* ---------------- SHELL ---------------- */
  function navItems() {
    var items = [
      { id: "beranda", t: "Beranda", i: "home" },
      { id: "unit", t: "Capaian Unit", i: "grid" }
    ];
    if (S.roles.penyusun.length) items.push({ id: "isi", t: "Isi Laporan", i: "edit" });
    items.push({ id: "inbox", t: "Persetujuan", i: "inbox", badge: S.inbox.length });
    items.push({ id: "rtl", t: "Tindak Lanjut", i: "flag", badge: 0 });
    items.push({ id: "kepatuhan", t: "Resume Kepatuhan", i: "chart" });
    items.push({ id: "dokumen", t: "Dokumen", i: "clip" });
    items.push({ id: "periode", t: "Periode & Kunci", i: "lock", badge: (S.roles.superAdmin || S.roles.timMutu) ? (S.all.periode || []).filter(function (x) { return x.status === "MINTA"; }).length : 0 });
    if (S.roles.manajer.length || S.roles.superAdmin || S.roles.direktur || S.roles.direksi || S.roles.timMutu) items.push({ id: "usulan", t: "Usulan Indikator", i: "list", badge: S.roles.superAdmin ? S.usulan.filter(function (u) { return u.status === "DIAJUKAN"; }).length : 0 });
    items.push({ id: "cetak", t: "Cetak Laporan", i: "doc" });
    items.push({ id: "panduan", t: "Panduan", i: "info" });
    if (S.roles.superAdmin) items.push({ id: "admin", t: "Pengaturan", i: "gear" });
    return items;
  }
  function roleLabel() {
    var r = S.roles, out = [];
    if (r.superAdmin) out.push("Super Admin");
    if (r.direktur) out.push("Direktur (approver)");
    if (r.timMutu) out.push("Ketua Tim Mutu");
    if (r.manajer.length) out.push("Manajer " + r.manajer.join(", "));
    if (r.penyusun.length) out.push("Penyusun " + r.penyusun.join(", "));
    if (!out.length) out.push(S.user.level || "Pengguna");
    return out.join(" · ");
  }
  var TITLES = { beranda: ["Ringkasan", "Beranda"], unit: ["Monitoring 2026", "Capaian Unit"], isi: ["Laporan bulanan", "Isi Laporan"], inbox: ["Alur persetujuan", "Persetujuan"], rtl: ["Rencana tindak lanjut", "Tindak Lanjut"], usulan: ["Perubahan master indikator", "Usulan Indikator"], cetak: ["Format resmi", "Cetak Laporan"], kepatuhan: ["Antar bulan & antar unit", "Resume Kepatuhan"], dokumen: ["Semua berkas laporan", "Dokumen"], periode: ["Buka-tutup pelaporan", "Periode & Kunci"], panduan: ["Cara pakai & arti ikon", "Panduan"], admin: ["Super Admin", "Pengaturan"] };
  function simRibbon() {
    var sampai = S.simSampai ? new Date(S.simSampai).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "";
    return '<div class="sim-ribbon" role="status"><strong>MODE SIMULASI</strong> · data latihan, terpisah dari data riil' + (sampai ? " · dihapus otomatis " + esc(sampai) : "") + "</div>";
  }
  function shell(body, foot) {
    var items = navItems();
    var mobileItems = items.filter(function (x) { return ["beranda", "unit", "isi", "inbox", "rtl"].indexOf(x.id) >= 0; });
    if (!S.roles.penyusun.length) mobileItems = items.filter(function (x) { return ["beranda", "unit", "inbox", "rtl", S.roles.superAdmin || S.roles.manajer.length ? "usulan" : "cetak"].indexOf(x.id) >= 0; });
    var t = TITLES[S.view];
    return (S.mode === "SIM" ? simRibbon() : "") + '<div class="app">' +
      '<aside class="side"><div class="brand">' + MARK + '<div><div class="brand-name">SARMUT</div><div class="brand-sub">Granostic Center · 2026</div></div></div>' +
      '<nav class="nav" aria-label="Menu utama">' + items.map(function (n) {
        return '<button class="nav-btn" data-act="nav" data-v="' + n.id + '"' + (S.view === n.id ? ' aria-current="page"' : "") + ">" + ic(n.i) + "<span>" + n.t + "</span>" + (n.badge ? '<span class="badge">' + n.badge + "</span>" : "") + "</button>";
      }).join("") + "</nav>" +
      '<div class="side-foot"><div class="who"><span class="avatar">' + esc(S.user.ini) + '</span><div style="min-width:0"><div class="who-name">' + esc(S.user.nama) + '</div><div class="who-role">' + esc(roleLabel()) + "</div></div></div>" +
      (API.real ? '<button class="btn btn-sm btn-ghost" data-act="askPw" style="justify-content:flex-start">' + ic("lock") + "Ganti password</button>" : "") + '<button class="btn btn-sm btn-ghost" data-act="logout" style="justify-content:flex-start">' + ic("out") + (API.real ? "Keluar" : "Keluar / ganti peran") + "</button></div></aside>" +
      '<div class="main"><header class="topbar"><div class="crumbs"><span class="eyebrow">' + t[0] + "</span><h1>" + t[1] + '</h1></div><div class="spacer"></div>' +
      '<span class="demo-note"' + (API.real ? ' hidden' : '') + '>Mockup · capaian = file SARMUT 2026 asli, status persetujuan = contoh · hari ini ' + fmtDate(S.ctx.today) + "</span>" +
      '<button class="btn btn-sm who-mobile" data-act="logout" style="display:none">' + esc(S.user.ini) + " · Keluar</button></header>" +
      '<main class="content">' + body + "</main></div>" +
      (foot || "") +
      '<nav class="tabbar" aria-label="Menu">' + mobileItems.map(function (n) {
        return '<button data-act="nav" data-v="' + n.id + '"' + (S.view === n.id ? ' aria-current="page"' : "") + ">" + ic(n.i) + "<span>" + n.t.split(" ")[0] + "</span>" + (n.badge ? '<span class="badge">' + n.badge + "</span>" : "") + "</button>";
      }).join("") + "</nav></div>" + drawerHtml() + modalHtml();
  }

  /* ---------------- BERANDA ---------------- */
  function ytdStats(units) {
    var res = { ok: 0, fail: 0, persp: {} };
    L.PERSP_ORDER.forEach(function (p) { res.persp[p] = { ok: 0, fail: 0 }; });
    S.all.indikator.forEach(function (ind) {
      if (units.indexOf(ind.unit) < 0) return;
      var c = capOf(ind.id);
      for (var m = 1; m <= S.ctx.lastDue; m++) {
        var st = cs(ind, m, c);
        if (st.s === "ok" || st.s === "fail") { res[st.s]++; res.persp[ind.perspektif][st.s]++; }
      }
    });
    return res;
  }
  function viewBeranda() {
    var vu = visibleUnits(), codes = vu.map(function (u) { return u.kode; });
    var due = S.ctx.lastDue, open = S.ctx.openMonth;
    var dueDate = L.dueDate(S.ctx.tahun, due, S.ctx.settings.tgl_batas), openDue = L.dueDate(S.ctx.tahun, open, S.ctx.settings.tgl_batas);
    var lateDays = daysBetween(dueDate, today()), hOpen = daysBetween(today(), openDue);
    var submitted = vu.filter(function (u) { var k = lapState(u.kode, due).key; return ["MENUNGGU_MANAJER", "MENUNGGU_TIM_MUTU", "MENUNGGU_DIREKTUR", "DISETUJUI"].indexOf(k) >= 0; });
    var st = ytdStats(codes), pct = st.ok + st.fail ? Math.round(st.ok / (st.ok + st.fail) * 100) : 0;
    var openRtl = rtlOpen().length;
    var myTask = S.roles.penyusun.map(function (k) {
      for (var m = 1; m <= due; m++) { var s2 = lapState(k, m).key; if (["DITUTUP", "MINTA", "DIBUKA", "JENDELA", "DIKEMBALIKAN"].indexOf(s2) >= 0) return { unit: k, m: m, s: s2 }; }
      return null;
    }).filter(Boolean);

    var band = '<div class="period-band"><div><div class="eyebrow">Periode laporan</div><strong>' + L.BULAN_PANJANG[due - 1] + " " + S.ctx.tahun + "</strong></div>" +
      '<span class="countdown late">ditutup ' + fmtDate(dueDate.toISOString()) + " · lewat " + lateDays + " hari</span>" +
      '<div><div class="eyebrow">Berikutnya</div><strong>' + L.BULAN_PANJANG[open - 1] + "</strong></div>" +
      '<span class="countdown">batas ' + fmtDate(openDue.toISOString()) + " · H-" + hOpen + "</span>" +
      '<div class="spacer"></div>' +
      (myTask.length ? '<button class="btn" data-act="goisi" data-unit="' + myTask[0].unit + '" data-m="' + myTask[0].m + '">' + ic("edit") + "Isi " + myTask[0].unit + " " + L.BULAN[myTask[0].m - 1] + "</button>" : "") +
      '<button class="btn" data-act="nav" data-v="kepatuhan">' + ic("chart") + "Resume kepatuhan</button>" + (S.inbox.length ? '<button class="btn" data-act="nav" data-v="inbox">' + ic("inbox") + S.inbox.length + " menunggu Anda</button>" : "") + "</div>";

    var tiles = '<div class="grid g-tiles">' +
      tile("Sudah diajukan · " + L.BULAN[due - 1], submitted.length + "<small>/ " + vu.length + " unit</small>", submitted.length / Math.max(1, vu.length), vu.length - submitted.length + " unit belum mengajukan") +
      tile("Indikator tercapai · Jan–" + L.BULAN[due - 1], pct + "<small>%</small>", pct / 100, st.ok + " tercapai dari " + (st.ok + st.fail) + " penilaian") +
      tile("Tindak lanjut terbuka", String(openRtl), null, "di " + new Set(rtlOpen().map(function (r) { return r.unit; })).size + " unit") +
      tile("Menunggu persetujuan Anda", String(S.inbox.length), null, S.inbox.length ? S.inbox.map(function (x) { return x.unit + " " + L.BULAN[x.bulan - 1]; }).join(", ") : "Tidak ada antrean") + "</div>";

    var matrix = '<section class="panel"><div class="panel-h"><h2>Kepatuhan pelaporan</h2><span class="muted" style="font-size:.8rem">status laporan per unit per bulan</span><div class="spacer"></div>' + legendLap() + '</div><div class="panel-b scroll-x"><table class="matrix"><thead><tr><th></th>' +
      L.BULAN.map(function (b, i) { return '<th scope="col"' + (i + 1 === due ? ' style="color:var(--ink)"' : "") + ">" + b + "</th>"; }).join("") + "</tr></thead><tbody>" +
      vu.map(function (u) {
        return '<tr><th class="unit" scope="row">' + esc(u.nama) + "<small>" + u.kode + " · " + u.ref + "</small></th>" + L.BULAN.map(function (b, i) {
          var s2 = lapState(u.kode, i + 1), ui = LAP_UI[s2.key];
          return '<td><div class="mcell ' + ui.cls + '" title="' + esc(u.nama + " · " + L.BULAN_PANJANG[i] + ": " + ui.t) + '">' + ui.short + "</div></td>";
        }).join("") + "</tr>";
      }).join("") + "</tbody></table></div></section>";

    var persp = '<section class="panel"><div class="panel-h"><h2>Capaian per perspektif BSC</h2></div><div class="panel-b">' + L.PERSP_ORDER.map(function (p) {
      var x = st.persp[p], n = x.ok + x.fail, v = n ? Math.round(x.ok / n * 100) : 0;
      return '<div class="pbar"><span class="persp-code persp-' + p + '">' + p + '</span><div><div class="lbl">' + L.PERSP[p] + ' <span class="muted mono" style="font-weight:400;font-size:.72rem">' + x.ok + "/" + n + '</span></div><div class="track" style="margin-top:10px"><i style="width:' + v + '%;background:var(--ok)"></i><i style="width:' + (n ? 100 - v : 0) + '%;background:color-mix(in srgb,var(--fail) 55%,transparent)"></i></div></div><span class="val">' + v + "%</span></div>";
    }).join("") + '<p class="muted" style="font-size:.74rem;margin-top:14px">Hanya bulan evaluasi yang dihitung. Indikator tahunan/semesteran belum masuk sampai bulan penilaiannya.</p></div></section>';

    // perlu perhatian: tidak tercapai di bulan terakhir yang terisi tiap unit
    var att = [];
    vu.forEach(function (u) {
      indsOf(u.kode).forEach(function (ind) {
        var c = capOf(ind.id), lastM = 0;
        for (var m = due; m >= 1; m--) { if (c[m]) { lastM = m; break; } }
        if (!lastM) return;
        var s2 = cs(ind, lastM, c);
        if (s2.s === "fail") att.push({ u: u, ind: ind, m: lastM, s: s2, rtl: S.all.rtl.some(function (r) { return r.indikator === ind.id && r.status === "TERBUKA"; }) });
      });
    });
    var attention = '<section class="panel"><div class="panel-h"><h2>Perlu perhatian</h2><span class="muted" style="font-size:.8rem">tidak tercapai di laporan terakhir</span></div><div class="panel-b"><div class="list">' +
      (att.length ? att.slice(0, 9).map(function (a) {
        return '<div class="li"><span class="persp-code persp-' + a.ind.perspektif + '">' + a.ind.perspektif + '</span><div><button class="linklike" style="font-size:.86rem;text-align:left;color:var(--ink)" data-act="ind" data-id="' + a.ind.id + '">' + esc(a.ind.nama) + '</button><div class="s">' + esc(a.u.nama) + " · " + L.BULAN[a.m - 1] + " · target " + esc(L.fmtTarget(a.ind)) + (a.rtl ? ' · <span style="color:var(--prog)">RTL berjalan</span>' : ' · <span style="color:var(--fail)">belum ada RTL</span>') + '</div></div><span class="pill pill-fail plain mono">' + L.fmtVal(a.ind, a.s.v) + "</span></div>";
      }).join("") : '<div class="empty">Semua indikator di laporan terakhir tercapai.</div>') + "</div></div></section>";

    return band + tiles + matrix + '<div class="grid g-2">' + attention + persp + "</div>";
  }
  function tile(lbl, big, frac, sub) {
    return '<div class="panel tile"><span class="eyebrow">' + lbl + '</span><span class="big">' + big + "</span>" + (frac !== null ? '<div class="meter"><i style="width:' + Math.round(frac * 100) + '%"></i></div>' : "") + '<span class="sub">' + esc(sub) + "</span></div>";
  }
  function legendLap() {
    return '<div class="legend"><span><i class="m-ok"></i>Disetujui</span><span><i class="m-proc"></i>Dalam proses</span><span><i class="m-draft"></i>Draf / dibuka khusus</span><span><i class="m-late"></i>Ditutup (belum lapor)</span><span><i class="m-future" style="border:1px solid var(--line)"></i>Belum jatuh tempo</span></div>';
  }

  /* ---------------- CAPAIAN UNIT (heatmap) ---------------- */
  function viewUnit() {
    var vu = visibleUnits();
    if (S.roles.units.indexOf(S.unit) < 0) S.unit = vu[0].kode;
    var u = unitOf(S.unit), inds = indsOf(u.kode);
    var st = ytdStats([u.kode]), pct = st.ok + st.fail ? Math.round(st.ok / (st.ok + st.fail) * 100) : null;
    var head = '<div class="unit-pick" role="group" aria-label="Pilih unit">' + vu.map(function (x) { return '<button class="chip-btn" data-act="unit" data-k="' + x.kode + '" aria-pressed="' + (x.kode === u.kode) + '">' + esc(x.nama) + "</button>"; }).join("") + "</div>";
    var summary = '<div class="grid g-tiles">' +
      tile("Indikator aktif", String(inds.filter(function (i) { return L.isActive(i, S.ctx.openMonth); }).length), null, L.PERSP_ORDER.map(function (p) { return p + " " + inds.filter(function (i) { return i.perspektif === p && L.isActive(i, S.ctx.openMonth); }).length; }).join(" · ")) +
      tile("Tercapai Jan–" + L.BULAN[S.ctx.lastDue - 1], pct === null ? "–" : pct + "<small>%</small>", pct === null ? 0 : pct / 100, st.ok + " dari " + (st.ok + st.fail) + " penilaian") +
      tile("RTL terbuka", String(rtlOpen(u.kode).length), null, "dari " + S.all.rtl.filter(function (r) { return r.unit === u.kode; }).length + " RTL tahun ini") +
      '<div class="panel tile"><span class="eyebrow">Alur tanda tangan</span><div style="font-size:.8rem;line-height:1.55"><b>' + esc(u.penyusunInfo.map(function (p) { return p.ini; }).join(", ")) + "</b> menyusun → " + (u.penyusun.indexOf(u.manajer) >= 0 ? "" : "<b>" + esc(u.manajerInfo ? u.manajerInfo.ini : "–") + "</b> verifikasi → ") + "<b>" + esc(person(S.ctx.settings.ketua_tim_mutu).ini) + "</b> Tim Mutu → <b>" + esc(person(S.ctx.settings.direktur).ini) + '</b> Direktur</div><span class="sub">Manajer otomatis dari Master Hirarki</span></div></div>';

    var rows = "", lastP = null, lastS = null;
    if (!inds.length) rows = '<tr><td colspan="14"><div class="empty">Belum ada indikator.</div></td></tr>';
    var cap0 = 0;
    inds.forEach(function (ind) { cap0 += Object.keys(capOf(ind.id)).length; });
    inds.forEach(function (ind) {
      if (ind.perspektif !== lastP) { rows += '<tr class="grp"><td colspan="14"><span class="pin"><span class="persp-code persp-' + ind.perspektif + '">' + ind.perspektif + "</span>" + L.PERSP[ind.perspektif] + " Perspective</span></td></tr>"; lastP = ind.perspektif; lastS = null; }
      var sgrp = ind.sasaran + "|" + ind.program;
      if (sgrp !== lastS) { rows += '<tr class="sub"><td colspan="14"><span class="pin">' + esc(ind.sasaran) + (ind.program ? " — " + esc(ind.program) : "") + "</span></td></tr>"; lastS = sgrp; }
      var c = capOf(ind.id);
      rows += "<tr><td class=\"c-ind\" data-act=\"ind\" data-id=\"" + ind.id + '"><span class="ind-name">' + esc(ind.nama) + '</span><span class="ind-meta"><span class="tag">' + ind.id + '</span><span class="tag">' + esc(L.FREK[ind.frekuensi]) + "</span>" + (ind.rahasia ? '<span class="tag tag-lock">' + ic("lock", ' width="10" height="10"') + "rahasia</span>" : "") + (ind.nonaktif_mulai ? '<span class="tag">nonaktif sejak ' + L.BULAN[ind.nonaktif_mulai - 1] + "</span>" : "") + (ind.aktif_dari && ind.aktif_dari > 1 ? '<span class="tag">baru sejak ' + L.BULAN[ind.aktif_dari - 1] + "</span>" : "") + "</span></td>" +
        '<td class="c-tg">' + esc(L.fmtTarget(ind)) + "</td>" +
        L.BULAN.map(function (b, i) { return '<td class="c-m">' + cellHtml(ind, i + 1, c) + "</td>"; }).join("") + "</tr>";
    });
    var table = '<div class="heat-wrap"><table class="heat"><thead><tr><th class="c-ind" scope="col">Indikator mutu</th><th class="c-tg" scope="col">Target</th>' +
      L.BULAN.map(function (b, i) { var s2 = lapState(u.kode, i + 1), ui = LAP_UI[s2.key]; return '<th scope="col" class="th-m" data-act="riwayat" data-u="' + u.kode + '" data-m="' + (i + 1) + '" title="' + ui.t + ' · klik untuk riwayat pengajuan">' + b + '<div style="margin-top:4px;display:flex;justify-content:center"><span class="mcell ' + ui.cls + '" style="height:6px;width:26px;margin:0"></span></div></th>'; }).join("") +
      "</tr></thead><tbody>" + rows + "</tbody></table></div>";
    var legend = '<div class="legend"><span><i class="c-ok"></i>Tercapai</span><span><i class="c-fail"></i>Tidak tercapai</span><span><i class="c-prog"></i>Progres (bulan non-evaluasi)</span><span><i class="c-empty"></i>Belum diisi</span><span><i class="c-tba" style="border:1px solid var(--line)"></i>Belum tersedia</span><span>– tidak dijadwalkan</span><span><i style="background:var(--fail);border-radius:50%;width:7px;height:7px"></i>ada RTL</span></div>';
    var emptyNote = !cap0 ? '<div class="alert alert-info">' + ic("info") + "<div>Unit ini belum punya data capaian 2026 di folder yang diunggah (hanya format/indikator). Penyusun bisa langsung mulai mengisi dari menu Isi Laporan.</div></div>" : "";
    return head + summary + emptyNote + legend + table;
  }
  function cellHtml(ind, m, c) {
    var st = cs(ind, m, c);
    var e = c[m];
    if (e && e.status === "TERKUNCI") return '<span class="cell c-lock" title="Data rahasia">' + ic("lock", ' width="12" height="12"') + "</span>";
    var txt = "";
    if (st.s === "ok" || st.s === "fail" || st.s === "prog") txt = L.fmtVal(ind, st.v);
    else if (st.s === "note") txt = st.v !== null && st.v !== undefined ? L.fmtVal(ind, st.v) : "✎";
    else if (st.s === "na") txt = "–";
    else if (st.s === "tba") txt = "TBA";
    else if (st.s === "empty") txt = "?";
    var hasRtl = S.all.rtl.some(function (r) { return r.indikator === ind.id && r.bulan === m; });
    var cls = st.s === "future" ? "c-future" : "c-" + st.s;
    var title = L.BULAN_PANJANG[m - 1] + ": " + CELL_TXT[st.s] + (st.eval ? " (bulan evaluasi)" : "") + (e && e.catatan ? " — " + e.catatan : "");
    if (st.s === "na" || st.s === "future") return '<span class="cell ' + cls + '" title="' + esc(title) + '">' + txt + "</span>";
    return '<button class="cell ' + cls + '" data-act="ind" data-id="' + ind.id + '" data-m="' + m + '" title="' + esc(title) + '">' + txt + (hasRtl ? '<span class="rtl-dot"></span>' : "") + (S.all.komentar && S.all.komentar.some(function (x) { return x.key === tkey("INDIKATOR", ind.unit, m, ind.id); }) ? '<span class="cmt-dot"></span>' : "") + "</button>";
  }

  /* drawer detail indikator */
  function sparkline(ind, c) {
    var W = 480, H = 150, pl = 40, pr = 12, pt = 14, pb = 24;
    var vals = [];
    for (var m = 1; m <= 12; m++) { var st = cs(ind, m, c); vals.push(st.v === null || st.v === undefined || st.s === "na" ? null : st.v); }
    var nums = vals.filter(function (v) { return v !== null; }).concat([ind.target]);
    if (!nums.length) return "";
    var lo = Math.min.apply(null, nums), hi = Math.max.apply(null, nums);
    if (ind.satuan === "%") { lo = Math.min(lo, ind.target) - 5; hi = Math.max(hi, ind.target) + 3; }
    if (hi - lo < 1e-6) { hi += 1; lo -= 1; }
    var pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
    function x(i) { return pl + i * (W - pl - pr) / 11; }
    function y(v) { return pt + (hi - v) / (hi - lo) * (H - pt - pb); }
    var path = "", area = "", started = false, firstX = 0, lastX = 0;
    vals.forEach(function (v, i) { if (v === null) return; path += (started ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1); if (!started) firstX = x(i); lastX = x(i); started = true; });
    if (started) area = path + "L" + lastX + " " + (H - pb) + "L" + firstX + " " + (H - pb) + "Z";
    var ticks = [lo + pad, (lo + hi) / 2, hi - pad];
    var svg = '<svg class="spark" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Tren ' + esc(ind.nama) + '">' +
      ticks.map(function (t) { return '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(t) + '" y2="' + y(t) + '" stroke="var(--line-2)"/><text x="' + (pl - 6) + '" y="' + (y(t) + 3) + '" text-anchor="end">' + L.fmtNum(t, ind.satuan === "%" ? 0 : 1) + "</text>"; }).join("") +
      '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(ind.target) + '" y2="' + y(ind.target) + '" stroke="var(--brand)" stroke-dasharray="4 4" stroke-width="1.4"/><text x="' + (W - pr) + '" y="' + (y(ind.target) - 5) + '" text-anchor="end" style="fill:var(--brand)">target ' + esc(L.fmtTarget(ind)) + "</text>" +
      (area ? '<path d="' + area + '" fill="var(--brand)" opacity=".08"/>' : "") +
      (path ? '<path d="' + path + '" fill="none" stroke="var(--ink-2)" stroke-width="1.8" stroke-linejoin="round"/>' : "") +
      vals.map(function (v, i) {
        if (v === null) return "";
        var st = cs(ind, i + 1, c), col = st.s === "ok" ? "var(--ok)" : st.s === "fail" ? "var(--fail)" : "var(--prog)";
        return '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="' + (st.eval ? 4.2 : 3) + '" fill="' + col + '" stroke="var(--surface)" stroke-width="1.5"/>';
      }).join("") +
      L.BULAN.map(function (b, i) { return '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + b + "</text>"; }).join("") + "</svg>";
    return svg;
  }
  function drawerInd(id, m) {
    var ind = S.all.indikator.filter(function (x) { return x.id === id; })[0];
    var c = capOf(id), u = unitOf(ind.unit);
    var rt = S.all.rtl.filter(function (r) { return r.indikator === id; }).sort(function (a, b) { return (b.bulan || 0) - (a.bulan || 0); });
    var focus = m ? c[m] : null;
    var body = '<div style="display:flex;gap:6px;flex-wrap:wrap"><span class="persp-code persp-' + ind.perspektif + '">' + ind.perspektif + '</span><span class="tag">' + ind.id + '</span><span class="tag">' + esc(L.TIPE[ind.tipe]) + "</span>" + (ind.rahasia ? '<span class="tag tag-lock">rahasia</span>' : "") + "</div>" +
      (focus ? '<div class="alert alert-info">' + ic("info") + "<div><b>" + L.BULAN_PANJANG[m - 1] + ":</b> " + esc(CELL_TXT[cs(ind, m, c).s]) + (focus.pembilang !== undefined && focus.pembilang !== null ? " · " + L.fmtNum(focus.pembilang) + " / " + L.fmtNum(focus.penyebut) : "") + (focus.catatan ? "<br>" + esc(focus.catatan) : "") + "</div></div>" : "") +
      (m ? '<div style="display:flex;gap:8px;flex-wrap:wrap">' + cchip("INDIKATOR", ind.unit, m, ind.id) + "</div>" + pimNote("INDIKATOR", ind.unit, m, ind.id, 3) : "") +
      '<div class="panel" style="padding:12px 10px 4px">' + (sparkline(ind, c) || '<div class="empty">Belum ada data.</div>') + "</div>" +
      '<dl class="kv"><dt>Sasaran</dt><dd>' + esc(ind.sasaran) + (ind.program ? "<br><span class=\"muted\">● " + esc(ind.program) + "</span>" : "") + "</dd>" +
      "<dt>Target</dt><dd>" + esc(L.fmtTarget(ind)) + ' <span class="muted">(tertulis: ' + esc(ind.target_teks) + ")</span></dd>" +
      "<dt>Frekuensi</dt><dd>" + esc(L.evalLabel(ind)) + "</dd>" +
      "<dt>Cara isi</dt><dd>" + (ind.cara_isi === "BULAN_EVALUASI" ? "Hanya di bulan evaluasi" : "Tiap bulan") + (ind.frekuensi !== "BULANAN" && ind.frekuensi !== "PER_KEJADIAN" ? " · dihitung: " + L.CARA_HITUNG[ind.cara_hitung] : "") + "</dd>" +
      (ind.rumus ? "<dt>Rumus</dt><dd>" + esc(ind.rumus) + "</dd>" : "") +
      "<dt>Tools / records</dt><dd>" + esc(ind.tools || "–") + "</dd>" +
      "<dt>Referensi</dt><dd class=\"mono\">" + esc(ind.referensi || "–") + "</dd>" +
      (ind.pic ? "<dt>PIC</dt><dd>" + esc(ind.pic) + "</dd>" : "") +
      "<dt>Unit</dt><dd>" + esc(u.nama) + "</dd></dl>" +
      (S.usulan.filter(function (x) { return x.indikator_id === id; }).length ? '<div><h3 style="margin-bottom:8px">Riwayat perubahan indikator</h3>' + S.usulan.filter(function (x) { return x.indikator_id === id; }).map(function (x) { return '<div style="font-size:.82rem;border:1px solid var(--line);border-radius:8px;padding:9px 12px;margin-bottom:6px"><span class="pill ' + USL_PILL[x.status][0] + '">' + USL_PILL[x.status][1] + "</span> <b>" + JENIS_LBL[x.jenis] + '</b> · berlaku ' + L.BULAN_PANJANG[x.efektif_bulan - 1] + '<div class="muted" style="margin-top:3px">' + esc(x.alasan) + "</div></div>"; }).join("") + "</div>" : "") +
      "<div><h3 style=\"margin-bottom:8px\">Rencana tindak lanjut (" + rt.length + ")</h3>" + (rt.length ? rt.map(rtlMini).join("") : '<p class="muted" style="font-size:.84rem">Belum ada RTL untuk indikator ini.</p>') + "</div>";
    return { title: ind.nama, sub: u.nama + " · No. " + ind.no, body: body };
  }
  function rtlMini(r) {
    return '<div style="border:1px solid var(--line);border-radius:8px;padding:10px 12px;margin-bottom:8px;font-size:.82rem"><div style="display:flex;gap:8px;align-items:center;margin-bottom:4px"><span class="pill ' + (r.status === "TERBUKA" ? "pill-warn" : "pill-ok") + '">' + (r.status === "TERBUKA" ? "Terbuka" : "Selesai") + '</span><span class="muted mono" style="font-size:.72rem">' + r.id + (r.bulan ? " · " + L.BULAN[r.bulan - 1] : "") + '</span></div><b>' + esc(r.kendala) + "</b>" + (r.uraian ? '<div class="muted" style="margin-top:3px">→ ' + esc(r.uraian) + "</div>" : "") + "</div>";
  }

  /* ---------------- ISI LAPORAN ---------------- */
  function pickDefaultMonth(unit) {
    for (var m = 1; m <= S.ctx.lastDue; m++) { var k = lapState(unit, m).key; if (["DITUTUP", "MINTA", "DIBUKA", "JENDELA", "DIKEMBALIKAN"].indexOf(k) >= 0) return m; }
    return S.ctx.openMonth;
  }
  function editable(unit, m) {
    var k = lapState(unit, m).key;
    return S.roles.penyusun.indexOf(unit) >= 0 && ["JENDELA", "DRAFT", "BERJALAN", "DIBUKA", "DIKEMBALIKAN"].indexOf(k) >= 0;
  }
  function initForm(unit, m) {
    S.form = {}; S.rtlDraft = {}; S.carryEdit = {};
    indsOf(unit).forEach(function (ind) {
      var e = capOf(ind.id)[m];
      S.form[ind.id] = e ? JSON.parse(JSON.stringify(e)) : { status: "" };
      var r = S.all.rtl.filter(function (x) { return x.indikator === ind.id && x.bulan === m; })[0];
      if (r) S.rtlDraft[ind.id] = JSON.parse(JSON.stringify(r));
    });
    S.formKey = unit + "|" + m;
  }
  function formCap(ind) {
    var c = Object.assign({}, capOf(ind.id));
    var f = S.form[ind.id];
    if (f && f.status) c[S.bulan] = f; else delete c[S.bulan];
    return c;
  }
  function rowState(ind) {
    var c = formCap(ind), f = S.form[ind.id] || {};
    var st = L.cellStatus(ind, c, S.bulan, { lastDue: 12, openMonth: 12 });
    var filled = !!f.status && (f.status !== "DIISI" || L.entryValue(ind, f) !== null);
    var needRtl = st.s === "fail";
    var r = S.rtlDraft[ind.id];
    var rtlOk = !needRtl || (r && ["kendala", "penyebab", "uraian", "pelaksana", "penanggung_jawab", "target_waktu"].every(function (k) { return r[k] && String(r[k]).trim(); }));
    return { st: st, filled: filled, needRtl: needRtl, rtlOk: rtlOk };
  }
  function viewIsi() {
    var units = S.roles.penyusun;
    if (units.indexOf(S.unit) < 0) S.unit = units[0];
    if (!S.bulan) S.bulan = pickDefaultMonth(S.unit);
    if (S.formKey !== S.unit + "|" + S.bulan) initForm(S.unit, S.bulan);
    var u = unitOf(S.unit), m = S.bulan, ls = lapState(u.kode, m), lap = ls.lap;
    var canEdit = editable(u.kode, m);
    var dd = L.dueDate(S.ctx.tahun, m, S.ctx.settings.tgl_batas), diff = daysBetween(today(), dd);
    var dueTxt = diff < 0 ? "lewat " + (-diff) + " hari" : "H-" + diff;

    var monthSel = '<div class="field" style="min-width:170px"><label for="selM">Periode</label><select class="sel" id="selM" data-act="selM">' + L.BULAN_PANJANG.map(function (b, i) {
      var k = lapState(u.kode, i + 1).key; var dis = i + 1 > S.ctx.openMonth;
      return '<option value="' + (i + 1) + '"' + (i + 1 === m ? " selected" : "") + (dis ? " disabled" : "") + ">" + b + " " + S.ctx.tahun + " · " + LAP_UI[k].t + "</option>";
    }).join("") + "</select></div>";
    var unitSel = units.length > 1 ? '<div class="field"><label for="selU">Unit</label><select class="sel" id="selU" data-act="selU">' + units.map(function (k) { return '<option value="' + k + '"' + (k === u.kode ? " selected" : "") + ">" + esc(unitOf(k).nama) + "</option>"; }).join("") + "</select></div>" : "";

    var head = '<section class="panel"><div class="panel-b" style="display:flex;flex-direction:column;gap:16px"><div class="report-head"><div><div class="eyebrow">' + esc(u.kode) + " · " + esc(u.divisi) + '</div><h2 style="font-size:1.3rem">' + esc(u.nama) + " — " + L.BULAN_PANJANG[m - 1] + " " + S.ctx.tahun + '</h2><div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap"><span class="pill ' + LAP_UI[ls.key].pill + '">' + LAP_UI[ls.key].t + '</span><span class="pill plain ' + (diff < 0 ? "pill-fail" : "pill-na") + ' mono">batas ' + fmtDate(dd.toISOString()) + " · " + dueTxt + "</span></div></div>" +
      '<div class="spacer"></div>' + unitSel + monthSel + "</div>" + stepper(u, lap) + '<div style="display:flex;gap:8px;flex-wrap:wrap">' + cchip("LAPORAN", u.kode, m, "") + '<button type="button" class="cchip" data-act="riwayat" data-u="' + u.kode + '" data-m="' + m + '">' + ic("clock", ' width="13" height="13"') + "<span>Riwayat pengajuan</span></button></div></div></section>";

    var alerts = "";
    var ret = lap && lap.status === "DIKEMBALIKAN" ? lap.riwayat.filter(function (h) { return h.aksi === "KEMBALIKAN"; }).slice(-1)[0] : null;
    if (ret) alerts += '<div class="alert alert-warn">' + ic("undo") + "<div><b>Dikembalikan oleh " + esc(person(ret.nik).ini) + " · " + fmtDate(ret.at, true) + "</b><br>" + esc(ret.catatan) + "</div></div>";
    if (!canEdit && (ls.key === "DITUTUP" || ls.key === "MINTA")) alerts += closedBanner(u, m, ls);
    else if (!canEdit) alerts += '<div class="alert alert-info">' + ic("lock") + "<div>Laporan ini " + (lap && lap.status === "DISETUJUI" ? "sudah disetujui dan terkunci" : "sedang dalam proses persetujuan") + ". Isian hanya bisa dilihat.</div></div>";
    else if (ls.key === "DIBUKA") alerts += '<div class="alert alert-warn">' + ic("clock") + "<div><b>Dibuka khusus sampai " + fmtDate(ls.ps.until.toISOString(), true) + "</b> oleh " + esc(person(ls.ps.ov.diputus_oleh).ini) + ". Karena lewat batas, pengajuan ini tercatat <b>terlambat</b> di resume kepatuhan.</div></div>";
    else if (diff < 0 && !lap) alerts += '<div class="alert alert-fail">' + ic("alert") + "<div>Batas lapor sudah lewat. Pengajuan akan tercatat <b>terlambat</b>.</div></div>";

    var lcm = cmtsOf("LAPORAN", u.kode, m, "").filter(function (c) { return !c.parent; });
    if (lcm.length) alerts += '<div class="alert alert-info">' + ic("msg") + "<div><b>Catatan pimpinan atas laporan ini (" + lcm.length + ")</b>" + pimNote("LAPORAN", u.kode, m, "", 2) + "</div></div>";
    var carry = S.all.rtl.filter(function (r) { return r.unit === u.kode && r.status === "TERBUKA" && (r.bulan || 0) < m; });
    var carryHtml = carry.length ? '<section class="panel"><div class="panel-h"><h2>RTL terbuka dari bulan sebelumnya</h2><span class="pill pill-warn">' + carry.length + '</span><div class="spacer"></div><span class="muted" style="font-size:.78rem">Perbarui progres; tandai selesai bila sudah tuntas</span></div><div class="list">' + carry.map(function (r) {
      var ind = S.all.indikator.filter(function (x) { return x.id === r.indikator; })[0];
      var ed = S.carryEdit[r.id] || {};
      return '<div class="rtl-card"><div style="min-width:0"><div class="muted mono" style="font-size:.72rem">' + r.id + " · sejak " + L.BULAN[(r.bulan || 1) - 1] + " · " + esc(ind ? ind.id : "") + '</div><div style="font-weight:650;margin-top:2px">' + esc(ind ? ind.nama : r.indikator) + '</div><div style="font-size:.84rem;margin-top:6px"><b>Kendala:</b> ' + esc(r.kendala) + "<br><b>Tindak lanjut:</b> " + esc(r.uraian || "–") + "</div>" + pimNote("RTL", r.unit, r.bulan, r.id, 2) + '<div class="inline-actions" style="margin-top:8px">' + cchip("RTL", r.unit, r.bulan, r.id) + "</div>" +
        (canEdit ? '<div class="field" style="margin-top:10px"><label for="cp-' + r.id + '">Progres ' + L.BULAN_PANJANG[m - 1] + '</label><textarea class="ta" id="cp-' + r.id + '" data-act="carry" data-id="' + r.id + '" placeholder="Apa yang sudah dilakukan bulan ini?">' + esc(ed.progres || "") + "</textarea></div>" : "") +
        '</div><div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">' + (canEdit ? '<label class="toggle"><input type="checkbox" data-act="carryDone" data-id="' + r.id + '"' + (ed.selesai ? " checked" : "") + "> Selesai</label>" : '<span class="pill pill-warn">Terbuka</span>') + "</div></div>";
    }).join("") + "</div></section>" : "";

    var inds = indsOf(u.kode);
    var sched = inds.filter(function (i) { return L.isScheduled(i, m); }), unsched = inds.filter(function (i) { return L.isActive(i, m) && !L.isScheduled(i, m); });
    var secs = L.PERSP_ORDER.map(function (p) {
      var list = sched.filter(function (i) { return i.perspektif === p; });
      var off = unsched.filter(function (i) { return i.perspektif === p; });
      if (!list.length && !off.length) return "";
      return '<section class="panel sec"><div class="sec-h"><span class="persp-code persp-' + p + '">' + p + "</span><h3>" + L.PERSP[p] + '</h3><div class="spacer"></div><span class="muted" style="font-size:.76rem">' + list.length + " diisi bulan ini</span></div>" +
        list.map(function (ind) { return irow(ind, canEdit); }).join("") +
        (off.length ? '<details class="collapse"><summary>Tidak dijadwalkan di ' + L.BULAN_PANJANG[m - 1] + " (" + off.length + ")</summary>" + off.map(function (ind) { return '<div class="na-row"><span class="mono">' + ind.no + "</span><span>" + esc(ind.nama) + '</span><span class="tag">' + esc(L.evalLabel(ind)) + "</span></div>"; }).join("") + "</details>" : "") + "</section>";
    }).join("");

    var foot = canEdit ? '<div class="footbar" id="footbar">' + footInner() + "</div>" : "";
    return { body: head + alerts + carryHtml + secs + docPanel(u.kode, m), foot: foot };
  }
  function stepper(u, lap) {
    var self = u.penyusun.indexOf(u.manajer) >= 0;
    var steps = [{ k: "AJUKAN", t: "Disusun", who: u.penyusunInfo[0] }];
    if (!self) steps.push({ k: "VERIFIKASI", t: "Manajer", who: u.manajerInfo });
    steps.push({ k: "DIKETAHUI", t: "Tim Mutu", who: person(S.ctx.settings.ketua_tim_mutu) });
    steps.push({ k: "SETUJUI", t: "Direktur", who: person(S.ctx.settings.direktur) });
    var hist = lap ? lap.riwayat : [];
    var lastK = lap && lap.status === "DIKEMBALIKAN" ? -1 : null;
    var doneIdx = -1;
    if (lap && lap.status !== "DRAFT" && lap.status !== "DIKEMBALIKAN") {
      steps.forEach(function (s, i) { if (hist.some(function (h) { return h.aksi === s.k; })) doneIdx = i; });
    }
    if (lastK === -1) doneIdx = -1;
    return '<div class="stepper" aria-label="Alur persetujuan">' + steps.map(function (s, i) {
      var h = hist.filter(function (x) { return x.aksi === s.k; }).slice(-1)[0];
      var cls = i <= doneIdx ? "done" : (i === doneIdx + 1 ? "cur" : "");
      return (i ? '<span class="step-line ' + (i <= doneIdx ? "done" : "") + '"></span>' : "") + '<div class="step ' + cls + '"><span class="dot">' + (i <= doneIdx ? "✓" : i + 1) + '</span><span class="txt">' + s.t + " · " + esc(s.who ? s.who.ini : "–") + '<span class="who-at">' + (i <= doneIdx && h ? fmtDate(h.at, true) : (i === doneIdx + 1 ? "menunggu" : "")) + "</span></span></div>";
    }).join("") + "</div>";
  }
  function irow(ind, canEdit) {
    var f = S.form[ind.id] || {}, rs = rowState(ind);
    var dis = canEdit ? "" : " disabled";
    var id = ind.id;
    var ev = L.isEval(ind, S.bulan);
    var inputs = "";
    var stSel = '<div class="seg" role="group" aria-label="Status isian">' +
      '<button type="button" data-act="fst" data-id="' + id + '" data-v="DIISI" aria-pressed="' + (f.status === "DIISI" || f.status === "CATATAN") + '"' + dis + ">Isi nilai</button>" +
      (ind.tipe === "KEJADIAN" || ind.frekuensi === "PER_KEJADIAN" ? '<button type="button" data-act="fst" data-id="' + id + '" data-v="TIDAK_ADA_KEJADIAN" aria-pressed="' + (f.status === "TIDAK_ADA_KEJADIAN") + '"' + dis + ">Tidak ada kejadian</button>" : "") +
      '<button type="button" data-act="fst" data-id="' + id + '" data-v="TBA" aria-pressed="' + (f.status === "TBA") + '"' + dis + ">Belum tersedia</button></div>";
    var showVal = f.status === "DIISI" || f.status === "CATATAN" || !f.status;
    if (showVal) {
      if (ind.tipe === "RASIO") {
        var legacy = (f.pembilang === undefined || f.pembilang === null) && f.nilai !== undefined && f.nilai !== null;
        inputs = '<div class="ratio"><div class="field"><label for="n-' + id + '">' + esc(ind.label_pembilang || "Pembilang") + '</label><input class="inp mono" id="n-' + id + '" data-act="fv" data-id="' + id + '" data-k="pembilang" inputmode="decimal" value="' + (f.pembilang !== undefined && f.pembilang !== null ? f.pembilang : "") + '"' + dis + '></div><span class="slash">/</span><div class="field"><label for="d-' + id + '">' + esc(ind.label_penyebut || "Penyebut") + '</label><input class="inp mono" id="d-' + id + '" data-act="fv" data-id="' + id + '" data-k="penyebut" inputmode="decimal" value="' + (f.penyebut !== undefined && f.penyebut !== null ? f.penyebut : "") + '"' + dis + "></div></div>" +
          (legacy ? '<span class="hint muted" style="font-size:.74rem">Nilai impor dari file lama: <b class="mono">' + L.fmtVal(ind, f.nilai) + "</b> (tanpa pembilang/penyebut)</span>" : "");
      } else if (ind.tipe === "YA_TIDAK") {
        inputs = '<div class="seg" role="group"><button type="button" data-act="fyn" data-id="' + id + '" data-v="1" aria-pressed="' + (f.nilai === 1) + '"' + dis + '>Terpenuhi</button><button type="button" data-act="fyn" data-id="' + id + '" data-v="0" aria-pressed="' + (f.nilai === 0) + '"' + dis + ">Tidak terpenuhi</button></div>";
      } else if (ind.tipe === "DURASI") {
        var tot = f.nilai !== undefined && f.nilai !== null ? f.nilai : null;
        inputs = '<div class="dur"><div class="field"><label for="j-' + id + '">Jam</label><input class="inp mono" id="j-' + id + '" data-act="fdur" data-id="' + id + '" data-k="j" inputmode="numeric" value="' + (tot !== null ? Math.floor(tot / 60) : "") + '"' + dis + '></div><div class="field"><label for="mm-' + id + '">Menit</label><input class="inp mono" id="mm-' + id + '" data-act="fdur" data-id="' + id + '" data-k="m" inputmode="numeric" value="' + (tot !== null ? Math.round(tot % 60) : "") + '"' + dis + "></div></div>";
      } else {
        inputs = '<div class="field"><label for="v-' + id + '">' + (ind.tipe === "KEJADIAN" ? "Jumlah kejadian" : "Nilai") + (ind.satuan && ind.satuan !== "%" ? " (" + esc(ind.satuan) + ")" : (ind.satuan === "%" ? " (%)" : "")) + '</label><input class="inp mono" id="v-' + id + '" data-act="fv" data-id="' + id + '" data-k="nilai" inputmode="decimal" value="' + (f.nilai !== undefined && f.nilai !== null ? f.nilai : "") + '"' + dis + "></div>";
      }
    }
    var noteOpen = S.openNote[id] || f.catatan || f.bukti;
    var noteHtml = noteOpen ? '<div class="field"><label for="c-' + id + '">Catatan</label><textarea class="ta" id="c-' + id + '" data-act="fv" data-id="' + id + '" data-k="catatan" placeholder="mis. nama kegiatan/pelatihan, penjelasan angka"' + dis + ">" + esc(f.catatan || "") + '</textarea></div><div class="field"><label for="b-' + id + '">Link bukti (Drive)</label><input class="inp" id="b-' + id + '" data-act="fv" data-id="' + id + '" data-k="bukti" placeholder="https://drive.google.com/…" value="' + esc(f.bukti || "") + '"' + dis + "></div>" : (canEdit ? '<div class="inline-actions"><button type="button" class="linklike" data-act="note" data-id="' + id + '">+ Catatan / link bukti</button></div>' : "");

    return '<div class="irow' + (rs.needRtl ? " is-fail" : "") + '" id="row-' + id + '"><span class="no">' + ind.no + '</span><div style="min-width:0"><div class="sasaran">' + esc(ind.program || ind.sasaran) + '</div><div class="nm">' + esc(ind.nama) + '</div><div class="meta"><span class="tag">' + ind.id + '</span><span class="tag">target ' + esc(L.fmtTarget(ind)) + '</span><span class="tag">' + esc(L.evalLabel(ind)) + "</span>" + (ev ? "" : '<span class="tag" style="color:var(--prog)">progres · dinilai ' + L.evalMonths(ind).map(function (x) { return L.BULAN[x - 1]; }).join("/") + "</span>") + "</div>" +
      (ind.rumus ? '<div class="formula">Rumus: ' + esc(ind.rumus) + "</div>" : "") + pimNote("INDIKATOR", ind.unit, S.bulan, ind.id, 2) + '</div><div class="inputs">' + stSel + inputs + noteHtml + '<div class="inline-actions" style="margin-top:2px">' + cchip("INDIKATOR", ind.unit, S.bulan, ind.id) + '</div></div><div class="res" id="res-' + id + '">' + resHtml(ind, rs) + "</div>" +
      '<div class="rtl-box" id="rtl-' + id + '"' + (rs.needRtl ? "" : " hidden") + ">" + rtlForm(ind, canEdit) + "</div></div>";
  }
  function resHtml(ind, rs) {
    var st = rs.st, v = st.v;
    if (!rs.filled) return '<span class="pill pill-warn">Belum diisi</span>';
    var pill = { ok: "pill-ok", fail: "pill-fail", prog: "pill-prog", note: "pill-prog", tba: "pill-na", empty: "pill-warn" }[st.s] || "pill-na";
    var lbl = { ok: "Tercapai", fail: "Tidak tercapai", prog: "Progres", note: "Catatan", tba: "Belum tersedia", empty: "Belum diisi" }[st.s] || CELL_TXT[st.s];
    var g = st.eval ? L.gap(ind, v) : null;
    return '<span class="val">' + (st.s === "tba" ? "TBA" : L.fmtVal(ind, v)) + '</span><span class="pill ' + pill + '">' + lbl + "</span>" + (g !== null && st.s !== "tba" ? '<span class="gap">selisih ' + (g > 0 ? "+" : "") + L.fmtNum(g, 1) + (ind.satuan === "%" ? " poin" : "") + "</span>" : "") + (st.eval && ind.frekuensi !== "BULANAN" && ind.frekuensi !== "PER_KEJADIAN" ? '<span class="gap">nilai periode · ' + esc(L.CARA_HITUNG[ind.cara_hitung]) + "</span>" : "");
  }
  function rtlForm(ind, canEdit) {
    var r = S.rtlDraft[ind.id] || {};
    var dis = canEdit ? "" : " disabled";
    function f(k, label, full, ta, ph) {
      var miss = canEdit && ["kendala", "penyebab", "uraian", "pelaksana", "penanggung_jawab", "target_waktu"].indexOf(k) >= 0 && !(r[k] && String(r[k]).trim());
      var el = ta ? '<textarea class="ta' + (miss ? " req-miss" : "") + '" id="r-' + k + "-" + ind.id + '" data-act="rv" data-id="' + ind.id + '" data-k="' + k + '" placeholder="' + (ph || "") + '"' + dis + ">" + esc(r[k] || "") + "</textarea>" : '<input class="inp' + (miss ? " req-miss" : "") + '" id="r-' + k + "-" + ind.id + '" data-act="rv" data-id="' + ind.id + '" data-k="' + k + '" placeholder="' + (ph || "") + '" value="' + esc(r[k] || "") + '"' + dis + ">";
      return '<div class="field' + (full ? " full" : "") + '"><label for="r-' + k + "-" + ind.id + '">' + label + "</label>" + el + "</div>";
    }
    return '<div class="rtl-title">' + ic("flag", ' width="15" height="15"') + "Rencana tindak lanjut wajib diisi</div>" +
      '<div class="rtl-grid">' + f("kendala", "Kendala / masalah *", false, true) + f("penyebab", "Penyebab *", false, true) + f("uraian", "Uraian tindak lanjut *", false, true) + f("tujuan", "Tujuan", false, true) + "</div>" +
      '<div class="rtl-grid-4">' + f("pelaksana", "Pelaksana *") + f("penanggung_jawab", "Penanggung jawab *") + f("target_waktu", "Target waktu *", false, false, "mis. 30 Nov 2026") + f("biaya", "Biaya (Rp)", false, false, "opsional") + "</div>" +
      f("keterangan", "Keterangan", true, false);
  }
  function footInner() {
    var inds = indsOf(S.unit).filter(function (i) { return L.isScheduled(i, S.bulan); });
    var filled = 0, rtlMiss = 0;
    inds.forEach(function (ind) { var rs = rowState(ind); if (rs.filled) filled++; if (rs.needRtl && !rs.rtlOk) rtlMiss++; });
    var done = filled === inds.length && rtlMiss === 0;
    return '<div class="prog-txt"><strong>' + filled + "/" + inds.length + "</strong> indikator terisi" + (rtlMiss ? ' · <span style="color:var(--fail);font-weight:600">' + rtlMiss + " RTL wajib belum lengkap</span>" : "") + '</div><div class="meter"><i style="width:' + (inds.length ? filled / inds.length * 100 : 0) + '%"></i></div><div class="spacer"></div>' +
      '<button class="btn" data-act="saveDraft">Simpan draf</button><button class="btn btn-primary" data-act="askSubmit"' + (done ? "" : " disabled") + ">Ajukan ke " + (unitOf(S.unit).penyusun.indexOf(unitOf(S.unit).manajer) >= 0 ? "Tim Mutu" : "Manajer") + "</button>";
  }
  function refreshRow(id) {
    var ind = S.all.indikator.filter(function (x) { return x.id === id; })[0];
    var rs = rowState(ind);
    var res = document.getElementById("res-" + id); if (res) res.innerHTML = resHtml(ind, rs);
    var row = document.getElementById("row-" + id);
    if (row) {
      row.classList.toggle("is-fail", rs.needRtl);
      var stv = (S.form[id] || {}).status;
      row.querySelectorAll('[data-act="fst"]').forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === stv || (b.dataset.v === "DIISI" && stv === "CATATAN"))); });
    }
    var box = document.getElementById("rtl-" + id); if (box) box.hidden = !rs.needRtl;
    var fb = document.getElementById("footbar"); if (fb) fb.innerHTML = footInner();
  }
  function collectEntries() {
    return indsOf(S.unit).map(function (ind) {
      var f = S.form[ind.id] || {};
      if (!f.status) return { indikator: ind.id, status: "" };
      var e = { indikator: ind.id, status: f.status, catatan: f.catatan || "", bukti: f.bukti || "" };
      if (f.status === "DIISI") {
        if (ind.tipe === "RASIO") { e.pembilang = f.pembilang; e.penyebut = f.penyebut; e.nilai = f.pembilang !== undefined && f.pembilang !== null && f.penyebut ? f.pembilang / f.penyebut * 100 : f.nilai; }
        else e.nilai = f.nilai;
      }
      return e;
    });
  }
  function saveAll() {
    var u = S.unit, m = S.bulan;
    var p = API.simpanCapaian(u, m, collectEntries());
    var rtlSaves = Object.keys(S.rtlDraft).map(function (id) {
      var ind = S.all.indikator.filter(function (x) { return x.id === id; })[0];
      if (!rowState(ind).needRtl) return null;
      var r = Object.assign({ indikator: id, unit: u, bulan: m, status: "TERBUKA" }, S.rtlDraft[id]);
      return API.simpanRTL(r).then(function (x) { S.rtlDraft[id] = x; });
    }).filter(Boolean);
    var carry = Object.keys(S.carryEdit).map(function (rid) {
      var ed = S.carryEdit[rid], r = S.all.rtl.filter(function (x) { return x.id === rid; })[0];
      var ket = (r.keterangan ? r.keterangan + "\n" : "") + (ed.progres ? L.BULAN[m - 1] + ": " + ed.progres : "");
      return API.simpanRTL({ id: rid, keterangan: ket, status: ed.selesai ? "SELESAI" : "TERBUKA" });
    });
    return p.then(function () { return Promise.all(rtlSaves.concat(carry)); }).then(function () { S.carryEdit = {}; return loadAll(); });
  }

  /* ---------------- PERSETUJUAN ---------------- */
  function monthSummary(unit, m) {
    var ok = 0, fail = 0, empty = 0;
    indsOf(unit).forEach(function (ind) { var s2 = cs(ind, m).s; if (s2 === "ok") ok++; else if (s2 === "fail") fail++; else if (s2 === "empty") empty++; });
    return { ok: ok, fail: fail, empty: empty, rtl: S.all.rtl.filter(function (r) { return r.unit === unit && r.bulan === m; }).length };
  }
  function viewInbox() {
    var list = S.inbox;
    var stageAct = { MENUNGGU_MANAJER: "Verifikasi", MENUNGGU_TIM_MUTU: "Tandai diketahui", MENUNGGU_DIREKTUR: "Setujui" };
    var cards = list.length ? list.map(function (x) {
      var u = unitOf(x.unit), sm = monthSummary(x.unit, x.bulan), sub = x.riwayat.filter(function (h) { return h.aksi === "AJUKAN"; }).slice(-1)[0];
      var open = S.review === x.id;
      return '<div class="inbox-card"><div style="min-width:0"><div class="eyebrow">' + esc(LAP_UI[x.status].t) + '</div><div class="ttl">' + esc(u.nama) + " — " + L.BULAN_PANJANG[x.bulan - 1] + " " + x.tahun + '</div><div class="facts"><span class="pill pill-ok plain">' + sm.ok + ' tercapai</span><span class="pill pill-fail plain">' + sm.fail + ' tidak tercapai</span><span class="pill pill-warn plain">' + sm.rtl + ' RTL</span><span class="muted" style="font-size:.78rem">diajukan ' + esc(sub ? person(sub.nik).ini : "") + " · " + (sub ? fmtDate(sub.at, true) : "") + '</span></div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-act="review" data-id="' + x.id + '">' + (open ? "Tutup" : "Tinjau") + '</button><button class="btn btn-danger" data-act="askReturn" data-u="' + x.unit + '" data-m="' + x.bulan + '">' + ic("undo") + 'Kembalikan</button><button class="btn btn-primary" data-act="approve" data-u="' + x.unit + '" data-m="' + x.bulan + '">' + ic("check") + stageAct[x.status] + "</button></div></div>" + (open ? reviewHtml(x) : "");
    }).join("") : '<div class="empty">Tidak ada laporan yang menunggu persetujuan Anda.</div>';
    var hist = S.all.laporan.filter(function (x) { return x.riwayat.some(function (h) { return h.nik === S.user.nik && h.aksi !== "AJUKAN"; }); }).slice(-6).reverse();
    return '<section class="panel"><div class="panel-h"><h2>Menunggu Anda</h2><span class="pill pill-brand plain">' + list.length + '</span></div><div>' + cards + "</div></section>" +
      '<section class="panel"><div class="panel-h"><h2>Riwayat tindakan Anda</h2></div><div class="panel-b">' + (hist.length ? '<div class="scroll-x"><table class="tbl"><thead><tr><th>Laporan</th><th>Status sekarang</th><th>Tindakan Anda</th></tr></thead><tbody>' + hist.map(function (x) {
        var h = x.riwayat.filter(function (y) { return y.nik === S.user.nik && y.aksi !== "AJUKAN"; }).slice(-1)[0];
        return "<tr><td>" + esc(unitOf(x.unit).nama) + " · " + L.BULAN_PANJANG[x.bulan - 1] + '</td><td><span class="pill ' + LAP_UI[x.status].pill + '">' + LAP_UI[x.status].t + '</span></td><td class="mono" style="font-size:.76rem">' + h.aksi + " · " + fmtDate(h.at, true) + "</td></tr>";
      }).join("") + "</tbody></table></div>" : '<div class="empty">Belum ada.</div>') + "</div></section>";
  }
  function reviewHtml(x) {
    var u = unitOf(x.unit), inds = indsOf(x.unit);
    var rows = inds.map(function (ind) {
      var c = capOf(ind.id), st = cs(ind, x.bulan, c), e = c[x.bulan];
      if (st.s === "na") return "";
      var pill = { ok: "pill-ok", fail: "pill-fail", prog: "pill-prog", note: "pill-prog", empty: "pill-warn", tba: "pill-na", future: "pill-na" }[st.s];
      var r = S.all.rtl.filter(function (y) { return y.indikator === ind.id && y.bulan === x.bulan; })[0];
      return '<tr><td><span class="persp-code persp-' + ind.perspektif + '">' + ind.perspektif + '</span></td><td class="w-ind">' + esc(ind.nama) + (r ? '<div class="muted" style="font-size:.76rem;margin-top:4px"><b style="color:var(--fail)">RTL:</b> ' + esc(r.kendala) + " → " + esc(r.uraian || "") + "</div>" : "") + (e && e.catatan ? '<div class="muted" style="font-size:.76rem;margin-top:2px">' + esc(e.catatan) + "</div>" : "") + '</td><td class="mono">' + esc(L.fmtTarget(ind)) + '</td><td class="mono">' + (e && e.status === "TERKUNCI" ? "🔒" : L.fmtVal(ind, st.v)) + '</td><td><span class="pill ' + pill + '">' + CELL_TXT[st.s] + '</span></td><td>' + cchip("INDIKATOR", ind.unit, x.bulan, ind.id) + "</td></tr>";
    }).join("");
    return '<div style="padding:0 18px 18px">' + stepper(u, x) + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">' + cchip("LAPORAN", x.unit, x.bulan, "") + '<button type="button" class="cchip" data-act="riwayat" data-u="' + x.unit + '" data-m="' + x.bulan + '">' + ic("clock", ' width="13" height="13"') + "<span>Riwayat pengajuan</span></button></div>" + pimNote("LAPORAN", x.unit, x.bulan, "", 2) + '<div class="scroll-x" style="margin-top:12px;border:1px solid var(--line);border-radius:8px"><table class="tbl"><thead><tr><th></th><th>Indikator</th><th>Target</th><th>Capaian</th><th>Status</th><th>Catatan</th></tr></thead><tbody>' + rows + "</tbody></table></div></div>";
  }

  /* ---------------- RTL ---------------- */
  function viewRTL() {
    var f = S.rtlFilter;
    var list = S.all.rtl.filter(function (r) { return (f.status === "ALL" || r.status === f.status) && (f.unit === "ALL" || r.unit === f.unit); }).sort(function (a, b) { return (b.bulan || 0) - (a.bulan || 0); });
    var vu = visibleUnits();
    var filters = '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center"><div class="seg" role="group" aria-label="Status">' + [["TERBUKA", "Terbuka"], ["SELESAI", "Selesai"], ["ALL", "Semua"]].map(function (x) { return '<button data-act="rtlSt" data-v="' + x[0] + '" aria-pressed="' + (f.status === x[0]) + '">' + x[1] + " · " + S.all.rtl.filter(function (r) { return (x[0] === "ALL" || r.status === x[0]) && (f.unit === "ALL" || r.unit === f.unit); }).length + "</button>"; }).join("") + '</div><div class="unit-pick"><button class="chip-btn" data-act="rtlU" data-v="ALL" aria-pressed="' + (f.unit === "ALL") + '">Semua unit</button>' + vu.map(function (u) { return '<button class="chip-btn" data-act="rtlU" data-v="' + u.kode + '" aria-pressed="' + (f.unit === u.kode) + '">' + u.kode + "</button>"; }).join("") + "</div></div>";
    var cards = list.length ? list.map(function (r) {
      var ind = S.all.indikator.filter(function (x) { return x.id === r.indikator; })[0] || {};
      var canClose = S.roles.penyusun.indexOf(r.unit) >= 0 && r.status === "TERBUKA";
      return '<div class="rtl-card"><div style="min-width:0"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="pill ' + (r.status === "TERBUKA" ? "pill-warn" : "pill-ok") + '">' + (r.status === "TERBUKA" ? "Terbuka" : "Selesai") + '</span><span class="tag">' + r.id + '</span><span class="tag">' + r.unit + '</span><span class="muted" style="font-size:.76rem">' + (r.bulan ? "sejak " + L.BULAN_PANJANG[r.bulan - 1] : "") + (r.bulan_terakhir && r.bulan_terakhir !== r.bulan ? " · update terakhir " + L.BULAN[r.bulan_terakhir - 1] : "") + '</span></div><div style="font-weight:650;margin-top:8px">' + esc(ind.nama || r.indikator) + '</div><div class="cols"><div><b>Kendala</b>' + esc(r.kendala) + "</div><div><b>Penyebab</b>" + esc(r.penyebab || "–") + "</div><div><b>Tindak lanjut</b>" + esc(r.uraian || "–") + "</div><div><b>Pelaksana</b>" + esc(r.pelaksana || "–") + "</div><div><b>Penanggung jawab</b>" + esc(r.penanggung_jawab || "–") + "</div><div><b>Target waktu</b>" + esc(r.target_waktu || "–") + '</div><div class="col-pim"><b>Catatan pimpinan</b>' + (cmtsOf("RTL", r.unit, r.bulan, r.id).filter(function (c) { return !c.parent; }).map(function (c) { return "<div><b style=\"display:inline;text-transform:none;letter-spacing:0;color:var(--ink)\">" + esc(person(c.nik).ini) + "</b> · " + fmtDate(c.at) + ": " + esc(c.teks) + "</div>"; }).join("") || '<span class="muted">–</span>') + "</div></div></div>" +
        '<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">' + (canClose ? '<button class="btn btn-sm" data-act="rtlClose" data-id="' + r.id + '">' + ic("check") + "Tandai selesai</button>" : "") + '<button class="btn btn-sm btn-ghost" data-act="ind" data-id="' + r.indikator + '">Lihat indikator</button>' + cchip("RTL", r.unit, r.bulan, r.id) + "</div></div>";
    }).join("") : '<div class="empty">Tidak ada RTL untuk filter ini.</div>';
    return filters + '<section class="panel"><div class="list">' + cards + "</div></section>";
  }

  /* ---------------- CETAK ---------------- */
  function verifCode(unit, m, aksi, h) {
    var s = unit + m + aksi + h.nik + h.at, x = 2166136261;
    for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; }
    return "SRM-" + unit + "-" + S.ctx.tahun + String(m).padStart(2, "0") + "-" + x.toString(16).toUpperCase().slice(0, 6);
  }
  function viewCetak() {
    var vu = visibleUnits();
    if (!S.cetak.unit || S.roles.units.indexOf(S.cetak.unit) < 0) S.cetak.unit = vu[0].kode;
    if (!S.cetak.bulan) { var lm = 1; S.all.laporan.forEach(function (x) { if (x.unit === S.cetak.unit && x.bulan > lm) lm = x.bulan; }); S.cetak.bulan = lm; }
    var u = unitOf(S.cetak.unit), m = S.cetak.bulan, lap = lapOf(u.kode, m), inds = indsOf(u.kode);
    var ctrl = '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end"><div class="field"><label for="cu">Unit</label><select class="sel" id="cu" data-act="cetakU">' + vu.map(function (x) { return '<option value="' + x.kode + '"' + (x.kode === u.kode ? " selected" : "") + ">" + esc(x.nama) + "</option>"; }).join("") + '</select></div><div class="field"><label for="cm">Periode</label><select class="sel" id="cm" data-act="cetakM">' + L.BULAN_PANJANG.map(function (b, i) { return '<option value="' + (i + 1) + '"' + (i + 1 === m ? " selected" : "") + ">" + b + "</option>"; }).join("") + '</select></div><button class="btn" data-act="riwayat" data-u="' + u.kode + '" data-m="' + m + '">' + ic("clock") + 'Riwayat pengajuan</button><p class="sheet-note" style="max-width:52ch">Pratinjau format resmi (Monitoring + ERTL) mengikuti template Klinik 2026. Di sistem final, tombol <b>Cetak / Simpan PDF</b> ada di sini; kertas A4 landscape.</p></div>';
    function pimPrint(ind, r, mm) {
      var cms = cmtsOf("INDIKATOR", u.kode, mm, ind.id).filter(function (c) { return !c.parent; }).concat(r ? cmtsOf("RTL", r.unit, r.bulan, r.id).filter(function (c) { return !c.parent; }) : []);
      var na = attsOf("INDIKATOR", u.kode, mm, ind.id).length + (r ? attsOf("RTL", r.unit, r.bulan, r.id).length : 0);
      return cms.map(function (c) { return "<b>" + esc(person(c.nik).ini) + "</b> " + fmtDate(c.at) + ": " + esc(c.teks); }).join("<br>") + (na ? '<div style="color:#555">Lampiran: ' + na + " file</div>" : "");
    }
    function signer(aksi) { var h = lap ? lap.riwayat.filter(function (x) { return x.aksi === aksi; }).slice(-1)[0] : null; return h; }
    function sig(label, nik, aksi) {
      var h = signer(aksi), p = person(nik);
      return "<div><div>" + label + "</div>" + (h ? '<span class="stamp">✓ ' + (aksi === "SETUJUI" ? "DISETUJUI" : aksi === "DIKETAHUI" ? "DIKETAHUI" : aksi === "VERIFIKASI" ? "DIVERIFIKASI" : "DIAJUKAN") + " " + fmtDate(h.at, true) + "<br>" + verifCode(u.kode, m, aksi, h) + "</span>" : '<span style="color:#999">belum</span>') + '<div class="nm">' + esc(p.nama) + "</div></div>";
    }
    var self = u.penyusun.indexOf(u.manajer) >= 0;
    var head = '<div class="s-head"><div><div class="s-title">PT PERSADA MEDIKA UTAMA</div><table><tr><td>Departemen / Divisi / Unit Kerja</td><td>: ' + esc(u.nama.toUpperCase()) + "</td></tr><tr><td>Jenis Indikator</td><td>: INDIKATOR MUTU TEKNIS</td></tr><tr><td>Tahun Anggaran</td><td>: " + S.ctx.tahun + "</td></tr><tr><td>Periode</td><td>: " + L.BULAN_PANJANG[m - 1].toUpperCase() + '</td></tr></table></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div class="sig">' + sig("Proposed by,", u.manajer, self ? "AJUKAN" : "VERIFIKASI") + sig("Approved by,", S.ctx.settings.direktur, "SETUJUI") + '</div><div class="sig">' + sig("Prepared by,", u.penyusun[0], "AJUKAN") + sig("Acknowledged by,", S.ctx.settings.ketua_tim_mutu, "DIKETAHUI") + "</div></div></div>";
    var rows = "", lp = null, lsas = null;
    inds.forEach(function (ind) {
      if (ind.perspektif !== lp) { rows += '<tr class="ps"><td colspan="19">' + L.PERSP[ind.perspektif].toUpperCase() + " PERSPECTIVES</td></tr>"; lp = ind.perspektif; lsas = null; }
      var c = capOf(ind.id);
      var key = ind.sasaran + "|" + ind.program;
      rows += "<tr><td>" + (key !== lsas ? "<b><i>" + esc(ind.sasaran) + "</i></b>" + (ind.program ? "<br>● " + esc(ind.program) : "") : "") + "</td><td>" + ind.no + "</td><td>" + esc(ind.nama) + '</td><td class="v">' + esc(ind.target_teks) + "</td><td>" + esc(L.FREK[ind.frekuensi]) + "</td><td>" + esc(ind.tools) + "</td><td>" + esc(ind.referensi) + "</td>" +
        L.BULAN.map(function (b, i) { var st = cs(ind, i + 1, c); var e = c[i + 1]; var t = i + 1 > m ? "" : (e && e.status === "TERKUNCI") ? "[terbatas]" : (st.s === "tba" ? "TBA" : st.s === "na" || st.s === "future" || st.s === "empty" ? "" : (st.v !== null && st.v !== undefined ? L.fmtVal(ind, st.v) : (e && e.catatan ? "✎" : ""))); return '<td class="v' + (st.s === "fail" && i + 1 <= m ? " v-fail" : "") + '">' + t + "</td>"; }).join("") + "</tr>";
      lsas = key;
    });
    var monitoring = '<table class="st"><thead><tr><th rowspan="2" style="width:150px">SASARAN MUTU</th><th rowspan="2">NO</th><th rowspan="2" style="width:190px">INDIKATOR MUTU</th><th rowspan="2">TARGET MUTU</th><th rowspan="2">FREKUENSI</th><th rowspan="2" style="width:110px">TOOLS / RECORDS</th><th rowspan="2">REF. PROGRAM</th><th colspan="12">Monitoring ' + S.ctx.tahun + "</th></tr><tr>" + L.BULAN.map(function (b) { return "<th>" + b + "</th>"; }).join("") + "</tr></thead><tbody>" + rows + "</tbody></table>";
    var erRows = "";
    inds.forEach(function (ind) {
      var c = capOf(ind.id), st = cs(ind, m, c);
      if (st.s === "na") return;
      var r = S.all.rtl.filter(function (x) { return x.indikator === ind.id && x.bulan === m; })[0] || S.all.rtl.filter(function (x) { return x.indikator === ind.id && x.status === "TERBUKA" && (x.bulan || 0) <= m; })[0];
      var g = st.eval ? L.gap(ind, st.v) : null;
      erRows += "<tr><td>" + ind.no + "</td><td>" + esc(ind.nama) + '</td><td class="v">' + esc(ind.target_teks) + '</td><td class="v' + (st.s === "fail" ? " v-fail" : "") + '">' + (st.v !== null && st.v !== undefined ? L.fmtVal(ind, st.v) : (st.s === "tba" ? "TBA" : "")) + '</td><td class="v">' + (g !== null ? L.fmtNum(g, 1) : "") + "</td><td>" + esc(r ? r.kendala : "-") + "</td><td>" + esc(r ? r.penyebab : "") + "</td><td>" + esc(r ? r.uraian : "") + "</td><td>" + esc(r ? r.tujuan : "") + "</td><td>" + esc(r ? r.pelaksana : "") + "</td><td>" + esc(r ? r.penanggung_jawab : "") + "</td><td>" + esc(r ? r.target_waktu : "") + "</td><td>" + esc(r ? r.biaya : "") + "</td><td>" + pimPrint(ind, r, m) + "</td></tr>";
    });
    var lc = cmtsOf("LAPORAN", u.kode, m, "").filter(function (c) { return !c.parent; });
    var lapNotes = lc.length ? '<div class="pim-print"><b>CATATAN PIMPINAN ATAS LAPORAN</b>' + lc.map(function (c) { return "<div><b>" + esc(person(c.nik).nama) + "</b> (" + fmtDate(c.at) + "): " + esc(c.teks) + "</div>"; }).join("") + "</div>" : "";
    var ertl = '<h4>LAPORAN EVALUASI DAN TINDAK LANJUT SASARAN MUTU — ' + L.BULAN_PANJANG[m - 1].toUpperCase() + " " + S.ctx.tahun + '</h4><table class="st"><thead><tr><th rowspan="2">NO</th><th rowspan="2" style="width:170px">INDIKATOR MUTU</th><th rowspan="2">TARGET</th><th rowspan="2">PENCAPAIAN</th><th rowspan="2">KESENJANGAN</th><th colspan="2">ANALISIS DAN EVALUASI</th><th colspan="6">TINDAK LANJUT</th><th rowspan="2" style="width:160px">CATATAN PIMPINAN</th></tr><tr><th>KENDALA / MASALAH</th><th>PENYEBAB</th><th>URAIAN</th><th>TUJUAN</th><th>PELAKSANA</th><th>PENANGGUNG JAWAB</th><th>TARGET WAKTU</th><th>BIAYA</th></tr></thead><tbody>' + erRows + "</tbody></table>" + lapNotes;
    return ctrl + '<div class="sheet-wrap"><div class="sheet">' + head + monitoring + ertl + "</div></div>";
  }

  /* ---------------- ADMIN ---------------- */
  function viewAdmin() {
    var a = S.admin;
    var tabs = [["unit", "Unit & penyusun"], ["pengguna", "Pengguna"], ["pengaturan", "Pengaturan"], ["log", "Log aktivitas"]];
    var t = '<div class="tabs" role="tablist">' + tabs.map(function (x) { return '<button role="tab" data-act="atab" data-v="' + x[0] + '" aria-selected="' + (a.tab === x[0]) + '">' + x[1] + "</button>"; }).join("") + "</div>";
    var body = "";
    if (a.tab === "unit") {
      body = '<section class="panel"><div class="scroll-x"><table class="tbl"><thead><tr><th>Kode</th><th>Unit</th><th>Ref</th><th>Departemen (Master Hirarki)</th><th>Penyusun & pelihat</th><th>Manajer (otomatis)</th><th>Alur</th></tr></thead><tbody>' + S.ctx.units.map(function (u) {
        var self = u.penyusun.indexOf(u.manajer) >= 0;
        return '<tr><td class="mono">' + u.kode + "</td><td><b>" + esc(u.nama) + '</b><div class="muted" style="font-size:.74rem">' + esc(u.divisi) + '</div></td><td class="mono">' + u.ref + '</td><td><div class="chipset">' + u.dept.map(function (d) { return '<span class="tag">' + esc(d) + "</span>"; }).join("") + "</div></td><td>" + u.penyusunInfo.map(function (p) { return '<div><b>' + esc(p.ini) + '</b> <span class="muted" style="font-size:.76rem">' + esc(p.jabatan || "") + "</span></div>"; }).join("") + ((u.viewer || []).length ? '<div class="muted" style="font-size:.74rem">Pelihat: ' + u.viewer.map(function (n) { return esc(person(n).ini); }).join(", ") + "</div>" : "") + '<button class="linklike" data-act="unitEdit" data-k="' + u.kode + '">Atur akses</button></td><td>' + (u.manajerInfo ? "<b>" + esc(u.manajerInfo.ini) + '</b> <span class="muted" style="font-size:.76rem">' + esc(u.manajerInfo.jabatan) + "</span>" : "–") + '</td><td style="font-size:.76rem">' + (self ? '<span class="pill pill-prog plain">lewati Manajer</span>' : "4 tahap") + "</td></tr>";
      }).join("") + "</tbody></table></div></section>";
    } else if (a.tab === "pengguna") {
      var dup = {};
      S.ctx.people.forEach(function (p) { dup[p.nik] = (dup[p.nik] || 0) + 1; });
      var master = window.__MASTER__.users;
      body = '<div class="alert alert-warn">' + ic("alert") + '<div>Data dibaca dari <b>MasterDatabase</b> (tidak diubah). Ditemukan <b>NIK 220012 dipakai 2 orang</b> (MJA & MSR) — perbaiki di MasterDatabase agar login tidak bentrok. Kolom Email masih sama semua, jadi email terkirim ke alamat cadangan sampai diisi.</div></div>' +
        '<section class="panel"><div class="scroll-x"><table class="tbl"><thead><tr><th>NIK</th><th>Inisial</th><th>Jabatan</th><th>Dept</th><th>Peran SARMUT</th><th>Nama lengkap (untuk PDF)</th><th>Email</th></tr></thead><tbody>' + master.map(function (m2) {
          var p = person(m2.nik), r = [];
          if (S.ctx.settings.admin.indexOf(m2.nik) >= 0 || m2.role === "Super Admin") r.push("Super Admin");
          if (m2.nik === S.ctx.settings.direktur) r.push("Direktur");
          if (m2.nik === S.ctx.settings.ketua_tim_mutu) r.push("Ketua Tim Mutu");
          S.ctx.units.forEach(function (u) { if (u.manajer === m2.nik) r.push("Manajer " + u.kode); if (u.penyusun.indexOf(m2.nik) >= 0) r.push("Penyusun " + u.kode); });
          var isDup = master.filter(function (z) { return z.nik === m2.nik; }).length > 1;
          var generic = !m2.email || m2.email === S.ctx.settings.email_cadangan;
          return '<tr><td class="mono"' + (isDup ? ' style="color:var(--fail);font-weight:700"' : "") + ">" + m2.nik + (isDup ? " ⚠" : "") + '</td><td class="mono">' + esc(m2.ini) + '</td><td style="font-size:.8rem">' + esc(m2.jabatan) + '</td><td style="font-size:.8rem">' + esc(m2.dept) + '</td><td style="font-size:.76rem">' + (r.length ? r.map(function (x) { return '<span class="pill pill-brand plain" style="margin:0 4px 4px 0">' + x + "</span>"; }).join("") : '<span class="muted">Pengguna</span>') + '</td><td><input class="inp" style="min-width:200px" data-act="nama" data-nik="' + m2.nik + '" placeholder="Nama + gelar" value="' + esc(p.nama !== m2.ini ? p.nama : "") + '"></td><td style="font-size:.76rem">' + (generic ? '<span class="pill pill-warn plain">cadangan</span>' : esc(m2.email)) + "</td></tr>";
        }).join("") + "</tbody></table></div></section>";
    } else if (a.tab === "pengaturan") {
      var s = S.ctx.settings;
      var opts = function (sel) { return window.__MASTER__.users.map(function (m2) { return '<option value="' + m2.nik + '"' + (m2.nik === sel ? " selected" : "") + ">" + m2.ini + " · " + esc(m2.jabatan) + " (" + m2.nik + ")</option>"; }).join(""); };
      body = '<section class="panel"><div class="panel-b"><form class="form-grid" id="setForm"><div class="field"><label for="s1">Tahun aktif</label><input class="inp mono" id="s1" name="tahun_aktif" value="' + s.tahun_aktif + '"></div><div class="field"><label for="s2">Batas lapor (tanggal, bulan berikutnya)</label><input class="inp mono" id="s2" name="tgl_batas" value="' + s.tgl_batas + '"><span class="hint">Laporan bulan M jatuh tempo tanggal ini di bulan M+1</span></div>' +
        '<div class="field"><label for="s3">Reminder email (H-minus)</label><input class="inp mono" id="s3" name="reminder_h" value="' + s.reminder_h + '"><span class="hint">H-' + s.reminder_h + " = tanggal " + (s.tgl_batas - s.reminder_h) + ' · plus H-1 dan eskalasi H+1</span></div><div class="field"><label for="s4">Email cadangan</label><input class="inp" id="s4" name="email_cadangan" value="' + esc(s.email_cadangan) + '"><span class="hint">Dipakai selama email pribadi belum diisi</span></div>' +
        '<div class="field"><label for="s5">Ketua Tim Mutu (Acknowledged)</label><select class="sel" id="s5" name="ketua_tim_mutu">' + opts(s.ketua_tim_mutu) + '</select></div><div class="field"><label for="s6">Approver akhir (Approved)</label><select class="sel" id="s6" name="direktur">' + opts(s.direktur) + '</select></div>' +
        '<div class="field full"><label for="s7">Pengirim email</label><input class="inp" id="s7" name="email_pengirim" value="' + esc(s.email_pengirim) + '"><span class="hint">Alias Gmail "Send As" — sama dengan aplikasi KPI</span></div><div class="full" style="display:flex;justify-content:flex-end"><button class="btn btn-primary" type="submit">Simpan pengaturan</button></div></form></div></section>';
    } else if (a.tab === "log") {
      body = '<div class="alert alert-info">' + ic("info") + "<div>Jejak audit bersifat <b>hanya-tambah</b>: tidak bisa diubah atau dihapus siapa pun, termasuk Super Admin. Mencatat siapa, kapan, apa, serta nilai sebelum dan sesudah.</div></div>" +
        '<section class="panel"><div class="panel-h"><div class="field" style="flex:1;min-width:200px"><label for="lq">Cari</label><input class="inp" id="lq" data-act="logQ" placeholder="objek, nama, atau isi catatan" value="' + esc(a.logQ) + '"></div><div class="field"><label for="la">Aksi</label><select class="sel" id="la" data-act="logA"><option value="ALL">Semua aksi</option>' + Object.keys(AKSI_LBL).map(function (k) { return '<option value="' + k + '"' + (a.logA === k ? " selected" : "") + ">" + AKSI_LBL[k] + "</option>"; }).join("") + '</select></div></div><div class="panel-b" id="logBox"><div class="empty">Memuat…</div></div></section>';
      API.audit().then(function (rows) {
        var b = document.getElementById("logBox"); if (!b) return;
        var q = (a.logQ || "").toLowerCase();
        var f = rows.filter(function (r) { return (a.logA === "ALL" || r.aksi === a.logA) && (!q || (r.objek + " " + r.detail + " " + person(r.nik).nama + " " + person(r.nik).ini + " " + (r.unit || "")).toLowerCase().indexOf(q) >= 0); });
        b.innerHTML = '<div class="muted" style="font-size:.78rem;margin-bottom:8px">' + f.length + " dari " + rows.length + ' catatan</div><div class="audit-list">' + (f.map(auditRow).join("") || '<div class="empty">Tidak ada catatan.</div>') + "</div>";
      });
    }
    return t + body;
  }
  function indForm(ind) {
    var o = function (map, sel) { return Object.keys(map).map(function (k) { return '<option value="' + k + '"' + (k === sel ? " selected" : "") + ">" + esc(map[k]) + "</option>"; }).join(""); };
    var ev = L.evalMonths(ind);
    var isNew = !ind.id, isSA = S.roles.superAdmin;
    var b = '<form class="form-grid" id="indForm">' +
      '<div class="field"><label for="f-ef">Berlaku mulai bulan</label><select class="sel" id="f-ef" name="efektif">' + monthOpts(S.ctx.openMonth) + '</select><span class="hint">Bulan sebelumnya tetap memakai definisi lama</span></div><div class="field"></div>' +
      '<div class="field full"><label for="f-al">Alasan ' + (isNew ? "penambahan" : "perubahan") + ' *</label><textarea class="ta" id="f-al" name="alasan" placeholder="Mengapa indikator ini perlu ' + (isNew ? "ditambah" : "diubah") + '?"></textarea></div>' +
      '<div class="field full"><label for="f-nama">Nama indikator</label><textarea class="ta" id="f-nama" name="nama">' + esc(ind.nama) + "</textarea></div>" +
      '<div class="field"><label for="f-p">Perspektif</label><select class="sel" id="f-p" name="perspektif">' + o(L.PERSP, ind.perspektif) + '</select></div><div class="field"><label for="f-no">No</label><input class="inp mono" id="f-no" name="no" value="' + ind.no + '"></div>' +
      '<div class="field full"><label for="f-s">Sasaran strategis</label><input class="inp" id="f-s" name="sasaran" value="' + esc(ind.sasaran) + '"></div><div class="field full"><label for="f-pr">Program (●)</label><input class="inp" id="f-pr" name="program" value="' + esc(ind.program) + '"><span class="hint">Kosongkan bila unit hanya memakai 2 level</span></div>' +
      '<div class="field"><label for="f-t">Tipe isian</label><select class="sel" id="f-t" name="tipe">' + o(L.TIPE, ind.tipe) + '</select></div><div class="field"><label for="f-op">Target</label><div style="display:grid;grid-template-columns:70px minmax(0,1fr) 90px;gap:6px"><select class="sel" id="f-op" name="operator">' + ["≥", "≤", "=", ">", "<"].map(function (x) { return "<option" + (x === ind.operator ? " selected" : "") + ">" + x + "</option>"; }).join("") + '</select><input class="inp mono" name="target" aria-label="Nilai target" value="' + ind.target + '"><input class="inp" name="satuan" aria-label="Satuan" placeholder="satuan" value="' + esc(ind.satuan) + '"></div><span class="hint">Durasi dalam menit (24 jam = 1440)</span></div>' +
      '<div class="field full"><label for="f-tt">Target tertulis (untuk cetak)</label><input class="inp" id="f-tt" name="target_teks" value="' + esc(ind.target_teks) + '"></div>' +
      '<div class="field"><label for="f-f">Frekuensi</label><select class="sel" id="f-f" name="frekuensi" data-act="freqChange">' + o(L.FREK, ind.frekuensi) + '</select></div><div class="field"><label for="f-ci">Cara isi</label><select class="sel" id="f-ci" name="cara_isi">' + o({ TIAP_BULAN: "Tiap bulan (progres)", BULAN_EVALUASI: "Hanya di bulan evaluasi" }, ind.cara_isi) + "</select></div>" +
      '<div class="field full"><span class="lbl">Bulan evaluasi</span><div class="months12" id="evm">' + L.BULAN.map(function (bb, i) { return '<label><input type="checkbox" name="ev" value="' + (i + 1) + '"' + (ev.indexOf(i + 1) >= 0 ? " checked" : "") + ">" + bb + "</label>"; }).join("") + '</div><span class="hint">Status Tercapai/Tidak hanya keluar di bulan ini; bulan lain tampil sebagai progres</span></div>' +
      '<div class="field"><label for="f-ch">Cara hitung nilai periode</label><select class="sel" id="f-ch" name="cara_hitung">' + o(L.CARA_HITUNG, ind.cara_hitung) + '</select></div><div class="field"><label for="f-pic">PIC</label><input class="inp" id="f-pic" name="pic" value="' + esc(ind.pic) + '"></div>' +
      '<div class="field"><label for="f-lp">Label pembilang</label><input class="inp" id="f-lp" name="label_pembilang" value="' + esc(ind.label_pembilang) + '"></div><div class="field"><label for="f-ld">Label penyebut</label><input class="inp" id="f-ld" name="label_penyebut" value="' + esc(ind.label_penyebut) + '"></div>' +
      '<div class="field full"><label for="f-r">Rumus</label><input class="inp" id="f-r" name="rumus" value="' + esc(ind.rumus) + '"></div><div class="field full"><label for="f-to">Tools / records</label><input class="inp" id="f-to" name="tools" value="' + esc(ind.tools) + '"></div><div class="field"><label for="f-ref">Referensi program</label><input class="inp mono" id="f-ref" name="referensi" value="' + esc(ind.referensi) + '"></div>' +
      '<div class="field" style="justify-content:flex-end"><label class="toggle"><input type="checkbox" name="rahasia"' + (ind.rahasia ? " checked" : "") + "> Data rahasia</label><span class=\"hint\">Nilai hanya terlihat unit, Direktur, Direksi</span></div></form>";
    return { title: ind.id ? (isSA ? "Ubah " : "Usulan ubah ") + ind.id : (isSA ? "Indikator baru" : "Usulan indikator baru"), sub: unitOf(ind.unit).nama, body: b, foot: '<button class="btn" data-act="closeDrawer">Batal</button><button class="btn btn-primary" data-act="indSave">' + (isSA ? "Simpan &amp; berlakukan" : "Ajukan ke Tim Mutu") + "</button>" };
  }

  /* ---------------- CATATAN · LAMPIRAN · RIWAYAT ---------------- */
  var AKSI_LBL = { AJUKAN: "Diajukan", VERIFIKASI: "Diverifikasi Manajer", DIKETAHUI: "Diketahui Tim Mutu", SETUJUI: "Disetujui Direktur", KEMBALIKAN: "Dikembalikan", SIMPAN_CAPAIAN: "Isian disimpan", BUAT_RTL: "RTL dibuat", UBAH_RTL: "RTL diubah", RTL_SELESAI: "RTL selesai", KOMENTAR: "Catatan pimpinan", BALAS_KOMENTAR: "Balasan catatan", LAMPIRAN: "Lampiran ditambah", LAMPIRAN_DIHAPUS: "Lampiran dihapus", USULAN_DIAJUKAN: "Usulan diajukan", USULAN_DISETUJUI: "Usulan disetujui", USULAN_DITOLAK: "Usulan ditolak", UBAH_INDIKATOR: "Indikator diubah", UBAH_PENGATURAN: "Pengaturan diubah", LOGIN: "Masuk sistem" };
  function tkey(t, u, b, r) { return t + "|" + u + "|" + (b || 0) + "|" + (r || ""); }
  function cmtsOf(t, u, b, r) { var k = tkey(t, u, b, r); return (S.all.komentar || []).filter(function (x) { return x.key === k; }); }
  function attsOf(t, u, b, r) { var k = tkey(t, u, b, r); return (S.all.lampiran || []).filter(function (x) { return x.key === k && !x.dihapus; }); }
  function isPimpinan(unit) { var r = S.roles; return r.superAdmin || r.direktur || r.direksi || r.timMutu || r.manajer.indexOf(unit) >= 0; }
  function fmtSize(n) { return n >= 1048576 ? (n / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
  function filesOf(input) { return input ? Array.prototype.map.call(input.files, function (f) { return { nama: f.name, ukuran: f.size, mime: f.type, url: API.real ? null : URL.createObjectURL(f), _file: f }; }) : []; }
  function cchip(t, u, b, r) {
    var nc = cmtsOf(t, u, b, r).length, na = attsOf(t, u, b, r).length;
    return '<button type="button" class="cchip' + (nc || na ? " has" : "") + '" data-act="thread" data-t="' + t + '" data-u="' + u + '" data-m="' + (b || 0) + '" data-ref="' + esc(r || "") + '" aria-label="Catatan dan lampiran">' + ic("msg", ' width="13" height="13"') + (nc ? "<b>" + nc + "</b>" : "") + ic("clip", ' width="13" height="13"') + (na ? "<b>" + na + "</b>" : "") + "<span>Catatan &amp; lampiran</span></button>";
  }
  function pimNote(t, u, b, r, max) {
    var tops = cmtsOf(t, u, b, r).filter(function (c) { return !c.parent; }).slice(-(max || 2));
    if (!tops.length) return "";
    return '<div class="pim-note">' + tops.map(function (c) { return '<div>' + ic("msg", ' width="13" height="13"') + "<span><b>" + esc(person(c.nik).ini) + "</b> · " + fmtDate(c.at) + " — " + esc(c.teks) + "</span></div>"; }).join("") + "</div>";
  }
  function canLampir(sp) {
    if (S.roles.penyusun.indexOf(sp.u) < 0) return false;
    var rt = sp.t === "RTL" ? S.all.rtl.filter(function (x) { return x.id === sp.r; })[0] : null;
    if (rt && rt.status === "TERBUKA") return true;
    var lap = lapOf(sp.u, sp.b);
    return !lap || ["DRAFT", "DIKEMBALIKAN"].indexOf(lap.status) >= 0;
  }
  function attItem(a, canDel) {
    var inner = ic("clip", ' width="14" height="14"') + '<span class="att-n">' + esc(a.nama) + '</span><span class="muted">' + fmtSize(a.ukuran) + "</span>";
    return (a.url ? '<a class="att" href="' + esc(a.url) + '" target="_blank" rel="noopener" download="' + esc(a.nama) + '">' + inner + "</a>" : '<span class="att" title="File contoh pada mockup">' + inner + "</span>") + (canDel && a.nik === S.user.nik ? '<button class="linklike" data-act="thDel" data-id="' + a.id + '" style="margin-left:4px">hapus</button>' : "");
  }
  function threadTitle(sp) {
    if (sp.t === "LAPORAN") return "Catatan laporan " + unitOf(sp.u).nama + " · " + L.BULAN_PANJANG[sp.b - 1];
    if (sp.t === "RTL") return "Catatan RTL " + sp.r;
    var ind = S.all.indikator.filter(function (x) { return x.id === sp.r; })[0];
    return ind ? ind.nama : sp.r;
  }
  function threadDrawer(sp) {
    var cm = cmtsOf(sp.t, sp.u, sp.b, sp.r), at = attsOf(sp.t, sp.u, sp.b, sp.r);
    var pim = isPimpinan(sp.u), pen = S.roles.penyusun.indexOf(sp.u) >= 0, cl = canLampir(sp);
    var tops = cm.filter(function (c) { return !c.parent; });
    var feed = tops.map(function (c) { return { at: c.at, html: cmHtml(c, cm, at, pim || pen) }; })
      .concat(at.filter(function (a) { return !a.komentar_id; }).map(function (a) { return { at: a.at, html: '<div class="cm cm-att"><div class="cm-h"><span class="avatar sm">' + esc(person(a.nik).ini) + "</span><b>" + esc(person(a.nik).nama) + '</b><span class="muted">menambah lampiran · ' + fmtDate(a.at, true) + '</span></div><div class="att-list">' + attItem(a, cl) + "</div></div>" }; }))
      .sort(function (x, y) { return x.at < y.at ? -1 : 1; });
    var rep = S.reply ? cm.filter(function (c) { return c.id === S.reply; })[0] : null;
    var compose = "";
    if (pim || (pen && rep)) {
      compose = '<div class="compose">' + (rep ? '<div class="reply-to">Membalas <b>' + esc(person(rep.nik).ini) + '</b><button class="linklike" data-act="thCancel">batal</button></div>' : "") +
        '<label class="lbl" for="thTxt">' + (rep ? "Balasan" : "Catatan baru") + '</label><textarea class="ta" id="thTxt" placeholder="' + (rep ? "Tulis balasan…" : "Tulis catatan / komentar untuk penyusun…") + '"></textarea>' +
        '<div class="compose-row"><label class="btn btn-sm filebtn">' + ic("clip", ' width="14" height="14"') + 'Lampirkan file<input type="file" id="thFile" data-act="thFileSel" multiple hidden></label><span class="muted" id="thFileN" style="font-size:.76rem"></span><div class="spacer"></div><button class="btn btn-primary btn-sm" data-act="thSend">Kirim</button></div></div>';
    } else if (pen) compose = '<p class="muted" style="font-size:.82rem">Catatan baru hanya dari pimpinan. Anda dapat <b>membalas</b> catatan yang sudah ada.</p>';
    var attach = cl ? '<div class="compose"><span class="lbl">Tambah lampiran bukti</span><div class="compose-row"><label class="btn btn-sm filebtn">' + ic("clip", ' width="14" height="14"') + 'Pilih file<input type="file" id="thFile2" data-act="thFileSel2" multiple hidden></label><span class="muted" id="thFileN2" style="font-size:.76rem"></span><div class="spacer"></div><button class="btn btn-sm" data-act="thUpload">Unggah</button></div><span class="hint muted" style="font-size:.74rem">Dokumen apa pun (kecuali file program) · maks 10 MB per file. Hanya bisa ditambah selama periode terbuka dan laporan belum diajukan.</span></div>' : "";
    var body = '<div class="alert alert-info">' + ic("info") + "<div>Catatan <b>tidak mengubah</b> isian yang sudah dilaporkan, tidak bisa diedit atau dihapus, dan semuanya tercatat di audit trail.</div></div>" +
      '<div class="thread">' + (feed.length ? feed.map(function (x) { return x.html; }).join("") : '<div class="empty">Belum ada catatan atau lampiran.</div>') + "</div>" + compose + attach;
    return { title: threadTitle(sp), sub: (sp.t === "LAPORAN" ? "Laporan" : sp.t === "RTL" ? "Rencana tindak lanjut" : "Indikator") + " · " + unitOf(sp.u).nama + (sp.b ? " · " + L.BULAN_PANJANG[sp.b - 1] : ""), body: body, thread: sp };
  }
  function cmHtml(c, all, atts, canReply) {
    var p = person(c.nik), reps = all.filter(function (x) { return x.parent === c.id; });
    var ats = atts.filter(function (a) { return a.komentar_id === c.id; });
    return '<div class="cm"><div class="cm-h"><span class="avatar sm">' + esc(p.ini) + "</span><div><b>" + esc(p.nama) + '</b><div class="muted" style="font-size:.72rem">' + esc(p.jabatan || "") + ' · <span class="mono">' + fmtDate(c.at, true) + "</span></div></div></div>" +
      '<div class="cm-b">' + esc(c.teks).replace(/\n/g, "<br>") + "</div>" + (ats.length ? '<div class="att-list">' + ats.map(function (a) { return attItem(a, false); }).join("") + "</div>" : "") +
      (canReply ? '<div><button class="linklike" data-act="thReply" data-id="' + c.id + '">Balas</button></div>' : "") +
      (reps.length ? '<div class="cm-replies">' + reps.map(function (r) { var pr = person(r.nik); return '<div class="cm cm-r"><div class="cm-h"><span class="avatar sm">' + esc(pr.ini) + "</span><div><b>" + esc(pr.nama) + '</b><div class="muted mono" style="font-size:.72rem">' + fmtDate(r.at, true) + '</div></div></div><div class="cm-b">' + esc(r.teks).replace(/\n/g, "<br>") + "</div>" + (atts.filter(function (a) { return a.komentar_id === r.id; }).map(function (a) { return '<div class="att-list">' + attItem(a, false) + "</div>"; }).join("")) + "</div>"; }).join("") + "</div>" : "") + "</div>";
  }
  function showE(ind, e) {
    if (!e || !e.status) return "(kosong)";
    if (e.status === "DIISI") { var v = L.entryValue(ind, e); return (v === null ? "–" : L.fmtVal(ind, v)) + (e.pembilang !== undefined && e.pembilang !== null && e.penyebut !== undefined && e.penyebut !== null ? " (" + L.fmtNum(e.pembilang) + " / " + L.fmtNum(e.penyebut) + ")" : ""); }
    return { TBA: "Belum tersedia", TIDAK_ADA_KEJADIAN: "Tidak ada kejadian", CATATAN: "Catatan saja" }[e.status] || e.status;
  }
  function sameE(a, b) { function k(e) { return e ? [e.status, e.nilai, e.pembilang, e.penyebut, e.catatan || ""].join("~") : ""; } return k(a) === k(b); }
  function openRiwayat(unit, m) {
    S.drawer = { title: "Riwayat pengajuan", sub: unitOf(unit).nama + " · " + L.BULAN_PANJANG[m - 1], body: '<div class="empty">Memuat…</div>' }; render();
    API.riwayatLaporan(unit, m).then(function (r) { S.drawer = riwayatDrawer(unit, m, r); render(); });
  }
  function riwayatDrawer(unit, m, r) {
    var inds = indsOf(unit), ev = r.laporan ? r.laporan.riwayat : [], versi = r.versi;
    var vh = versi.slice().reverse().map(function (v, idx) {
      var prev = versi[v.n - 2], lines = "", n = Object.keys(v.capaian).length;
      var ret = ev.filter(function (h) { return h.aksi === "KEMBALIKAN" && prev && h.at > prev.at && h.at <= v.at; })[0];
      if (prev) {
        var ch = [];
        inds.forEach(function (ind) { if (!sameE(prev.capaian[ind.id], v.capaian[ind.id])) ch.push("<tr><td>" + esc(ind.id) + '</td><td class="w-ind">' + esc(ind.nama) + '</td><td class="mono">' + esc(showE(ind, prev.capaian[ind.id])) + '</td><td class="mono"><b>' + esc(showE(ind, v.capaian[ind.id])) + "</b></td></tr>"); });
        var rt = Math.abs(v.rtl.length - prev.rtl.length);
        lines = ch.length ? '<div class="scroll-x" style="border:1px solid var(--line);border-radius:8px;margin-top:8px"><table class="tbl"><thead><tr><th>Kode</th><th>Indikator</th><th>Versi ' + prev.n + "</th><th>Versi " + v.n + "</th></tr></thead><tbody>" + ch.join("") + "</tbody></table></div>" : '<p class="muted" style="font-size:.8rem;margin-top:8px">Tidak ada perubahan nilai dari versi ' + prev.n + ".</p>";
        if (rt) lines += '<p class="muted" style="font-size:.8rem">RTL: ' + prev.rtl.length + " → " + v.rtl.length + "</p>";
      } else {
        var rows = inds.filter(function (ind) { return v.capaian[ind.id]; }).map(function (ind) { return "<tr><td>" + esc(ind.id) + '</td><td class="w-ind">' + esc(ind.nama) + '</td><td class="mono">' + esc(showE(ind, v.capaian[ind.id])) + "</td></tr>"; }).join("");
        lines = '<details class="collapse" style="margin-top:8px"><summary>Lihat isian versi 1 (' + n + ')</summary><div class="scroll-x"><table class="tbl"><thead><tr><th>Kode</th><th>Indikator</th><th>Isian</th></tr></thead><tbody>' + rows + "</tbody></table></div></details>";
      }
      return '<div class="ver"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="pill pill-brand plain">Versi ' + v.n + "</span>" + (idx === 0 ? '<span class="pill pill-ok plain">terbaru</span>' : "") + '<span class="muted" style="font-size:.78rem">diajukan <b>' + esc(person(v.nik).ini) + "</b> · " + fmtDate(v.at, true) + " · " + n + " isian · " + v.rtl.length + " RTL</span></div>" +
        (ret ? '<div class="alert alert-warn" style="margin-top:8px">' + ic("undo") + "<div><b>Sebelumnya dikembalikan oleh " + esc(person(ret.nik).ini) + " · " + fmtDate(ret.at, true) + "</b><br>" + esc(ret.catatan || "") + "</div></div>" : "") + lines + "</div>";
    }).join("") || '<div class="empty">Belum pernah diajukan.</div>';
    var tl = ev.slice().reverse().map(function (h) { return '<li><span class="tl-dot' + (h.aksi === "KEMBALIKAN" ? " warn" : "") + '"></span><div><b>' + (AKSI_LBL[h.aksi] || h.aksi) + "</b> · " + esc(person(h.nik).nama) + '<div class="muted mono" style="font-size:.72rem">' + fmtDate(h.at, true) + "</div>" + (h.catatan ? '<div style="font-size:.82rem;margin-top:2px">' + esc(h.catatan) + "</div>" : "") + "</div></li>"; }).join("");
    var au = r.audit.map(auditRow).join("");
    var nc = cmtsOf("LAPORAN", unit, m, "").length;
    var body = '<div style="display:flex;gap:8px;flex-wrap:wrap">' + cchip("LAPORAN", unit, m, "") + "</div>" +
      '<div><h3 style="margin-bottom:8px">Versi pengajuan (' + versi.length + ")</h3>" + vh + "</div>" +
      '<div><h3 style="margin-bottom:8px">Alur persetujuan</h3>' + (tl ? '<ul class="tl">' + tl + "</ul>" : '<p class="muted" style="font-size:.84rem">Belum ada.</p>') + "</div>" +
      '<div><h3 style="margin-bottom:8px">Jejak audit laporan ini</h3>' + (au ? '<div class="audit-list">' + au + "</div>" : '<p class="muted" style="font-size:.84rem">Belum ada aktivitas.</p>') + "</div>";
    return { title: "Riwayat pengajuan", sub: unitOf(unit).nama + " · " + L.BULAN_PANJANG[m - 1] + " " + S.ctx.tahun, body: body };
  }
  function auditRow(a) {
    var det = a.perubahan && a.perubahan.length ? '<details class="collapse"><summary>' + esc(a.detail || a.perubahan.length + " perubahan") + '</summary><table class="tbl"><thead><tr><th>Bagian</th><th>Sebelum</th><th>Sesudah</th></tr></thead><tbody>' + a.perubahan.map(function (p) { return '<tr><td class="mono" style="font-size:.74rem">' + esc(p.ref) + '</td><td class="mono" style="font-size:.76rem">' + esc(p.lama) + '</td><td class="mono" style="font-size:.76rem"><b>' + esc(p.baru) + "</b></td></tr>"; }).join("") + "</tbody></table></details>" : esc(a.detail || "");
    return '<div class="audit-row"><div class="mono" style="font-size:.72rem;color:var(--muted)">' + fmtDate(a.at, true) + '</div><div><span class="tag">' + (AKSI_LBL[a.aksi] || a.aksi) + '</span> <b style="font-size:.8rem">' + esc(person(a.nik).ini) + '</b> <span class="mono muted" style="font-size:.72rem">' + esc(a.objek) + '</span><div style="font-size:.82rem;margin-top:3px">' + det + "</div></div></div>";
  }

  /* ---------------- USULAN INDIKATOR ---------------- */
  var JENIS_LBL = { TAMBAH: "Indikator baru", UBAH: "Ubah indikator", NONAKTIF: "Nonaktifkan" };
  var USL_PILL = { DIAJUKAN: ["pill-warn", "Menunggu Tim Mutu"], DISETUJUI: ["pill-ok", "Disetujui"], DITOLAK: ["pill-fail", "Ditolak"] };
  function proposeUnits() { return S.roles.superAdmin ? S.ctx.units : S.ctx.units.filter(function (u) { return S.roles.manajer.indexOf(u.kode) >= 0; }); }
  function viewUsulan() {
    var f = S.usulanF, vu = visibleUnits(), isSA = S.roles.superAdmin;
    var base = S.usulan.filter(function (u) { return f.unit === "ALL" || u.unit === f.unit; });
    var list = base.filter(function (u) { return f.status === "ALL" || u.status === f.status; });
    var cnt = function (s) { return base.filter(function (u) { return s === "ALL" || u.status === s; }).length; };
    var filters = '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center"><div class="seg" role="group" aria-label="Status usulan">' + [["DIAJUKAN", "Menunggu"], ["DISETUJUI", "Disetujui"], ["DITOLAK", "Ditolak"], ["ALL", "Semua"]].map(function (x) { return '<button data-act="uslSt" data-v="' + x[0] + '" aria-pressed="' + (f.status === x[0]) + '">' + x[1] + " · " + cnt(x[0]) + "</button>"; }).join("") + '</div><div class="unit-pick"><button class="chip-btn" data-act="uslU" data-v="ALL" aria-pressed="' + (f.unit === "ALL") + '">Semua unit</button>' + vu.map(function (u) { return '<button class="chip-btn" data-act="uslU" data-v="' + u.kode + '" aria-pressed="' + (f.unit === u.kode) + '">' + u.kode + "</button>"; }).join("") + "</div></div>";
    var cards = list.length ? list.map(function (u) {
      var ind = u.indikator_id ? S.all.indikator.filter(function (x) { return x.id === u.indikator_id; })[0] : null;
      var nm = ind ? ind.nama : (u.data ? u.data.nama : "");
      var detail = "";
      if (u.jenis === "UBAH") detail = '<div class="scroll-x" style="border:1px solid var(--line);border-radius:8px;margin-top:10px"><table class="tbl"><thead><tr><th>Bagian</th><th>Sebelum</th><th>Sesudah</th></tr></thead><tbody>' + u.perubahan.map(function (p) { return "<tr><td>" + esc(p.label) + '</td><td class="mono" style="font-size:.78rem">' + esc(p.lama) + '</td><td class="mono" style="font-size:.78rem"><b>' + esc(p.baru) + "</b></td></tr>"; }).join("") + "</tbody></table></div>";
      if (u.jenis === "TAMBAH" && u.data) detail = '<dl class="kv" style="margin-top:10px"><dt>Perspektif</dt><dd>' + esc(L.PERSP[u.data.perspektif] || "") + "</dd><dt>Target</dt><dd>" + esc(u.data.target_teks || L.fmtTarget(u.data)) + "</dd><dt>Frekuensi</dt><dd>" + esc(L.evalLabel(u.data)) + "</dd><dt>Tipe isian</dt><dd>" + esc(L.TIPE[u.data.tipe] || "") + "</dd></dl>";
      var kep = u.keputusan ? '<div class="alert ' + (u.status === "DISETUJUI" ? "alert-info" : "alert-warn") + '" style="margin-top:10px">' + ic(u.status === "DISETUJUI" ? "check" : "undo") + "<div><b>" + (u.status === "DISETUJUI" ? "Disetujui" : "Ditolak") + " oleh " + esc(person(u.keputusan.nik).ini) + " · " + fmtDate(u.keputusan.at, true) + "</b>" + (u.keputusan.catatan ? "<br>" + esc(u.keputusan.catatan) : "") + "</div></div>" : "";
      var act = isSA && u.status === "DIAJUKAN" ? '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start"><button class="btn btn-danger" data-act="askTolak" data-id="' + u.id + '">' + ic("undo") + 'Tolak</button><button class="btn btn-primary" data-act="uslOk" data-id="' + u.id + '">' + ic("check") + "Setujui</button></div>" : "";
      return '<div class="usl-card"><div style="min-width:0"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="pill ' + USL_PILL[u.status][0] + '">' + USL_PILL[u.status][1] + '</span><span class="pill pill-brand plain">' + JENIS_LBL[u.jenis] + '</span><span class="tag">' + u.id + '</span><span class="tag">' + u.unit + "</span>" + (u.indikator_id ? '<span class="tag">' + esc(u.indikator_id) + "</span>" : "") + '</div><div style="font-weight:650;margin-top:8px">' + esc(nm) + '</div><div class="muted" style="font-size:.78rem;margin-top:3px">diusulkan <b>' + esc(person(u.oleh).ini) + "</b> · " + fmtDate(u.at, true) + " · berlaku mulai <b>" + L.BULAN_PANJANG[u.efektif_bulan - 1] + "</b></div>" +
        '<div style="font-size:.84rem;margin-top:8px"><b>Alasan:</b> ' + esc(u.alasan) + "</div>" + detail + kep + "</div>" + act + "</div>";
    }).join("") : '<div class="empty">Tidak ada usulan untuk filter ini.</div>';
    var manage = "";
    var pu = proposeUnits();
    if (pu.length) {
      if (!S.usulanUnit || !pu.some(function (x) { return x.kode === S.usulanUnit; })) S.usulanUnit = pu[0].kode;
      var inds = indsOf(S.usulanUnit), mo = S.ctx.openMonth;
      manage = '<section class="panel"><div class="panel-h"><h2>Kelola indikator unit</h2><span class="muted" style="font-size:.8rem">' + (isSA ? "Super Admin: perubahan langsung berlaku dan tercatat" : "Perubahan diajukan ke Ketua Tim Mutu untuk disetujui") + '</span><div class="spacer"></div><div class="field"><label for="uu">Unit</label><select class="sel" id="uu" data-act="uslUnitSel">' + pu.map(function (u) { return '<option value="' + u.kode + '"' + (u.kode === S.usulanUnit ? " selected" : "") + ">" + esc(u.nama) + "</option>"; }).join("") + '</select></div><button class="btn btn-primary" data-act="indNew">' + ic("plus") + (isSA ? "Indikator baru" : "Usulkan indikator baru") + '</button></div><div class="scroll-x"><table class="tbl"><thead><tr><th>Kode</th><th></th><th>Indikator</th><th>Target</th><th>Status</th><th></th></tr></thead><tbody>' +
        inds.map(function (i) {
          var pend = S.usulan.some(function (u) { return u.status === "DIAJUKAN" && u.indikator_id === i.id; });
          var off = i.nonaktif_mulai ? '<span class="pill pill-na plain">nonaktif sejak ' + L.BULAN[i.nonaktif_mulai - 1] + "</span>" : (i.aktif_dari && i.aktif_dari > 1 ? '<span class="pill pill-prog plain">mulai ' + L.BULAN[i.aktif_dari - 1] + "</span>" : '<span class="pill pill-ok plain">aktif</span>');
          return '<tr><td class="mono" style="font-size:.76rem;white-space:nowrap">' + i.id + '</td><td><span class="persp-code persp-' + i.perspektif + '">' + i.perspektif + '</span></td><td class="w-ind">' + esc(i.nama) + '</td><td class="mono" style="white-space:nowrap">' + esc(L.fmtTarget(i)) + "</td><td style=\"white-space:nowrap\">" + off + (pend ? ' <span class="pill pill-warn plain">usulan menunggu</span>' : "") + '</td><td style="white-space:nowrap"><button class="btn btn-sm" data-act="indEdit" data-id="' + i.id + '"' + (pend ? " disabled" : "") + ">" + (isSA ? "Ubah" : "Usulkan ubah") + '</button> <button class="btn btn-sm btn-ghost" data-act="askNonaktif" data-id="' + i.id + '"' + (pend || i.nonaktif_mulai ? " disabled" : "") + ">" + (isSA ? "Nonaktifkan" : "Usulkan nonaktif") + "</button></td></tr>";
        }).join("") + "</tbody></table></div></section>";
    }
    var note = '<div class="alert alert-info">' + ic("info") + "<div>Manajer <b>mengajukan</b>, Ketua Tim Mutu <b>menyetujui</b>. Indikator yang dinonaktifkan tidak dihapus: data bulan lama tetap utuh, hanya berhenti muncul mulai bulan yang ditentukan. Semua usulan, keputusan, dan perubahan tersimpan permanen.</div></div>";
    return note + filters + '<section class="panel"><div class="list">' + cards + "</div></section>" + manage;
  }
  function monthOpts(sel) { return L.BULAN_PANJANG.map(function (b, i) { return '<option value="' + (i + 1) + '"' + (i + 1 === sel ? " selected" : "") + ">" + b + "</option>"; }).join(""); }

  /* ---------------- drawer/modal ---------------- */
  function drawerHtml() {
    if (!S.drawer) return "";
    var d = S.drawer;
    return '<div class="scrim" data-act="closeDrawer"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="' + esc(d.title) + '"><div class="drawer-h"><div style="min-width:0"><div class="eyebrow">' + esc(d.sub || "") + '</div><h2 style="margin-top:4px">' + esc(d.title) + '</h2></div><div class="spacer"></div><button class="btn btn-ghost btn-sm" data-act="closeDrawer" aria-label="Tutup">' + ic("x") + '</button></div><div class="drawer-b">' + d.body + "</div>" + (d.foot ? '<div class="drawer-f">' + d.foot + "</div>" : "") + "</aside>";
  }
  function modalHtml() {
    if (!S.modal) return "";
    var m = S.modal;
    return '<div class="modal" role="dialog" aria-modal="true"><div class="scrim"' + (m.wajib ? "" : ' data-act="closeModal"') + '></div><div class="modal-card"><div class="panel-h"><h2>' + esc(m.title) + '</h2></div><div class="panel-b">' + m.body + '</div><div class="drawer-f">' + m.foot + "</div></div></div>";
  }

  /* ---------------- PERIODE, DOKUMEN, KEPATUHAN ---------------- */
  var KEY_UI = {
    TEPAT: { cls: "m-ok", short: "T", t: "Tepat waktu" },
    TERLAMBAT: { cls: "m-late", short: "L", t: "Terlambat" },
    BELUM_LAPOR: { cls: "m-late", short: "X", t: "Belum lapor (periode ditutup)" },
    JENDELA: { cls: "m-draft", short: "•", t: "Masih dalam batas waktu" },
    BERJALAN: { cls: "m-none", short: "•", t: "Periode berjalan" },
    BELUM: { cls: "m-future", short: "", t: "Belum dimulai" },
    ARSIP: { cls: "m-future", short: "–", t: "Sebelum sistem dipakai" }
  };
  function isPim2() { return S.roles.superAdmin || S.roles.timMutu; }
  function canAsk(unit) { return S.roles.penyusun.indexOf(unit) >= 0 || S.roles.manajer.indexOf(unit) >= 0; }
  function closedBanner(u, m, ls) {
    var ov = ls.ps.ov, mn = ls.key === "MINTA";
    var btns = "";
    if (mn && isPim2()) btns = '<button class="btn btn-sm btn-primary" data-act="askOpen" data-u="' + u.kode + '" data-m="' + m + '">Setujui & buka</button><button class="btn btn-sm" data-act="askTolak" data-u="' + u.kode + '" data-m="' + m + '">Tolak</button>';
    else if (!mn && isPim2()) btns = '<button class="btn btn-sm btn-primary" data-act="askOpen" data-u="' + u.kode + '" data-m="' + m + '">Buka periode</button>';
    else if (!mn && canAsk(u.kode)) btns = '<button class="btn btn-sm btn-primary" data-act="askBuka" data-u="' + u.kode + '" data-m="' + m + '">Ajukan pembukaan</button>';
    var txt = mn
      ? "<b>Menunggu keputusan pembukaan.</b> " + esc(person(ov.oleh).ini) + " meminta dibuka pada " + fmtDate(ov.at, true) + ". Alasan: “" + esc(ov.alasan) + "”"
      : "<b>Periode " + L.BULAN_PANJANG[m - 1] + " sudah ditutup</b> (batas " + fmtDate(ls.ps.due.toISOString()) + "). Isian hanya bisa dilihat. Pembukaan kembali hanya oleh Ketua Tim Mutu / Super Admin." + (ov && ov.status === "DITOLAK" ? "<br>Permintaan sebelumnya ditolak: “" + esc(ov.catatan) + "”" : "");
    return '<div class="alert alert-fail">' + ic("lock") + "<div>" + txt + (btns ? '<div class="inline-actions" style="margin-top:8px">' + btns + "</div>" : "") + "</div></div>";
  }
  function readFiles(input) {
    var fl = input ? Array.prototype.slice.call(input.files) : [];
    return Promise.all(fl.map(function (f) {
      return new Promise(function (res) {
        var r = new FileReader();
        r.onload = function () { res({ nama: f.name, ukuran: f.size, mime: f.type || "application/octet-stream", data: String(r.result).split(",")[1] || "" }); };
        r.onerror = function () { res({ nama: f.name, ukuran: f.size, mime: f.type, data: null }); };
        r.readAsDataURL(f);
      });
    }));
  }
  function downloadDoc(id) {
    var lp = (S.all.lampiran || []).filter(function (x) { return x.id === id && x.url; })[0];
    if (lp) { var a0 = document.createElement("a"); a0.href = lp.url; a0.download = lp.nama; document.body.appendChild(a0); a0.click(); a0.remove(); return; }
    API.unduh(id).then(function (r) {
      if (!r.data) { toast("Ini file contoh pada mockup, tidak ada isinya."); return; }
      var bin = atob(r.data), arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      var url = URL.createObjectURL(new Blob([arr], { type: r.mime || "application/octet-stream" }));
      var a = document.createElement("a"); a.href = url; a.download = r.nama; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    }).catch(errToast);
  }
  function docRow(d, canDel) {
    return '<div class="doc-row"><span class="doc-ic">' + ic("clip", ' width="16" height="16"') + '</span><div style="min-width:0"><div class="doc-n">' + esc(d.judul && d.judul !== d.nama ? d.judul + " · " : "") + esc(d.nama) + '</div><div class="muted" style="font-size:.74rem">' + fmtSize(d.ukuran) + " · " + esc(person(d.nik).ini) + " · " + fmtDate(d.at, true) + '</div></div><div class="spacer"></div><button class="btn btn-sm" data-act="dl" data-id="' + d.id + '">' + ic("download", ' width="14" height="14"') + "Unduh</button>" + (canDel ? '<button class="linklike" data-act="dokDel" data-id="' + d.id + '">hapus</button>' : "") + "</div>";
  }
  function canUpload(unit) { return S.roles.penyusun.indexOf(unit) >= 0 || S.roles.manajer.indexOf(unit) >= 0 || S.roles.superAdmin; }
  function docPanel(unit, m) {
    var list = (S.all.dokumen || []).filter(function (d) { return d.unit === unit && d.bulan === m; }).sort(function (a, b) { return a.at < b.at ? 1 : -1; });
    var up = canUpload(unit) ? '<div class="doc-up"><label class="btn filebtn">' + ic("upload", ' width="15" height="15"') + 'Pilih dokumen<input type="file" id="docFile" data-act="docSel" multiple hidden></label><span class="muted" id="docFileN" style="font-size:.78rem">Dokumen apa pun: PDF, Word, Excel, foto, ZIP… (maks 10 MB per file)</span><div class="spacer"></div><button class="btn btn-primary" data-act="docUp" data-u="' + unit + '" data-m="' + m + '">Unggah</button></div>' : "";
    return '<section class="panel"><div class="panel-h"><h2>Dokumen laporan</h2><span class="pill pill-na plain">' + list.length + ' file</span><div class="spacer"></div><button class="linklike" data-act="nav" data-v="dokumen">Lihat semua dokumen</button></div><div class="panel-b">' + up + '<div class="doc-list">' + (list.length ? list.map(function (d) { return docRow(d, d.nik === S.user.nik || isPim2()); }).join("") : '<div class="empty">Belum ada dokumen untuk laporan ini. Unggah berkas pendukung seperti rekap, bukti, notulen, atau laporan vendor.</div>') + "</div></div></section>";
  }
  function viewDokumen() {
    var vu = visibleUnits(), f = S.dok;
    var items = (S.all.dokumen || []).map(function (d) { return Object.assign({ jenis: "Dokumen laporan" }, d); })
      .concat((S.all.lampiran || []).filter(function (a) { return !a.dihapus; }).map(function (a) { return Object.assign({ jenis: a.tipe === "RTL" ? "Lampiran RTL" : a.tipe === "INDIKATOR" ? "Lampiran indikator" : "Lampiran catatan" }, a); }));
    var q = (f.q || "").toLowerCase();
    items = items.filter(function (d) { return (f.unit === "ALL" || d.unit === f.unit) && (!f.bulan || d.bulan === f.bulan) && (!q || (d.nama + " " + (d.judul || "") + " " + person(d.nik).nama).toLowerCase().indexOf(q) >= 0); }).sort(function (a, b) { return a.at < b.at ? 1 : -1; });
    var bar = '<section class="panel"><div class="panel-h" style="flex-wrap:wrap;gap:12px"><div class="field" style="flex:1;min-width:180px"><label for="dq">Cari</label><input class="inp" id="dq" data-act="dokQ" placeholder="nama file atau pengunggah" value="' + esc(f.q) + '"></div><div class="field"><label for="du">Unit</label><select class="sel" id="du" data-act="dokU"><option value="ALL">Semua unit</option>' + vu.map(function (u) { return '<option value="' + u.kode + '"' + (f.unit === u.kode ? " selected" : "") + ">" + esc(u.nama) + "</option>"; }).join("") + '</select></div><div class="field"><label for="db">Bulan</label><select class="sel" id="db" data-act="dokB"><option value="0">Semua bulan</option>' + L.BULAN_PANJANG.map(function (b, i) { return '<option value="' + (i + 1) + '"' + (f.bulan === i + 1 ? " selected" : "") + ">" + b + "</option>"; }).join("") + "</select></div></div>";
    var rows = items.length ? '<div class="panel-b"><div class="muted" style="font-size:.78rem;margin-bottom:8px">' + items.length + ' file · Unggah baru lewat menu <b>Isi Laporan</b> (bagian “Dokumen laporan”)</div><div class="doc-list">' + items.map(function (d) {
      return '<div class="doc-row"><span class="doc-ic">' + ic("clip", ' width="16" height="16"') + '</span><div style="min-width:0"><div class="doc-n">' + esc(d.judul && d.judul !== d.nama ? d.judul + " · " : "") + esc(d.nama) + '</div><div class="muted" style="font-size:.74rem">' + esc(d.jenis) + " · " + esc(unitOf(d.unit).nama) + (d.bulan ? " · " + L.BULAN[d.bulan - 1] : "") + " · " + fmtSize(d.ukuran) + " · " + esc(person(d.nik).ini) + " · " + fmtDate(d.at, true) + '</div></div><div class="spacer"></div><button class="btn btn-sm" data-act="dl" data-id="' + d.id + '">' + ic("download", ' width="14" height="14"') + "Unduh</button></div>";
    }).join("") + "</div></div>" : '<div class="panel-b"><div class="empty">Tidak ada dokumen yang cocok.</div></div>';
    return bar + rows + "</section>";
  }

  function viewPeriode() {
    var pim = isPim2(), vu = visibleUnits(), per = (S.all.periode || []).slice();
    var cells = L.kepatuhan(pctx(), vu, S.all.laporan).cells;
    var wait = per.filter(function (x) { return x.status === "MINTA"; });
    var info = '<div class="alert alert-info">' + ic("info") + "<div><b>Cara kerja penutupan.</b> Laporan bulan M dibuka sepanjang bulan M dan <b>otomatis ditutup tanggal " + S.ctx.settings.tgl_batas + " bulan berikutnya pukul 23.59</b>. Setelah ditutup, penyusun tidak bisa mengisi atau mengajukan. Jika terlambat, penyusun/manajer <b>mengajukan pembukaan</b> dengan alasan, lalu <b>Ketua Tim Mutu atau Super Admin</b> membuka untuk beberapa hari. Semua tercatat di audit dan resume kepatuhan.</div></div>";
    var waitHtml = '<section class="panel"><div class="panel-h"><h2>Menunggu keputusan</h2><span class="pill ' + (wait.length ? "pill-warn" : "pill-na") + '">' + wait.length + '</span></div><div class="panel-b"><div class="list">' + (wait.length ? wait.map(function (x) {
      return '<div class="li"><div style="min-width:0"><b>' + esc(unitOf(x.unit).nama) + " · " + L.BULAN_PANJANG[x.bulan - 1] + '</b><div class="s">Diminta ' + esc(person(x.oleh).ini) + " · " + fmtDate(x.at, true) + "</div><div style=\"font-size:.84rem;margin-top:4px\">“" + esc(x.alasan) + "”</div></div>" + (pim ? '<div class="inline-actions"><button class="btn btn-sm btn-primary" data-act="askOpen" data-u="' + x.unit + '" data-m="' + x.bulan + '">Setujui & buka</button><button class="btn btn-sm" data-act="askTolak" data-u="' + x.unit + '" data-m="' + x.bulan + '">Tolak</button></div>' : '<span class="pill pill-prog plain">menunggu Tim Mutu</span>') + "</div>";
    }).join("") : '<div class="empty">Tidak ada permintaan yang menunggu. 🎉</div>') + "</div></div></section>";
    var upto = S.ctx.openMonth;
    var grid = '<section class="panel"><div class="panel-h"><h2>Status periode per unit</h2><span class="muted" style="font-size:.8rem">klik sel terkunci untuk ' + (pim ? "membuka" : "mengajukan pembukaan") + '</span></div><div class="panel-b scroll-x"><table class="matrix"><thead><tr><th></th>' + L.BULAN.slice(0, upto).map(function (b) { return '<th scope="col">' + b + "</th>"; }).join("") + "</tr></thead><tbody>" + vu.map(function (u) {
      return '<tr><th class="unit" scope="row">' + esc(u.nama) + "<small>" + u.kode + "</small></th>" + L.BULAN.slice(0, upto).map(function (b, i) {
        var m = i + 1, ls = lapState(u.kode, m), ps = ls.ps || pstate(u.kode, m), k = ls.key, cls, sh, ti, act = "";
        var submitted = ["MENUNGGU_MANAJER", "MENUNGGU_TIM_MUTU", "MENUNGGU_DIREKTUR", "DISETUJUI"].indexOf(k) >= 0;
        if (m < (u.kepatuhan_mulai || 1)) { cls = "m-future"; sh = "–"; ti = "Sebelum sistem dipakai"; }
        else if (submitted) { cls = "m-ok"; sh = "✓"; ti = "Sudah diajukan"; }
        else if (k === "DITUTUP") { cls = "m-late"; sh = "🔒"; ti = "Ditutup"; if (pim || canAsk(u.kode)) act = ' data-act="' + (pim ? "askOpen" : "askBuka") + '" data-u="' + u.kode + '" data-m="' + m + '"'; }
        else if (k === "MINTA") { cls = "m-proc"; sh = "?"; ti = "Menunggu keputusan"; if (pim) act = ' data-act="askOpen" data-u="' + u.kode + '" data-m="' + m + '"'; }
        else if (k === "DIBUKA") { cls = "m-draft"; sh = "BUKA"; ti = "Dibuka sampai " + fmtDate(ps.until.toISOString(), true); }
        else if (k === "DIKEMBALIKAN") { cls = "m-draft"; sh = "↩"; ti = "Dikembalikan, bisa direvisi"; }
        else { cls = ps.state === "BELUM" ? "m-future" : "m-none"; sh = ps.state === "BELUM" ? "" : "•"; ti = ps.state === "BELUM" ? "Belum dimulai" : "Terbuka sampai " + fmtDate(ps.until.toISOString()); }
        return '<td><div class="mcell ' + cls + '"' + (act ? act + ' role="button" tabindex="0" style="cursor:pointer"' : "") + ' title="' + esc(u.nama + " · " + L.BULAN_PANJANG[i] + ": " + ti) + '">' + sh + "</div></td>";
      }).join("") + "</tr>";
    }).join("") + '</tbody></table><div class="legend" style="margin-top:12px"><span><i class="m-ok"></i>Sudah diajukan</span><span><i class="m-none"></i>Terbuka</span><span><i class="m-draft"></i>Dibuka khusus</span><span><i class="m-proc"></i>Menunggu keputusan</span><span><i class="m-late"></i>Ditutup</span></div></div></section>';
    var hist = per.sort(function (a, b) { return a.at < b.at ? 1 : -1; });
    var PS = { MINTA: ["pill-prog", "Menunggu"], DIBUKA: ["pill-ok", "Dibuka"], DITOLAK: ["pill-fail", "Ditolak"], DITUTUP: ["pill-na", "Ditutup lagi"] };
    var histHtml = '<section class="panel"><div class="panel-h"><h2>Riwayat permintaan & pembukaan</h2></div><div class="scroll-x"><table class="tbl"><thead><tr><th>Laporan</th><th>Diminta oleh</th><th>Alasan</th><th>Keputusan</th><th>Status</th></tr></thead><tbody>' + (hist.length ? hist.map(function (x) {
      return "<tr><td><b>" + esc(x.unit) + "</b> · " + L.BULAN[x.bulan - 1] + '</td><td style="font-size:.8rem">' + esc(person(x.oleh).ini) + '<div class="muted">' + fmtDate(x.at, true) + '</div></td><td style="font-size:.82rem;max-width:300px">' + esc(x.alasan) + '</td><td style="font-size:.8rem">' + (x.diputus_oleh ? esc(person(x.diputus_oleh).ini) + '<div class="muted">' + fmtDate(x.diputus_at, true) + (x.sampai ? " · sampai " + fmtDate(x.sampai) : "") + "</div>" + (x.catatan ? '<div class="muted">' + esc(x.catatan) + "</div>" : "") : "–") + '</td><td><span class="pill ' + (PS[x.status] || PS.MINTA)[0] + '">' + (PS[x.status] || PS.MINTA)[1] + "</span></td></tr>";
    }).join("") : '<tr><td colspan="5"><div class="empty">Belum ada.</div></td></tr>') + "</tbody></table></div></section>";
    return info + waitHtml + grid + histHtml;
  }

  function viewKepatuhan() {
    var vu = visibleUnits().filter(function (u) { return S.kep.unit === "ALL" || u.kode === S.kep.unit; });
    var K = L.kepatuhan(pctx(), vu, S.all.laporan), T = K.total;
    var pct = function (r) { return r === null ? "–" : Math.round(r * 100) + "<small>%</small>"; };
    var sel = visibleUnits().length > 1 ? '<div class="field" style="min-width:200px"><label for="ku">Tampilkan</label><select class="sel" id="ku" data-act="kepU"><option value="ALL">Semua unit</option>' + visibleUnits().map(function (u) { return '<option value="' + u.kode + '"' + (S.kep.unit === u.kode ? " selected" : "") + ">" + esc(u.nama) + "</option>"; }).join("") + "</select></div>" : "";
    var head = '<div class="period-band"><div><div class="eyebrow">Resume kepatuhan</div><strong>Tahun ' + S.ctx.tahun + ' · sampai ' + L.BULAN_PANJANG[S.ctx.lastDue - 1] + '</strong></div><span class="countdown">tepat waktu = diajukan sebelum tanggal ' + S.ctx.settings.tgl_batas + " bulan berikutnya pukul 23.59</span><div class=\"spacer\"></div>" + sel + "</div>";
    var tiles = '<div class="grid g-tiles">' +
      tile("Tingkat kepatuhan", pct(T.rate), T.rate || 0, T.tepat + " dari " + T.all + " laporan jatuh tempo") +
      tile("Tepat waktu", String(T.tepat), null, "laporan") +
      tile("Terlambat", String(T.terlambat), null, T.terlambat ? "rata-rata " + T.rataHari.toFixed(1).replace(".", ",") + " hari" : "tidak ada") +
      tile("Belum lapor", String(T.belum), null, T.belum ? "periode sudah ditutup" : "semua sudah lapor") + "</div>";
    var bars = '<div class="trend">' + L.BULAN.map(function (b, i) {
      var pm = K.perMonth[i + 1], tot = pm.total, h = 118;
      var seg = function (n, c) { return n ? '<i style="height:' + Math.round(n / Math.max(1, tot) * h) + "px;background:" + c + '" title="' + n + '"></i>' : ""; };
      return '<div class="tcol"><div class="tval">' + (pm.rate === null ? "" : Math.round(pm.rate * 100) + "%") + '</div><div class="tbar" style="height:' + h + 'px">' + (tot ? seg(pm.belum, "var(--fail)") + seg(pm.terlambat, "var(--warn)") + seg(pm.tepat, "var(--ok)") : '<i class="tnone"></i>') + '</div><div class="tlbl">' + b + '</div><div class="tsub">' + (tot ? pm.tepat + "/" + tot : "") + "</div></div>";
    }).join("") + '</div><div class="legend" style="margin-top:12px"><span><i style="background:var(--ok)"></i>Tepat waktu</span><span><i style="background:var(--warn)"></i>Terlambat</span><span><i style="background:var(--fail)"></i>Belum lapor</span><span class="muted">angka di atas = persen tepat waktu; di bawah = tepat/jumlah unit</span></div>';
    var trend = '<section class="panel"><div class="panel-h"><h2>Tren antar bulan</h2><span class="muted" style="font-size:.8rem">laporan bulan M dinilai pada batas bulan M+1</span></div><div class="panel-b">' + bars + "</div></section>";
    var mat = '<section class="panel"><div class="panel-h"><h2>Peta kepatuhan unit × bulan</h2><div class="spacer"></div><div class="legend"><span><i class="m-ok"></i>T tepat</span><span><i class="m-late"></i>L terlambat / X belum</span><span><i class="m-draft"></i>• dalam batas</span></div></div><div class="panel-b scroll-x"><table class="matrix"><thead><tr><th></th>' + L.BULAN.map(function (b) { return '<th scope="col">' + b + "</th>"; }).join("") + '<th scope="col">Skor</th></tr></thead><tbody>' + vu.map(function (u) {
      var pu = K.perUnit[u.kode];
      return '<tr><th class="unit" scope="row">' + esc(u.nama) + "<small>" + u.kode + "</small></th>" + L.BULAN.map(function (b, i) {
        var t = K.cells[u.kode][i + 1], ui = KEY_UI[t.key], lbl = t.key === "TERLAMBAT" ? "+" + t.days + "h" : t.key === "BELUM_LAPOR" ? "X" : ui.short;
        var tip = u.nama + " · " + L.BULAN_PANJANG[i] + ": " + ui.t + (t.key === "TERLAMBAT" ? " (" + t.days + " hari)" : t.key === "BELUM_LAPOR" ? " (lewat " + t.days + " hari)" : "") + (t.at ? " · diajukan " + fmtDate(t.at, true) : "");
        var clk = ["TEPAT", "TERLAMBAT"].indexOf(t.key) >= 0;
        return '<td><div class="mcell ' + ui.cls + '"' + (clk ? ' data-act="riwayat" data-u="' + u.kode + '" data-m="' + (i + 1) + '" role="button" tabindex="0" style="cursor:pointer"' : "") + ' title="' + esc(tip) + '">' + lbl + "</div></td>";
      }).join("") + '<td class="mono" style="font-weight:700;text-align:center">' + (pu.rate === null ? "–" : Math.round(pu.rate * 100) + "%") + "</td></tr>";
    }).join("") + "</tbody></table></div></section>";
    var rank = vu.slice().sort(function (a, b) { var x = K.perUnit[a.kode].rate, y = K.perUnit[b.kode].rate; return (y === null ? -1 : y) - (x === null ? -1 : x); });
    var rk = '<section class="panel"><div class="panel-h"><h2>Peringkat kepatuhan unit</h2></div><div class="panel-b">' + rank.map(function (u) {
      var pu = K.perUnit[u.kode], v = pu.rate === null ? 0 : Math.round(pu.rate * 100);
      return '<div class="pbar"><span class="persp-code" style="background:var(--brand-soft);color:var(--brand)">' + u.kode.slice(0, 3) + '</span><div><div class="lbl">' + esc(u.nama) + ' <span class="muted mono" style="font-weight:400;font-size:.72rem">' + pu.tepat + " tepat · " + pu.terlambat + " terlambat · " + pu.belum + " belum" + (pu.terlambat ? " · rata " + pu.rataHari.toFixed(1).replace(".", ",") + " hari" : "") + '</span></div><div class="track" style="margin-top:10px"><i style="width:' + v + '%;background:var(--ok)"></i><i style="width:' + (pu.total ? 100 - v : 0) + '%;background:color-mix(in srgb,var(--fail) 55%,transparent)"></i></div></div><span class="val">' + (pu.rate === null ? "–" : v + "%") + "</span></div>";
    }).join("") + '<p class="muted" style="font-size:.74rem;margin-top:14px">' + vu.filter(function (u) { return (u.kepatuhan_mulai || 1) > 1; }).map(function (u) { return esc(u.nama) + " dihitung mulai " + L.BULAN_PANJANG[u.kepatuhan_mulai - 1]; }).join("; ") + (vu.some(function (u) { return (u.kepatuhan_mulai || 1) > 1; }) ? " (bulan sebelumnya = arsip data lama)." : "") + "</p></div></section>";
    var todo = [];
    vu.forEach(function (u) { for (var m = 1; m <= 12; m++) { var t = K.cells[u.kode][m]; if (t.key === "BELUM_LAPOR") todo.push({ u: u, m: m, t: t, ps: t.ps }); } });
    var td = '<section class="panel"><div class="panel-h"><h2>Perlu tindakan</h2><span class="pill ' + (todo.length ? "pill-fail" : "pill-ok") + '">' + todo.length + '</span></div><div class="panel-b"><div class="list">' + (todo.length ? todo.map(function (x) {
      var st = x.ps.state, act = "";
      if (st === "MINTA") act = isPim2() ? '<button class="btn btn-sm btn-primary" data-act="askOpen" data-u="' + x.u.kode + '" data-m="' + x.m + '">Putuskan</button>' : '<span class="pill pill-prog plain">menunggu keputusan</span>';
      else if (st === "DIBUKA") act = '<span class="pill pill-warn plain">dibuka sampai ' + fmtDate(x.ps.until.toISOString()) + "</span>";
      else if (isPim2()) act = '<button class="btn btn-sm" data-act="askOpen" data-u="' + x.u.kode + '" data-m="' + x.m + '">Buka periode</button>';
      else if (canAsk(x.u.kode)) act = '<button class="btn btn-sm btn-primary" data-act="askBuka" data-u="' + x.u.kode + '" data-m="' + x.m + '">Ajukan pembukaan</button>';
      return '<div class="li"><div style="min-width:0"><b>' + esc(x.u.nama) + " · " + L.BULAN_PANJANG[x.m - 1] + '</b><div class="s">Batas ' + fmtDate(x.t.due.toISOString()) + " · lewat " + x.t.days + " hari</div></div>" + act + "</div>";
    }).join("") : '<div class="empty">Semua laporan jatuh tempo sudah masuk. Mantap! 🎉</div>') + "</div></div></section>";
    return head + tiles + trend + mat + '<div class="grid g-2">' + rk + td + "</div>";
  }


  /* ---------------- PANDUAN ---------------- */
  var GUIDE_MENU = [
    { i: "home", t: "Beranda", apa: "Ringkasan kondisi laporan kamu: tugas yang menunggu, RTL terbuka, dan periode yang sedang berjalan.", siapa: "Semua pengguna.", cara: "Buka pertama kali setelah masuk. Klik kartu tugas untuk langsung ke halamannya." },
    { i: "grid", t: "Capaian Unit", apa: "Peta capaian semua indikator per bulan (heatmap). Kolom Target dibekukan supaya mudah dibandingkan.", siapa: "Semua pengguna, sesuai unit yang boleh dilihat.", cara: "Pilih unit dari daftar. Klik nama bulan di kepala kolom untuk melihat riwayat laporan bulan itu. Klik sel indikator untuk melihat detail dan tren." },
    { i: "edit", t: "Isi Laporan", apa: "Tempat mengisi capaian bulanan, catatan, RTL, dan dokumen pendukung.", siapa: "Penyusun unit (hanya bulan yang periodenya masih terbuka).", cara: "1) Pilih unit dan bulan. 2) Isi tiap indikator sesuai tipenya (rasio, angka, ya/tidak, kejadian, durasi). 3) Kalau indikator tidak tercapai, isi RTL. 4) Unggah dokumen pendukung di bagian \"Dokumen laporan\". 5) Klik Ajukan. Isian tersimpan otomatis sebagai draf sebelum diajukan." },
    { i: "inbox", t: "Persetujuan", apa: "Daftar laporan yang menunggu tindakan kamu sebagai pemeriksa berikutnya.", siapa: "Manajer, Ketua Tim Mutu, Direktur (sesuai tahapnya).", cara: "Buka laporan, periksa isinya dan dokumennya. Pilih Setujui untuk meneruskan, atau Kembalikan dengan catatan yang jelas (catatan wajib diisi)." },
    { i: "flag", t: "Tindak Lanjut", apa: "Semua RTL (rencana tindak lanjut) dari indikator yang tidak tercapai, beserta statusnya dan catatan pimpinan.", siapa: "Semua pengguna sesuai unit.", cara: "Perbarui progres RTL yang masih Terbuka tiap bulan. Tandai Selesai kalau sudah tuntas. RTL yang belum selesai ikut terbawa ke bulan berikutnya." },
    { i: "chart", t: "Resume Kepatuhan", apa: "Ringkasan ketepatan lapor antar bulan dan antar unit: tepat waktu, terlambat, atau belum lapor.", siapa: "Semua pengguna sesuai unit.", cara: "Pilih unit atau tampilkan semua. Baca peta unit × bulan: T = tepat, +Nh = terlambat N hari, X = belum lapor, • = masih dalam batas. Klik sel T atau L untuk melihat riwayatnya." },
    { i: "clip", t: "Dokumen", apa: "Kumpulan semua berkas laporan dan lampiran (PDF, Word, Excel, foto, dan lainnya) dalam satu tempat.", siapa: "Semua pengguna sesuai unit.", cara: "Pakai kolom Cari, atau saring per unit dan bulan. Klik Unduh untuk menyimpan file ke komputer. Unggah dokumen baru lewat menu Isi Laporan." },
    { i: "lock", t: "Periode & Kunci", apa: "Melihat status tiap periode laporan (terbuka, ditutup, dibuka khusus) dan menangani permintaan pembukaan.", siapa: "Semua bisa melihat. Hanya Ketua Tim Mutu dan Super Admin yang bisa membuka atau menolak.", cara: "Kalau periode sudah ditutup dan kamu terlambat, klik Ajukan pembukaan dan tulis alasannya. Ketua Tim Mutu akan membuka atau menolak. Pembukaan khusus berlaku sesuai jumlah hari yang ditentukan." },
    { i: "list", t: "Usulan Indikator", apa: "Usulan perubahan daftar indikator: tambah, ubah, atau nonaktifkan.", siapa: "Manajer mengajukan. Ketua Tim Mutu / Super Admin memutuskan.", cara: "Klik Usulkan indikator baru (atau Ubah / Nonaktifkan di indikator yang ada), pilih jenisnya, tulis alasan dan bulan mulai berlaku. Perubahan hanya berlaku mulai bulan itu. Data bulan sebelumnya tidak ikut berubah." },
    { i: "doc", t: "Cetak Laporan", apa: "Menampilkan laporan dalam format resmi (Monitoring dan ERTL) yang siap dicetak.", siapa: "Semua pengguna sesuai unit.", cara: "Pilih unit dan bulan, lalu klik Cetak. Di jendela cetak, pilih Save as PDF kalau mau disimpan sebagai file." },
    { i: "gear", t: "Pengaturan", apa: "Atur unit dan penyusunnya, hak akses (penyusun dan pelihat), indikator, batas tanggal lapor, dan melihat log aktivitas.", siapa: "Super Admin saja.", cara: "Tab Unit & penyusun: klik Atur akses untuk menambah penyusun atau pelihat. Tab Pengaturan: ubah tanggal batas. Tab Log aktivitas: lihat siapa melakukan apa dan kapan." }
  ];
  var GUIDE_FLOW = [
    ["Isi", "Penyusun mengisi capaian, RTL, dan dokumen di bulan yang periodenya terbuka."],
    ["Ajukan", "Setelah yakin, klik Ajukan. Setelah diajukan, laporan dikunci dan tidak bisa diubah."],
    ["Verifikasi", "Manajer memeriksa. Kalau ada yang kurang, dikembalikan dengan catatan."],
    ["Diketahui", "Ketua Tim Mutu memeriksa dan meneruskan."],
    ["Disetujui", "Direktur memberi persetujuan akhir. Laporan terkunci dan tersimpan sebagai versi resmi."]
  ];
  var GUIDE_STATUS = [
    ["m-ok", "T", "Tepat waktu", "Diajukan sebelum batas tanggal 15 bulan berikutnya."],
    ["m-late", "+3h", "Terlambat", "Diajukan setelah batas. Angka = jumlah hari terlambat."],
    ["m-late", "X", "Belum lapor", "Periode sudah ditutup tapi belum diajukan."],
    ["m-draft", "•", "Dalam batas", "Masih bisa diisi dan diajukan, belum jatuh tempo."],
    ["m-proc", "?", "Menunggu", "Permintaan pembukaan sedang diperiksa Ketua Tim Mutu."],
    ["m-draft", "BUKA", "Dibuka khusus", "Periode dibuka sementara oleh Ketua Tim Mutu. Pengajuan tetap tercatat terlambat."]
  ];
  var GUIDE_FAQ = [
    ["Kenapa tombol Isi tidak bisa diklik?", "Periode bulan itu sudah ditutup. Ajukan pembukaan lewat menu Periode & Kunci, atau tunggu Ketua Tim Mutu membukanya."],
    ["Laporan sudah diajukan, tapi ada yang salah. Bagaimana?", "Hubungi manajer atau Ketua Tim Mutu, minta laporan dikembalikan. Setelah dikembalikan, kamu bisa merevisi dan mengajukan lagi."],
    ["Dokumen apa saja yang boleh diunggah?", "Semua jenis dokumen, kecuali file program (.exe, .bat, .js, dan sejenisnya). Ukuran maksimal 10 MB per file."],
    ["Lupa password?", "Minta Super Admin mereset. Setelah reset, password kembali ke password MasterDatabase dan kamu wajib menggantinya saat masuk."],
    ["Apa bedanya catatan dan komentar pimpinan?", "Catatan pimpinan hanya tambahan. Tidak mengubah isi laporan yang sudah diajukan. Penyusun hanya bisa membalas."]
  ];

  function viewPanduan() {
    var r = S.roles;
    var menus = GUIDE_MENU.filter(function (m) {
      if (m.t === "Pengaturan") return !!r.superAdmin;
      return true;
    });
    var intro = '<section class="panel"><div class="panel-b">' +
      '<div class="eyebrow">Selamat datang di SARMUT</div>' +
      '<h2 style="margin:4px 0 8px">Cara pakai dalam 1 menit</h2>' +
      '<p style="font-size:.9rem;line-height:1.6">Tiap bulan, penyusun mengisi capaian unitnya, lalu laporan naik berurutan ke manajer, Ketua Tim Mutu, dan Direktur. Menu di kiri adalah tempat kerja utama. Kartu di bawah menjelaskan fungsi tiap menu, siapa yang bisa memakainya, dan langkahnya.</p>' +
      '<p class="muted" style="font-size:.8rem;margin-top:8px">Tidak yakin dengan sesuatu? Klik ikon di kartu untuk melihat keterangannya, atau buka bagian FAQ di bawah.</p></div></section>';

    var flow = '<section class="panel"><div class="panel-h"><h2>Alur laporan bulanan</h2></div><div class="panel-b"><div class="guide-flow">' +
      GUIDE_FLOW.map(function (f, i) { return '<div class="gf-step"><span class="gf-n">' + (i + 1) + '</span><div><b>' + f[0] + '</b><div class="muted" style="font-size:.82rem;margin-top:2px">' + f[1] + '</div></div></div>'; }).join("") +
      '</div></div></section>';

    var cards = '<div class="guide-grid">' + menus.map(function (m) {
      return '<article class="guide-card"><div class="gc-h"><span class="gc-ic">' + ic(m.i, ' width="20" height="20"') + '</span><h3>' + esc(m.t) + '</h3></div>' +
        '<p class="gc-apa">' + esc(m.apa) + '</p>' +
        '<div class="gc-meta"><span class="gc-k">Siapa</span> ' + esc(m.siapa) + '</div>' +
        '<div class="gc-meta"><span class="gc-k">Cara</span> ' + esc(m.cara) + '</div></article>';
    }).join("") + '</div>';

    var legend = '<section class="panel"><div class="panel-h"><h2>Arti warna dan simbol</h2></div><div class="panel-b"><div class="guide-status">' +
      GUIDE_STATUS.map(function (x) { return '<div class="gs-row"><span class="mcell ' + x[0] + '" style="min-width:52px">' + x[1] + '</span><div><b>' + x[2] + '</b><div class="muted" style="font-size:.82rem">' + x[3] + '</div></div></div>'; }).join("") +
      '</div></div></section>';

    var faq = '<section class="panel"><div class="panel-h"><h2>Pertanyaan yang sering muncul</h2></div><div class="panel-b">' +
      GUIDE_FAQ.map(function (q) { return '<details class="faq"><summary>' + esc(q[0]) + '</summary><p>' + esc(q[1]) + '</p></details>'; }).join("") +
      '</div></section>';

    return intro + flow + cards + legend + faq +
      '<section class="panel tentang"><div class="panel-b"><div class="eyebrow">Tentang Aplikasi</div><div class="tentang-lines">' + COPY_LINES.map(function (l) { return "<p>" + esc(l) + "</p>"; }).join("") + "</div></div></section>";
  }

  /* ---------------- render ---------------- */
  function render() {
    if (!S.user) { root.innerHTML = viewLogin(); requestAnimationFrame(drawLJ); return; }
    var body = "", foot = "";
    if (S.view === "beranda") body = viewBeranda();
    else if (S.view === "unit") body = viewUnit();
    else if (S.view === "isi") { var r = viewIsi(); body = r.body; foot = r.foot; }
    else if (S.view === "inbox") body = viewInbox();
    else if (S.view === "rtl") body = viewRTL();
    else if (S.view === "usulan") body = viewUsulan();
    else if (S.view === "cetak") body = viewCetak();
    else if (S.view === "admin") body = viewAdmin();
    else if (S.view === "kepatuhan") body = viewKepatuhan();
    else if (S.view === "dokumen") body = viewDokumen();
    else if (S.view === "periode") body = viewPeriode();
    else if (S.view === "panduan") body = viewPanduan();
    var sx = window.scrollX, sy = window.scrollY;
    root.innerHTML = shell(body, foot);
    window.scrollTo(sx, sy);
  }
  function go(v) { S.view = v; S.drawer = null; render(); window.scrollTo(0, 0); }

  /* ---------------- events ---------------- */
  root.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (ev.target.id === "loginForm") {
      var nik = $("#nik").value.trim();
      if (!nik) { $("#loginErr").textContent = "Isi NIK terlebih dahulu."; return; }
      var pwEl = $("#pw"), pw = pwEl ? pwEl.value : "";
      if (API.real && !pw) { $("#loginErr").textContent = "Isi password."; return; }
      var sb = ev.target.querySelector('button[type=submit]'); if (sb) { sb.disabled = true; sb.textContent = "Memeriksa…"; }
      var mEl = $("#loginMode"), mode = mEl ? mEl.value : "RIIL";
      doLogin(nik, pw, mode).catch(function (e) { $("#loginErr").textContent = e.message; var b2 = document.querySelector('#loginForm button[type=submit]'); if (b2) { b2.disabled = false; b2.textContent = "Masuk"; } });
    }
    if (ev.target.id === "setForm") {
      var fd = new FormData(ev.target), o = {};
      fd.forEach(function (v, k) { o[k] = /^(tahun_aktif|tgl_batas|reminder_h)$/.test(k) ? Number(v) : v; });
      API.simpanPengaturan(o).then(function () { return API.context(); }).then(function (c) { S.ctx = c; toast("Pengaturan tersimpan"); render(); });
    }
  });
  root.addEventListener("click", function (ev) {
    var t = ev.target.closest("[data-act]"); if (!t) return;
    var a = t.dataset.act;
    if (t.tagName === "SELECT" || (t.tagName === "INPUT" && t.type !== "checkbox") || t.tagName === "TEXTAREA") return;
    switch (a) {
      case "askPw": S.modal = pwModal(false); render(); break;
      case "doPw":
        var o1 = document.getElementById("pwOld").value, n1 = document.getElementById("pwNew").value, n2 = document.getElementById("pwNew2").value, pe = document.getElementById("pwErr");
        if (n1.length < 8) { pe.textContent = "Password baru minimal 8 karakter."; break; }
        if (n1 !== n2) { pe.textContent = "Ulangi password belum sama."; break; }
        API.gantiPassword(o1, n1).then(function () { S.modal = null; toast("Password berhasil diganti"); render(); }).catch(function (e) { pe.textContent = e.message; }); break;
      case "setMode": {
        var mv = document.getElementById("loginMode"), on = !!mv && mv.value !== "SIM";
        if (mv) mv.value = on ? "SIM" : "RIIL";
        t.setAttribute("aria-pressed", on ? "true" : "false"); t.classList.toggle("on", on);
        var hint = document.getElementById("modeHint"); if (hint) hint.hidden = !on;
        break;
      }
      case "persona": doLogin(t.dataset.nik).catch(errToast); break;
      case "logout": S.user = null; S.mode = null; S.simSampai = null; S.formKey = null; S.bulan = null; S.drawer = null; S.modal = null; API.logout(); render(); break;
      case "nav": go(t.dataset.v); break;
      case "unit": S.unit = t.dataset.k; render(); break;
      case "goisi": S.unit = t.dataset.unit; S.bulan = Number(t.dataset.m); S.formKey = null; go("isi"); break;
      case "ind": var d = drawerInd(t.dataset.id, t.dataset.m ? Number(t.dataset.m) : null); S.drawer = d; render(); break;
      case "closeDrawer": S.drawer = null; render(); break;
      case "closeModal": S.modal = null; render(); break;
      case "fst":
        var f = S.form[t.dataset.id] || (S.form[t.dataset.id] = {});
        f.status = t.dataset.v;
        if (t.dataset.v === "TIDAK_ADA_KEJADIAN") f.nilai = 0;
        render(); break;
      case "fyn": var f2 = S.form[t.dataset.id]; f2.status = "DIISI"; f2.nilai = Number(t.dataset.v); render(); break;
      case "note": S.openNote[t.dataset.id] = true; render(); var ta = document.getElementById("c-" + t.dataset.id); if (ta) ta.focus(); break;
      case "saveDraft": saveAll().then(function () { toast("Draf tersimpan"); render(); }).catch(errToast); break;
      case "askSubmit":
        var u = unitOf(S.unit);
        S.modal = { title: "Ajukan laporan " + u.kode + " " + L.BULAN_PANJANG[S.bulan - 1] + "?", body: "<p>Setelah diajukan, isian terkunci dan laporan diteruskan ke <b>" + esc(u.penyusun.indexOf(u.manajer) >= 0 ? person(S.ctx.settings.ketua_tim_mutu).ini + " (Ketua Tim Mutu)" : u.manajerInfo.ini + " (Manajer)") + "</b>. Email notifikasi dikirim otomatis.</p>", foot: '<button class="btn" data-act="closeModal">Periksa lagi</button><button class="btn btn-primary" data-act="doSubmit">Ajukan</button>' };
        render(); break;
      case "doSubmit":
        S.modal = null;
        saveAll().then(function () { return API.ajukan(S.unit, S.bulan); }).then(loadAll).then(function () { S.formKey = null; toast("Laporan diajukan"); render(); }).catch(errToast); break;
      case "review": S.review = S.review === t.dataset.id ? null : t.dataset.id; render(); break;
      case "approve": API.setujui(t.dataset.u, Number(t.dataset.m)).then(loadAll).then(function () { toast("Tersimpan · diteruskan ke tahap berikutnya"); render(); }).catch(errToast); break;
      case "askReturn":
        S.modal = { title: "Kembalikan laporan", body: '<div class="field"><label for="retNote">Catatan untuk penyusun *</label><textarea class="ta" id="retNote" placeholder="Apa yang perlu diperbaiki?"></textarea></div>', foot: '<button class="btn" data-act="closeModal">Batal</button><button class="btn btn-danger" data-act="doReturn" data-u="' + t.dataset.u + '" data-m="' + t.dataset.m + '">Kembalikan</button>' };
        render(); setTimeout(function () { var n = document.getElementById("retNote"); if (n) n.focus(); }, 0); break;
      case "doReturn":
        var note = document.getElementById("retNote").value;
        API.kembalikan(t.dataset.u, Number(t.dataset.m), note).then(function () { S.modal = null; return loadAll(); }).then(function () { toast("Laporan dikembalikan ke penyusun"); render(); }).catch(errToast); break;
      case "rtlSt": S.rtlFilter.status = t.dataset.v; render(); break;
      case "rtlU": S.rtlFilter.unit = t.dataset.v; render(); break;
      case "rtlClose": API.simpanRTL({ id: t.dataset.id, status: "SELESAI" }).then(loadAll).then(function () { toast("RTL ditandai selesai"); render(); }); break;
      case "atab": S.admin.tab = t.dataset.v; render(); break;
      case "indEdit": var ind = S.all.indikator.filter(function (x) { return x.id === t.dataset.id; })[0]; S.drawer = indForm(JSON.parse(JSON.stringify(ind))); S.drawer.ind = ind; render(); break;
      case "indNew":
        var blank = { id: "", unit: S.usulanUnit, perspektif: "IP", sasaran: "", program: "", no: 1, nama: "", target_teks: "", operator: "≥", target: 100, satuan: "%", tipe: "RASIO", frekuensi: "BULANAN", bulan_evaluasi: L.EVAL_DEFAULT.BULANAN, cara_isi: "TIAP_BULAN", cara_hitung: "TERAKHIR", rumus: "", tools: "", referensi: "", pic: "", rahasia: false, urutan: 999, label_pembilang: "", label_penyebut: "" };
        S.drawer = indForm(blank); S.drawer.ind = blank; S.drawer.isNew = true; render(); break;
      case "indSave":
        var fm = document.getElementById("indForm"), base = Object.assign({}, S.drawer.ind);
        var fd = new FormData(fm);
        ["nama", "perspektif", "sasaran", "program", "tipe", "operator", "satuan", "target_teks", "frekuensi", "cara_isi", "cara_hitung", "pic", "label_pembilang", "label_penyebut", "rumus", "tools", "referensi"].forEach(function (k) { base[k] = (fd.get(k) || "").toString(); });
        base.no = Number(fd.get("no")) || base.no; base.target = Number(String(fd.get("target")).replace(",", ".")) || 0;
        base.rahasia = !!fd.get("rahasia"); base.bulan_evaluasi = fd.getAll("ev").map(Number);
        if (!base.nama.trim()) { toast("Nama indikator wajib diisi"); break; }
        var isNew = S.drawer.isNew, alasan = (fd.get("alasan") || "").toString();
        API.ajukanUsulan({ jenis: isNew ? "TAMBAH" : "UBAH", unit: base.unit, indikator_id: isNew ? null : base.id, data: base, alasan: alasan, efektif_bulan: Number(fd.get("efektif")) }).then(loadAll).then(function () { S.drawer = null; toast(S.roles.superAdmin ? "Perubahan diberlakukan dan tercatat" : "Usulan dikirim ke Ketua Tim Mutu"); render(); }).catch(errToast); break;
      case "askNonaktif":
        var ni = S.all.indikator.filter(function (x) { return x.id === t.dataset.id; })[0];
        S.modal = { title: (S.roles.superAdmin ? "Nonaktifkan " : "Usulkan nonaktif ") + ni.id, body: '<p style="font-size:.88rem;margin-bottom:12px">' + esc(ni.nama) + '</p><div class="field"><label for="nzM">Nonaktif mulai bulan</label><select class="sel" id="nzM">' + monthOpts(Math.min(12, S.ctx.openMonth + 1)) + '</select><span class="hint">Data bulan sebelumnya tetap utuh dan tetap bisa dilihat.</span></div><div class="field" style="margin-top:12px"><label for="nzA">Alasan *</label><textarea class="ta" id="nzA" placeholder="Mengapa indikator ini tidak lagi dipakai?"></textarea></div>', foot: '<button class="btn" data-act="closeModal">Batal</button><button class="btn btn-primary" data-act="doNonaktif" data-id="' + ni.id + '" data-u="' + ni.unit + '">' + (S.roles.superAdmin ? "Nonaktifkan" : "Ajukan ke Tim Mutu") + "</button>" };
        render(); break;
      case "doNonaktif":
        API.ajukanUsulan({ jenis: "NONAKTIF", unit: t.dataset.u, indikator_id: t.dataset.id, alasan: document.getElementById("nzA").value, efektif_bulan: Number(document.getElementById("nzM").value) }).then(function () { S.modal = null; return loadAll(); }).then(function () { toast(S.roles.superAdmin ? "Indikator dinonaktifkan" : "Usulan dikirim ke Ketua Tim Mutu"); render(); }).catch(errToast); break;
      case "uslSt": S.usulanF.status = t.dataset.v; render(); break;
      case "uslU": S.usulanF.unit = t.dataset.v; render(); break;
      case "uslOk": API.putusanUsulan(t.dataset.id, true, "").then(loadAll).then(function () { toast("Usulan disetujui dan berlaku"); render(); }).catch(errToast); break;
      case "askTolak":
        S.modal = { title: "Tolak usulan", body: '<div class="field"><label for="tlNote">Catatan untuk pengusul *</label><textarea class="ta" id="tlNote" placeholder="Alasan penolakan"></textarea></div>', foot: '<button class="btn" data-act="closeModal">Batal</button><button class="btn btn-danger" data-act="doTolak" data-id="' + t.dataset.id + '">Tolak usulan</button>' };
        render(); break;
      case "doTolak": API.putusanUsulan(t.dataset.id, false, document.getElementById("tlNote").value).then(function () { S.modal = null; return loadAll(); }).then(function () { toast("Usulan ditolak"); render(); }).catch(errToast); break;
      case "thread":
        S.reply = null; S.drawer = threadDrawer({ t: t.dataset.t, u: t.dataset.u, b: Number(t.dataset.m) || 0, r: t.dataset.ref || "" }); render(); break;
      case "thReply": S.reply = t.dataset.id; S.drawer = threadDrawer(S.drawer.thread); render(); setTimeout(function () { var x = document.getElementById("thTxt"); if (x) x.focus(); }, 0); break;
      case "thCancel": S.reply = null; S.drawer = threadDrawer(S.drawer.thread); render(); break;
      case "thSend":
        var sp = S.drawer.thread, txt = document.getElementById("thTxt").value;
        API.tambahKomentar({ tipe: sp.t, unit: sp.u, bulan: sp.b, ref: sp.r, teks: txt, parent: S.reply || null, files: filesOf(document.getElementById("thFile")) }).then(loadAll).then(function () { S.reply = null; S.drawer = threadDrawer(sp); toast("Catatan tersimpan"); render(); }).catch(errToast); break;
      case "thUpload":
        var sp2 = S.drawer.thread, fl = filesOf(document.getElementById("thFile2"));
        if (!fl.length) { toast("Pilih file terlebih dahulu"); break; }
        API.tambahLampiran({ tipe: sp2.t, unit: sp2.u, bulan: sp2.b, ref: sp2.r, files: fl }).then(loadAll).then(function () { S.drawer = threadDrawer(sp2); toast("Lampiran ditambahkan"); render(); }).catch(errToast); break;
      case "thDel": API.hapusLampiran(t.dataset.id).then(loadAll).then(function () { S.drawer = threadDrawer(S.drawer.thread); toast("Lampiran dihapus (tetap tercatat di audit)"); render(); }).catch(errToast); break;
      case "askBuka":
        S.modal = { title: "Ajukan pembukaan periode", body: "<p style=\"font-size:.88rem;margin-bottom:12px\">" + esc(unitOf(t.dataset.u).nama) + " · " + L.BULAN_PANJANG[t.dataset.m - 1] + ". Permintaan dikirim ke Ketua Tim Mutu dan Super Admin (dengan email).</p><div class=\"field\"><label for=\"bkA\">Alasan keterlambatan *</label><textarea class=\"ta\" id=\"bkA\" placeholder=\"Mengapa laporan belum bisa diajukan sebelum batas?\"></textarea></div>", foot: '<button class="btn" data-act="closeModal">Batal</button><button class="btn btn-primary" data-act="doBuka" data-u="' + t.dataset.u + '" data-m="' + t.dataset.m + '">Kirim permintaan</button>' };
        render(); setTimeout(function () { var n = document.getElementById("bkA"); if (n) n.focus(); }, 0); break;
      case "doBuka":
        API.mintaBuka({ unit: t.dataset.u, bulan: Number(t.dataset.m), alasan: document.getElementById("bkA").value }).then(function () { S.modal = null; return loadAll(); }).then(function () { toast("Permintaan terkirim ke Tim Mutu"); render(); }).catch(errToast); break;
      case "askOpen":
        S.modal = { title: "Buka periode " + unitOf(t.dataset.u).nama + " · " + L.BULAN_PANJANG[t.dataset.m - 1], body: '<div class="field"><label for="opH">Dibuka selama</label><select class="sel" id="opH"><option value="1">1 hari</option><option value="3" selected>3 hari</option><option value="7">7 hari</option><option value="14">14 hari</option></select><span class="hint">Setelah itu otomatis tertutup lagi. Pengajuan di masa ini tetap tercatat terlambat.</span></div><div class="field" style="margin-top:12px"><label for="opC">Catatan (opsional)</label><textarea class="ta" id="opC" placeholder="Pesan untuk penyusun"></textarea></div>', foot: '<button class="btn" data-act="closeModal">Batal</button>' + ((S.all.periode || []).some(function (x) { return x.unit === t.dataset.u && x.bulan === Number(t.dataset.m) && x.status === "MINTA"; }) ? '<button class="btn" data-act="askTolak" data-u="' + t.dataset.u + '" data-m="' + t.dataset.m + '">Tolak</button>' : "") + '<button class="btn btn-primary" data-act="doOpen" data-u="' + t.dataset.u + '" data-m="' + t.dataset.m + '">Buka periode</button>' };
        render(); break;
      case "doOpen":
        API.bukaPeriode({ unit: t.dataset.u, bulan: Number(t.dataset.m), hari: Number(document.getElementById("opH").value), catatan: document.getElementById("opC").value }).then(function () { S.modal = null; return loadAll(); }).then(function () { S.formKey = null; toast("Periode dibuka · penyusun diberi tahu"); render(); }).catch(errToast); break;
      case "askTolak":
        S.modal = { title: "Tolak permintaan pembukaan", body: '<div class="field"><label for="tkC">Alasan penolakan *</label><textarea class="ta" id="tkC"></textarea></div>', foot: '<button class="btn" data-act="closeModal">Batal</button><button class="btn btn-danger" data-act="doTolak" data-u="' + t.dataset.u + '" data-m="' + t.dataset.m + '">Tolak</button>' };
        render(); break;
      case "doTolak":
        API.tolakBuka({ unit: t.dataset.u, bulan: Number(t.dataset.m), catatan: document.getElementById("tkC").value }).then(function () { S.modal = null; return loadAll(); }).then(function () { toast("Permintaan ditolak"); render(); }).catch(errToast); break;
      case "riwayat": openRiwayat(t.dataset.u, Number(t.dataset.m)); break;
      case "dl": downloadDoc(t.dataset.id); break;
      case "docUp":
        var inp = document.getElementById("docFile");
        if (!inp || !inp.files.length) { toast("Pilih file dulu"); break; }
        readFiles(inp).then(function (fl) { return API.unggahDokumen({ unit: t.dataset.u, bulan: Number(t.dataset.m), files: fl }); }).then(loadAll).then(function () { toast("Dokumen terunggah"); render(); }).catch(errToast); break;
      case "dokDel": API.hapusDokumen(t.dataset.id).then(loadAll).then(function () { toast("Dokumen dihapus (jejak tetap di audit)"); render(); }).catch(errToast); break;
      case "unitEdit":
        var uu = unitOf(t.dataset.k);
        var optP = window.__MASTER__.users.filter(function (m2) { return m2.divisi === uu.divisi || uu.penyusun.indexOf(m2.nik) >= 0; }).map(function (m2) { return '<option value="' + m2.nik + '"' + (uu.penyusun.indexOf(m2.nik) >= 0 ? " selected" : "") + ">" + m2.ini + " · " + esc(m2.jabatan) + "</option>"; }).join("");
        var optV = window.__MASTER__.users.filter(function (m2) { return uu.penyusun.indexOf(m2.nik) < 0; }).map(function (m2) { return '<option value="' + m2.nik + '"' + ((uu.viewer || []).indexOf(m2.nik) >= 0 ? " selected" : "") + ">" + m2.ini + " · " + esc(m2.jabatan) + "</option>"; }).join("");
        S.modal = { title: "Hak akses " + uu.nama,
          body: '<div class="field"><label for="penSel">Penyusun (boleh mengisi & mengajukan)</label><select class="sel" id="penSel" multiple size="6">' + optP + '</select><span class="hint">Daftar = karyawan divisi ' + esc(uu.divisi) + ". Tahan Ctrl/⌘ untuk pilih banyak.</span></div>" +
            '<div class="field" style="margin-top:14px"><label for="vwSel">Pelihat tambahan (hanya baca)</label><select class="sel" id="vwSel" multiple size="6">' + optV + '</select><span class="hint">Bisa melihat laporan & dokumen unit ini, tidak bisa mengisi. Direksi, Tim Mutu, dan Manajer atasan otomatis punya akses.</span></div>',
          foot: '<button class="btn" data-act="closeModal">Batal</button><button class="btn btn-primary" data-act="unitSave" data-k="' + uu.kode + '">Simpan</button>' };
        render(); break;
      case "unitSave":
        var sel = Array.from(document.getElementById("penSel").selectedOptions).map(function (o) { return o.value; });
        if (!sel.length) { toast("Pilih minimal satu penyusun"); break; }
        var vw = Array.from(document.getElementById("vwSel").selectedOptions).map(function (o) { return o.value; });
        API.simpanAkses(t.dataset.k, { penyusun: sel, viewer: vw }).then(function () { return Promise.all([API.context(), loadAll()]); }).then(function (r) { S.ctx = r[0]; return r; }).then(function () { S.modal = null; toast("Hak akses diperbarui"); render(); }).catch(errToast); break;
    }
  });
  root.addEventListener("change", function (ev) {
    var t = ev.target, a = t.dataset.act; if (!a) return;
    if (a === "kepU") { S.kep.unit = t.value; render(); }
    if (a === "dokU") { S.dok.unit = t.value; render(); }
    if (a === "dokB") { S.dok.bulan = Number(t.value); render(); }
    if (a === "docSel") { var dn = document.getElementById("docFileN"); if (dn) dn.textContent = Array.prototype.map.call(t.files, function (f) { return f.name + " (" + fmtSize(f.size) + ")"; }).join(", "); }
    if (a === "selM") { S.bulan = Number(t.value); S.formKey = null; render(); }
    if (a === "selU") { S.unit = t.value; S.bulan = null; S.formKey = null; render(); }
    if (a === "cetakU") { S.cetak.unit = t.value; S.cetak.bulan = null; render(); }
    if (a === "cetakM") { S.cetak.bulan = Number(t.value); render(); }
    if (a === "aUnit") { S.admin.unit = t.value; render(); }
    if (a === "uslUnitSel") { S.usulanUnit = t.value; render(); }
    if (a === "logA") { S.admin.logA = t.value; render(); }
    if (a === "thFileSel" || a === "thFileSel2") { var nn = document.getElementById(a === "thFileSel" ? "thFileN" : "thFileN2"); if (nn) nn.textContent = Array.prototype.map.call(t.files, function (f) { return f.name; }).join(", "); }
    if (a === "carryDone") { (S.carryEdit[t.dataset.id] = S.carryEdit[t.dataset.id] || {}).selesai = t.checked; }
    if (a === "freqChange") {
      var ev2 = L.EVAL_DEFAULT[t.value];
      document.querySelectorAll('#evm input[name="ev"]').forEach(function (cb) { cb.checked = ev2.indexOf(Number(cb.value)) >= 0; });
    }
    if (a === "nama") { API.simpanProfil(t.dataset.nik, { nama: t.value.trim() }).then(function () { return API.context(); }).then(function (c) { S.ctx = c; toast("Nama tersimpan"); }); }
  });
  root.addEventListener("input", function (ev) {
    var t = ev.target, a = t.dataset.act; if (!a) return;
    var id = t.dataset.id;
    if (a === "fv") {
      var f = S.form[id] || (S.form[id] = {});
      var k = t.dataset.k;
      if (k === "catatan" || k === "bukti") { f[k] = t.value; if (!f.status) f.status = "CATATAN"; }
      else {
        var raw = t.value.trim();
        var v = raw.indexOf(",") >= 0 ? raw.replace(/\./g, "").replace(",", ".") : raw;
        f[k] = v === "" ? null : Number(v);
        if (f.status !== "DIISI") f.status = "DIISI";
        if (k === "pembilang" || k === "penyebut") delete f.nilai;
      }
      refreshRow(id);
    }
    if (a === "fdur") {
      var f3 = S.form[id] || (S.form[id] = {});
      var row = document.getElementById("row-" + id);
      var j = Number($("#j-" + id, row).value || 0), mm = Number($("#mm-" + id, row).value || 0);
      f3.status = "DIISI"; f3.nilai = j * 60 + mm; refreshRow(id);
    }
    if (a === "rv") {
      var r = S.rtlDraft[id] || (S.rtlDraft[id] = {});
      r[t.dataset.k] = t.value;
      t.classList.toggle("req-miss", ["kendala", "penyebab", "uraian", "pelaksana", "penanggung_jawab", "target_waktu"].indexOf(t.dataset.k) >= 0 && !t.value.trim());
      var fb = document.getElementById("footbar"); if (fb) fb.innerHTML = footInner();
    }
    if (a === "carry") { (S.carryEdit[id] = S.carryEdit[id] || {}).progres = t.value; }
    if (a === "logQ") { S.admin.logQ = t.value; clearTimeout(root._q); root._q = setTimeout(function () { render(); var q = document.getElementById("lq"); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 250); }
    if (a === "dokQ") { S.dok.q = t.value; clearTimeout(root._q); root._q = setTimeout(function () { render(); var q = document.getElementById("dq"); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 250); }
    if (a === "aQ") { S.admin.q = t.value; clearTimeout(root._q); root._q = setTimeout(function () { render(); var q = document.getElementById("aq"); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 250); }
  });
  window.addEventListener("sarmut-session-expired", function () { S.user = null; S.modal = null; S.drawer = null; render(); toast("Sesi habis, silakan masuk lagi."); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && (S.drawer || (S.modal && !S.modal.wajib))) { S.drawer = null; S.modal = null; render(); } });
  window.addEventListener("resize", function () { if (!S.user) drawLJ(); });

  render();
})();
