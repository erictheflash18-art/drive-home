// LEVEL 3 — BUENA VISTA
// Top-down rafting down the Arkansas River in the rain. Tap left/right to paddle (alternate to
// go faster), dodge rocks through three rapids, and keep Chad from ΣΤΓ from pushing you in.
// Messages in bottles hold memories. At the end the rain stops and there's a rainbow.

const BuenaVistaLevel = (() => {
  const L = LINES.buenaVista;
  const FINISH = 17000;
  const CURRENT = 165, RAPID_CURRENT = 245;
  const RAPIDS = [[2500, 3600, 0], [6000, 7400, 1], [11000, 12600, 2]]; // [start, end, sign index]
  const HARD_RAPID = 2;              // Raft Ripper: narrow and rocky
  const PUSHERS = [3900, 8900, 13300];
  const BOTTLES = [5000, 10000, 14300];
  const GRANDPARENTS = 8200;
  const RAIN_STOPS = 14800;
  const CHARM = 15700;
  const RAFT_R = 30;

  let s;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const hash = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

  // ---------- The river ----------
  const inRapid = (wy) => RAPIDS.find(([a, b]) => wy > a && wy < b);
  function cx(wy) { return Engine.W / 2 + 55 * Math.sin(wy / 900) + 28 * Math.sin(wy / 377 + 1); }
  function width(wy) {
    let w = 270 + 30 * Math.sin(wy / 1300);
    const r = inRapid(wy);
    if (r) {
      const edge = Math.min(1, (wy - r[0]) / 300, (r[1] - wy) / 300);
      w -= (r[2] === HARD_RAPID ? 70 : 40) * edge;
    }
    return w;
  }
  function banks(wy) { const c = cx(wy), w = width(wy); return [c - w / 2, c + w / 2]; }
  function current(wy) {
    const r = inRapid(wy);
    if (!r) return CURRENT;
    const edge = Math.min(1, (wy - r[0]) / 250, (r[1] - wy) / 250);
    return CURRENT + (RAPID_CURRENT - CURRENT) * edge;
  }

  // ---------- Setup ----------
  function reset() {
    s = {
      dist: 0, x: cx(0), vx: 0, boost: 0, spin: 0, ang: 0, t: 0,
      state: "intro", flowers: 0, toes: 0, dunks: 0, rocksHit: 0, bottles: 0, charm: false,
      objs: [], floaters: [], drops: [], flags: {}, invuln: 0,
      oarL: 0, oarR: 0, lastSide: null, lastStroke: -9,
      zoom: 1, shrinkT: 0, smallPending: false, nextToe: 10,
      pusher: null, swimT: 0, rain: 1, rainbow: 0, card: null,
    };
    for (let i = 0; i < 110; i++) s.drops.push({ x: Math.random() * 460, y: Math.random() * Engine.H, l: rand(10, 20), v: rand(520, 760) });
    Confetti.bits = [];
    populate();
    updateHud();
  }

  function populate() {
    const add = (o) => s.objs.push(o);
    // rocks: sparse in calm water, rows with a guaranteed gap in the rapids
    for (let wy = 900; wy < FINISH - 1200; wy += 120) {
      const r = inRapid(wy);
      const [l, rt] = banks(wy);
      if (r) {
        if (hash(wy, 1) < 0.25) continue;
        const gapW = r[2] === HARD_RAPID ? 95 : 120;
        const gapX = l + 40 + hash(wy, 2) * (rt - l - 80);
        for (let x = l + 22; x < rt - 22; x += 46 + hash(wy, 3) * 30) {
          if (Math.abs(x - gapX) < gapW / 2 + 22) continue;
          if (hash(x, wy) < (r[2] === HARD_RAPID ? 0.55 : 0.35)) add({ type: "rock", wy, x, r: 15 + hash(x, 9) * 11 });
        }
      } else if (hash(wy, 4) < 0.18) {
        add({ type: "rock", wy, x: l + 40 + hash(wy, 5) * (rt - l - 80), r: 16 + hash(wy, 6) * 10 });
      }
    }
    // flowers floating in little lines
    for (let wy = 600; wy < FINISH - 700; wy += 520 + Math.floor(hash(wy, 7) * 260)) {
      const [l, rt] = banks(wy);
      const x = l + 50 + hash(wy, 8) * (rt - l - 100);
      for (let i = 0; i < 3; i++) add({ type: "flower", wy: wy + i * 50, x: x + Math.sin(i) * 10, hue: (Math.floor(wy / 10) + i) % 3 });
    }
    BOTTLES.forEach((wy, i) => add({ type: "bottle", wy, x: cx(wy) + (i % 2 ? 40 : -40), n: i }));
    add({ type: "charm", wy: CHARM, x: cx(CHARM) });
    // keep the path clear right around the bottles and the charm
    s.objs = s.objs.filter((o) => o.type !== "rock" || ![...BOTTLES, CHARM].some((b) => Math.abs(o.wy - b) < 160));
  }

  // ---------- Update ----------
  function P() { return Engine.H - 240; } // raft's screen y
  function sy(wy) { return P() - (wy - s.dist); }

  function update(dt) {
    s.t += dt;
    Confetti.update(dt, Engine.H);
    ToePrompt.update(dt);
    for (const f of s.floaters) { f.t += dt; f.y -= 30 * dt; }
    s.floaters = s.floaters.filter((f) => f.t < 1.8);
    Engine.shake = Math.max(0, Engine.shake - dt * 30);
    s.invuln = Math.max(0, s.invuln - dt);
    s.oarL = Math.max(0, s.oarL - dt); s.oarR = Math.max(0, s.oarR - dt);
    for (const d of s.drops) { d.y += d.v * dt; d.x -= d.v * 0.18 * dt; if (d.y > Engine.H + 20) { d.y = -20; d.x = Math.random() * 480; } }
    s.shrinkT = Math.max(0, s.shrinkT - dt);
    s.zoom += ((s.shrinkT > 0 ? 0.5 : 1) - s.zoom) * Math.min(1, dt * (s.shrinkT > 0 ? 6 : 3));
    if (s.smallPending && s.zoom < 0.62) { s.smallPending = false; Engine.toast(pick(LINES.gotSmall), "water"); }
    if (s.card) { s.card.t -= dt; if (s.card.t <= 0) s.card = null; }

    // paddling: each tap is a stroke
    const pl = Engine.presses.left, pr = Engine.presses.right;
    Engine.presses.left = Engine.presses.right = 0;
    if (s.state === "drive") {
      for (let i = 0; i < pl; i++) stroke("L");
      for (let i = 0; i < pr; i++) stroke("R");
    }

    if (s.state !== "intro") {
      const wy = s.dist;
      const cur = current(wy);
      s.boost = Math.max(-80, s.boost - s.boost * 1.4 * dt);
      const v = s.state === "done" ? cur * 0.4 : cur + s.boost;
      s.dist += v * dt;
      // the river carries you around its bends
      s.x += (cx(s.dist) - cx(s.dist - v * dt)) * 0.85;
      if (inRapid(wy)) { s.vx += rand(-1, 1) * 480 * dt; s.spin += rand(-1, 1) * 2 * dt; }
      s.vx *= 1 - 2.2 * dt;
      s.x += s.vx * dt;
      s.spin *= 1 - 1.8 * dt;
      s.ang = s.spin + clamp(s.vx / 400, -0.35, 0.35);
      // banks are soft
      const [l, rt] = banks(s.dist);
      if (s.x < l + RAFT_R) { s.x = l + RAFT_R; s.vx = Math.abs(s.vx) * 0.4 + 20; s.boost -= 15; }
      if (s.x > rt - RAFT_R) { s.x = rt - RAFT_R; s.vx = -Math.abs(s.vx) * 0.4 - 20; s.boost -= 15; }
    }
    if (s.state === "swim") { s.swimT -= dt; if (s.swimT <= 0) { s.state = "drive"; s.invuln = 1.5; } }
    if (s.state === "drive") events(dt);
    updatePusher(dt);
    touchObjects();
    // rain fades out near the end; rainbow fades in
    if (s.dist > RAIN_STOPS) { s.rain = Math.max(0, s.rain - dt * 0.4); s.rainbow = Math.min(1, s.rainbow + dt * 0.35); }
    updateHud();
  }

  function stroke(side) {
    const alt = s.lastSide && s.lastSide !== side && s.t - s.lastStroke < 0.8;
    s.vx += side === "L" ? -90 : 90;
    s.boost = Math.min(170, s.boost + 26 + (alt ? 22 : 0));
    s.spin += side === "L" ? -0.06 : 0.06;
    if (side === "L") s.oarL = 0.3; else s.oarR = 0.3;
    s.lastSide = side; s.lastStroke = s.t;
    Sfx.noise(0.12, 0.08, true);
  }

  function events(dt) {
    if (!ToePrompt.active) {
      s.nextToe -= dt;
      if (s.nextToe <= 0) { startToe(); s.nextToe = rand(12, 18); }
    }
    // the middle of Zoom Flume: worst possible moment
    if (!s.flags.flumeToe && s.dist > 6700) { s.flags.flumeToe = true; if (!ToePrompt.active) startToe(1.8); }
    for (const [a] of RAPIDS) if (!s.flags["r" + a] && s.dist > a - 450) { s.flags["r" + a] = true; Engine.toast(L.rapidWarning); }
    PUSHERS.forEach((wy, i) => { if (!s.flags["p" + i] && s.dist > wy) { s.flags["p" + i] = true; spawnPusher(i); } });
    if (!s.flags.gp && s.dist > GRANDPARENTS) { s.flags.gp = true; s.gp = 0; Engine.toast(L.grandparents); }
    if (!s.flags.rainStop && s.dist > RAIN_STOPS) { s.flags.rainStop = true; Sfx.rainStop(4); Engine.toast(L.rainStops, "good"); }
    if (s.dist >= FINISH) finish();
  }

  function startToe(win) {
    ToePrompt.start((ok) => {
      if (ok) s.toes++;
      else { s.spin += rand(0, 1) < 0.5 ? -2.5 : 2.5; s.vx += rand(-1, 1) * 200; }
    }, win);
  }

  // ---------- Chad from ΣΤΓ ----------
  function spawnPusher(i) {
    s.pusher = { wy: s.dist - 380, x: s.x + (s.x < cx(s.dist) ? 70 : -70), i, t: 0, taunt: 1.2, done: false, fade: 0, phase: "approach" };
    Engine.toast(L.pusherAppear[i] || L.pusherAppear[0], "bad");
    Sfx.honk();
  }

  function updatePusher(dt) {
    const p = s.pusher;
    if (!p) return;
    p.t += dt;
    const yours = s.state === "intro" ? 0 : current(s.dist) + s.boost;
    if (!p.done) {
      // 1. approach: rides up behind you   2. windup: "!!" (dodge now)   3. lunge: charges where you WERE
      const dy = s.dist - p.wy;
      const [l, rt] = banks(p.wy);
      if (p.phase === "approach") {
        p.wy += (yours + clamp((dy - 95) * 1.2, -60, 150)) * dt;
        p.x += clamp(s.x - p.x, -70 * dt, 70 * dt);
        if (Math.abs(dy - 95) < 25 && s.state === "drive") {
          p.phase = "windup"; p.wt = 0.95 - p.i * 0.1;
          p.tx = s.x; // he's aiming at where you are RIGHT NOW: move!
          Engine.toast(L.pusherWindup, "bad"); Sfx.alarm();
        }
      } else if (p.phase === "windup") {
        p.wy += yours * dt;
        p.wt -= dt;
        if (p.wt <= 0) { p.phase = "lunge"; Sfx.tone(200, 0.3, "sawtooth", 0.08, 0, 500); }
      } else {
        p.wy += (yours + 300) * dt;
        p.x += clamp(p.tx - p.x, -170 * dt, 170 * dt);
        if (s.state === "drive" && s.invuln <= 0 && Math.abs(dy) < 50 && Math.abs(s.x - p.x) < 38) pushIn(p);
        if (dy < -110) { p.done = true; if (!p.got) Engine.toast(L.pusherGiveUp, "good"); }
      }
      p.x = clamp(p.x, l + RAFT_R, rt - RAFT_R);
      p.taunt -= dt;
      if (p.taunt <= 0 && p.phase === "approach" && Math.abs(dy) < 300) { p.taunt = rand(3, 4.5); Engine.toast(pick(L.pusherTaunts)); }
      if (p.t > 14 && !p.done) { p.done = true; Engine.toast(L.pusherGiveUp, "good"); }
    } else {
      p.fade += dt * 0.7;
      p.wy += (yours - 90) * dt; // drifts back and away
      p.x += (p.x < cx(p.wy) ? -40 : 40) * dt;
      if (p.fade >= 1) s.pusher = null;
    }
  }

  function pushIn(p) {
    p.got = true; p.done = true;
    s.state = "swim"; s.swimT = 2.4;
    s.dunks++;
    ToePrompt.cancel();
    Sfx.splash();
    Engine.shake = 6;
    if (s.flowers > 0) { s.flowers--; s.floaters.push({ x: s.x, y: P() - 60, text: "-1 🌼", t: 0 }); }
    Engine.toast(L.pushedIn, "bad");
    Engine.toast(pick(LINES.waterCold), "water");
    s.shrinkT = 3.4; s.smallPending = true;
  }

  // ---------- Objects ----------
  function touchObjects() {
    if (s.state === "intro") return;
    const py = P();
    for (const o of s.objs) {
      if (o.got) continue;
      const y = sy(o.wy);
      if (y < -60 || y > Engine.H + 60) continue;
      const d = Math.hypot(o.x - s.x, y - py);
      if (o.type === "rock") {
        if (d < o.r + RAFT_R - 6 && s.state === "drive") hitRock(o);
        continue;
      }
      if (d > RAFT_R + 22) continue;
      if (o.type === "flower") { o.got = true; s.flowers++; Sfx.flower(); }
      else if (o.type === "bottle") {
        o.got = true; s.bottles++; Sfx.fanfare();
        s.card = { text: L.bottles[o.n] || "", t: 6 };
        Voice.play(L.bottles[o.n], "interrupt");
      } else if (o.type === "charm" && s.state === "drive") {
        o.got = true; s.charm = true; Sfx.fanfare(); Confetti.burst(80, Engine.W);
        Engine.toast(L.gotCharm, "good");
      }
    }
  }

  function hitRock(o) {
    const away = Math.sign(s.x - o.x) || 1;
    s.vx = away * 170; s.spin += away * 2.2; s.boost = Math.min(s.boost, -50);
    s.x += away * 6;
    if (s.invuln > 0) return;
    s.invuln = 1;
    s.rocksHit++;
    Sfx.crash(); Engine.shake = 6;
    if (s.flowers > 0) { s.flowers--; s.floaters.push({ x: s.x, y: P() - 60, text: "-1 🌼", t: 0 }); }
    Engine.toast(pick(L.rockHit), "bad");
  }

  async function finish() {
    const me = s;
    s.state = "done";
    ToePrompt.cancel();
    Sfx.fanfare();
    Confetti.burst(160, Engine.W);
    await wait(2200);
    if (me.dead) return;
    await Engine.say(L.outro);
    if (me.dead) return;
    Save.finish("buenaVista", { flowers: s.flowers, toes: s.toes, charm: s.charm });
    Game.showComplete({
      title: L.completeTitle,
      flowers: s.flowers, toes: s.toes, charm: "🌧️", charmName: "Raindrop",
      extra: [
        { icon: "🌊", value: s.dunks, label: "times pushed in" },
        { icon: "🪨", value: s.rocksHit, label: "rocks hit" },
        { icon: "🍾", value: s.bottles + "/" + BOTTLES.length, label: "bottles found" },
      ],
      note: L.note,
    });
  }

  // ---------- Drawing ----------
  function draw(ctx) {
    const W = Engine.W, H = Engine.H, py = P();
    ctx.save();
    if (Engine.shake) ctx.translate(rand(-1, 1) * Engine.shake, rand(-1, 1) * Engine.shake);
    const k = s.zoom;
    ctx.translate(s.x, py); ctx.scale(k, k); ctx.translate(-s.x, -py);
    const top = py - py / k - 40, bot = py + (H - py) / k + 40;
    const left = s.x - W / k, right = s.x + W / k;

    // banks
    ctx.fillStyle = "#5f8f4e"; ctx.fillRect(left, top, right - left, bot - top);
    // river polygon
    const L1 = [], R1 = [];
    for (let y = top; y <= bot; y += 10) {
      const wy = s.dist + (py - y);
      const [l, r] = banks(wy);
      L1.push([l, y]); R1.push([r, y]);
    }
    ctx.beginPath();
    ctx.moveTo(L1[0][0] - 14, L1[0][1]);
    L1.forEach(([x, y]) => ctx.lineTo(x - 14, y));
    for (let i = R1.length - 1; i >= 0; i--) ctx.lineTo(R1[i][0] + 14, R1[i][1]);
    ctx.closePath(); ctx.fillStyle = "#b6a37f"; ctx.fill(); // sandy edge
    ctx.beginPath();
    ctx.moveTo(L1[0][0], L1[0][1]);
    L1.forEach(([x, y]) => ctx.lineTo(x, y));
    for (let i = R1.length - 1; i >= 0; i--) ctx.lineTo(R1[i][0], R1[i][1]);
    ctx.closePath(); ctx.fillStyle = "#3f7fa8"; ctx.fill();

    // ripples (and white water in the rapids)
    for (let i = Math.floor((s.dist - (bot - py)) / 34); i <= (s.dist + (py - top)) / 34; i++) {
      const wy = i * 34, y = sy(wy) + ((s.t * 40) % 34);
      const [l, r] = banks(wy);
      const rapid = inRapid(wy);
      for (let j = 0; j < (rapid ? 4 : 2); j++) {
        const x = l + 20 + hash(i, j + 1) * (r - l - 40);
        ctx.strokeStyle = rapid ? "rgba(255,255,255,.75)" : "rgba(190,225,245,.45)";
        ctx.lineWidth = rapid ? 3 : 2;
        ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.quadraticCurveTo(x, y - 5, x + 10, y); ctx.stroke();
      }
    }
    // trees + bank rocks
    for (let i = Math.floor((s.dist - (bot - py)) / 70); i <= (s.dist + (py - top)) / 70; i++) {
      const wy = i * 70, y = sy(wy);
      const [l, r] = banks(wy);
      if (hash(i, 11) < 0.7) pine(ctx, l - 34 - hash(i, 12) * 30, y, 15 + hash(i, 13) * 7);
      if (hash(i, 14) < 0.7) pine(ctx, r + 34 + hash(i, 15) * 30, y, 15 + hash(i, 16) * 7);
    }
    // rapid signs on the bank
    RAPIDS.forEach(([a, , n]) => bankSign(ctx, a - 300, L.signs[n], -1));
    bankSign(ctx, FINISH - 250, L.signs[3], 1);
    // take-out ramp at the finish
    const fy = sy(FINISH);
    if (fy > top && fy < bot) {
      const [l, r] = banks(FINISH);
      for (let x = l; x < r; x += 16) { ctx.fillStyle = (Math.floor(x / 16) % 2) ? "#fff" : "#e63946"; ctx.fillRect(x, fy - 4, 16, 8); }
    }

    // objects
    for (const o of s.objs) {
      if (o.got) continue;
      const y = sy(o.wy);
      if (y < top - 40 || y > bot + 40) continue;
      if (o.type === "rock") rock(ctx, o.x, y, o.r, o.wy);
      else if (o.type === "flower") Art.flower(ctx, o.x + Math.sin(s.t * 2 + o.wy) * 3, y, s.t, o.hue);
      else if (o.type === "bottle") bottle(ctx, o.x + Math.sin(s.t * 2 + o.n) * 4, y);
      else if (o.type === "charm") raindrop(ctx, o.x, y + Math.sin(s.t * 3) * 4);
    }

    // Chad
    const p = s.pusher;
    if (p) {
      ctx.save(); ctx.globalAlpha = 1 - p.fade;
      raft(ctx, p.x, sy(p.wy), Math.sin(s.t * 3) * 0.1 + (p.phase === "windup" ? Math.sin(s.t * 30) * 0.12 : 0), "#e63946", false, s.t);
      if (p.phase === "windup") {
        ctx.font = "800 26px 'Baloo 2', sans-serif"; ctx.textAlign = "center";
        ctx.lineWidth = 5; ctx.strokeStyle = "#fff"; ctx.strokeText("!!", p.x, sy(p.wy) - 52);
        ctx.fillStyle = "#e63946"; ctx.fillText("!!", p.x, sy(p.wy) - 52);
      }
      ctx.restore();
    }
    // the penguin's raft (or the penguin in the water)
    const swimming = s.state === "swim";
    raft(ctx, s.x, py, s.ang, "#ffbe0b", !swimming, s.t);
    if (swimming) swimmer(ctx, s.x + 44, py + 10);
    ctx.restore();

    // screen-space effects
    if (p && !p.done && sy(p.wy) > H - 60) { // Chad is behind you
      ctx.fillStyle = Math.floor(s.t * 6) % 2 ? "#e63946" : "#7b1e3a";
      Art.rr(ctx, W / 2 - 78, H - 196, 156, 32, 12); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "800 15px 'Baloo 2', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("▼ CHAD (ΣΤΓ) BEHIND YOU", W / 2, H - 179);
    }
    if (s.gp !== undefined && s.gp < 1) { // the RV grandparents drift overhead
      s.gp += 1 / 60 / 6;
      for (let i = 0; i < 2; i++) chute(ctx, W * (1.1 - s.gp * 1.3) + i * 70, 140 + i * 40, i ? "#f15bb5" : "#3a86ff");
    }
    if (s.rain > 0) {
      ctx.strokeStyle = `rgba(210,230,255,${0.5 * s.rain})`; ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (const d of s.drops) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * 0.18, d.y + d.l); }
      ctx.stroke();
      ctx.fillStyle = `rgba(40,60,90,${0.18 * s.rain})`; ctx.fillRect(0, 0, W, H);
    }
    if (s.rainbow > 0) rainbow(ctx, s.rainbow);
    if (s.zoom < 0.95) {
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75);
      g.addColorStop(0, "rgba(78,168,222,0)"); g.addColorStop(1, `rgba(78,168,222,${(1 - s.zoom) * 0.8})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    for (const f of s.floaters) {
      ctx.globalAlpha = Math.min(1, (1.8 - f.t) * 2);
      ctx.font = "800 20px 'Baloo 2', sans-serif"; ctx.textAlign = "center";
      ctx.lineWidth = 5; ctx.strokeStyle = "#fff"; ctx.lineJoin = "round"; ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = "#e63946"; ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
    if (s.card) bottleCard(ctx, s.card);
    Confetti.draw(ctx);
    ctx.restore();
  }

  function raft(ctx, x, y, ang, color, penguin, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.beginPath(); ctx.ellipse(4, 6, 31, 44, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, 31, 44, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3d4452"; ctx.beginPath(); ctx.ellipse(0, 0, 20, 32, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color; ctx.fillRect(-20, -3, 40, 6); // thwart
    // oars
    const sweepL = penguin ? s.oarL / 0.3 : 0.5 + Math.sin(t * 4) * 0.5, sweepR = penguin ? s.oarR / 0.3 : 0.5 + Math.sin(t * 4 + 1) * 0.5;
    ctx.strokeStyle = "#8d5b3b"; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(-46, -16 + sweepL * 34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14, -6); ctx.lineTo(46, -16 + sweepR * 34); ctx.stroke();
    ctx.fillStyle = "#8d5b3b";
    ctx.beginPath(); ctx.ellipse(-48, -16 + sweepL * 34, 5, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(48, -16 + sweepR * 34, 5, 9, 0, 0, Math.PI * 2); ctx.fill();
    if (penguin) {
      // balloon tied to the back
      ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, 40); ctx.quadraticCurveTo(6, 56, 10 + Math.sin(t * 2) * 6, 70); ctx.stroke();
      ctx.fillStyle = "#f15bb5"; ctx.beginPath(); ctx.ellipse(10 + Math.sin(t * 2) * 6, 84, 12, 15, 0, 0, Math.PI * 2); ctx.fill();
      // penguin from above, party hat on
      ctx.fillStyle = "#1b1f2e"; ctx.beginPath(); ctx.arc(0, 4, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(0, -1, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f7a21b"; ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(3, -6); ctx.lineTo(0, -13); ctx.fill();
      ctx.fillStyle = "#9b5de5"; ctx.beginPath(); ctx.arc(0, 8, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f15bb5"; ctx.beginPath(); ctx.arc(0, 8, 2.5, 0, Math.PI * 2); ctx.fill();
    } else if (color === "#e63946") {
      // Chad: backwards ΣΤΓ cap
      ctx.fillStyle = "#ffd7b5"; ctx.beginPath(); ctx.arc(0, 4, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#7b1e3a"; ctx.beginPath(); ctx.arc(0, 6, 10, 0, Math.PI); ctx.fill(); ctx.fillRect(-6, 13, 12, 6);
      ctx.fillStyle = "#f1e3c8"; ctx.font = "800 7px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("ΣΤΓ", 0, 10);
    }
    ctx.restore();
  }

  function swimmer(ctx, x, y) {
    const t = s.t;
    ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { const q = (t * 1.5 + i / 3) % 1; ctx.beginPath(); ctx.arc(x, y, 12 + q * 26, 0, Math.PI * 2); ctx.globalAlpha = 1 - q; ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#1b1f2e"; ctx.beginPath(); ctx.arc(x, y + Math.sin(t * 9) * 2, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(x, y - 4, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f7a21b"; ctx.beginPath(); ctx.moveTo(x - 3, y - 9); ctx.lineTo(x + 3, y - 9); ctx.lineTo(x, y - 15); ctx.fill();
    ctx.font = "800 16px 'Baloo 2', sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#fff";
    ctx.fillText(Math.floor(t * 4) % 2 ? "BRRR" : "COLD", x, y - 26);
  }

  function rock(ctx, x, y, r, seed) {
    ctx.fillStyle = "rgba(255,255,255,.55)"; // foam piling up on the upstream side
    ctx.beginPath(); ctx.ellipse(x, y - r * 0.35, r + 7 + Math.sin(s.t * 6 + seed) * 2, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, rr = r * (0.85 + hash(seed, i) * 0.25); ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath();
    ctx.fillStyle = "#a89f91"; ctx.fill();
    ctx.strokeStyle = "#3d3a35"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.38, 0, Math.PI * 2); ctx.fill();
  }

  function pine(ctx, x, y, r) {
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.arc(x + 4, y + 4, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2d6a4f"; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#40916c"; ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.55, 0, Math.PI * 2); ctx.fill();
  }

  function bottle(ctx, x, y) {
    ctx.fillStyle = "rgba(255,230,120,.35)"; ctx.beginPath(); ctx.arc(x, y, 24 + Math.sin(s.t * 5) * 3, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.rotate(0.6 + Math.sin(s.t * 2) * 0.2);
    ctx.fillStyle = "rgba(80,170,120,.9)"; Art.rr(ctx, -7, -16, 14, 28, 5); ctx.fill(); ctx.fillRect(-3, -24, 6, 9);
    ctx.fillStyle = "#c08a52"; ctx.fillRect(-3, -27, 6, 4);
    ctx.fillStyle = "#fff8ec"; ctx.fillRect(-3, -10, 6, 16);
    ctx.restore();
  }

  function raindrop(ctx, x, y) {
    ctx.fillStyle = "rgba(120,200,255,.35)"; ctx.beginPath(); ctx.arc(x, y, 30 + Math.sin(s.t * 6) * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#4ea8de";
    ctx.beginPath(); ctx.moveTo(x, y - 22); ctx.quadraticCurveTo(x + 15, y, x + 13, y + 7); ctx.arc(x, y + 7, 13, 0, Math.PI); ctx.quadraticCurveTo(x - 15, y, x, y - 22); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.ellipse(x - 5, y + 3, 3, 6, -0.3, 0, Math.PI * 2); ctx.fill();
  }

  function chute(ctx, x, y, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 22, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = "#555"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.lineTo(x, y + 30); ctx.lineTo(x + 22, y); ctx.stroke();
    ctx.fillStyle = "#e9ecef"; ctx.beginPath(); ctx.arc(x, y + 30, 4, 0, Math.PI * 2); ctx.fill();
  }

  function bankSign(ctx, wy, text, side) {
    const y = sy(wy);
    if (y < -60 || y > Engine.H + 60) return;
    const [l, r] = banks(wy);
    ctx.font = "800 13px 'Baloo 2', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const w = ctx.measureText(text).width + 16;
    const x = side < 0 ? Math.max(w / 2 + 4, l - w / 2 + 10) : Math.min(Engine.W - w / 2 - 4, r + w / 2 - 10);
    ctx.fillStyle = "#6b4f2a"; Art.rr(ctx, x - w / 2, y - 13, w, 26, 6); ctx.fill();
    ctx.strokeStyle = "#f1e3c8"; ctx.lineWidth = 1.5; Art.rr(ctx, x - w / 2 + 3, y - 10, w - 6, 20, 4); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.fillText(text, x, y + 1);
  }

  function bottleCard(ctx, c) {
    const W = Engine.W, a = Math.min(1, c.t * 2, (6 - c.t) * 4);
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = "600 16px 'Baloo 2', sans-serif";
    const lines = Art.wrap(ctx, c.text, W - 90);
    const h = 52 + lines.length * 21;
    const y = 118;
    ctx.fillStyle = "#fff8ec"; Art.rr(ctx, 22, y, W - 44, h, 16); ctx.fill();
    ctx.strokeStyle = "#f4a6b5"; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); Art.rr(ctx, 28, y + 6, W - 56, h - 12, 12); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#e63946"; ctx.font = "800 14px 'Baloo 2', sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText("🍾 " + L.bottleFound, 42, y + 16);
    ctx.fillStyle = "#1b1f2e"; ctx.font = "600 16px 'Baloo 2', sans-serif";
    lines.forEach((l, i) => ctx.fillText(l, 42, y + 40 + i * 21));
    ctx.restore();
  }

  function rainbow(ctx, a) {
    const W = Engine.W;
    const colors = ["#e63946", "#f77f00", "#fcbf49", "#06d6a0", "#3a86ff", "#8338ec"];
    ctx.save(); ctx.globalAlpha = a * 0.55; ctx.lineWidth = 9;
    colors.forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(W / 2, 330, 260 - i * 9, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); });
    ctx.restore();
  }

  function updateHud() {
    $("hudFlowers").textContent = s.flowers;
    $("hudToes").textContent = s.toes;
    const p = clamp(s.dist / FINISH, 0, 1);
    $("progressFill").style.width = p * 100 + "%";
    $("progressPeng").style.left = `calc(${p * 100}% - 10px)`;
  }

  return {
    id: "buenaVista",
    async start() {
      reset();
      const me = s;
      Engine.setControls("◀ PADDLE", "PADDLE ▶");
      Sfx.rainStart(0.05);
      await Engine.say(L.intro);
      if (me.dead) return;
      Engine.presses.left = Engine.presses.right = 0;
      s.state = "drive";
    },
    update, draw,
    _debug: () => s, // used by the test script
    _banks: (wy) => banks(wy),
    stop() { ToePrompt.cancel(); Sfx.rainStop(0.3); s.state = "done"; s.dead = true; Engine.closeDialog(); Engine.hideBanner(); Confetti.bits = []; },
  };
})();
