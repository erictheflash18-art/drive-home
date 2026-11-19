// Shared game machinery: screen sizing, input, sound, popups, the loop.

const $ = (id) => document.getElementById(id);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const Engine = {
  W: 420,
  H: 740,
  dpr: 1,
  ctx: null,
  level: null,
  paused: false,
  dialogOpen: false,
  input: { left: false, right: false },
  onToe: null,

  init() {
    const canvas = $("canvas");
    this.ctx = canvas.getContext("2d");
    window.addEventListener("resize", () => this.resize());
    this.resize();
    this.bindInput();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.input.left = this.input.right = false;
    });
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (this.level && !this.paused && !this.dialogOpen && !document.hidden) this.level.update(dt);
      if (this.level) {
        this.ctx.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, 0, 0);
        this.level.draw(this.ctx);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  },

  // Phones in portrait get a taller playfield; everything else gets a centered column.
  resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const aspect = vh / vw;
    let cssW, cssH;
    if (aspect >= 1.4) {
      this.H = clamp(Math.round(this.W * aspect), 640, 960);
      cssW = vw; cssH = vh;
    } else {
      this.H = 740;
      cssH = vh; cssW = Math.round(vh * this.W / this.H);
      if (cssW > vw) { cssW = vw; cssH = Math.round(vw * this.H / this.W); }
    }
    this.scale = cssW / this.W;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const stage = $("stage"), canvas = $("canvas");
    stage.style.width = cssW + "px";
    stage.style.height = cssH + "px";
    stage.style.setProperty("--u", this.scale);
    canvas.width = Math.round(cssW * this.dpr);
    canvas.height = Math.round(cssH * this.dpr);
  },

  bindInput() {
    const keyMap = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };
    window.addEventListener("keydown", (e) => {
      if (keyMap[e.key]) { this.input[keyMap[e.key]] = true; e.preventDefault(); }
      if (e.key === " " || e.key === "Enter" || e.key === "t" || e.key === "T") {
        e.preventDefault();
        if (e.repeat) return;
        if (this.dialogOpen) this.advanceDialog();
        else if (this.onToe) this.onToe();
      }
    });
    window.addEventListener("keyup", (e) => {
      if (keyMap[e.key]) this.input[keyMap[e.key]] = false;
    });
    const hold = (el, key) => {
      const on = (e) => { e.preventDefault(); this.input[key] = true; el.classList.add("down"); Sfx.unlock(); };
      const off = (e) => { e.preventDefault(); this.input[key] = false; el.classList.remove("down"); };
      el.addEventListener("pointerdown", on);
      el.addEventListener("pointerup", off);
      el.addEventListener("pointercancel", off);
      el.addEventListener("pointerleave", off);
      el.addEventListener("contextmenu", (e) => e.preventDefault());
    };
    hold($("leftBtn"), "left");
    hold($("rightBtn"), "right");
    $("toeBtn").addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (this.onToe) this.onToe();
    });
    $("dialog").addEventListener("pointerdown", (e) => { e.preventDefault(); this.advanceDialog(); });
    $("muteBtn").addEventListener("click", () => {
      Sfx.muted = !Sfx.muted;
      $("muteBtn").textContent = Sfx.muted ? "🔇" : "🔊";
    });
  },

  steer() {
    return (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
  },

  // ---- Dialog: say(["line", "line"]) → resolves when she taps through all of them ----
  say(lines) {
    if (typeof lines === "string") lines = [lines];
    return new Promise((resolve) => {
      this.dialogQueue = lines.slice();
      this.dialogDone = resolve;
      this.dialogOpen = true;
      this.dialogShownAt = performance.now();
      this.input.left = this.input.right = false;
      $("dialogText").textContent = this.dialogQueue.shift();
      $("dialog").classList.add("show");
      Sfx.blip();
    });
  },
  advanceDialog() {
    if (!this.dialogOpen) return;
    if (performance.now() - this.dialogShownAt < 350) return; // no accidental skipping
    Sfx.unlock();
    if (this.dialogQueue.length) {
      $("dialogText").textContent = this.dialogQueue.shift();
      this.dialogShownAt = performance.now();
      Sfx.blip();
      return;
    }
    $("dialog").classList.remove("show");
    this.dialogOpen = false;
    const done = this.dialogDone;
    this.dialogDone = null;
    if (done) done();
  },

  closeDialog() {
    $("dialog").classList.remove("show");
    this.dialogOpen = false;
    this.dialogDone = null;
  },

  toast(text, kind) {
    const box = $("toasts");
    const el = document.createElement("div");
    el.className = "toast " + (kind || "");
    el.textContent = text;
    box.appendChild(el);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => el.classList.add("out"), 1900);
    setTimeout(() => el.remove(), 2400);
  },

  banner(text, ms) {
    const el = $("banner");
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(this.bannerT);
    if (ms) this.bannerT = setTimeout(() => el.classList.remove("show"), ms);
  },
  hideBanner() { $("banner").classList.remove("show"); },

  showFeet(text) {
    $("feetText").textContent = text;
    const el = $("feet");
    el.classList.remove("show"); void el.offsetWidth;
    el.classList.add("show");
    clearTimeout(this.feetT);
    this.feetT = setTimeout(() => el.classList.remove("show"), 1500);
  },

  shake: 0,
};

// ---- Tiny synth sound effects (no audio files) ----
const Sfx = {
  ac: null,
  muted: false,
  unlock() {
    if (!this.ac) {
      try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    }
    if (this.ac.state === "suspended") this.ac.resume();
  },
  tone(freq, dur, type, vol, delay, slideTo) {
    if (this.muted || !this.ac) return;
    const t = this.ac.currentTime + (delay || 0);
    const o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ac.destination);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol, hiToLo) {
    if (this.muted || !this.ac) return;
    const len = Math.floor(this.ac.sampleRate * dur);
    const buf = this.ac.createBuffer(1, len, this.ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ac.createBufferSource(); src.buffer = buf;
    const f = this.ac.createBiquadFilter(); f.type = "bandpass";
    const t = this.ac.currentTime;
    f.frequency.setValueAtTime(hiToLo ? 3000 : 800, t);
    if (hiToLo) f.frequency.exponentialRampToValueAtTime(300, t + dur);
    const g = this.ac.createGain(); g.gain.value = vol || 0.3;
    src.connect(f).connect(g).connect(this.ac.destination);
    src.start();
  },
  blip() { this.tone(660, 0.06, "square", 0.05); },
  flower() { this.tone(880, 0.08, "sine", 0.12); this.tone(1320, 0.12, "sine", 0.1, 0.06); },
  crash() { this.noise(0.35, 0.4); this.tone(140, 0.3, "sawtooth", 0.12, 0, 60); },
  honk() { this.tone(330, 0.25, "square", 0.08); this.tone(415, 0.25, "square", 0.08); },
  bell() { this.tone(1800, 0.25, "sine", 0.08); this.tone(1800, 0.25, "sine", 0.08, 0.15); },
  splash() { this.noise(0.5, 0.35, true); },
  toe() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, "triangle", 0.12, i * 0.06)); },
  alarm() { this.tone(988, 0.1, "square", 0.06); this.tone(988, 0.1, "square", 0.06, 0.14); },
  scratch() { this.noise(0.4, 0.5, true); this.tone(600, 0.4, "sawtooth", 0.08, 0, 80); },
  boost() { this.tone(300, 0.4, "sawtooth", 0.07, 0, 1200); },
  fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.18, "triangle", 0.13, i * 0.12)); },
  munch() { for (let i = 0; i < 5; i++) setTimeout(() => this.noise(0.08, 0.25), i * 220); },
};

// ---- HOOK THE TOE: shared by every level ----
// toePrompt.start(onResult) shows the button; she has `window` seconds to hit it.
const ToePrompt = {
  active: false,
  t: 0,
  window: 2.2,
  start(onResult, win) {
    if (this.active) return;
    this.active = true;
    this.t = 0;
    this.window = win || 2.2;
    this.onResult = onResult;
    $("toeBtn").classList.add("show");
    Sfx.alarm();
    Engine.onToe = () => this.hit();
  },
  update(dt) {
    if (!this.active) return;
    this.t += dt;
    $("toeTimer").style.transform = `scaleX(${Math.max(0, 1 - this.t / this.window)})`;
    if (this.t >= this.window) this.end(false);
  },
  hit() { if (this.active) this.end(true); },
  end(ok) {
    this.active = false;
    Engine.onToe = null;
    $("toeBtn").classList.remove("show");
    if (ok) { Sfx.toe(); Engine.showFeet(pick(LINES.toeSuccess)); }
    else { Sfx.honk(); Engine.toast(pick(LINES.toeFail), "bad"); }
    if (this.onResult) this.onResult(ok);
  },
  cancel() {
    this.active = false;
    Engine.onToe = null;
    $("toeBtn").classList.remove("show");
  },
};

// Confetti, drawn on top of a level
const Confetti = {
  bits: [],
  burst(n, W) {
    const colors = ["#e63946", "#ffd23f", "#2ec4b6", "#f15bb5", "#9b5de5", "#fff"];
    for (let i = 0; i < n; i++) {
      this.bits.push({ x: rand(0, W), y: rand(-200, -10), vx: rand(-40, 40), vy: rand(120, 260),
        r: rand(0, 6), vr: rand(-8, 8), c: pick(colors), w: rand(5, 10) });
    }
  },
  update(dt, H) {
    for (const b of this.bits) { b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt; }
    this.bits = this.bits.filter((b) => b.y < H + 20);
  },
  draw(ctx) {
    for (const b of this.bits) {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r);
      ctx.fillStyle = b.c; ctx.fillRect(-b.w / 2, -3, b.w, 6);
      ctx.restore();
    }
  },
};
