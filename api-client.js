/* api-client.js — penghubung frontend ke backend Apps Script (signature sama dengan MockAPI).
 * Atur URL di config.js:  window.SARMUT_CONFIG = { API_URL: "https://script.google.com/macros/s/XXXX/exec" }
 */
window.SARMUT_API = (function () {
  var cfg = window.SARMUT_CONFIG || {}, token = null;
  try { token = sessionStorage.getItem("sarmut_token"); } catch (e) {}
  function setToken(t) { token = t; try { if (t) sessionStorage.setItem("sarmut_token", t); else sessionStorage.removeItem("sarmut_token"); } catch (e) {} }

  function b64(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(",")[1] || ""); };
      r.onerror = function () { rej(new Error("Gagal membaca file " + file.name)); };
      r.readAsDataURL(file);
    });
  }
  // ubah File (field _file) menjadi base64 sebelum dikirim
  function prepare(args) {
    var jobs = [];
    (args || []).forEach(function (a) {
      if (a && Array.isArray(a.files)) a.files.forEach(function (f) {
        if (f._file) { jobs.push(b64(f._file).then(function (d) { f.data = d; delete f._file; delete f.url; })); }
      });
    });
    return Promise.all(jobs).then(function () { return args; });
  }
  function call(action, args) {
    if (!cfg.API_URL) return Promise.reject(new Error("API_URL belum diisi di config.js"));
    return prepare(args).then(function (a) {
      return fetch(cfg.API_URL, { method: "POST", redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: action, token: token, args: a }) });
    }).then(function (r) { return r.json(); }, function () { throw new Error("Tidak bisa menghubungi server. Cek koneksi internet."); })
      .then(function (j) {
        if (!j.ok) {
          if (/Sesi habis/.test(j.error || "")) { setToken(null); window.dispatchEvent(new Event("sarmut-session-expired")); }
          throw new Error(j.error || "Terjadi kesalahan");
        }
        return j.data;
      });
  }
  var api = { real: true, personas: [] };
  ["context", "unitYear", "allLaporan", "allData", "simpanCapaian", "simpanRTL", "hapusRTL", "ajukan", "setujui", "kembalikan", "inbox",
    "tambahKomentar", "tambahLampiran", "hapusLampiran", "usulan", "ajukanUsulan", "putusanUsulan", "riwayatLaporan", "periode", "mintaBuka",
    "bukaPeriode", "tolakBuka", "tutupPeriode", "unggahDokumen", "dokumen", "hapusDokumen", "unduh", "simpanAkses", "simpanIndikator",
    "simpanUnit", "simpanPengaturan", "simpanProfil", "audit", "hirarki", "masterUsers", "gantiPassword", "resetPassword"].forEach(function (n) {
    api[n] = function () { return call(n, Array.prototype.slice.call(arguments)); };
  });
  api.login = function (nik, pw, mode) { return call("login", [nik, pw, mode === "SIM" ? "SIM" : "RIIL"]).then(function (r) { setToken(r.token); try { sessionStorage.setItem("sarmut_mode", r.mode || "RIIL"); } catch (e) {} return r; }); };
  api.logout = function () { var p = token ? call("logout", []).catch(function () {}) : Promise.resolve(); setToken(null); return p; };
  return api;
})();
