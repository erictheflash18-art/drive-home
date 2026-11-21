// When each leg of the drive opens: midnight Mountain time (MST = UTC-7 in November).
// Add ?preview to the URL to unlock everything for testing.

const STOPS = [
  { id: "boulder",    day: 20, charm: "🍫", charmName: "Snickers" },
  { id: "kenosha",    day: 21, charm: "🚲", charmName: "Bike" },
  { id: "buenaVista", day: 22, charm: "🌧️", charmName: "Raindrop" },
  { id: "wolfCreek",  day: 23, charm: "🎿", charmName: "Skis" },
  { id: "durango",    day: 24, charm: "🌼", charmName: "Chrysanthemum" },
];
const BIRTHDAY = Date.UTC(2026, 10, 25, 7);

// Preview mode (everything unlocked, separate save): ?preview on the live site, and always
// on the local copy (localhost), which only runs on this computer.
const PREVIEW = new URLSearchParams(location.search).has("preview") ||
  location.hostname === "localhost" || location.hostname === "127.0.0.1";

function unlockTime(stop) {
  return Date.UTC(2026, 10, stop.day, 7); // month 10 = November
}
function isUnlocked(stop) {
  return PREVIEW || Date.now() >= unlockTime(stop);
}

// ---- Saved progress (stays on her device; the game still works if storage is blocked) ----
const SAVE_KEY = PREVIEW ? "yojohn-drive-home-preview" : "yojohn-drive-home-v1";
const Save = {
  data: { levels: {} },
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) this.data = JSON.parse(raw);
      if (!this.data.levels) this.data.levels = {};
    } catch (e) { /* private mode etc. */ }
  },
  write() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) {}
  },
  finish(id, result) {
    const prev = this.data.levels[id];
    // keep the best run
    if (!prev || result.flowers > prev.flowers) this.data.levels[id] = result;
    else prev.toes = Math.max(prev.toes, result.toes);
    this.write();
  },
  // lifetime counters (replays count too — every bike is remembered)
  bump(key) {
    this.data.stats = this.data.stats || {};
    this.data.stats[key] = (this.data.stats[key] || 0) + 1;
    this.write();
  },
  stat(key) { return (this.data.stats && this.data.stats[key]) || 0; },
  // ---- Save code: progress as a short copyable string, e.g. YOJOHN-eyJsIjp7... ----
  exportCode() {
    const levels = {};
    for (const [id, r] of Object.entries(this.data.levels)) levels[id] = [r.flowers || 0, r.toes || 0, r.charm ? 1 : 0];
    const st = this.data.stats || {};
    const body = JSON.stringify({ l: levels, s: [st.bikesHit || 0, st.carsTotalled || 0] });
    const b64 = btoa(unescape(encodeURIComponent(body))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return "YOJOHN-" + b64 + "-" + checksum(b64);
  },
  // Returns true if the code was good. Merges: keeps the best of what's here and what's in the code.
  importCode(code) {
    const m = String(code).trim().match(/^YOJOHN-([A-Za-z0-9_-]+)-([a-z0-9]+)$/i);
    if (!m || checksum(m[1]) !== m[2].toLowerCase()) return false;
    let data;
    try {
      const b64 = m[1].replace(/-/g, "+").replace(/_/g, "/");
      data = JSON.parse(decodeURIComponent(escape(atob(b64))));
    } catch (e) { return false; }
    if (!data || typeof data.l !== "object") return false;
    for (const [id, v] of Object.entries(data.l)) {
      if (!STOPS.some((s) => s.id === id) || !Array.isArray(v)) continue;
      const [flowers, toes, charm] = v.map((n) => Math.max(0, Math.floor(+n || 0)));
      const prev = this.data.levels[id];
      this.data.levels[id] = {
        flowers: Math.max(flowers, prev ? prev.flowers || 0 : 0),
        toes: Math.max(toes, prev ? prev.toes || 0 : 0),
        charm: !!charm || !!(prev && prev.charm),
      };
    }
    const s = Array.isArray(data.s) ? data.s : [];
    this.data.stats = this.data.stats || {};
    this.data.stats.bikesHit = Math.max(+s[0] || 0, this.data.stats.bikesHit || 0);
    this.data.stats.carsTotalled = Math.max(+s[1] || 0, this.data.stats.carsTotalled || 0);
    this.write();
    return true;
  },
  totals() {
    let flowers = 0, toes = 0;
    for (const k in this.data.levels) {
      flowers += this.data.levels[k].flowers || 0;
      toes += this.data.levels[k].toes || 0;
    }
    return { flowers, toes };
  },
};
// Short checksum so a mistyped code is caught instead of loading garbage
function checksum(str) {
  let h = 7;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return (h % 1679616).toString(36).padStart(4, "0");
}

Save.load();
