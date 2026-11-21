// Voice lines: every line in LINES gets a key from its position, e.g. "boulder.intro.0".
// Recordings live in audio/<key>.m4a and are listed in audio/manifest.js (VOICE_CLIPS),
// which the recording page keeps up to date.

// Things that are labels, not spoken lines
const VOICE_SKIP = new Set([
  "title", "subtitle", "soundHint", "lockedText", "name", "signs", "devilsThumbSign", "floodSign",
  "backSign", "finalSign", "toePrompt", "comingSoon",
  "birthdayCountdown", "birthdayTomorrow", "birthdayToday",
  "refs", "hotSpringsSign", "shake", "skierYell", "keepPaddling", "bottleFound", "pushedIn", "rvSurvived", "rvDestroyed", "summitSign", "trailSign", "checkpoint", "completeTitle",
  "saveTitle", "saveHelp", "copyButton", "copied", "loadHelp", "loadButton", "loadedOk", "loadedBad",
]);

const Voice = {
  byText: {},
  buffers: {},
  loading: {},
  current: null,
  queue: [],

  // [{ key, text, section, voiced }] in the order they appear in lines.js.
  // includeLabels also returns text-only lines (signs, title...) with voiced: false.
  allLines(includeLabels) {
    const out = [];
    const walk = (node, path, section, voiced) => {
      if (typeof node === "string") { out.push({ key: path.join("."), text: node, section, voiced }); return; }
      if (Array.isArray(node)) { node.forEach((v, i) => walk(v, path.concat(i), section, voiced)); return; }
      if (node && typeof node === "object") {
        for (const k of Object.keys(node)) {
          const skip = VOICE_SKIP.has(k);
          if (skip && !includeLabels) continue;
          const sec = path.length === 0 && typeof node[k] === "object" && !Array.isArray(node[k]) ? k : section;
          walk(node[k], path.concat(k), sec, voiced && !skip);
        }
      }
    };
    walk(LINES, [], "general", true);
    return out;
  },

  init() {
    for (const l of this.allLines()) if (!(l.text in this.byText)) this.byText[l.text] = l.key;
  },

  clip(key) { return typeof VOICE_CLIPS !== "undefined" && VOICE_CLIPS[key]; },

  load(key) {
    if (this.buffers[key]) return Promise.resolve(this.buffers[key]);
    if (this.loading[key]) return this.loading[key];
    const url = this.clip(key);
    if (!url || !Sfx.ac) return Promise.resolve(null);
    this.loading[key] = fetch(url)
      .then((r) => r.arrayBuffer())
      .then((data) => new Promise((ok, bad) => Sfx.ac.decodeAudioData(data, ok, bad)))
      .then((buf) => (this.buffers[key] = buf))
      .catch(() => null);
    return this.loading[key];
  },

  // Warm up every recorded clip once sound is unlocked
  preload() {
    if (typeof VOICE_CLIPS === "undefined") return;
    Object.keys(VOICE_CLIPS).forEach((k) => this.load(k));
  },

  // mode "interrupt": cut off whatever is playing. mode "queue": wait your turn.
  play(text, mode) {
    if (Sfx.muted || !Sfx.ac) return;
    const key = this.byText[text];
    if (!key || !this.clip(key)) return;
    if (mode === "interrupt") this.stop();
    else if (this.current) {
      this.queue.push(key);
      if (this.queue.length > 2) this.queue.shift();
      return;
    }
    this.start(key);
  },

  async start(key) {
    const token = { key };
    this.current = token;
    const buf = await this.load(key);
    if (this.current !== token) return;
    if (!buf || Sfx.muted) { this.current = null; return this.next(); }
    const src = Sfx.ac.createBufferSource();
    const gain = Sfx.ac.createGain();
    gain.gain.value = 1.4;
    src.buffer = buf;
    src.connect(gain).connect(Sfx.ac.destination);
    src.onended = () => { if (this.current === token) { this.current = null; this.next(); } };
    token.src = src;
    src.start();
  },

  next() {
    const k = this.queue.shift();
    if (k) this.start(k);
  },

  stop() {
    this.queue = [];
    if (this.current && this.current.src) {
      this.current.src.onended = null;
      try { this.current.src.stop(); } catch (e) {}
    }
    this.current = null;
  },
};
Voice.init();
