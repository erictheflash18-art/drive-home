// Recording page: record a line → trim silence → WAV → server converts to .m4a in audio/.
// Lines can also be edited here; edits are written straight into js/lines.js.

const SECTION_NAMES = {
  general: "Everywhere (title, punchlines & crashes)",
  boulder: "Level 1: Boulder",
  kenosha: "Level 2: Kenosha Pass",
  buenaVista: "Level 3: Buena Vista",
  wolfCreek: "Level 4: Wolf Creek Pass",
  durango: "Level 5: Durango",
};

const Rec = {
  lines: Voice.allLines(true),
  clips: typeof VOICE_CLIPS !== "undefined" ? { ...VOICE_CLIPS } : {},
  recordedText: {}, // key → the words that take was recorded with
  sel: 0,
  stream: null,
  recorder: null,
  recording: null, // index being recorded
  editing: null,   // index being edited
  busy: false,
  ctx: null,

  async init() {
    try { this.recordedText = await (await fetch("audio/texts.json")).json(); } catch (e) {}
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
      row.className = "row" + (l.voiced ? "" : " label");
      row.innerHTML = `
        <span class="status"></span>
        <span class="text"><span class="words"></span><span class="key"></span></span>
        <button class="edit" title="Edit the words">✏️</button>
        ${l.voiced ? `<button class="recbtn">● Record</button>
        <button class="play">▶</button>
        <button class="del" title="Delete recording">🗑</button>` : `<span class="tag">text only</span>`}`;
      row.querySelector(".key").textContent = l.key;
      row.addEventListener("click", () => this.select(i));
      row.querySelector(".words").addEventListener("dblclick", (e) => { e.stopPropagation(); this.edit(i); });
      row.querySelector(".edit").addEventListener("click", (e) => { e.stopPropagation(); this.edit(i); });
      if (l.voiced) {
        row.querySelector(".recbtn").addEventListener("click", (e) => { e.stopPropagation(); this.select(i); this.toggle(); });
        row.querySelector(".play").addEventListener("click", (e) => { e.stopPropagation(); this.play(i); });
        row.querySelector(".del").addEventListener("click", (e) => { e.stopPropagation(); this.remove(i); });
      }
      l.row = row;
      list.appendChild(row);
      this.showWords(i);
    });
    document.getElementById("onlyMissing").addEventListener("change", () => this.render());
    window.addEventListener("keydown", (e) => {
      if (this.editing !== null) return; // typing in the editor
      if (e.key === " ") { e.preventDefault(); if (!e.repeat) this.toggle(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); this.move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); this.move(-1); }
      else if (e.key === "p" || e.key === "P") this.play(this.sel);
      else if (e.key === "e" || e.key === "E") { e.preventDefault(); this.edit(this.sel); }
    });
    const firstMissing = this.lines.findIndex((l) => this.needs(l));
    this.select(firstMissing >= 0 ? firstMissing : 0);
    this.render();
  },

  has(l) { return !!this.clips[l.key]; },
  stale(l) { return this.has(l) && l.key in this.recordedText && this.recordedText[l.key] !== l.text; },
  needs(l) { return l.voiced && (!this.has(l) || this.stale(l)); },

  showWords(i) {
    const l = this.lines[i];
    l.row.querySelector(".words").textContent = l.text;
  },

  render() {
    const only = document.getElementById("onlyMissing").checked;
    let done = 0, total = 0;
    this.lines.forEach((l, i) => {
      l.row.classList.toggle("sel", i === this.sel);
      l.row.classList.toggle("hidden", only && !this.needs(l) && i !== this.sel && i !== this.editing);
      if (!l.voiced) return;
      total++;
      const has = this.has(l), stale = this.stale(l);
      if (has && !stale) done++;
      const st = l.row.querySelector(".status");
      st.textContent = stale ? "⚠️" : has ? "✅" : "";
      st.title = stale ? "You changed the words after recording this. Redo it." : "";
      l.row.querySelector(".play").disabled = !has;
      l.row.querySelector(".del").disabled = !has;
      l.row.classList.toggle("rec", i === this.recording);
      const btn = l.row.querySelector(".recbtn");
      btn.classList.toggle("on", i === this.recording);
      btn.textContent = i === this.recording ? "■ Stop" : this.busy && i === this.sel ? "listening…" : stale ? "● Redo (words changed)" : has ? "● Redo" : "● Record";
    });
    document.querySelectorAll("h2").forEach((h) => {
      const any = this.lines.some((l) => l.section === h.dataset.section && !l.row.classList.contains("hidden"));
      h.style.display = any ? "" : "none";
    });
    document.getElementById("count").textContent = `${done} / ${total} recorded`;
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
    while (only && i >= 0 && i < this.lines.length && !this.needs(this.lines[i])) i += d;
    this.select(i);
  },

  error(msg) { document.getElementById("err").textContent = msg || ""; },

  // ---------- editing ----------
  edit(i) {
    if (this.recording !== null || this.busy) return;
    if (this.editing !== null) this.cancelEdit();
    this.select(i);
    this.editing = i;
    const l = this.lines[i];
    const words = l.row.querySelector(".words");
    words.innerHTML = `<textarea rows="1"></textarea>
      <span class="edit-actions"><button class="save">Save</button><button class="cancel">Cancel</button>
      <small>Enter saves · Esc cancels</small></span>`;
    const ta = words.querySelector("textarea");
    ta.value = l.text;
    const fit = () => { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; };
    ta.addEventListener("input", fit);
    ta.addEventListener("click", (e) => e.stopPropagation());
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); this.saveEdit(); }
      if (e.key === "Escape") { e.preventDefault(); this.cancelEdit(); }
    });
    words.querySelector(".save").addEventListener("click", (e) => { e.stopPropagation(); this.saveEdit(); });
    words.querySelector(".cancel").addEventListener("click", (e) => { e.stopPropagation(); this.cancelEdit(); });
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
    fit();
  },

  cancelEdit() {
    const i = this.editing;
    this.editing = null;
    if (i !== null) this.showWords(i);
    this.render();
  },

  async saveEdit() {
    const i = this.editing;
    const l = this.lines[i];
    const next = l.row.querySelector("textarea").value.replace(/\s+/g, " ").trim();
    if (!next) return this.error("A line can't be empty.");
    if (next === l.text) return this.cancelEdit();
    if (l.text.includes("{n}") && !next.includes("{n}")) {
      return this.error("Keep {n} somewhere in this line. It's where the number of days goes.");
    }
    try {
      const r = await fetch("/api/text?key=" + encodeURIComponent(l.key), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old: l.text, new: next }),
      });
      const res = await r.json();
      if (!r.ok) throw new Error(res.error || "Couldn't save that.");
      l.text = res.text;
      this.error("");
      this.cancelEdit();
    } catch (e) {
      this.error(e.message.includes("fetch") ? "The save server isn't running. Start tools/voice_server.py." : e.message);
    }
  },

  // ---------- recording ----------
  async toggle() {
    if (this.busy || this.editing !== null) return;
    if (!this.lines[this.sel].voiced) return this.error("That one's a sign/label, so it's text only.");
    if (this.recording !== null) return this.stopRec();
    this.error("");
    if (!navigator.mediaDevices || !window.isSecureContext) {
      return this.error("Recording only works on the computer (phones need a secure https link for the mic). You can still edit lines and play clips here.");
    }
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
      const l = this.lines[i];
      const match = document.getElementById("matchWords").checked ? 1 : 0;
      const r = await fetch(`/api/save?key=${encodeURIComponent(l.key)}&text=${encodeURIComponent(l.text)}&match=${match}`, { method: "POST", body: wav });
      if (!r.ok) throw new Error("The save server said no. Is tools/voice_server.py running?");
      const res = await r.json();
      this.clips = res.clips;
      if (res.matched) {
        l.text = res.matched;
        this.showWords(i);
        this.showUndo(i, res.previous, res.matched);
      }
      this.recordedText[l.key] = l.text;
      this.busy = false;
      // jump to the next line that still needs a recording
      let next = this.lines.findIndex((x, j) => j > i && this.needs(x));
      if (next < 0) next = Math.min(i + 1, this.lines.length - 1);
      this.select(next);
    } catch (e) {
      this.busy = false;
      this.error(e.message);
      this.render();
    }
  },

  // "Changed to what you said" note with an undo link
  showUndo(i, previous, matched) {
    const l = this.lines[i];
    const note = document.createElement("div");
    note.className = "matched";
    note.innerHTML = `Changed to what you said. Was: <i></i> <a href="#">↩ Undo</a>`;
    note.querySelector("i").textContent = `"${previous}"`;
    note.querySelector("a").addEventListener("click", async (e) => {
      e.preventDefault(); e.stopPropagation();
      const r = await fetch("/api/text?key=" + encodeURIComponent(l.key), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old: matched, new: previous, keepRecording: true }),
      });
      if (!r.ok) return this.error((await r.json()).error || "Couldn't undo.");
      l.text = previous;
      this.recordedText[l.key] = previous;
      this.showWords(i);
      this.render();
    });
    l.row.querySelector(".words").appendChild(note);
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
    delete this.recordedText[key];
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
