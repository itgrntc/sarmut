/* Logika penilaian SARMUT — murni (tanpa DOM), dipakai bersama frontend & Apps Script. */
var Sarmut = (function () {
  var BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  var BULAN_PANJANG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  var PERSP = { LG: "Learning & Growth", IP: "Internal Process", CU: "Customer", FI: "Financial" };
  var PERSP_ORDER = ["LG", "IP", "CU", "FI"];
  var FREK = { BULANAN: "Bulanan", TRIWULAN: "Triwulanan", SEMESTER: "Semesteran", TAHUNAN: "Tahunan", PER_KEJADIAN: "Per kejadian" };
  var EVAL_DEFAULT = { BULANAN: [1,2,3,4,5,6,7,8,9,10,11,12], TRIWULAN: [3,6,9,12], SEMESTER: [6,12], TAHUNAN: [12], PER_KEJADIAN: [1,2,3,4,5,6,7,8,9,10,11,12] };
  var TIPE = { RASIO: "Rasio (pembilang/penyebut)", ANGKA: "Angka langsung", YA_TIDAK: "Ya / Tidak", KEJADIAN: "Jumlah kejadian", DURASI: "Durasi" };
  var CARA_HITUNG = { TERAKHIR: "Nilai terakhir", RATA: "Rata-rata", TOTAL: "Total", GABUNGAN: "Gabungan rasio (Σ/Σ)" };
  var STATUS_LAPORAN = {
    DRAFT: "Draf", MENUNGGU_MANAJER: "Menunggu Manajer", MENUNGGU_TIM_MUTU: "Menunggu Tim Mutu",
    MENUNGGU_DIREKTUR: "Menunggu Direktur", DISETUJUI: "Disetujui", DIKEMBALIKAN: "Dikembalikan"
  };
  var ALUR = ["DRAFT", "MENUNGGU_MANAJER", "MENUNGGU_TIM_MUTU", "MENUNGGU_DIREKTUR", "DISETUJUI"];

  function fmtNum(n, d) {
    if (n === null || n === undefined || isNaN(n)) return "–";
    var dd = d === undefined ? (Math.abs(n - Math.round(n)) < 1e-9 ? 0 : (Math.abs(n) >= 100 ? 1 : 2)) : d;
    var s = Number(n).toFixed(dd);
    if (dd > 0) s = s.replace(/0+$/, "").replace(/\.$/, "");
    var parts = s.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return parts.join(",");
  }

  function fmtDur(min) {
    if (min === null || min === undefined || isNaN(min)) return "–";
    var j = Math.floor(min / 60), m = Math.round(min % 60);
    if (!j) return m + "m";
    return j + "j" + (m ? " " + m + "m" : "");
  }

  function fmtVal(ind, v) {
    if (v === null || v === undefined) return "–";
    switch (ind.tipe) {
      case "RASIO": return fmtNum(v, Math.abs(v - Math.round(v)) < 1e-9 ? 0 : 1) + "%";
      case "YA_TIDAK": return v >= 1 ? "Ya" : "Tidak";
      case "DURASI": return fmtDur(v);
      default: return fmtNum(v) + (ind.satuan === "%" ? "%" : "");
    }
  }

  function fmtValLong(ind, v) {
    if (v === null || v === undefined) return "–";
    if (ind.tipe === "ANGKA" || ind.tipe === "KEJADIAN") return fmtNum(v) + (ind.satuan ? " " + ind.satuan : "");
    return fmtVal(ind, v);
  }

  function fmtTarget(ind) {
    if (ind.tipe === "YA_TIDAK") return "Terpenuhi";
    if (ind.tipe === "DURASI") return ind.operator + " " + fmtDur(ind.target);
    var u = ind.satuan === "%" ? "%" : (ind.satuan ? " " + ind.satuan : "");
    return ind.operator + " " + fmtNum(ind.target) + u;
  }

  function evalMonths(ind) { return ind.bulan_evaluasi && ind.bulan_evaluasi.length ? ind.bulan_evaluasi : EVAL_DEFAULT[ind.frekuensi]; }
  function isEval(ind, m) { return evalMonths(ind).indexOf(m) >= 0; }
  /* aktif per bulan: usulan TAMBAH berlaku mulai aktif_dari; usulan NONAKTIF berlaku mulai nonaktif_mulai (data lama tetap utuh) */
  function isActive(ind, m) { return (!ind.aktif_dari || m >= ind.aktif_dari) && (!ind.nonaktif_mulai || m < ind.nonaktif_mulai); }
  /* versi definisi indikator yang berlaku di bulan m (usulan UBAH berlaku mulai bulan tertentu) */
  function asOf(ind, m) {
    if (!ind.versi || !ind.versi.length) return ind;
    for (var i = 0; i < ind.versi.length; i++) if (m <= ind.versi[i].sampai_bulan) return Object.assign({}, ind, ind.versi[i].snap);
    return ind;
  }
  function isScheduled(ind, m) { return isActive(ind, m) && (ind.cara_isi === "BULAN_EVALUASI" ? isEval(ind, m) : true); }

  function compare(op, v, t) {
    switch (op) {
      case "≥": return v >= t - 1e-9;
      case "≤": return v <= t + 1e-9;
      case ">": return v > t;
      case "<": return v < t;
      default: return Math.abs(v - t) < 1e-9;
    }
  }

  function entryValue(ind, e) {
    if (!e || e.status !== "DIISI") return null;
    if (ind.tipe === "RASIO" && e.pembilang !== null && e.pembilang !== undefined && e.penyebut) return e.pembilang / e.penyebut * 100;
    return e.nilai === undefined ? null : e.nilai;
  }

  /* nilai periode di bulan evaluasi m untuk indikator non-bulanan */
  function periodValue(ind, capByMonth, m) {
    if (ind.frekuensi === "BULANAN" || ind.frekuensi === "PER_KEJADIAN") return entryValue(ind, capByMonth[m]);
    var ev = evalMonths(ind).slice().sort(function (a, b) { return a - b; });
    var prev = 0;
    for (var i = 0; i < ev.length; i++) { if (ev[i] < m) prev = ev[i]; }
    var vals = [], num = 0, den = 0, hasRatio = false;
    for (var k = prev + 1; k <= m; k++) {
      var e = capByMonth[k];
      var v = entryValue(ind, e);
      if (v !== null) vals.push(v);
      if (e && e.status === "DIISI" && e.penyebut) { num += e.pembilang; den += e.penyebut; hasRatio = true; }
    }
    if (!vals.length) return null;
    switch (ind.cara_hitung) {
      case "RATA": return vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
      case "TOTAL": return vals.reduce(function (a, b) { return a + b; }, 0);
      case "GABUNGAN": return hasRatio && den ? num / den * 100 : vals[vals.length - 1];
      default: return vals[vals.length - 1];
    }
  }

  /*
   * Status satu sel indikator × bulan.
   * ctx.lastDue = bulan terakhir yang laporannya sudah jatuh tempo (mis. Sep bila hari ini 26 Okt)
   * kembali: {s: ok|fail|prog|note|empty|na|tba|future, v: nilai, eval: bool}
   */
  function cellStatus(ind, capByMonth, m, ctx) {
    if (!isActive(ind, m)) return { s: "na", v: null, eval: false };
    ind = asOf(ind, m);
    var e = capByMonth[m];
    var ev = isEval(ind, m);
    if (!isScheduled(ind, m)) {
      if (e && (e.status === "CATATAN" || e.status === "DIISI")) return { s: "note", v: entryValue(ind, e), eval: false, e: e };
      return { s: "na", v: null, eval: false };
    }
    if (!e) {
      if (m > ctx.openMonth) return { s: "future", v: null, eval: ev };
      return { s: m <= ctx.lastDue ? "empty" : "future", v: null, eval: ev };
    }
    if (e.status === "TBA") return { s: "tba", v: null, eval: ev, e: e };
    if (e.status === "TIDAK_ADA_KEJADIAN") return { s: ev ? "ok" : "prog", v: 0, eval: ev, e: e };
    if (e.status === "CATATAN") return { s: "note", v: null, eval: ev, e: e };
    var v = ev ? periodValue(ind, capByMonth, m) : entryValue(ind, e);
    if (v === null) return { s: "empty", v: null, eval: ev, e: e };
    if (!ev) return { s: "prog", v: v, eval: false, e: e };
    return { s: compare(ind.operator, v, ind.target) ? "ok" : "fail", v: v, eval: true, e: e };
  }

  function gap(ind, v) {
    if (v === null || v === undefined || ind.tipe === "YA_TIDAK") return null;
    return v - ind.target;
  }

  function evalLabel(ind) {
    var ev = evalMonths(ind);
    if (ind.frekuensi === "BULANAN" || ind.frekuensi === "PER_KEJADIAN") return FREK[ind.frekuensi];
    return FREK[ind.frekuensi] + " · nilai " + ev.map(function (m) { return BULAN[m - 1]; }).join(", ");
  }

  function dueDate(tahun, bulan, tglBatas) {
    var y = bulan === 12 ? tahun + 1 : tahun, mm = bulan === 12 ? 0 : bulan;
    return new Date(y, mm, tglBatas || 15);
  }

  /* ---------- periode lapor: jendela, penutupan, buka kunci ---------- */
  /* batas lapor bulan m = tanggal tglBatas bulan m+1, sampai pukul 23:59 */
  function dueEnd(tahun, bulan, tglBatas) { var d = dueDate(tahun, bulan, tglBatas); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999); }
  function openMonthOf(tahun, today) { return today.getFullYear() === tahun ? today.getMonth() + 1 : (today.getFullYear() > tahun ? 12 : 0); }
  function lastDueOf(tahun, today, tglBatas) { var n = 0; for (var m = 1; m <= 12; m++) if (dueEnd(tahun, m, tglBatas) < today) n = m; return n; }
  /* baris TRX_Periode terakhir untuk unit+bulan: {status: MINTA|DIBUKA|DITOLAK|DITUTUP, sampai, ...} */
  function lastOverride(list, unit, bulan) {
    var r = null;
    (list || []).forEach(function (x) { if (x.unit === unit && x.bulan === bulan && (!r || String(x.at) >= String(r.at))) r = x; });
    return r;
  }
  /*
   * Status periode satu laporan.
   * ctx: {tahun, today:Date, tglBatas, overrides:[...]}
   * kembali: {state: BELUM|BERJALAN|JENDELA|DIBUKA|MINTA|DITUTUP, open: bool, due: Date, until: Date|null, ov: baris terakhir}
   */
  function periodState(ctx, unit, bulan) {
    var today = ctx.today, open = openMonthOf(ctx.tahun, today), due = dueEnd(ctx.tahun, bulan, ctx.tglBatas);
    var ov = lastOverride(ctx.overrides, unit, bulan);
    if (bulan > open) return { state: "BELUM", open: false, due: due, until: null, ov: ov };
    if (bulan === open) return { state: "BERJALAN", open: true, due: due, until: due, ov: ov };
    if (today <= due) return { state: "JENDELA", open: true, due: due, until: due, ov: ov };
    if (ov && ov.status === "DIBUKA" && ov.sampai && new Date(ov.sampai) >= today) return { state: "DIBUKA", open: true, due: due, until: new Date(ov.sampai), ov: ov };
    if (ov && ov.status === "MINTA") return { state: "MINTA", open: false, due: due, until: null, ov: ov };
    return { state: "DITUTUP", open: false, due: due, until: null, ov: ov };
  }
  /* waktu pengajuan pertama (patokan ketepatan waktu; revisi setelah dikembalikan tidak menggeser) */
  function firstSubmit(lap) {
    var f = null;
    ((lap && lap.riwayat) || []).forEach(function (h) { if (h.aksi === "AJUKAN" && (!f || h.at < f)) f = h.at; });
    return f;
  }
  /*
   * Ketepatan waktu satu sel unit×bulan.
   * key: ARSIP | TEPAT | TERLAMBAT | BELUM_LAPOR | JENDELA | BERJALAN | BELUM
   */
  function timing(ctx, unit, bulan, lap) {
    var ps = periodState(ctx, unit.kode, bulan), at = firstSubmit(lap);
    var mulai = unit.kepatuhan_mulai || 1;
    var base = { ps: ps, at: at, due: ps.due, days: 0 };
    if (bulan < mulai) return Object.assign(base, { key: "ARSIP" });
    if (at) {
      var late = new Date(at) > ps.due;
      return Object.assign(base, { key: late ? "TERLAMBAT" : "TEPAT", days: late ? Math.ceil((new Date(at) - ps.due) / 864e5) : 0 });
    }
    if (ps.state === "BELUM") return Object.assign(base, { key: "BELUM" });
    if (ps.state === "BERJALAN") return Object.assign(base, { key: "BERJALAN" });
    if (ps.state === "JENDELA") return Object.assign(base, { key: "JENDELA", days: -Math.ceil((ps.due - ctx.today) / 864e5) });
    return Object.assign(base, { key: "BELUM_LAPOR", days: Math.ceil((ctx.today - ps.due) / 864e5) });
  }
  /* resume kepatuhan antar bulan: sel per unit×bulan, ringkasan per bulan & per unit */
  function kepatuhan(ctx, units, laporan) {
    var cells = {}, perMonth = [], perUnit = {}, tot = { tepat: 0, terlambat: 0, belum: 0, hariTerlambat: 0 };
    var byLap = {}; (laporan || []).forEach(function (x) { byLap[x.unit + "|" + x.bulan] = x; });
    for (var m = 1; m <= 12; m++) perMonth[m] = { tepat: 0, terlambat: 0, belum: 0, total: 0, rate: null };
    units.forEach(function (u) {
      var pu = perUnit[u.kode] = { tepat: 0, terlambat: 0, belum: 0, total: 0, rate: null, hari: 0, rataHari: 0 };
      cells[u.kode] = {};
      for (var m2 = 1; m2 <= 12; m2++) {
        var t = timing(ctx, u, m2, byLap[u.kode + "|" + m2]); cells[u.kode][m2] = t;
        var bucket = t.key === "TEPAT" ? "tepat" : t.key === "TERLAMBAT" ? "terlambat" : t.key === "BELUM_LAPOR" ? "belum" : null;
        if (!bucket) continue;
        pu[bucket]++; pu.total++; perMonth[m2][bucket]++; perMonth[m2].total++; tot[bucket]++;
        if (t.key === "TERLAMBAT") { pu.hari += t.days; tot.hariTerlambat += t.days; }
      }
      pu.rate = pu.total ? pu.tepat / pu.total : null; pu.rataHari = pu.terlambat ? pu.hari / pu.terlambat : 0;
    });
    for (var m3 = 1; m3 <= 12; m3++) perMonth[m3].rate = perMonth[m3].total ? perMonth[m3].tepat / perMonth[m3].total : null;
    var all = tot.tepat + tot.terlambat + tot.belum;
    return { cells: cells, perMonth: perMonth, perUnit: perUnit, total: { tepat: tot.tepat, terlambat: tot.terlambat, belum: tot.belum, all: all, rate: all ? tot.tepat / all : null, rataHari: tot.terlambat ? tot.hariTerlambat / tot.terlambat : 0 } };
  }

  return {
    dueEnd: dueEnd, openMonthOf: openMonthOf, lastDueOf: lastDueOf, lastOverride: lastOverride, periodState: periodState, firstSubmit: firstSubmit, timing: timing, kepatuhan: kepatuhan,
    BULAN: BULAN, BULAN_PANJANG: BULAN_PANJANG, PERSP: PERSP, PERSP_ORDER: PERSP_ORDER, FREK: FREK, EVAL_DEFAULT: EVAL_DEFAULT,
    TIPE: TIPE, CARA_HITUNG: CARA_HITUNG, STATUS_LAPORAN: STATUS_LAPORAN, ALUR: ALUR,
    fmtNum: fmtNum, fmtDur: fmtDur, fmtVal: fmtVal, fmtValLong: fmtValLong, fmtTarget: fmtTarget,
    isActive: isActive, asOf: asOf, evalMonths: evalMonths, isEval: isEval, isScheduled: isScheduled, compare: compare, entryValue: entryValue,
    periodValue: periodValue, cellStatus: cellStatus, gap: gap, evalLabel: evalLabel, dueDate: dueDate
  };
})();
if (typeof module !== "undefined") module.exports = Sarmut;
