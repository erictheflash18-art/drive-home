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

const PREVIEW = new URLSearchParams(location.search).has("preview");

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
  totals() {
    let flowers = 0, toes = 0;
    for (const k in this.data.levels) {
      flowers += this.data.levels[k].flowers || 0;
      toes += this.data.levels[k].toes || 0;
    }
    return { flowers, toes };
  },
};
Save.load();
