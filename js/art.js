// Everything is drawn in code — no image files needed.

const PENGUIN_SVG = `
<svg viewBox="0 -14 100 134" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="22" cy="72" rx="9" ry="22" fill="#1b1f2e" transform="rotate(20 22 72)"/>
  <ellipse cx="78" cy="72" rx="9" ry="22" fill="#1b1f2e" transform="rotate(-20 78 72)"/>
  <ellipse cx="50" cy="66" rx="32" ry="44" fill="#1b1f2e"/>
  <ellipse cx="50" cy="74" rx="22" ry="33" fill="#fff"/>
  <ellipse cx="50" cy="46" rx="20" ry="15" fill="#fff"/>
  <circle cx="42" cy="44" r="4.2" fill="#1b1f2e"/><circle cx="43.4" cy="42.6" r="1.3" fill="#fff"/>
  <circle cx="58" cy="44" r="4.2" fill="#1b1f2e"/><circle cx="59.4" cy="42.6" r="1.3" fill="#fff"/>
  <circle cx="35" cy="52" r="3.5" fill="#ff8fa3" opacity=".7"/><circle cx="65" cy="52" r="3.5" fill="#ff8fa3" opacity=".7"/>
  <path d="M43 51 L57 51 L50 60 Z" fill="#f7a21b"/>
  <path d="M26 30 Q50 18 74 30 L72 36 Q50 26 28 36 Z" fill="#e63946"/>
  <ellipse cx="38" cy="110" rx="11" ry="5" fill="#f7a21b"/>
  <ellipse cx="62" cy="110" rx="11" ry="5" fill="#f7a21b"/>
  <g transform="rotate(14 58 20)">
    <path d="M44 28 L58 -6 L72 28 Z" fill="#9b5de5"/>
    <path d="M48 19 L68 19 M51 11 L65 11 M54 3 L62 3" stroke="#ffd23f" stroke-width="3"/>
    <circle cx="58" cy="-7" r="5" fill="#f15bb5"/>
  </g>
</svg>`;

// Penguin flopped on its back, proudly showing its feet
const FEET_SVG = `
<svg viewBox="0 0 200 190" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="100" cy="88" rx="58" ry="64" fill="#1b1f2e"/>
  <ellipse cx="100" cy="98" rx="40" ry="46" fill="#fff"/>
  <ellipse cx="100" cy="60" rx="30" ry="20" fill="#fff"/>
  <path d="M84 56 q4 -6 8 0" stroke="#1b1f2e" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M108 56 q4 -6 8 0" stroke="#1b1f2e" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M90 66 L110 66 L100 78 Z" fill="#f7a21b"/>
  <circle cx="78" cy="68" r="5" fill="#ff8fa3" opacity=".7"/><circle cx="122" cy="68" r="5" fill="#ff8fa3" opacity=".7"/>
  <path d="M50 30 Q100 6 150 30 L146 40 Q100 20 54 40 Z" fill="#e63946"/>
  <g class="foot foot-l">
    <ellipse cx="62" cy="150" rx="26" ry="20" fill="#f7a21b"/>
    <circle cx="42" cy="134" r="10" fill="#f7a21b"/><circle cx="60" cy="126" r="10" fill="#f7a21b"/><circle cx="78" cy="132" r="10" fill="#f7a21b"/>
  </g>
  <g class="foot foot-r">
    <ellipse cx="138" cy="150" rx="26" ry="20" fill="#f7a21b"/>
    <circle cx="122" cy="132" r="10" fill="#f7a21b"/><circle cx="140" cy="126" r="10" fill="#f7a21b"/><circle cx="158" cy="134" r="10" fill="#f7a21b"/>
  </g>
</svg>`;

// Snack-break cutscene: the penguin in the car, eating a Snickers bite by bite
const SNACK_SVG = `
<svg viewBox="0 0 320 240" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="snackWin"><path d="M112 70 Q114 64 122 64 L210 64 Q220 64 224 72 L244 124 L96 124 Z"/></clipPath>
  </defs>
  <rect width="320" height="240" rx="24" fill="#8ecae6"/>
  <path d="M0 160 L55 96 L105 146 L168 74 L228 140 L276 100 L320 136 L320 240 L0 240Z" fill="#6c8ebf"/>
  <path d="M168 74 L182 90 L172 88 L164 94 L156 88Z M55 96 L66 109 L55 106 L46 110Z" fill="#fff"/>
  <rect y="196" width="320" height="44" fill="#3d4452"/>
  <rect x="20" y="214" width="40" height="6" fill="#fff" opacity=".7"/><rect x="140" y="214" width="40" height="6" fill="#fff" opacity=".7"/><rect x="260" y="214" width="40" height="6" fill="#fff" opacity=".7"/>
  <path d="M30 150 Q30 128 52 126 L84 126 L104 66 Q108 56 120 56 L214 56 Q228 56 234 68 L258 126 L280 128 Q296 130 296 150 L296 186 Q296 196 286 196 L40 196 Q30 196 30 186 Z" fill="#2ec4b6"/>
  <path d="M112 70 Q114 64 122 64 L210 64 Q220 64 224 72 L244 124 L96 124 Z" fill="#bde8ff"/>
  <g clip-path="url(#snackWin)">
    <g class="head">
      <ellipse cx="160" cy="138" rx="40" ry="46" fill="#1b1f2e"/>
      <ellipse cx="160" cy="146" rx="26" ry="32" fill="#fff"/>
      <ellipse cx="164" cy="100" rx="24" ry="17" fill="#fff"/>
      <path d="M152 96 q4 -6 8 0" stroke="#1b1f2e" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M170 96 q4 -6 8 0" stroke="#1b1f2e" stroke-width="3" fill="none" stroke-linecap="round"/>
      <circle cx="150" cy="106" r="4" fill="#ff8fa3" opacity=".8"/>
      <path d="M134 84 Q160 70 188 82 L186 89 Q160 78 136 91 Z" fill="#e63946"/>
      <path class="jaw" d="M176 106 L196 107 L176 113 Z" fill="#d98a10"/>
      <path d="M176 99 L200 104 L176 107 Z" fill="#f7a21b"/>
    </g>
    <g class="bar">
      <rect x="190" y="98" width="50" height="15" rx="3" fill="#5a3518"/>
      <rect x="190" y="98" width="50" height="4" rx="2" fill="#7a4a24"/>
      <text x="215" y="109.5" font-size="8" font-weight="800" fill="#fff" text-anchor="middle" font-family="sans-serif">SNICKERS</text>
    </g>
    <ellipse cx="214" cy="120" rx="18" ry="7" fill="#1b1f2e" transform="rotate(-20 214 120)"/>
  </g>
  <circle class="crumb" cx="196" cy="110" r="2.5" fill="#7a4a24" style="--dx:18px;--dy:-16px"/>
  <circle class="crumb" cx="196" cy="110" r="2" fill="#c08a52" style="--dx:-6px;--dy:22px;animation-delay:.15s"/>
  <circle class="crumb" cx="196" cy="110" r="2.5" fill="#7a4a24" style="--dx:24px;--dy:10px;animation-delay:.3s"/>
  <circle class="crumb" cx="196" cy="110" r="2" fill="#c08a52" style="--dx:6px;--dy:-24px;animation-delay:.42s"/>
  <circle cx="92" cy="196" r="22" fill="#1b1f2e"/><circle cx="92" cy="196" r="9" fill="#adb5bd"/>
  <circle cx="238" cy="196" r="22" fill="#1b1f2e"/><circle cx="238" cy="196" r="9" fill="#adb5bd"/>
  <text class="munch m1" x="40" y="44">MUNCH</text>
  <text class="munch m2" x="200" y="36">munch</text>
  <text class="munch m3" x="56" y="100">MUNCH</text>
  <text class="munch m4" x="214" y="160">*chomp*</text>
</svg>`;

const Art = {
  rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  // Player car seen from above, penguin in the driver's seat (convertible, obviously)
  playerCar(ctx, x, y, tilt, blink) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    if (blink) ctx.globalAlpha = 0.45;
    ctx.fillStyle = "rgba(0,0,0,.25)";
    this.rr(ctx, -21, -33, 46, 74, 12); ctx.fill();
    ctx.fillStyle = "#2ec4b6";
    this.rr(ctx, -23, -37, 46, 74, 12); ctx.fill();
    ctx.fillStyle = "#24a399";
    this.rr(ctx, -23, 18, 46, 19, 10); ctx.fill();
    ctx.fillStyle = "#bde8ff";
    this.rr(ctx, -17, -28, 34, 10, 4); ctx.fill();
    ctx.fillStyle = "#16706a";
    this.rr(ctx, -17, -16, 34, 32, 8); ctx.fill();
    // penguin head
    ctx.fillStyle = "#1b1f2e";
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.ellipse(0, -4, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f7a21b";
    ctx.beginPath(); ctx.moveTo(-3, -8); ctx.lineTo(3, -8); ctx.lineTo(0, -14); ctx.fill();
    ctx.fillStyle = "#e63946";
    ctx.fillRect(-10, 4, 20, 4);
    // headlights / taillights
    ctx.fillStyle = "#fff6c2";
    ctx.fillRect(-19, -37, 8, 4); ctx.fillRect(11, -37, 8, 4);
    ctx.fillStyle = "#ff4d4d";
    ctx.fillRect(-19, 33, 8, 4); ctx.fillRect(11, 33, 8, 4);
    ctx.restore();
  },

  car(ctx, x, y, color, subaru) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(0,0,0,.22)";
    this.rr(ctx, -20, -32, 44, 72, 10); ctx.fill();
    ctx.fillStyle = color;
    this.rr(ctx, -22, -36, 44, 72, 10); ctx.fill();
    ctx.fillStyle = "#1d2b3a";
    this.rr(ctx, -16, -24, 32, 12, 4); ctx.fill();
    this.rr(ctx, -16, 16, 32, 10, 4); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.18)";
    this.rr(ctx, -16, -10, 32, 24, 5); ctx.fill();
    if (subaru) { // roof box, the Boulder uniform
      ctx.fillStyle = "#2b2b2b";
      this.rr(ctx, -11, -10, 22, 26, 6); ctx.fill();
    }
    ctx.fillStyle = "#ff4d4d";
    ctx.fillRect(-18, 32, 8, 4); ctx.fillRect(10, 32, 8, 4);
    ctx.restore();
  },

  bike(ctx, x, y, color, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(0,0,0,.2)";
    ctx.beginPath(); ctx.ellipse(3, 4, 9, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#222"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, 18); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(8, -10); ctx.stroke();
    const pedal = Math.sin(t * 12) * 4;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(0, 0, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#333";
    ctx.fillRect(-6 + pedal * 0.3, 6 + pedal, 4, 6); ctx.fillRect(2 - pedal * 0.3, 6 - pedal, 4, 6);
    ctx.fillStyle = "#ffd23f";
    ctx.beginPath(); ctx.arc(0, -6, 6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  cone(ctx, x, y) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = "rgba(0,0,0,.2)";
    ctx.beginPath(); ctx.arc(3, 3, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ff7b00";
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ff7b00";
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  prairieDog(ctx, x, y, dir, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
    const hop = Math.abs(Math.sin(t * 16)) * 3;
    ctx.fillStyle = "rgba(0,0,0,.2)";
    ctx.beginPath(); ctx.ellipse(0, 6, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(0, -hop);
    ctx.fillStyle = "#b07d48";
    ctx.beginPath(); ctx.ellipse(0, 0, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, -2, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1b1f2e";
    ctx.beginPath(); ctx.arc(14, -4, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8a5d30";
    ctx.beginPath(); ctx.ellipse(-14, 0, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  // Chrysanthemum: layered petals
  flower(ctx, x, y, t, hue) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.8);
    const s = 1 + Math.sin(t * 4) * 0.06;
    ctx.scale(s, s);
    const colors = [["#ff9f1c", "#ffbf69"], ["#f15bb5", "#ff9ed2"], ["#fee440", "#fff3a3"]][Math.abs(Math.floor(hue)) % 3];
    for (let layer = 0; layer < 2; layer++) {
      ctx.fillStyle = colors[layer];
      const n = 12, r = layer ? 8 : 13;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + layer * 0.26;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.5, 2.6, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = "#9c6644";
    ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  puddle(ctx, x, y, w, t, h) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = "#4ea8de";
    ctx.beginPath(); ctx.ellipse(0, 0, w / 2, (h || 40) / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#90e0ef";
    ctx.beginPath(); ctx.ellipse(-w * 0.12, -5, w * 0.25, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 2;
    const r = (t * 30) % 18;
    ctx.beginPath(); ctx.ellipse(w * 0.15, 4, 4 + r, 2 + r * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  },

  kombucha(ctx, x, y, t) {
    ctx.save(); ctx.translate(x, y + Math.sin(t * 5) * 2);
    ctx.fillStyle = "rgba(255,230,0,.35)";
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#c97c1a";
    this.rr(ctx, -8, -12, 16, 24, 5); ctx.fill();
    ctx.fillStyle = "#f6e05e";
    ctx.fillRect(-8, -3, 16, 8);
    ctx.fillStyle = "#333";
    ctx.fillRect(-4, -17, 8, 6);
    ctx.fillStyle = "#1b1f2e"; ctx.font = "bold 8px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("⚡", 0, 4);
    ctx.restore();
  },

  snickers(ctx, x, y, t) {
    ctx.save(); ctx.translate(x, y + Math.sin(t * 4) * 3); ctx.rotate(Math.sin(t * 2) * 0.15);
    ctx.fillStyle = "rgba(255,220,120,.45)";
    ctx.beginPath(); ctx.arc(0, 0, 34 + Math.sin(t * 6) * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#5a3518";
    this.rr(ctx, -30, -11, 60, 22, 6); ctx.fill();
    ctx.fillStyle = "#3d7dd8";
    ctx.font = "800 13px 'Baloo 2', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText("SNICKERS", 0, 1);
    ctx.restore();
  },

  // Little devil: red, horns, tiny pitchfork, wiggly tail
  devil(ctx, x, y, t, flip, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.scale(flip, 1);
    ctx.globalAlpha = alpha;
    ctx.rotate(Math.sin(t * 9) * 0.25);
    // tail
    ctx.strokeStyle = "#b5172b"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-6, 10); ctx.quadraticCurveTo(-20, 14 + Math.sin(t * 12) * 6, -22, 2); ctx.stroke();
    ctx.fillStyle = "#b5172b";
    ctx.beginPath(); ctx.moveTo(-22, -4); ctx.lineTo(-27, 5); ctx.lineTo(-17, 4); ctx.fill();
    // pitchfork
    ctx.strokeStyle = "#5c4033"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(12, 16); ctx.lineTo(16, -18); ctx.stroke();
    ctx.strokeStyle = "#ffd23f"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(10, -16); ctx.lineTo(11, -24); ctx.moveTo(16, -18); ctx.lineTo(16.5, -27); ctx.moveTo(22, -18); ctx.lineTo(21.5, -26);
    ctx.moveTo(10, -16); ctx.lineTo(22, -18); ctx.stroke();
    // body + head
    ctx.fillStyle = "#e63946";
    ctx.beginPath(); ctx.ellipse(0, 8, 9, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -6, 11, 0, Math.PI * 2); ctx.fill();
    // horns
    ctx.fillStyle = "#fff3e0";
    ctx.beginPath(); ctx.moveTo(-9, -12); ctx.lineTo(-12, -24); ctx.lineTo(-3, -15); ctx.fill();
    ctx.beginPath(); ctx.moveTo(9, -12); ctx.lineTo(12, -24); ctx.lineTo(3, -15); ctx.fill();
    // face: mischievous
    ctx.fillStyle = "#1b1f2e";
    ctx.beginPath(); ctx.ellipse(-4, -7, 2, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4, -7, 2, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#1b1f2e"; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(0, -3, 5, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.restore();
  },

  // Birthday balloon on a string, tied to the back of the car, trailing behind
  balloon(ctx, x, y, t, vx) {
    const sway = Math.sin(t * 2.2) * 8 - (vx || 0) * 0.05;
    const bx = x + 10 + sway, by = y + 52;
    ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sway * 0.3, y + 26, bx, by - 15); ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.beginPath(); ctx.ellipse(bx + 8, by + 8, 13, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f15bb5";
    ctx.beginPath(); ctx.ellipse(bx, by, 13, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(bx - 3, by - 17); ctx.lineTo(bx + 3, by - 17); ctx.lineTo(bx, by - 13); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.beginPath(); ctx.ellipse(bx - 4, by - 5, 3.5, 5.5, -0.4, 0, Math.PI * 2); ctx.fill();
  },

  // The frat van: maroon, Greek letters on the roof, party lights
  fratVan(ctx, x, y, t) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = "rgba(0,0,0,.25)";
    this.rr(ctx, -25, -44, 54, 96, 10); ctx.fill();
    ctx.fillStyle = "#7b1e3a";
    this.rr(ctx, -27, -48, 54, 96, 10); ctx.fill();
    ctx.fillStyle = "#1d2b3a";
    this.rr(ctx, -21, -40, 42, 12, 4); ctx.fill();
    ctx.fillStyle = "#f1e3c8";
    this.rr(ctx, -21, -24, 42, 60, 6); ctx.fill();
    ctx.fillStyle = "#7b1e3a";
    ctx.font = "800 17px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("ΒΡΟ", 0, 6);
    // headlights + flashing party light
    ctx.fillStyle = "#fff6c2";
    ctx.fillRect(-23, -48, 9, 4); ctx.fillRect(14, -48, 9, 4);
    const flash = Math.floor(t * 6) % 2;
    ctx.fillStyle = flash ? "#ff006e" : "#3a86ff";
    ctx.beginPath(); ctx.arc(0, -30, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = flash ? "rgba(255,0,110,.25)" : "rgba(58,134,255,.25)";
    ctx.beginPath(); ctx.arc(0, -30, 16, 0, Math.PI * 2); ctx.fill();
    // music notes
    ctx.fillStyle = "#ffd23f"; ctx.font = "700 16px sans-serif";
    const n = (t * 1.5) % 1;
    ctx.globalAlpha = 1 - n;
    ctx.fillText("♪", -30 - n * 10, -20 - n * 30);
    ctx.fillText("♫", 30 + n * 10, -10 - n * 30);
    ctx.restore();
  },

  // ================= SIDE VIEW (Kenosha Pass) =================
  // Car facing right; (0,0) is where the wheels touch the ground.
  sideCar(ctx, wheelRot) {
    // wheels
    for (const wx of [-23, 23]) {
      ctx.save(); ctx.translate(wx, -11); ctx.rotate(wheelRot);
      ctx.fillStyle = "#1b1f2e"; ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#adb5bd"; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#6c757d"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.stroke();
      ctx.restore();
    }
    // body
    ctx.fillStyle = "#2ec4b6";
    ctx.beginPath();
    ctx.moveTo(-37, -14); ctx.lineTo(-37, -30); ctx.quadraticCurveTo(-36, -34, -30, -34);
    ctx.lineTo(-18, -34); ctx.lineTo(-12, -50); ctx.quadraticCurveTo(-10, -53, -5, -53);
    ctx.lineTo(12, -53); ctx.quadraticCurveTo(16, -53, 19, -48); ctx.lineTo(25, -34);
    ctx.lineTo(33, -32); ctx.quadraticCurveTo(38, -31, 38, -25); ctx.lineTo(38, -14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#24a399"; ctx.fillRect(-37, -18, 75, 5);
    // window + penguin
    ctx.fillStyle = "#bde8ff";
    ctx.beginPath(); ctx.moveTo(-13, -35); ctx.lineTo(-8, -48); ctx.lineTo(11, -48); ctx.lineTo(19, -35); ctx.closePath(); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-13, -35); ctx.lineTo(-8, -48); ctx.lineTo(11, -48); ctx.lineTo(19, -35); ctx.closePath(); ctx.clip();
    ctx.fillStyle = "#1b1f2e"; ctx.beginPath(); ctx.arc(3, -38, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(6, -38, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1b1f2e"; ctx.beginPath(); ctx.arc(7, -39, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f7a21b"; ctx.beginPath(); ctx.moveTo(10, -38); ctx.lineTo(15, -36.5); ctx.lineTo(10, -35); ctx.fill();
    ctx.restore();
    // party hat poking out of the sunroof
    ctx.fillStyle = "#9b5de5";
    ctx.beginPath(); ctx.moveTo(-2, -53); ctx.lineTo(3, -66); ctx.lineTo(8, -53); ctx.fill();
    ctx.fillStyle = "#f15bb5"; ctx.beginPath(); ctx.arc(3, -67, 2.5, 0, Math.PI * 2); ctx.fill();
    // lights
    ctx.fillStyle = "#fff6c2"; ctx.fillRect(35, -28, 3, 5);
    ctx.fillStyle = "#ff4d4d"; ctx.fillRect(-37, -29, 3, 6);
  },

  sideRV(ctx, wheelRot) {
    ctx.fillStyle = "#f1f3f5";
    this.rr(ctx, -72, -84, 144, 70, 8); ctx.fill();
    ctx.fillStyle = "#e9c46a"; this.rr(ctx, 54, -60, 24, 46, 6); ctx.fill(); // cab nose
    ctx.fillStyle = "#8d5b3b"; ctx.fillRect(-72, -46, 150, 7); ctx.fillRect(-72, -36, 150, 3);
    ctx.fillStyle = "#9cc5de";
    for (const wx of [-56, -24, 8]) this.rr(ctx, wx, -76, 24, 18, 3), ctx.fill();
    this.rr(ctx, 56, -56, 18, 16, 3); ctx.fill();
    ctx.fillStyle = "#ced4da"; this.rr(ctx, 40, -76, 10, 28, 2); ctx.fill(); // door
    // bumper sticker on the back
    ctx.fillStyle = "#fff"; ctx.fillRect(-80, -34, 14, 12);
    ctx.fillStyle = "#e63946"; ctx.font = "800 9px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("♥", -73, -28);
    for (const wx of [-46, 46]) {
      ctx.save(); ctx.translate(wx, -12); ctx.rotate(wheelRot);
      ctx.fillStyle = "#1b1f2e"; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#adb5bd"; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  },

  sideVan(ctx, wheelRot, t) {
    ctx.fillStyle = "#7b1e3a";
    this.rr(ctx, -52, -66, 98, 52, 9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(46, -50); ctx.lineTo(58, -32); ctx.lineTo(58, -14); ctx.lineTo(46, -14); ctx.fill();
    ctx.fillStyle = "#9cc5de"; this.rr(ctx, 30, -58, 18, 18, 3); ctx.fill();
    ctx.fillStyle = "#f1e3c8"; ctx.font = "800 20px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("ΒΡΟ", -10, -40);
    const flash = Math.floor(t * 6) % 2;
    ctx.fillStyle = flash ? "#ff006e" : "#3a86ff";
    ctx.beginPath(); ctx.arc(-6, -70, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffd23f"; ctx.font = "700 16px sans-serif";
    const n = (t * 1.5) % 1;
    ctx.globalAlpha = 1 - n; ctx.fillText("♪", -30 - n * 12, -78 - n * 30); ctx.fillText("♫", 20 + n * 12, -82 - n * 30);
    ctx.globalAlpha = 1;
    for (const wx of [-30, 34]) {
      ctx.save(); ctx.translate(wx, -12); ctx.rotate(wheelRot);
      ctx.fillStyle = "#1b1f2e"; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#adb5bd"; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  },

  aspen(ctx, x, y, h, seed) {
    ctx.fillStyle = "#f1ede4"; ctx.fillRect(x - 3, y - h, 6, h);
    ctx.fillStyle = "#3d3a35";
    for (let i = 1; i < 5; i++) ctx.fillRect(x - 3 + ((seed * 7 + i) % 3), y - h * (i / 5), 3, 2);
    ctx.strokeStyle = "#cfc8ba"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y - h * 0.7); ctx.lineTo(x - 10, y - h * 0.85);
    ctx.moveTo(x, y - h * 0.8); ctx.lineTo(x + 9, y - h * 0.95); ctx.stroke();
    ctx.fillStyle = "rgba(244,180,0,.85)"; // the last golden leaves of the year
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.arc(x + ((seed * 13 + i * 7) % 22) - 11, y - h + ((seed + i * 5) % 14), 3, 0, Math.PI * 2); ctx.fill();
    }
  },

  pine(ctx, x, y, h) {
    ctx.fillStyle = "#5c4033"; ctx.fillRect(x - 2, y - 8, 4, 8);
    ctx.fillStyle = "#2d6a4f";
    for (let i = 0; i < 3; i++) {
      const w = (h * 0.42) * (1 - i * 0.25), top = y - 8 - h * (0.35 + i * 0.3);
      ctx.beginPath(); ctx.moveTo(x, top - h * 0.25); ctx.lineTo(x - w, top + h * 0.2); ctx.lineTo(x + w, top + h * 0.2); ctx.fill();
    }
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.moveTo(x, y - 8 - h * 1.2); ctx.lineTo(x - 6, y - 8 - h * 1.05); ctx.lineTo(x + 6, y - 8 - h * 1.05); ctx.fill();
  },

  postSign(ctx, x, y, text, color) {
    ctx.font = "700 15px 'Baloo 2', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const lines = this.wrap(ctx, text, 130);
    const w = Math.min(150, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 22);
    const h = 12 + lines.length * 17;
    ctx.fillStyle = "#6b4f2a"; ctx.fillRect(x - 2, y - 60, 4, 60);
    ctx.fillStyle = color || "#1e7a46"; this.rr(ctx, x - w / 2, y - 60 - h, w, h, 6); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; this.rr(ctx, x - w / 2 + 3, y - 57 - h, w - 6, h - 6, 4); ctx.stroke();
    ctx.fillStyle = "#fff";
    lines.forEach((l, i) => ctx.fillText(l, x, y - 60 - h + 15 + i * 17));
  },

  sign(ctx, x, y, text, side) {
    ctx.save(); ctx.translate(x, y);
    ctx.font = "700 12px 'Baloo 2', sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const lines = this.wrap(ctx, text, 78);
    const h = 14 + lines.length * 13;
    ctx.fillStyle = "#6b4f2a"; ctx.fillRect(-2, h / 2 - 2, 4, 16);
    ctx.fillStyle = "#1e7a46";
    this.rr(ctx, -45, -h / 2, 90, h, 6); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    this.rr(ctx, -42, -h / 2 + 3, 84, h - 6, 4); ctx.stroke();
    ctx.fillStyle = "#fff";
    lines.forEach((l, i) => ctx.fillText(l, 0, -h / 2 + 13 + i * 13));
    ctx.restore();
  },

  wrap(ctx, text, maxW) {
    const words = text.split(" ");
    const lines = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  },

  finishLine(ctx, x0, x1, y, label, color) {
    const sq = 15;
    for (let i = 0; x0 + i * sq < x1; i++) {
      for (let j = 0; j < 2; j++) {
        ctx.fillStyle = (i + j) % 2 ? "#fff" : "#111";
        ctx.fillRect(x0 + i * sq, y + j * sq, sq, sq);
      }
    }
    ctx.fillStyle = color || "#e63946";
    ctx.fillRect(x0 - 8, y - 46, x1 - x0 + 16, 34);
    ctx.fillStyle = "#fff";
    ctx.font = "800 20px 'Baloo 2', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(label, (x0 + x1) / 2, y - 28);
  },

  gasStation(ctx, x, y) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = "#e9ecef";
    ctx.fillRect(-40, -60, 80, 120);
    ctx.fillStyle = "#e63946";
    ctx.fillRect(-40, -60, 80, 18);
    ctx.fillStyle = "#fff";
    ctx.font = "800 12px 'Baloo 2', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("GAS & SNACKS", 0, -51);
    ctx.fillStyle = "#adb5bd";
    ctx.fillRect(-30, -30, 14, 30); ctx.fillRect(16, -30, 14, 30);
    ctx.restore();
  },

  tree(ctx, x, y, s, shade) {
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.beginPath(); ctx.arc(x + 5, y + 5, s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = shade ? "#2d6a4f" : "#40916c";
    ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.12)";
    ctx.beginPath(); ctx.arc(x - s * 0.3, y - s * 0.3, s * 0.45, 0, Math.PI * 2); ctx.fill();
  },

  house(ctx, x, y, color) {
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.fillRect(x - 22, y - 18, 50, 44);
    ctx.fillStyle = color;
    ctx.fillRect(x - 26, y - 22, 50, 44);
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.fillRect(x - 1, y - 22, 25, 44);
  },
};
