// LEVEL 1 — BOULDER
// Top-down drive out of town. Fake finish line, then back to the gas station for Snickers.

const BoulderLevel = (() => {
  const L = LINES.boulder;
  // Road geometry (logical px, width 420)
  const ROAD_L = 100, ROAD_R = 340, LANE_W = 80;
  const LANES = [140, 220, 300];
  const BIKE_L = 86, BIKE_R = 354;
  const BASE = 270;           // cruising speed
  const FAKE_FINISH = 8600;
  const SNACK_AT = 4300;
  const GPS_AT = 6400;
  const CAR_COLORS = ["#e76f51", "#457b9d", "#f4a261", "#8d99ae", "#6a4c93", "#d62828", "#f1faee"];
  const RIDER_COLORS = ["#ff006e", "#3a86ff", "#8338ec", "#fb5607", "#06d6a0"];

  let s; // all level state

  const hash = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function reset() {
    s = {
      dist: 0, speed: 0, x: LANES[1], vx: 0, t: 0,
      state: "intro",          // intro | drive | snack | cutscene | done
      phase: 1,                // 1 = leaving, 2 = back to gas station, 3 = for real
      objs: [], signs: [], floaters: [],
      flowers: 0, toes: 0,
      invuln: 0, spinT: 0, spinDur: 0.7, boostT: 0, waterT: 0, flipT: 0,
      nextToe: 7, flags: {}, snickersMisses: 0,
      p2Start: 0, p2End: 0, p3Start: 0, p3End: 0,
      finishes: [], gas: null,
    };
    Confetti.bits = [];
    generate(0, FAKE_FINISH - 300, {
      density: 0.25, gap: [300, 380],
      quiet: [[SNACK_AT - 450, SNACK_AT + 500], [GPS_AT - 150, GPS_AT + 1100]],
    });
    L.signs.slice(0, 5).forEach((txt, i) => addSign(1300 + i * 1450, txt));
    s.finishes.push({ e: FAKE_FINISH, label: "FINISH!", color: "#e63946" });
    updateHud();
  }

  // ---------- Level layout ----------
  function add(o) { o.active = false; o.v = o.v || 0; s.objs.push(o); return o; }
  function addSign(e, text) { s.signs.push({ e, text }); }

  function generate(from, to, opt) {
    let y = from + 550;
    const quiet = (yy) => (opt.quiet || []).some(([a, b]) => yy > a && yy < b);
    while (y < to) {
      if (quiet(y)) {
        if (Math.random() < 0.7) flowerLine(y, pick([0, 1, 2]), 3);
        y += 240;
        continue;
      }
      const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);
      const k = Math.random() < opt.density ? 2 : 1;
      for (let i = 0; i < k; i++) {
        const ln = lanes[i], r = Math.random();
        if (r < 0.5) add({ type: "car", e: y, x: LANES[ln], v: rand(130, 170), color: pick(CAR_COLORS), subaru: Math.random() < 0.4 });
        else if (r < 0.78) add({ type: "cone", e: y, x: LANES[ln] + rand(-12, 12) });
        else add({ type: "puddle", e: y, x: LANES[ln], w: 70 });
      }
      const free = lanes[k];
      const rf = Math.random();
      if (rf < 0.5) flowerLine(y - 60, free, 3);
      else if (rf < 0.57) add({ type: "kombucha", e: y, x: LANES[free] });
      if (Math.random() < 0.45) {
        const left = Math.random() < 0.5;
        add({ type: "bike", e: y + 120, x: left ? BIKE_L : BIKE_R, base: left ? BIKE_L : BIKE_R, dir: left ? 1 : -1,
          v: 110, color: pick(RIDER_COLORS), swerve: Math.random() < 0.35, sw: 0 });
      }
      if (Math.random() < 0.12) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        add({ type: "dog", e: y + 140, x: dir > 0 ? ROAD_L - 20 : ROAD_R + 20, dir, run: false });
      }
      y += rand(opt.gap[0], opt.gap[1]);
    }
  }

  function flowerLine(y, lane, n) {
    for (let i = 0; i < n; i++) add({ type: "flower", e: y + i * 55, x: LANES[lane], hue: Math.floor(Math.random() * 3) });
  }

  // ---------- Update ----------
  function py() { return Engine.H - 170; } // player's screen y
  function screenY(o) { return py() - ((o.wy !== undefined ? o.wy : o.e) - s.dist); }

  function update(dt) {
    s.t += dt;
    Confetti.update(dt, Engine.H);
    ToePrompt.update(dt);
    for (const f of s.floaters) { f.t += dt; f.y -= 40 * dt; }
    s.floaters = s.floaters.filter((f) => f.t < 1.1);
    Engine.shake = Math.max(0, Engine.shake - dt * 30);

    // speed
    let target = 0;
    if (s.state === "drive") target = s.boostT > 0 ? 440 : s.waterT > 0 ? 150 : BASE;
    if (s.speed < target) s.speed = Math.min(target, s.speed + 260 * dt);
    else s.speed = Math.max(target, s.speed - 520 * dt);
    s.dist += s.speed * dt;

    // timers
    if (s.boostT > 0) {
      s.boostT -= dt;
      if (s.boostT <= 0) Engine.toast(pick(LINES.doesntLastLong));
    }
    s.waterT = Math.max(0, s.waterT - dt);
    s.invuln = Math.max(0, s.invuln - dt);
    s.spinT = Math.max(0, s.spinT - dt);
    if (s.flipT > 0) {
      s.flipT -= dt;
      if (s.flipT <= 0) Engine.hideBanner();
    }

    // steering
    let dir = s.state === "drive" ? Engine.steer() : 0;
    if (s.flipT > 0) dir = -dir;
    const tv = dir * 300;
    s.vx += (tv - s.vx) * Math.min(1, dt * 12);
    s.x = clamp(s.x + s.vx * dt, BIKE_L - 20, BIKE_R + 20);

    if (s.state === "drive") events(dt);
    updateObjects(dt);
    updateHud();
  }

  function events(dt) {
    // Random HOOK THE TOE, always at slightly bad times
    if (!ToePrompt.active && s.flipT <= 0) {
      s.nextToe -= dt;
      if (s.nextToe <= 0) { startToe(); s.nextToe = rand(10, 17); }
    }
    if (s.phase === 1 && !s.flags.snack && s.dist >= SNACK_AT) snackBreak();
    if (s.phase === 1 && !s.flags.gps && s.dist >= GPS_AT) {
      s.flags.gps = true;
      ToePrompt.cancel();
      s.flipT = 3.5;
      Sfx.alarm();
      Engine.banner(L.gpsWarning);
    }
    // the worst-timed toe: right in the middle of the bike swarm
    if (s.phase === 2 && !s.flags.swarmToe && s.dist >= s.swarmAt) {
      s.flags.swarmToe = true;
      if (!ToePrompt.active) startToe(2.6);
    }
    if (s.phase === 1 && s.dist >= FAKE_FINISH) fakeFinish();
    if (s.phase === 3 && s.dist >= s.p3End) realFinish();
  }

  function startToe(win) {
    ToePrompt.start((ok) => {
      if (ok) { s.toes++; }
      else { s.spinT = s.spinDur; s.speed = Math.min(s.speed, 150); }
    }, win);
  }

  async function snackBreak() {
    const me = s;
    s.flags.snack = true;
    ToePrompt.cancel();
    s.state = "snack";
    Engine.toast(L.snackBreak);
    await wait(700);
    if (me.dead) return;
    Sfx.munch();
    s.munching = true;
    await wait(2300);
    if (me.dead) return;
    s.munching = false;
    Engine.toast(L.snackDone);
    if (s.state === "snack") s.state = "drive";
  }

  async function fakeFinish() {
    const me = s;
    s.phase = 1.5;
    s.state = "cutscene";
    ToePrompt.cancel();
    Sfx.fanfare();
    Confetti.burst(140, Engine.W);
    Engine.banner(L.fakeComplete);
    s.progressOverride = 1;
    await wait(2800);
    if (me.dead) return;
    Sfx.scratch();
    Engine.hideBanner();
    Confetti.bits = [];
    await Engine.say(L.forgot);
    if (me.dead) return;
    // turn around (dramatically)
    s.spinDur = 1.1; s.spinT = 1.1;
    await wait(900);
    if (me.dead) return;
    s.spinDur = 0.7;
    s.objs = s.objs.filter((o) => screenY(o) > py() + 40);
    s.finishes = [];
    s.p2Start = s.dist;
    s.p2End = s.dist + 5400;
    s.swarmAt = s.p2Start + 2700;
    generate(s.p2Start, s.p2End - 500, {
      density: 0.5, gap: [240, 300],
      quiet: [[s.swarmAt - 200, s.swarmAt + 700]],
    });
    swarm(s.swarmAt - 100);
    addSign(s.p2Start + 500, L.backSign);
    addSign(s.p2Start + 1900, L.signs[5]);
    s.gas = { e: s.p2End - 150 };
    placeSnickers(s.p2End, LANES[Math.floor(Math.random() * 3)]);
    s.phase = 2;
    s.progressOverride = null;
    s.state = "drive";
    s.nextToe = rand(5, 8);
  }

  // A pack of cyclists + cones right where the toe prompt fires. Always one gap.
  function swarm(y) {
    const pattern = [[0, 1], [1, 2], [0, 2], [0, 1], [1, 2]];
    pattern.forEach((blocked, i) => {
      const row = y + i * 170;
      blocked.forEach((ln) => add({ type: i % 2 ? "cone" : "bike", e: row, x: LANES[ln], base: LANES[ln], dir: 1,
        v: i % 2 ? 0 : 80, color: pick(RIDER_COLORS), swerve: false, sw: 0 }));
      const free = [0, 1, 2].find((l) => !blocked.includes(l));
      add({ type: "flower", e: row, x: LANES[free], hue: i % 3 });
    });
  }

  function placeSnickers(e, x) {
    s.snickers = add({ type: "snickers", e, x });
  }

  async function gotSnickers() {
    const me = s;
    s.state = "cutscene";
    ToePrompt.cancel();
    Sfx.fanfare();
    Confetti.burst(60, Engine.W);
    s.speed = Math.min(s.speed, 120);
    await Engine.say(L.gotSnickers);
    if (me.dead) return;
    s.phase = 3;
    s.p3Start = s.dist;
    s.p3End = s.dist + 2800;
    s.objs = s.objs.filter((o) => screenY(o) > py() + 40);
    generate(s.p3Start, s.p3End - 400, { density: 0.2, gap: [300, 360] });
    addSign(s.p3Start + 600, L.signs[6]);
    s.finishes.push({ e: s.p3End, label: L.finalSign, color: "#1e7a46" });
    s.state = "drive";
    s.nextToe = rand(6, 9);
  }

  async function realFinish() {
    const me = s;
    s.phase = 4;
    s.state = "done";
    ToePrompt.cancel();
    Sfx.fanfare();
    Confetti.burst(160, Engine.W);
    await wait(1800);
    if (me.dead) return;
    Save.finish("boulder", { flowers: s.flowers, toes: s.toes, charm: true });
    Game.showComplete({
      title: "YO JOHN, BOULDER: DONE. (For real this time.)",
      flowers: s.flowers, toes: s.toes, charm: "🍫", charmName: "Snickers",
      note: L.note,
    });
  }

  function crash(o) {
    if (s.invuln > 0 || s.boostT > 0) {
      if (s.boostT > 0 && o.type !== "puddle") { o.hit = true; o.fly = 1; Sfx.blip(); }
      return;
    }
    o.hit = true;
    o.fly = 1;
    Sfx.crash();
    Engine.shake = 10;
    s.invuln = 1.4;
    s.speed = 90;
    if (s.flowers > 0) {
      s.flowers--;
      s.floaters.push({ x: s.x, y: py() - 40, text: "-1 🌼", t: 0 });
    }
    Engine.toast(pick(LINES.crash), "bad");
  }

  function updateObjects(dt) {
    const P = py();
    const pbox = { x: s.x, y: P, hw: 17, hh: 30 };
    for (const o of s.objs) {
      if (!o.active) {
        const rel = o.e - s.dist;
        const factor = o.v ? 1 - o.v / BASE : 1;
        if (rel * factor < P + 90) {
          o.active = true;
          o.wy = o.v ? o.e - o.v * rel / BASE : o.e;
        } else continue;
      }
      if (o.v) o.wy += o.v * dt;
      if (o.fly) { o.fly += dt * 3; continue; }
      const y = screenY(o);

      if (o.type === "bike") {
        if (o.swerve && y > 120 && y < P - 60) o.sw = Math.min(1, o.sw + dt * 2);
        else o.sw = Math.max(0, o.sw - dt * 2);
        if (o.swerve && !o.rang && y > 120) { o.rang = true; Sfx.bell(); }
        o.x = o.base + o.dir * 26 * o.sw;
      }
      if (o.type === "dog") {
        if (!o.run && y > P - 420) o.run = true;
        if (o.run) o.x += o.dir * 150 * dt;
      }
      if (o.collected || o.hit) continue;

      // collisions
      const box = hitbox(o);
      if (!box) continue;
      if (Math.abs(box.x - pbox.x) < box.hw + pbox.hw && Math.abs(y - pbox.y) < box.hh + pbox.hh) {
        touch(o);
      }
    }
    // missed the Snickers? It "respawns" further up the road.
    if (s.snickers && !s.snickers.collected && s.snickers.active && screenY(s.snickers) > P + 70 && s.state === "drive") {
      s.snickersMisses++;
      Engine.toast(L.missedSnickers, "bad");
      const o = s.snickers;
      o.active = false;
      o.e = s.dist + 1000;
      delete o.wy;
      o.x = s.snickersMisses >= 2 ? clamp(s.x, LANES[0], LANES[2]) : LANES[Math.floor(Math.random() * 3)];
    }
    s.objs = s.objs.filter((o) => !o.active || screenY(o) < Engine.H + 140);
  }

  function hitbox(o) {
    switch (o.type) {
      case "car": return { x: o.x, hw: 19, hh: 33 };
      case "bike": return { x: o.x, hw: 8, hh: 16 };
      case "cone": return { x: o.x, hw: 10, hh: 10 };
      case "dog": return { x: o.x, hw: 11, hh: 7 };
      case "puddle": return { x: o.x, hw: o.w / 2 - 10, hh: 14 };
      case "flower": return { x: o.x, hw: 18, hh: 18 };
      case "kombucha": return { x: o.x, hw: 16, hh: 16 };
      case "snickers": return { x: o.x, hw: 32, hh: 22 };
    }
    return null;
  }

  function touch(o) {
    if (o.type === "flower") {
      o.collected = true; s.flowers++; Sfx.flower();
    } else if (o.type === "kombucha") {
      o.collected = true; s.boostT = 2; Sfx.boost(); Engine.toast(L.boost, "good");
    } else if (o.type === "puddle") {
      o.hit = true;
      if (s.boostT <= 0) {
        s.waterT = 1.3; Sfx.splash(); Engine.toast(pick(LINES.waterCold), "water");
      }
    } else if (o.type === "snickers") {
      o.collected = true;
      gotSnickers();
    } else {
      crash(o);
    }
  }

  // ---------- Drawing ----------
  function draw(ctx) {
    const W = Engine.W, H = Engine.H, P = py();
    ctx.save();
    if (Engine.shake) ctx.translate(rand(-1, 1) * Engine.shake, rand(-1, 1) * Engine.shake);

    // grass + road
    ctx.fillStyle = "#74c69d"; ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.fillStyle = "#c9c9c9"; ctx.fillRect(64, -20, 12, H + 40); ctx.fillRect(W - 76, -20, 12, H + 40);
    ctx.fillStyle = "#3d4452"; ctx.fillRect(74, -20, W - 148, H + 40);
    ctx.fillStyle = "#4b6b52"; ctx.fillRect(74, -20, 26, H + 40); ctx.fillRect(ROAD_R, -20, 26, H + 40);
    ctx.fillStyle = "#fff"; ctx.fillRect(ROAD_L - 2, -20, 3, H + 40); ctx.fillRect(ROAD_R - 1, -20, 3, H + 40);

    // lane dashes + bike symbols (world-fixed so they scroll)
    const first = Math.floor((s.dist - (H - P) - 80) / 70);
    const last = Math.floor((s.dist + P + 80) / 70);
    ctx.fillStyle = "#f8f9fa";
    for (let i = first; i <= last; i++) {
      const y = P - (i * 70 - s.dist);
      ctx.fillRect(ROAD_L + LANE_W - 2, y, 4, 34);
      ctx.fillRect(ROAD_L + LANE_W * 2 - 2, y, 4, 34);
    }
    ctx.font = "16px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.5;
    for (let i = Math.floor(first / 6); i <= last / 6 + 1; i++) {
      const y = P - (i * 420 - s.dist);
      ctx.fillText("🚲", BIKE_L, y); ctx.fillText("🚲", BIKE_R, y);
    }
    ctx.globalAlpha = 1;

    // scenery on the grass
    const f2 = Math.floor((s.dist - (H - P) - 150) / 110), l2 = Math.floor((s.dist + P + 150) / 110);
    for (let i = f2; i <= l2; i++) {
      const y = P - (i * 110 - s.dist);
      const a = hash(i, 1), b = hash(i, 2);
      if (a < 0.55) Art.tree(ctx, 30 + hash(i, 3) * 14, y, 16 + hash(i, 4) * 8, a < 0.25);
      else if (a < 0.8) Art.house(ctx, 32, y, ["#ffcdb2", "#b5e48c", "#a2d2ff", "#ffc8dd"][i & 3]);
      if (b < 0.55) Art.tree(ctx, W - 28 - hash(i, 5) * 10, y, 15 + hash(i, 6) * 7, b < 0.25);
      else if (b < 0.75) Art.house(ctx, W - 22, y, ["#e9edc9", "#cdb4db", "#ffafcc", "#bde0fe"][i & 3]);
    }

    if (s.gas) {
      const gy = P - (s.gas.e - s.dist);
      if (gy > -100 && gy < H + 100) Art.gasStation(ctx, W - 20, gy);
    }

    // objects, layered: ground stuff first
    const order = { puddle: 0, flower: 1, kombucha: 1, snickers: 1, cone: 2, dog: 3, bike: 4, car: 5 };
    const vis = s.objs.filter((o) => o.active && !o.collected).sort((a, b) => order[a.type] - order[b.type]);
    for (const o of vis) {
      let y = screenY(o);
      if (y < -80 || y > H + 80) continue;
      ctx.save();
      if (o.fly) {
        ctx.globalAlpha = Math.max(0, 2 - o.fly);
        ctx.translate(o.x, y); ctx.rotate(o.fly * 3); ctx.translate(-o.x, -y);
        y -= (o.fly - 1) * 60;
      }
      switch (o.type) {
        case "car": Art.car(ctx, o.x, y, o.color, o.subaru); break;
        case "bike": Art.bike(ctx, o.x, y, o.color, s.t);
          if (o.swerve && o.sw > 0.05 && o.sw < 0.95) { ctx.fillStyle = "#ffd23f"; ctx.font = "800 18px 'Baloo 2'"; ctx.fillText("!", o.x, y - 28); }
          break;
        case "cone": Art.cone(ctx, o.x, y); break;
        case "dog": Art.prairieDog(ctx, o.x, y, o.dir, s.t); break;
        case "puddle": Art.puddle(ctx, o.x, y, o.w, s.t); break;
        case "flower": Art.flower(ctx, o.x, y, s.t, o.hue); break;
        case "kombucha": Art.kombucha(ctx, o.x, y, s.t); break;
        case "snickers": Art.snickers(ctx, o.x, y, s.t); break;
      }
      ctx.restore();
    }

    // finish lines
    for (const f of s.finishes) {
      const y = P - (f.e - s.dist);
      if (y > -60 && y < H + 60) Art.finishLine(ctx, ROAD_L - 26, ROAD_R + 26, y, f.label, f.color);
    }

    // the penguin
    const spin = s.spinT > 0 ? (1 - s.spinT / s.spinDur) * Math.PI * 2 : 0;
    const blink = s.invuln > 0 && Math.floor(s.t * 12) % 2 === 0;
    if (s.boostT > 0) {
      ctx.fillStyle = "rgba(255,210,63,.5)";
      for (let i = 0; i < 4; i++) ctx.fillRect(s.x - 16 + i * 10, P + 38 + Math.random() * 10, 4, 18 + Math.random() * 20);
    }
    Art.playerCar(ctx, s.x, P, s.vx / 300 * 0.2 + spin, blink);
    if (s.munching) {
      ctx.fillStyle = "#fff";
      Art.rr(ctx, s.x + 18, P - 74, 96, 30, 12); ctx.fill();
      ctx.fillStyle = "#1b1f2e"; ctx.font = "700 14px 'Baloo 2', sans-serif"; ctx.textAlign = "center";
      ctx.fillText(Math.floor(s.t * 3) % 2 ? "munch munch" : "MUNCH", s.x + 66, P - 58);
    }

    // overhead highway signs
    for (const sg of s.signs) {
      const y = P - (sg.e - s.dist);
      if (y < -120 || y > H + 120) continue;
      ctx.font = "700 16px 'Baloo 2', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const lines = Art.wrap(ctx, sg.text, 200);
      const h = 18 + lines.length * 18;
      ctx.fillStyle = "#555"; ctx.fillRect(ROAD_L - 14, y - h / 2, 6, h + 10); ctx.fillRect(ROAD_R + 8, y - h / 2, 6, h + 10);
      ctx.fillStyle = "rgba(0,0,0,.25)"; Art.rr(ctx, ROAD_L + 4, y - h / 2 + 8, ROAD_R - ROAD_L, h, 8); ctx.fill();
      ctx.fillStyle = "#1e7a46"; Art.rr(ctx, ROAD_L - 8, y - h / 2, ROAD_R - ROAD_L + 16, h, 8); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; Art.rr(ctx, ROAD_L - 4, y - h / 2 + 4, ROAD_R - ROAD_L + 8, h - 8, 6); ctx.stroke();
      ctx.fillStyle = "#fff";
      lines.forEach((l, i) => ctx.fillText(l, W / 2, y - h / 2 + 18 + i * 18));
    }

    // floating "-1" text
    for (const f of s.floaters) {
      ctx.globalAlpha = 1 - f.t / 1.1;
      ctx.fillStyle = "#e63946"; ctx.font = "800 20px 'Baloo 2', sans-serif"; ctx.textAlign = "center";
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }

    // cold water tint
    if (s.waterT > 0) {
      const a = Math.min(1, s.waterT) * 0.45;
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75);
      g.addColorStop(0, "rgba(78,168,222,0)"); g.addColorStop(1, `rgba(78,168,222,${a})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (s.flipT > 0) {
      ctx.fillStyle = `rgba(155,93,229,${0.12 + Math.sin(s.t * 10) * 0.05})`;
      ctx.fillRect(0, 0, W, H);
    }
    Confetti.draw(ctx);
    ctx.restore();
  }

  // ---------- HUD ----------
  function updateHud() {
    $("hudFlowers").textContent = s.flowers;
    $("hudToes").textContent = s.toes;
    let p;
    if (s.progressOverride != null) p = s.progressOverride;
    else if (s.phase === 1) p = s.dist / FAKE_FINISH;
    else if (s.phase === 2) p = 0.55 + 0.3 * clamp((s.dist - s.p2Start) / (s.p2End - s.p2Start), 0, 1);
    else if (s.phase === 3) p = 0.85 + 0.15 * clamp((s.dist - s.p3Start) / (s.p3End - s.p3Start), 0, 1);
    else p = 1;
    p = clamp(p, 0, 1);
    $("progressFill").style.width = p * 100 + "%";
    $("progressPeng").style.left = `calc(${p * 100}% - 10px)`;
  }

  return {
    id: "boulder",
    async start() {
      reset();
      const me = s;
      await Engine.say(L.intro);
      if (me.dead) return;
      s.state = "drive";
    },
    update, draw,
    _debug: () => s, // used by the test script
    stop() { ToePrompt.cancel(); s.state = "done"; s.dead = true; Engine.closeDialog(); Engine.hideBanner(); Confetti.bits = []; },
  };
})();
