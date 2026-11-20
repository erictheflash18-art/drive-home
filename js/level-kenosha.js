// LEVEL 2 — KENOSHA PASS
// Side-view hill climb over the pass. Gas/brake on the ground, tilt in the air, land on your wheels.
// Stuck behind an RV, a false summit, an icy climb where too much gas flips you, then the frat
// guys chase you down the other side.

const KenoshaLevel = (() => {
  const L = LINES.kenosha;
  const G = 900;              // gravity, px/s²
  const ACCEL = 540;          // engine
  const MAXV = 430;
  const ZOOM = 0.72;          // how zoomed out the camera is
  const STEP = 10;            // terrain sample spacing (px)
  const FINISH = 28000;
  const SUMMIT = 19300;
  const FALSE_SUMMIT = 15450;
  const STEEP = [15800, 18300];
  const PUDDLE = [4480, 4720];
  const RV = { start: 7400, end: 9750, speed: 125 };
  const CHECKPOINTS = [200, 3100, 6000, 9900, 12600, 15900, 17100, 19400, 22300, 25100];
  // [x, height] — negative is up. Smoothed into hills.
  const KEYS = [[0, 0], [1500, 0], [3000, -150], [4300, -230], [4900, -230], [6000, -380], [7300, -450],
    [9900, -620], [11000, -700], [12000, -900], [13000, -980], [14200, -1150], [15300, -1350], [15800, -1360],
    [18300, -2650], [18600, -2700], [19900, -2720], [21000, -2500], [22500, -2150], [24000, -1850],
    [25500, -1500], [27000, -1350], [30000, -1350]];
  const KICKERS = [[2600, 40], [5600, 45], [11600, 50], [13200, 80], [21800, 55], [23300, 60], [24800, 60], [26200, 70]];
  const BIG_JUMP = 13200;
  const BUMPY = [[1500, 4300], [4900, 7200], [9900, 15300], [19900, 27000]];
  const SIGN_X = [500, 2000, 6900, 11000, 13800, 21200, 27600];

  let ground = null;
  let s;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const hash = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

  // ---------- Terrain ----------
  function buildTerrain() {
    const n = Math.ceil(30000 / STEP) + 1;
    let a = new Float32Array(n);
    let k = 0;
    for (let i = 0; i < n; i++) {
      const x = i * STEP;
      while (k < KEYS.length - 2 && x > KEYS[k + 1][0]) k++;
      const [x0, y0] = KEYS[k], [x1, y1] = KEYS[k + 1];
      a[i] = y0 + (y1 - y0) * clamp((x - x0) / (x1 - x0), 0, 1);
    }
    for (let pass = 0; pass < 3; pass++) { // soften the corners
      const b = new Float32Array(n), R = 12;
      for (let i = 0; i < n; i++) {
        let sum = 0, c = 0;
        for (let j = i - R; j <= i + R; j++) if (j >= 0 && j < n) { sum += a[j]; c++; }
        b[i] = sum / c;
      }
      a = b;
    }
    for (let i = 0; i < n; i++) {
      const x = i * STEP;
      for (const [s0, e0] of BUMPY) if (x > s0 && x < e0) {
        const fade = Math.min(1, (x - s0) / 300, (e0 - x) / 300);
        a[i] += fade * (Math.sin(x / 170) * 14 + Math.sin(x / 97 + 1.3) * 7);
      }
    }
    for (const [kx, h] of KICKERS) { // jump ramps: curve up, then drop away
      for (let x = kx - 160; x <= kx + 30; x += STEP) {
        const d = x - (kx - 160);
        const add = d <= 160 ? h * Math.pow(d / 160, 2) : h * Math.max(0, 1 - (d - 160) / 30);
        a[Math.round(x / STEP)] -= add;
      }
    }
    ground = a;
  }
  function gy(x) {
    const f = x / STEP;
    const i = clamp(Math.floor(f), 0, ground.length - 2);
    const t = f - i;
    return ground[i] * (1 - t) + ground[i + 1] * t;
  }
  function slope(x) { return (gy(x + 6) - gy(x - 6)) / 12; }

  // ---------- Setup ----------
  function reset() {
    if (!ground) buildTerrain();
    s = {
      x: 200, y: gy(200), sp: 0, vx: 0, vy: 0, air: false, ang: 0, av: 0, w: 0, wheel: 0, t: 0,
      fuel: 100, flowers: 0, toes: 0, carsTotalled: 0, charm: false,
      state: "intro", cp: 200, objs: [], flags: {}, floaters: [],
      rv: { active: false, x: RV.start, pulled: false, pull: 0, taunt: 3 },
      van: { on: false, x: 0, taunt: 5 },
      crashT: 0, flipFrom: 0, zoom: 1, shrinkT: 0, smallPending: false, nextToe: 9,
      camX: 200 - (Engine.W / ZOOM) * 0.3, camY: gy(200) - (Engine.H / ZOOM) * 0.58,
      lowFuelWarned: false, warnW: false, snow: [],
    };
    for (let i = 0; i < 70; i++) s.snow.push({ x: Math.random() * Engine.W, y: Math.random() * Engine.H, r: rand(1, 2.6), v: rand(20, 55) });
    Confetti.bits = [];
    populate();
    updateHud();
  }

  function populate() {
    const add = (o) => s.objs.push(o);
    // flowers on the road, in little lines
    for (let x = 900; x < FINISH - 400; x += 640 + Math.floor(hash(x, 1) * 300)) {
      if (x > STEEP[0] - 200 && x < STEEP[1]) continue;
      if (x > PUDDLE[0] - 120 && x < PUDDLE[1] + 120) continue;
      for (let i = 0; i < 3; i++) add({ type: "flower", x: x + i * 45, air: 0, hue: (Math.floor(x / 10) + i) % 3 });
    }
    // flowers in the air over each jump: you have to fly through them
    for (const [kx, h] of KICKERS) { // along the arc of a jump at normal speed
      [[60, 1.3], [120, 1.1], [180, 0.55]].forEach(([dx, k], i) => add({ type: "flower", x: kx + dx, air: h * k, hue: i }));
    }
    // Snickers = fuel
    for (let x = 1300; x < FINISH - 600; x += 2000) add({ type: "snickers", x });
    add({ type: "snickers", x: STEEP[0] + 300 });
    add({ type: "snickers", x: 17300 });
    // the bike charm on the Colorado Trail sign at the summit
    add({ type: "charm", x: SUMMIT + 150 });
  }

  // ---------- Update ----------
  function update(dt) {
    s.t += dt;
    Confetti.update(dt, Engine.H);
    ToePrompt.update(dt);
    for (const f of s.floaters) { f.t += dt; f.y -= 30 * dt; }
    s.floaters = s.floaters.filter((f) => f.t < 1.8);
    Engine.shake = Math.max(0, Engine.shake - dt * 30);
    for (const f of s.snow) {
      f.y += f.v * dt; f.x += Math.sin(s.t + f.r * 3) * 12 * dt - s.vx * 0.05 * dt;
      if (f.y > Engine.H) { f.y = -5; f.x = Math.random() * Engine.W; }
      if (f.x < -5) f.x = Engine.W + 5; if (f.x > Engine.W + 5) f.x = -5;
    }
    // THE WATER IS COLD → everything shrinks for a bit
    s.shrinkT = Math.max(0, s.shrinkT - dt);
    s.zoom += ((s.shrinkT > 0 ? 0.5 : 1) - s.zoom) * Math.min(1, dt * (s.shrinkT > 0 ? 6 : 3));
    if (s.smallPending && s.zoom < 0.62) { s.smallPending = false; Engine.toast(pick(LINES.gotSmall), "water"); }

    const driving = s.state === "drive";
    const gas = driving && Engine.input.right && s.fuel > 0;
    const brake = (driving && Engine.input.left) || s.state === "stopping";
    if (s.state === "crash") {
      s.crashT -= dt;
      if (s.crashT <= 0) respawn();
    } else if (s.state !== "intro") {
      physics(dt, gas, brake);
    }
    if (driving) events(dt);
    updateRV(dt);
    updateVan(dt);
    if (driving || s.state === "stopping") touchObjects();
    camera(dt);
    updateHud();
  }

  function physics(dt, gas, brake) {
    if (s.state === "drive") s.fuel = Math.max(0, s.fuel - (Math.abs(s.vx) * 0.013 + (gas ? 0.6 : 0)) * dt);
    if (!s.air) {
      const th = Math.atan(slope(s.x));       // >0 downhill, <0 uphill
      const icy = s.x > STEEP[0] && s.x < STEEP[1];
      let a = G * Math.sin(th) - 0.3 * s.sp;
      if (gas) a += ACCEL * (icy ? 0.95 : 1);
      if (brake) {
        if (s.sp > 25) a -= 950;
        else { s.sp = 0; a = 0; } // handbrake: hold on any hill
      }
      s.sp = clamp(s.sp + a * dt, -230, MAXV + (th > 0.1 ? 80 : 0));
      if (brake && s.sp < 25 && s.sp > -25) s.sp = 0;
      // too much gas on a steep climb lifts the nose... and eventually flips you
      const up = -th;
      if (gas && up > 0.3 && s.sp > -10) s.w += (up - 0.3) * 2.0 * dt;
      else s.w = Math.max(0, s.w - 3.5 * dt);
      if (s.w > 0.7 && s.t - (s.warnAt || -99) > 6) { s.warnAt = s.t; Engine.toast(L.easyGas, "bad"); }
      if (s.w > 1.25) return flip();

      const dx = Math.cos(th), dy = Math.sin(th);
      s.vx = s.sp * dx; s.vy = s.sp * dy;
      const nx = s.x + s.vx * dt;
      const fly = s.y + s.vy * dt + 0.5 * G * dt * dt;
      if (s.sp > 140 && gy(nx) > fly + 1.5) { // the ground drops away faster than you fall: airborne
        s.air = true;
        s.ang = th - s.w; s.w = 0; s.av = 0;
        s.x = nx; s.y += s.vy * dt;
      } else {
        s.x = nx; s.y = gy(nx);
        s.ang = Math.atan(slope(nx)) - s.w;
      }
    } else {
      s.vy += G * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      const tilt = (gas || (s.state === "drive" && Engine.input.right) ? -1 : 0) + (brake ? 1 : 0);
      if (tilt) s.av += tilt * 9 * dt;
      else s.av += (0.5 - s.av) * Math.min(1, dt * 2); // nose drifts gently down
      s.av = clamp(s.av, -4.5, 4.5);
      s.ang += s.av * dt;
      if (s.y >= gy(s.x)) land();
    }
    s.wheel += (s.air ? s.vx * 0.6 : s.sp) * dt / 11;
    s.x = Math.max(60, s.x);
  }

  function land() {
    const th = Math.atan(slope(s.x));
    const diff = Math.atan2(Math.sin(s.ang - th), Math.cos(s.ang - th));
    s.y = gy(s.x);
    if (Math.abs(diff) > 1.05) return flip();
    const dx = Math.cos(th), dy = Math.sin(th);
    const impact = Math.abs(-s.vx * dy + s.vy * dx);
    s.sp = s.vx * dx + s.vy * dy;
    s.air = false; s.av = 0; s.w = 0; s.ang = th;
    if (impact > 450) { Engine.shake = Math.min(8, impact / 90); Sfx.noise(0.12, 0.25); }
  }

  function flip() {
    if (s.state !== "drive") { // mid-cutscene: just put it back on its wheels
      s.air = false; s.w = 0; s.av = 0; s.ang = Math.atan(slope(s.x)); s.y = gy(s.x);
      return;
    }
    s.state = "crash";
    s.crashT = 1.7;
    s.flipFrom = s.ang;
    ToePrompt.cancel();
    Sfx.crash();
    Engine.shake = 10;
    s.carsTotalled++;
    Save.bump("carsTotalled");
    if (s.flowers > 0) { s.flowers--; s.floaters.push({ x: s.x, y: s.y - 90, text: "-1 🌼", t: 0 }); }
    s.floaters.push({ x: s.x, y: s.y - 120, text: "CARS TOTALLED: " + s.carsTotalled, t: 0 });
    Engine.toast(pick(L.flipped), "bad");
  }

  function respawn() {
    s.x = s.cp + 10; s.y = gy(s.x);
    s.sp = 0; s.vx = 0; s.vy = 0; s.air = false; s.w = 0; s.av = 0;
    s.ang = Math.atan(slope(s.x));
    s.fuel = Math.max(s.fuel, 60);
    s.state = "drive";
    if (s.van.on) s.van.x = s.x - 750;
    Sfx.blip();
  }

  function events(dt) {
    for (const c of CHECKPOINTS) if (s.x >= c && c > s.cp) {
      s.cp = c;
      if (c > 300) { Sfx.blip(); s.floaters.push({ x: s.x, y: s.y - 100, text: L.checkpoint, t: 0, good: true }); }
    }
    if (!ToePrompt.active && !s.air) {
      s.nextToe -= dt;
      if (s.nextToe <= 0) { startToe(); s.nextToe = rand(11, 17); }
    }
    // the worst possible moment: in the middle of the big jump
    if (!s.flags.bigToe && s.air && s.x > BIG_JUMP - 30 && s.x < BIG_JUMP + 500) {
      s.flags.bigToe = true;
      if (!ToePrompt.active) startToe(1.8);
    }
    if (!s.flags.rv && s.x > RV.start - 900) {
      s.flags.rv = true;
      s.rv.active = true;
      Engine.toast(L.rvAppear);
      Sfx.honk();
    }
    if (!s.flags.puddle && !s.air && s.x > PUDDLE[0] && s.x < PUDDLE[1]) {
      s.flags.puddle = true;
      s.sp *= 0.55;
      Sfx.splash();
      Engine.toast(pick(LINES.waterCold), "water");
      s.shrinkT = 3.4; s.smallPending = true;
    }
    if (!s.flags.falseSummit && s.x >= FALSE_SUMMIT) falseSummit();
    if (!s.flags.steep && s.x >= STEEP[0] + 60) { s.flags.steep = true; Engine.toast(L.steepWarning); }
    if (s.fuel < 25 && !s.lowFuelWarned) { s.lowFuelWarned = true; Engine.toast(L.lowFuel, "bad"); }
    if (s.fuel >= 40) s.lowFuelWarned = false;
    if (s.fuel <= 0 && !s.air && Math.abs(s.sp) < 12) hangry();
    if (s.x >= FINISH) finish();
  }

  function startToe(win) {
    ToePrompt.start((ok) => {
      if (ok) s.toes++;
      else if (s.air) s.av += 5;           // missed it mid-air: the car spins
      else s.sp *= 0.5;
    }, win);
  }

  async function hangry() {
    const me = s;
    s.state = "crash";       // reuses the respawn timer
    s.crashT = 2.2;
    s.flipFrom = s.ang;
    s.hangry = true;
    ToePrompt.cancel();
    Engine.toast(L.hangry, "bad");
    await wait(2200);
    if (me.dead) return;
    s.hangry = false;
    s.fuel = 100;
  }

  async function falseSummit() {
    const me = s;
    s.flags.falseSummit = true;
    s.state = "stopping";
    ToePrompt.cancel();
    Sfx.fanfare();
    Confetti.burst(120, Engine.W);
    Engine.banner(L.falseSummitBanner);
    await wait(2400);
    if (me.dead) return;
    Sfx.scratch();
    Engine.hideBanner();
    Confetti.bits = [];
    await Engine.say(L.falseSummit);
    if (me.dead) return;
    s.state = "drive";
    s.nextToe = rand(8, 12);
  }

  async function gotCharm() {
    const me = s;
    s.charm = true;
    s.state = "stopping";
    ToePrompt.cancel();
    Sfx.fanfare();
    Confetti.burst(70, Engine.W);
    await Engine.say(L.gotCharm);
    if (me.dead) return;
    s.van.on = true;
    s.van.x = s.x - 650;
    Sfx.honk();
    await Engine.say(L.fratsAppear);
    if (me.dead) return;
    s.state = "drive";
  }

  async function finish() {
    const me = s;
    s.state = "stopping";
    ToePrompt.cancel();
    Sfx.fanfare();
    Confetti.burst(160, Engine.W);
    if (s.van.on) { s.van.on = false; Engine.toast(L.fratLost, "good"); }
    await wait(2200);
    if (me.dead) return;
    await Engine.say(L.outro);
    if (me.dead) return;
    s.state = "done";
    Save.finish("kenosha", { flowers: s.flowers, toes: s.toes, charm: s.charm });
    Game.showComplete({
      title: L.completeTitle,
      flowers: s.flowers, toes: s.toes, charm: "🚲", charmName: "Bike",
      bikesHit: 0, carsTotalled: s.carsTotalled,
      note: L.note,
    });
  }

  function updateRV(dt) {
    const r = s.rv;
    if (!r.active) return;
    if (!r.pulled) {
      r.x += RV.speed * dt;
      r.wheel = (r.wheel || 0) + RV.speed * dt / 12;
      if (r.x >= RV.end) { r.pulled = true; Engine.toast(L.rvGone, "good"); return; }
      if (s.state === "drive" && s.x > r.x - 450) {
        r.taunt -= dt;
        if (r.taunt <= 0) { r.taunt = rand(5, 7); Sfx.honk(); Engine.toast(pick(L.rvTaunts)); }
      }
      // no passing zone: you can't get past it
      const limit = r.x - 72 - 40;
      if (s.x > limit && !s.air) {
        if (s.sp > RV.speed + 140) { Sfx.noise(0.15, 0.3); Engine.shake = 4; }
        s.x = limit; s.y = gy(s.x);
        s.sp = Math.min(s.sp, RV.speed * 0.9);
      }
    } else {
      r.pull = Math.min(1, r.pull + dt * 0.5);
    }
  }

  function updateVan(dt) {
    const v = s.van;
    if (!v.on) return;
    if (s.state === "drive") v.x += 290 * dt;
    v.wheel = (v.wheel || 0) + 290 * dt / 12;
    if (s.state !== "drive") return;
    v.taunt -= dt;
    if (v.taunt <= 0) { v.taunt = rand(6, 9); Sfx.honk(); Engine.toast(pick(L.fratTaunts)); }
    if (v.x > s.x - 80) {
      v.x = s.x - 850;
      Sfx.honk(); Sfx.crash(); Engine.shake = 8;
      const lost = Math.min(2, s.flowers);
      s.flowers -= lost;
      if (lost) s.floaters.push({ x: s.x, y: s.y - 90, text: "-" + lost + " 🌼", t: 0 });
      Engine.toast(L.fratCaught, "bad");
    }
  }

  function touchObjects() {
    const cy = s.y - 26; // middle of the car
    for (const o of s.objs) {
      if (o.got) continue;
      const oy = o.type === "charm" ? gy(o.x) - 70 : gy(o.x) - 22 - (o.air || 0);
      if (Math.abs(o.x - s.x) > 40 || Math.abs(oy - cy) > 46) continue;
      o.got = true;
      if (o.type === "flower") { s.flowers++; Sfx.flower(); }
      else if (o.type === "snickers") {
        s.fuel = Math.min(100, s.fuel + 26); Sfx.munch();
        s.floaters.push({ x: s.x, y: s.y - 90, text: "+🍫", t: 0, good: true });
      } else if (o.type === "charm") gotCharm();
    }
  }

  function camera(dt) {
    const z = ZOOM * s.zoom;
    const tx = s.x - (Engine.W / z) * 0.3;
    const ty = s.y - (Engine.H / z) * 0.58;
    s.camX += (tx - s.camX) * Math.min(1, dt * 6);
    s.camY += (ty - s.camY) * Math.min(1, dt * 4);
  }

  // ---------- Drawing ----------
  function draw(ctx) {
    const W = Engine.W, H = Engine.H;
    const z = ZOOM * s.zoom;
    ctx.save();
    if (Engine.shake) ctx.translate(rand(-1, 1) * Engine.shake, rand(-1, 1) * Engine.shake);

    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#6f9fd8"); sky.addColorStop(0.7, "#cfe3f5"); sky.addColorStop(1, "#eef5fb");
    ctx.fillStyle = sky; ctx.fillRect(-20, -20, W + 40, H + 40);
    mountains(ctx, 0.08, "#a9bdd6", 140, 0.55);
    mountains(ctx, 0.18, "#7f9bbb", 110, 0.68);

    ctx.save();
    ctx.scale(z, z);
    ctx.translate(-s.camX, -s.camY);
    const x0 = s.camX - 60, x1 = s.camX + W / z + 60, bottom = s.camY + H / z + 80;

    // trees behind the road
    for (let i = Math.floor(x0 / 70); i <= x1 / 70; i++) {
      const a = hash(i, 3);
      if (a < 0.45) continue;
      const tx = i * 70 + hash(i, 4) * 40;
      const ty = gy(tx) + 4;
      if (tx > SUMMIT - 300 && tx < SUMMIT + 300) continue;
      if (a < 0.75) Art.aspen(ctx, tx, ty, 70 + hash(i, 5) * 50, i);
      else Art.pine(ctx, tx, ty, 50 + hash(i, 6) * 40);
    }

    // the mountain itself: snow, dirt, road
    ctx.beginPath(); ctx.moveTo(x0, bottom);
    for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, gy(x));
    ctx.lineTo(x1, bottom); ctx.closePath();
    ctx.fillStyle = "#f4f7fb"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x0, bottom);
    for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, gy(x) + 34);
    ctx.lineTo(x1, bottom); ctx.closePath();
    ctx.fillStyle = "#7d6b5a"; ctx.fill();
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 8) (x === x0 ? ctx.moveTo : ctx.lineTo).call(ctx, x, gy(x) + 6);
    ctx.strokeStyle = "#3d4452"; ctx.lineWidth = 12; ctx.stroke();
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 8) (x === x0 ? ctx.moveTo : ctx.lineTo).call(ctx, x, gy(x) + 1);
    ctx.strokeStyle = "#e9ecef"; ctx.lineWidth = 2; ctx.stroke();
    // ice on the steep part
    if (x1 > STEEP[0] && x0 < STEEP[1]) {
      ctx.beginPath();
      for (let x = Math.max(x0, STEEP[0]); x <= Math.min(x1, STEEP[1]); x += 8) ctx.lineTo(x, gy(x) + 1);
      ctx.strokeStyle = "rgba(160,220,255,.9)"; ctx.lineWidth = 4; ctx.stroke();
    }

    // snowmelt puddle
    if (x1 > PUDDLE[0] && x0 < PUDDLE[1]) {
      const px = (PUDDLE[0] + PUDDLE[1]) / 2;
      ctx.fillStyle = "#4ea8de";
      ctx.beginPath(); ctx.ellipse(px, gy(px) + 2, (PUDDLE[1] - PUDDLE[0]) / 2, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#90e0ef";
      ctx.beginPath(); ctx.ellipse(px - 30, gy(px), 40, 3, 0, 0, Math.PI * 2); ctx.fill();
    }

    // signs + checkpoints
    L.signs.forEach((txt, i) => { const x = SIGN_X[i]; if (x > x0 - 100 && x < x1 + 100) Art.postSign(ctx, x, gy(x), txt); });
    if (FALSE_SUMMIT > x0 - 100 && FALSE_SUMMIT < x1 + 100) Art.postSign(ctx, FALSE_SUMMIT + 60, gy(FALSE_SUMMIT + 60), L.falseSummitSign, "#e63946");
    if (SUMMIT > x0 - 200 && SUMMIT < x1 + 200) {
      Art.postSign(ctx, SUMMIT - 120, gy(SUMMIT - 120), L.summitSign, "#6b4f2a");
      Art.postSign(ctx, SUMMIT + 150, gy(SUMMIT + 150), L.trailSign, "#5c4033");
    }
    for (const c of CHECKPOINTS) {
      if (c < 300 || c < x0 - 40 || c > x1 + 40) continue;
      const cy = gy(c);
      ctx.fillStyle = "#555"; ctx.fillRect(c - 1.5, cy - 50, 3, 50);
      ctx.fillStyle = c <= s.cp ? "#2ec4b6" : "#e63946";
      ctx.beginPath(); ctx.moveTo(c + 1.5, cy - 50); ctx.lineTo(c + 26, cy - 43); ctx.lineTo(c + 1.5, cy - 36); ctx.fill();
    }
    // finish
    if (FINISH > x0 - 100 && FINISH < x1 + 100) {
      const fy = gy(FINISH);
      for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) {
        ctx.fillStyle = (i + j) % 2 ? "#fff" : "#111"; ctx.fillRect(FINISH - 4 + j * 8, fy - 120 + i * 15, 8, 15);
      }
    }

    // collectibles
    for (const o of s.objs) {
      if (o.got || o.x < x0 - 50 || o.x > x1 + 50) continue;
      const oy = gy(o.x) - 22 - (o.air || 0);
      if (o.type === "flower") Art.flower(ctx, o.x, oy, s.t, o.hue);
      else if (o.type === "snickers") { ctx.save(); ctx.translate(o.x, oy); ctx.scale(0.75, 0.75); Art.snickers(ctx, 0, 0, s.t); ctx.restore(); }
      else if (o.type === "charm") {
        const cy = gy(o.x) - 70 + Math.sin(s.t * 3) * 4;
        ctx.fillStyle = "rgba(255,210,63,.4)"; ctx.beginPath(); ctx.arc(o.x, cy, 26 + Math.sin(s.t * 6) * 3, 0, Math.PI * 2); ctx.fill();
        ctx.font = "30px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🚲", o.x, cy);
      }
    }

    // RV
    const r = s.rv;
    if (r.active && r.pull < 1 && r.x > x0 - 100 && r.x < x1 + 100) {
      ctx.save();
      ctx.globalAlpha = 1 - r.pull;
      ctx.translate(r.x, gy(r.x) - r.pull * 30); ctx.rotate(Math.atan(slope(r.x)));
      ctx.scale(1 - r.pull * 0.3, 1 - r.pull * 0.3);
      Art.sideRV(ctx, r.wheel || 0);
      ctx.restore();
    }
    // frat van
    const v = s.van;
    if (v.on && v.x > x0 - 100 && v.x < x1 + 100) {
      ctx.save(); ctx.translate(v.x, gy(v.x)); ctx.rotate(Math.atan(slope(v.x)));
      Art.sideVan(ctx, v.wheel || 0, s.t);
      ctx.restore();
    }

    // the penguin's car (+ balloon)
    drawCar(ctx);

    // floating text
    for (const f of s.floaters) {
      ctx.globalAlpha = Math.min(1, (1.8 - f.t) * 2);
      ctx.font = "800 22px 'Baloo 2', sans-serif"; ctx.textAlign = "center";
      ctx.lineWidth = 5; ctx.strokeStyle = "#fff"; ctx.lineJoin = "round";
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.good ? "#1e7a46" : "#e63946"; ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // snow
    ctx.fillStyle = "rgba(255,255,255,.85)";
    for (const f of s.snow) { ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill(); }
    if (s.zoom < 0.95) {
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75);
      g.addColorStop(0, "rgba(78,168,222,0)"); g.addColorStop(1, `rgba(78,168,222,${(1 - s.zoom) * 0.8})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    fuelGauge(ctx);
    vanWarning(ctx, z);
    Confetti.draw(ctx);
    ctx.restore();
  }

  function drawCar(ctx) {
    const crashing = s.state === "crash";
    const p = crashing ? 1 - s.crashT / (s.hangry ? 2.2 : 1.7) : 0;
    // balloon trails behind and above
    const bx = s.x - 34 + Math.sin(s.t * 2) * 5 - s.vx * 0.03, by = s.y - 105 + Math.cos(s.t * 1.7) * 4;
    ctx.strokeStyle = "rgba(60,60,60,.6)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(s.x - 30, s.y - 32); ctx.quadraticCurveTo(s.x - 40, s.y - 70, bx, by + 16); ctx.stroke();
    ctx.fillStyle = "#f15bb5"; ctx.beginPath(); ctx.ellipse(bx, by, 13, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.ellipse(bx - 4, by - 5, 3.5, 5.5, -0.4, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.translate(s.x, s.y);
    if (crashing && !s.hangry) {
      // tumble onto the roof
      const target = s.flipFrom + (s.flipFrom < 0 ? -Math.PI : Math.PI);
      ctx.translate(0, -30 * Math.sin(Math.min(1, p * 2) * Math.PI) - (p > 0.5 ? 50 : 0) * 0);
      ctx.rotate(s.flipFrom + (target - s.flipFrom) * Math.min(1, p * 2.2));
      if (p > 0.45) ctx.translate(0, -60);
    } else {
      ctx.rotate(s.ang);
    }
    Art.sideCar(ctx, s.wheel);
    ctx.restore();
    if (crashing) {
      ctx.fillStyle = "rgba(120,120,120,.5)";
      for (let i = 0; i < 4; i++) {
        const q = (p * 2 + i * 0.25) % 1;
        ctx.beginPath(); ctx.arc(s.x - 10 + i * 8, s.y - 40 - q * 60, 8 + q * 12, 0, Math.PI * 2); ctx.fill();
      }
      if (s.hangry) {
        ctx.font = "26px sans-serif"; ctx.textAlign = "center"; ctx.fillText("😤", s.x, s.y - 80 - Math.sin(s.t * 8) * 4);
      }
    }
  }

  function mountains(ctx, par, color, amp, base) {
    const W = Engine.W, H = Engine.H;
    const by = H * base - s.camY * 0.04 * par * 10 * 0.25;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let sx = 0; sx <= W + 8; sx += 8) {
      const wx = s.camX * par + sx;
      const h = amp * (0.9 + 0.6 * Math.sin(wx / 210 + par * 9) + 0.35 * Math.sin(wx / 83 + 2) + 0.2 * Math.sin(wx / 37));
      ctx.lineTo(sx, by - h);
    }
    ctx.lineTo(W, H); ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.fillRect(0, 0, W, by - amp * 1.25);
    ctx.restore();
  }

  // The frat van is usually just off-screen behind you: show how close it is
  function vanWarning(ctx, z) {
    const v = s.van;
    if (!v.on || s.state === "done") return;
    const sx = (v.x - s.camX) * z;
    if (sx > 0) return; // it's on screen, you can see it
    const gap = Math.max(0, Math.round((s.x - v.x) / 10));
    const y = (s.y - 40 - s.camY) * z;
    const close = gap < 45;
    ctx.fillStyle = close && Math.floor(s.t * 6) % 2 ? "#e63946" : "#7b1e3a";
    Art.rr(ctx, 4, y - 18, 112, 36, 12); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "800 15px 'Baloo 2', sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText("◀ ΒΡΟ " + gap + "m", 14, y + 1);
  }

  function fuelGauge(ctx) {
    const x = 12, y = 58, w = 130, h = 14;
    ctx.fillStyle = "rgba(27,31,46,.75)"; Art.rr(ctx, x - 4, y - 4, w + 40, h + 8, 10); ctx.fill();
    ctx.font = "15px sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText("🍫", x, y + h / 2 + 1);
    ctx.fillStyle = "rgba(255,255,255,.2)"; Art.rr(ctx, x + 24, y, w, h, 7); ctx.fill();
    const low = s.fuel < 25 && Math.floor(s.t * 4) % 2;
    ctx.fillStyle = low ? "#e63946" : s.fuel < 25 ? "#ff8a95" : "#c08a52";
    Art.rr(ctx, x + 24, y, Math.max(6, w * s.fuel / 100), h, 7); ctx.fill();
  }

  function updateHud() {
    $("hudFlowers").textContent = s.flowers;
    $("hudToes").textContent = s.toes;
    const p = clamp(s.x / FINISH, 0, 1);
    $("progressFill").style.width = p * 100 + "%";
    $("progressPeng").style.left = `calc(${p * 100}% - 10px)`;
  }

  return {
    id: "kenosha",
    async start() {
      reset();
      const me = s;
      Engine.setControls("◀ BRAKE", "GAS ▶");
      await Engine.say(L.intro);
      if (me.dead) return;
      s.state = "drive";
    },
    update, draw,
    _debug: () => s, // used by the test script
    _slope: (x) => slope(x),
    _gy: (x) => gy(x),
    stop() { ToePrompt.cancel(); s.state = "done"; s.dead = true; Engine.closeDialog(); Engine.hideBanner(); Confetti.bits = []; },
  };
})();
