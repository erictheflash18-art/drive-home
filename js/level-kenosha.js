// LEVEL 2 — KENOSHA PASS
// Side-view hill climb over the pass. Gas/brake on the ground, tilt in the air, land on your wheels.
// Stuck behind an RV, a false summit, an icy climb where too much gas flips you, then the frat
// guys chase you down the other side.

const KenoshaLevel = (() => {
  const L = LINES.kenosha;
  const G = 900;              // gravity on the ground (hills feel heavy)
  const G_AIR = 600;          // gravity in the air (jumps feel floaty)
  const RAMP_LEN = 200;       // jump ramps: length of the run-up
  const POP = 130;            // extra upward kick when leaving a ramp
  const JUMP_V = 480;         // the JUMP button
  // Slow traffic to jump over: [x where it appears, type]. Speeds/sizes below.
  const TRAFFIC = [[1700, "minivan"], [3500, "semi"], [4300, "minivan"], [10300, "semi"], [12000, "minivan"],
    [14100, "semi"], [20500, "minivan"], [22700, "semi"], [25400, "minivan"]];
  const VEHICLE = { semi: { len: 200, h: 84, speed: 150 }, minivan: { len: 96, h: 58, speed: 175 } };
  const VAN_COLORS = ["#c9b79c", "#8d99ae", "#b5838d"];
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
  const KICKERS = [[2600, 70], [5600, 95], [11600, 95], [13200, 110], [21800, 75], [23300, 80], [24800, 90], [26200, 100]];
  const BIG_JUMP = 13200;
  const BUMPY = [[1500, 4300], [4900, 7200], [9900, 15300], [19900, 27000]];
  const SIGN_X = [500, 2000, 6900, 11000, 13800, 21200, 27600];

  let ground = null;
  let baseGround = null;      // the road without the ramps (ramps are drawn on top of it)
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
        let fade = Math.min(1, (x - s0) / 300, (e0 - x) / 300);
        for (const [kx] of KICKERS) { // keep the run-up and landing zone smooth
          const d = x < kx ? (kx - RAMP_LEN - 150 - x) : (x - (kx + 750));
          if (d < 0) fade = 0; else if (d < 200) fade = Math.min(fade, d / 200);
        }
        a[i] += fade * (Math.sin(x / 170) * 14 + Math.sin(x / 97 + 1.3) * 7);
      }
    }
    baseGround = Float32Array.from(a);
    for (const [kx, h] of KICKERS) { // jump ramps: curve up, then a short drop on the far side
      for (let x = kx - RAMP_LEN; x <= kx + 40; x += STEP) {
        const d = x - (kx - RAMP_LEN);
        const add = d <= RAMP_LEN ? h * Math.pow(d / RAMP_LEN, 2) : h * Math.max(0, 1 - (d - RAMP_LEN) / 40);
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
  function by(x) { // road height ignoring ramps
    const f = x / STEP;
    const i = clamp(Math.floor(f), 0, baseGround.length - 2);
    const t = f - i;
    return baseGround[i] * (1 - t) + baseGround[i + 1] * t;
  }
  function lipAngle(kx) { return Math.atan((gy(kx - 2) - gy(kx - 14)) / 12); } // ramp angle right at the edge
  function rampAt(x) { return KICKERS.find(([kx]) => x > kx - RAMP_LEN - 5 && x < kx + 5); }

  // ---------- Setup ----------
  function reset() {
    if (!ground) buildTerrain();
    s = {
      x: 200, y: gy(200), sp: 0, vx: 0, vy: 0, air: false, ang: 0, av: 0, w: 0, wheel: 0, t: 0,
      fuel: 100, flowers: 0, toes: 0, carsTotalled: 0, charm: false,
      state: "intro", cp: 200, objs: [], flags: {}, floaters: [],
      rv: { active: false, x: RV.start, pulled: false, pull: 0, taunt: 3 },
      traffic: [], nextTraffic: 0, jumpWas: false, jumpBuf: 0,
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
    for (const [kx] of KICKERS) { // along the arc of a jump at normal speed
      const th = lipAngle(kx), V = 400;
      let x = kx, y = gy(kx), vx = V * Math.cos(th), vy = V * Math.sin(th) - POP, t = 0, i = 0;
      const marks = [0.3, 0.55, 0.8, 1.05];
      while (i < marks.length && t < 2) {
        vy += G_AIR / 60; x += vx / 60; y += vy / 60; t += 1 / 60;
        if (t >= marks[i]) { if (by(x) - y > 45) add({ type: "flower", x, y: y - 20, hue: i % 3 }); i++; }
      }
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
    const brake = s.state === "stopping"; // no brake button anymore; only cutscenes stop the car
    const jumpHeld = driving && (Engine.input.left || Engine.input.up);
    if (jumpHeld && !s.jumpWas) s.jumpBuf = 0.15; // a press just before landing still counts
    s.jumpWas = jumpHeld;
    s.jumpBuf = Math.max(0, s.jumpBuf - dt);
    if (s.state === "crash") {
      s.crashT -= dt;
      if (s.crashT <= 0) respawn();
    } else if (s.state !== "intro") {
      physics(dt, gas, brake);
    }
    if (driving) events(dt);
    updateRV(dt);
    updateTraffic(dt);
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
      const ramp = rampAt(s.x);
      let a = G * Math.sin(th) * (ramp ? 0.2 : 1) - 0.3 * s.sp; // ramps don't eat your speed
      if (gas) a += ACCEL * (icy ? 0.95 : 1);
      if (brake) {
        if (s.sp > 25) a -= 950;
        else { s.sp = 0; a = 0; } // handbrake: hold on any hill
      }
      s.sp = clamp(s.sp + a * dt, -230, MAXV + (th > 0.1 ? 80 : 0));
      if (brake && s.sp < 25 && s.sp > -25) s.sp = 0;
      // too much gas on a steep climb lifts the nose... and eventually flips you
      const up = -th;
      if (gas && up > 0.3 && s.sp > -10 && !ramp) s.w += (up - 0.3) * 2.0 * dt;
      else s.w = Math.max(0, s.w - 3.5 * dt);
      if (s.w > 0.7 && s.t - (s.warnAt || -99) > 6) { s.warnAt = s.t; Engine.toast(L.easyGas, "bad"); }
      if (s.w > 1.25) return flip();

      const dx = Math.cos(th), dy = Math.sin(th);
      s.vx = s.sp * dx; s.vy = s.sp * dy;
      const nx = s.x + s.vx * dt;
      const fly = s.y + s.vy * dt + 0.5 * G * dt * dt;
      if (s.jumpBuf > 0 && s.state === "drive") { // JUMP
        s.jumpBuf = 0;
        s.air = true; s.w = 0; s.av = 0; s.ang = th;
        s.vx = Math.max(s.vx, 60); s.vy -= JUMP_V;
        s.y -= 1;
        Sfx.tone(300, 0.18, "square", 0.07, 0, 700);
        return;
      }
      const offLip = ramp && s.x < ramp[0] && nx >= ramp[0] && s.sp > 120;
      if (offLip || (s.sp > 140 && gy(nx) > fly + 1.5)) { // off a ramp, or the ground drops away: airborne
        s.air = true;
        s.ang = th - s.w; s.w = 0; s.av = 0;
        s.x = nx; s.y += s.vy * dt;
        if (offLip) { // leave at the ramp's real angle, plus a pop
          const la = lipAngle(ramp[0]);
          s.vx = s.sp * Math.cos(la); s.vy = s.sp * Math.sin(la) - POP;
          s.ang = la; s.x = ramp[0]; s.y = gy(ramp[0] - 2);
          Sfx.boost();
        }
      } else {
        s.x = nx; s.y = gy(nx);
        s.ang = Math.atan(slope(nx)) - s.w;
      }
    } else {
      s.vy += G_AIR * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      // The car steadies itself toward the slope it's about to land on, so normal jumps are
      // safe. A missed HOOK THE TOE mid-air (helpless spin) is what flips you.
      const target = Math.atan(slope(s.x + s.vx * 0.25)) - (gas ? 0.15 : 0);
      const diff = Math.atan2(Math.sin(target - s.ang), Math.cos(target - s.ang));
      if (s.spinT > 0) s.spinT -= dt;
      else s.av += (diff * 7 - s.av * 3) * dt;
      s.av = clamp(s.av, -7, 7);
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
    if (Math.abs(diff) > 0.55) s.sp *= 0.8; // sloppy landing costs a little speed
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
    s.traffic = s.traffic.filter((v) => v.x - v.len / 2 > s.x + 300);
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
      if (!ToePrompt.active) startToe(1.1);
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
      else if (s.air) { s.av = 10; s.spinT = 0.5; } // missed it mid-air: half a second of helpless spinning
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
      if (s.x > limit && s.air) { // tried to jump it
        s.x = limit; s.vx = Math.min(s.vx, RV.speed * 0.5);
        if (!r.noJumpSaid) { r.noJumpSaid = true; Engine.toast(L.rvNoJump, "bad"); }
      }
      if (s.x > limit && !s.air) {
        if (s.sp > RV.speed + 140) { Sfx.noise(0.15, 0.3); Engine.shake = 4; }
        s.x = limit; s.y = gy(s.x);
        s.sp = Math.min(s.sp, RV.speed * 0.9);
      }
    } else {
      r.pull = Math.min(1, r.pull + dt * 0.5);
    }
  }

  function updateTraffic(dt) {
    // spawn each vehicle a bit ahead of you as you get close
    while (s.nextTraffic < TRAFFIC.length && s.x > TRAFFIC[s.nextTraffic][0] - 700) {
      const [x, type] = TRAFFIC[s.nextTraffic++];
      if (x < s.x - 200) continue; // respawned past it already
      s.traffic.push({ type, x, wheel: 0, color: pick(VAN_COLORS), ...VEHICLE[type] });
    }
    for (const v of s.traffic) {
      v.x += v.speed * dt;
      v.wheel += v.speed * dt / 12;
      if (s.state !== "drive") continue;
      const front = v.x + v.len / 2, back = v.x - v.len / 2;
      if (s.x + 36 < back || s.x - 36 > front) continue;   // not overlapping
      const roof = by(v.x) - v.h;
      if (s.air && s.vy > 0 && s.y - 8 <= roof + 14) {      // landing on top of it: boing
        s.y = roof; s.vy = -330; s.av = 0;
        Sfx.tone(200, 0.2, "sine", 0.12, 0, 600);
        if (!v.bounced) { v.bounced = true; Engine.toast(L.roofBounce, "good"); }
        continue;
      }
      if (s.y <= roof + 6) continue;                        // clearing it
      // rear-ended it
      s.x = back - 38;
      if (s.air) { s.vx = Math.min(s.vx, v.speed * 0.5); }
      else { s.y = gy(s.x); s.sp = Math.min(s.sp, v.speed * 0.5); }
      if (s.invuln > 0) continue;
      s.invuln = 1.2;
      Sfx.crash(); Engine.shake = 8;
      s.carsTotalled++; Save.bump("carsTotalled");
      if (s.flowers > 0) { s.flowers--; s.floaters.push({ x: s.x, y: s.y - 90, text: "-1 🌼", t: 0 }); }
      s.floaters.push({ x: s.x, y: s.y - 120, text: "CARS TOTALLED: " + s.carsTotalled, t: 0 });
      Engine.toast(pick(L.rearEnd), "bad");
    }
    s.invuln = Math.max(0, (s.invuln || 0) - dt);
    s.traffic = s.traffic.filter((v) => v.x > s.x - 900);
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
      const oy = o.type === "charm" ? gy(o.x) - 70 : o.y !== undefined ? o.y : gy(o.x) - 22;
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
      const ty = by(tx) + 4;
      if (tx > SUMMIT - 300 && tx < SUMMIT + 300) continue;
      if (a < 0.75) Art.aspen(ctx, tx, ty, 70 + hash(i, 5) * 50, i);
      else Art.pine(ctx, tx, ty, 50 + hash(i, 6) * 40);
    }

    // the mountain itself: snow, dirt, road
    ctx.beginPath(); ctx.moveTo(x0, bottom);
    for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, by(x));
    ctx.lineTo(x1, bottom); ctx.closePath();
    ctx.fillStyle = "#f4f7fb"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x0, bottom);
    for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, by(x) + 34);
    ctx.lineTo(x1, bottom); ctx.closePath();
    ctx.fillStyle = "#7d6b5a"; ctx.fill();
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 8) (x === x0 ? ctx.moveTo : ctx.lineTo).call(ctx, x, by(x) + 6);
    ctx.strokeStyle = "#3d4452"; ctx.lineWidth = 12; ctx.stroke();
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 8) (x === x0 ? ctx.moveTo : ctx.lineTo).call(ctx, x, by(x) + 1);
    ctx.strokeStyle = "#e9ecef"; ctx.lineWidth = 2; ctx.stroke();
    for (const [kx, h] of KICKERS) if (kx > x0 - 50 && kx - RAMP_LEN - 120 < x1) drawRamp(ctx, kx, h);
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
    L.signs.forEach((txt, i) => { const x = SIGN_X[i]; if (x > x0 - 100 && x < x1 + 100) Art.postSign(ctx, x, by(x), txt); });
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
      const oy = o.y !== undefined ? o.y : gy(o.x) - 22;
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

    // slow traffic
    for (const v of s.traffic) {
      if (v.x < x0 - 150 || v.x > x1 + 150) continue;
      ctx.save(); ctx.translate(v.x, by(v.x)); ctx.rotate(Math.atan((by(v.x + 10) - by(v.x - 10)) / 20));
      if (v.type === "semi") Art.sideSemi(ctx, v.wheel); else Art.sideMinivan(ctx, v.wheel, v.color);
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

  // Wooden jump ramp with a warning sign before it
  function drawRamp(ctx, kx, h) {
    const start = kx - RAMP_LEN;
    ctx.beginPath();
    for (let x = start; x <= kx + 40; x += 5) ctx.lineTo(x, gy(x));
    for (let x = kx + 40; x >= start; x -= 5) ctx.lineTo(x, by(x) + 2);
    ctx.closePath();
    ctx.fillStyle = "#b07d48"; ctx.fill();
    ctx.strokeStyle = "#7a5230"; ctx.lineWidth = 2;
    for (let x = start + 40; x < kx; x += 32) { ctx.beginPath(); ctx.moveTo(x, gy(x)); ctx.lineTo(x, by(x)); ctx.stroke(); }
    ctx.beginPath();
    for (let x = start; x <= kx; x += 5) ctx.lineTo(x, gy(x));
    ctx.strokeStyle = "#ffd23f"; ctx.lineWidth = 4; ctx.stroke();
    // yellow warning diamond
    const sx = start - 70, sy = by(sx);
    ctx.fillStyle = "#555"; ctx.fillRect(sx - 1.5, sy - 46, 3, 46);
    ctx.save(); ctx.translate(sx, sy - 58); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "#ffd23f"; ctx.fillRect(-13, -13, 26, 26);
    ctx.strokeStyle = "#1b1f2e"; ctx.lineWidth = 2; ctx.strokeRect(-11, -11, 22, 22);
    ctx.restore();
    ctx.fillStyle = "#1b1f2e"; ctx.font = "800 18px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("↗", sx, sy - 58);
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
    if (s.invuln > 0 && Math.floor(s.t * 12) % 2) ctx.globalAlpha = 0.45;
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
      Engine.setControls("JUMP ⤴", "GAS ▶");
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
