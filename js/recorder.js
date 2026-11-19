// Recording page: record a line → trim silence → WAV → server converts to .m4a in audio/.

const SECTION_NAMES = {
  general: "Everywhere (punchlines & crashes)",
  boulder: "Level 1: Boulder",
  kenosha: "Level 2: Kenosha Pass",
  buenaVista: "Level 3: Buena Vista",
  wolfCreek: "Level 4: Wolf Creek Pass",
  durango: "Level 5: Durango",
};

const Rec = {
  lines: Voice.allLines(),
  clips: typeof VOICE_CLIPS !== "undefined" ? { ...VOICE_CLIPS } : {},
  sel: 0,
  stream: null,
  recorder: null,
  recording: null, // index being recorded
  busy: false,
  ctx: null,

  init() {
    const list = document.getElementById("list");
    let section = null;
    this.lines.forEach((l, i) => {
      if (l.section !== section) {
        section = l.section;
        const h = document.createElement("h2");
        h.textContent = SECTION_NAMES[section] || section;
        h.dataset.section = section;
        list.appendChild(h);
      }
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `
        <span class="status"></span>
        <span class="text"></span>
        <button class="recbtn">● Record</button>
        <button class="play">▶</button>
        <button class="del" title="Delete recording">🗑</button>`;
      row.querySelector(".text").textContent = l.text;
      const k = document.createElement("span"); k.className = "key"; k.textContent = l.key;
      row.querySelector(".text").appendChild(k);
      row.addEventListener("click", () => this.select(i));
      row.querySelector(".recbtn").addEventListener("click", (e) => { e.stopPropagation(); this.select(i); this.toggle(); });
      row.querySelector(".play").addEventListener("click", (e) => { e.stopPropagation(); this.play(i); });
      row.querySelector(".del").addEventListener("click", (e) => { e.stopPropagation(); this.remove(i); });
      l.row = row;
      list.appendChild(row);
    });
    document.getElementById("onlyMissing").addEventListener("change", () => this.render());
    window.addEventListener("keydown", (e) => {
      if (e.key === " ") { e.preventDefault(); if (!e.repeat) this.toggle(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); this.move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); this.move(-1); }
      else if (e.key === "p" || e.key === "P") this.play(this.sel);
    });
    const firstMissing = this.lines.findIndex((l) => !this.clips[l.key]);
    this.select(firstMissing >= 0 ? firstMissing : 0);
    this.render();
  },

  render() {
    const only = document.getElementById("onlyMissing").checked;
    let done = 0;
    this.lines.forEach((l, i) => {
      const has = !!this.clips[l.key];
      if (has) done++;
      l.row.querySelector(".status").textContent = has ? "✅" : "";
      l.row.querySelector(".play").disabled = !has;
      l.row.querySelector(".del").disabled = !has;
      l.row.classList.toggle("sel", i === this.sel);
      l.row.classList.toggle("rec", i === this.recording);
      l.row.classList.toggle("hidden", only && has && i !== this.sel);
      const btn = l.row.querySelector(".recbtn");
      btn.classList.toggle("on", i === this.recording);
      btn.textContent = i === this.recording ? "■ Stop" : this.busy && i === this.sel ? "saving…" : has ? "● Redo" : "● Record";
    });
    document.querySelectorAll("h2").forEach((h) => {
      const any = this.lines.some((l) => l.section === h.dataset.section && !l.row.classList.contains("hidden"));
      h.style.display = any ? "" : "none";
    });
    document.getElementById("count").textContent = `${done} / ${this.lines.length} recorded`;
  },

  select(i) {
    if (this.recording !== null) return;
    this.sel = Math.max(0, Math.min(this.lines.length - 1, i));
    this.render();
    this.lines[this.sel].row.scrollIntoView({ block: "nearest", behavior: "smooth" });
  },
  move(d) {
    const only = document.getElementById("onlyMissing").checked;
    let i = this.sel + d;
    while (only && i >= 0 && i < this.lines.length && this.clips[this.lines[i].key]) i += d;
    this.select(i);
  },

  error(msg) { document.getElementById("err").textContent = msg || ""; },

  async toggle() {
    if (this.busy) return;
    if (this.recording !== null) return this.stopRec();
    this.error("");
    try {
      if (!this.stream) {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        const an = this.ctx.createAnalyser();
        an.fftSize = 512;
        this.ctx.createMediaStreamSource(this.stream).connect(an);
        const buf = new Uint8Array(an.fftSize);
        const meter = document.getElementById("level");
        const tick = () => {
          an.getByteTimeDomainData(buf);
          let peak = 0;
          for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
          meter.style.width = Math.min(100, (peak / 128) * 160) + "%";
          meter.style.background = this.recording !== null ? "#e63946" : "#2ec4b6";
          requestAnimationFrame(tick);
        };
        tick();
      }
      if (this.ctx.state === "suspended") await this.ctx.resume();
      const chunks = [];
      this.recorder = new MediaRecorder(this.stream);
      this.recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      this.recorder.onstop = () => this.save(new Blob(chunks, { type: this.recorder.mimeType }));
      this.recorder.start();
      this.recording = this.sel;
      this.render();
    } catch (e) {
      this.error("Couldn't use the microphone: " + e.message + ". Allow mic access for this page and try again.");
    }
  },

  stopRec() {
    if (this.recorder && this.recorder.state !== "inactive") this.recorder.stop();
  },

  async save(blob) {
    const i = this.recording;
    this.recording = null;
    this.busy = true;
    this.render();
    try {
      const audio = await this.ctx.decodeAudioData(await blob.arrayBuffer());
      const wav = encodeWav(trimSilence(mixDown(audio), audio.sampleRate), audio.sampleRate);
      if (!wav) throw new Error("Didn't hear anything. Is the right mic selected?");
      const key = this.lines[i].key;
      const r = await fetch("/api/save?key=" + encodeURIComponent(key), { method: "POST", body: wav });
      if (!r.ok) throw new Error("The save server said no. Is tools/voice_server.py running?");
      this.clips = (await r.json()).clips;
      this.busy = false;
      // jump to the next line that still needs a recording
      let next = this.lines.findIndex((l, j) => j > i && !this.clips[l.key]);
      if (next < 0) next = Math.min(i + 1, this.lines.length - 1);
      this.select(next);
    } catch (e) {
      this.busy = false;
      this.error(e.message);
      this.render();
    }
  },

  play(i) {
    const url = this.clips[this.lines[i].key];
    if (url) new Audio(url).play();
  },

  async remove(i) {
    const key = this.lines[i].key;
    if (!confirm(`Delete the recording for:\n"${this.lines[i].text}"?`)) return;
    await fetch("/api/delete?key=" + encodeURIComponent(key), { method: "POST" });
    delete this.clips[key];
    this.render();
  },
};

function mixDown(audio) {
  const out = new Float32Array(audio.length);
  for (let c = 0; c < audio.numberOfChannels; c++) {
    const d = audio.getChannelData(c);
    for (let i = 0; i < d.length; i++) out[i] += d[i] / audio.numberOfChannels;
  }
  return out;
}

// Cut the dead air before and after the line (keeps a little breathing room)
function trimSilence(data, rate) {
  let peak = 0;
  for (const v of data) peak = Math.max(peak, Math.abs(v));
  if (peak < 0.01) return null;
  const th = Math.max(0.01, peak * 0.06);
  let a = 0, b = data.length - 1;
  while (a < data.length && Math.abs(data[a]) < th) a++;
  while (b > a && Math.abs(data[b]) < th) b--;
  a = Math.max(0, a - Math.floor(rate * 0.12));
  b = Math.min(data.length, b + Math.floor(rate * 0.25));
  const out = data.slice(a, b);
  // normalize so quiet takes aren't too quiet
  const gain = Math.min(4, 0.9 / peak);
  for (let i = 0; i < out.length; i++) out[i] *= gain;
  return out;
}

function encodeWav(samples, rate) {
  if (!samples) return null;
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + samples.length * 2, true); str(8, "WAVE");
  str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: "audio/wav" });
}

Rec.init();
