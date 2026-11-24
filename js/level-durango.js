// LEVEL 5 — DURANGO (the finale)
// Mountain bike in real 3D (same engine as Wolf Creek). An open free-ride hillside with three
// glowing gifts (memories) and trick spots, then a downhill race against ΣΤΓ through checkpoint
// gates, a wingsuit off a huge cliff through rings, landing on Main Ave, racing through town to
// her house... and the birthday finale + the printable gift certificate.

const DurangoLevel = (() => {
  const L = LINES.durango;
  const FINISH = 47000;            // her house
  const HALF = 620;
  const G = 900, G_AIR = 520, DRAG = 0.0013;
  const FREE = [0, 12000];
  const RACE_START = 12500, RACE_FINISH = 42000;
  const GATES = Array.from({ length: 11 }, (_, i) => 13600 + i * 1600);
  const CLIFF_W = 30500, FLY_END = 37500, TOWN = 37500;
  const GIFTS = [2600, 7400, 10800];
  const SKIER_R = 16;

  let s;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const hash = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  const within = (z, [a, b]) => z > a && z < b;
  const smooth = (e0, e1, v) => { const u = clamp((v - e0) / (e1 - e0), 0, 1); return u * u * (3 - 2 * u); };

  // ---------- The trail ----------
  // A winding singletrack cut into a steep mountainside: big S-turns with banked berms, table-top
  // jumps on the straights, rollers, steep chutes and mellow stretches. Straightens out for the
  // wingsuit cliff and runs straight down Main Ave in town.
  const TW = 76;                    // trail width
  function cxRaw(z) {
    const A = 300 + 260 * Math.pow(Math.sin(z / 3100 + 0.6), 2);
    const ph = z / 430 + 0.8 * Math.sin(z / 2700);
    return A * Math.sin(ph) * smooth(0, 1400, z) + 140 * Math.sin(z / 1900);
  }
  function cx(z) {
    const t = smooth(CLIFF_W - 1600, CLIFF_W - 400, z);
    return cxRaw(z) * (1 - t) + cxRaw(CLIFF_W - 400) * t;   // straight run-in to the cliff, then straight through the valley and town
  }
  const dcx = (z) => (cx(z + 6) - cx(z - 6)) / 12;                 // trail slope (dx/dz)
  const trailDir = (z) => Math.atan(dcx(z));
  const curv = (z) => (cx(z + 24) - 2 * cx(z) + cx(z - 24)) / 576;  // dx²/dz²
  // perpendicular distance from the trail centerline (positive = +x side)
  const perp = (x, z) => (x - cx(z)) * Math.cos(trailDir(z));

  // pitch: steep chutes and mellow stretches
  function pitch(z) {
    if (z > TOWN) return 0.035;
    if (z > TOWN - 600) return 0.2 - 0.165 * smooth(TOWN - 600, TOWN, z);
    if (z > CLIFF_W - 400) return 0.2;
    return 0.2 + 0.1 * Math.sin(z / 1700 + 1) + 0.05 * Math.sin(z / 610);
  }
  const BASE = (() => {
    const a = new Float32Array(Math.ceil((FINISH + 6000) / 20) + 2);
    let h = 0;
    for (let i = 0; i < a.length; i++) { a[i] = h; h -= pitch(i * 20 - 1000) * 20; }
    return a;
  })();
  function base(z) {
    const f = (z + 1000) / 20, i = clamp(Math.floor(f), 0, BASE.length - 2), u = clamp(f - i, 0, 1);
    return BASE[i] + (BASE[i + 1] - BASE[i]) * u + (z < -1000 ? -0.2 * (z + 1000) : 0);
  }

  // table-top jumps on the straighter bits of trail (+ the dirt-jump line near the top)
  const TABLES = (() => {
    const out = [];
    for (const z of [3300, 3900, 4500]) out.push({ z, h: 55, up: 90, deck: 110, down: 150 });   // dirt jump line
    let last = 4600;
    for (let z = 5200; z < CLIFF_W - 1800; z += 40) {
      if (z - last < 1300 || Math.abs(curv(z)) > 0.0009 || Math.abs(curv(z + 300)) > 0.0012) continue;
      out.push({ z, h: 75, up: 115, deck: 170, down: 200 }); last = z;
    }
    return out;
  })();
  const sideSlope = (z) => 0.5 * Math.sin(z / 4300 + 1.2);   // which side of the mountain is uphill

  function ground(x, z) {
    const d = perp(x, z), ad = Math.abs(d);
    const town = smooth(TOWN - 300, TOWN + 200, z);
    const onTrail = smooth(TW / 2 + 30, TW / 2, ad);          // 1 on the trail bench
    // the mountainside: uphill on one side, dropping away on the other, with lumpy forest floor
    const dOut = Math.sign(d) * Math.max(0, ad - TW / 2 - 18);
    const side = sideSlope(z) * (1 - town);
    const lumps = (10 * Math.sin(x / 70 + z / 90) + 8 * Math.sin(x / 33 - z / 55) + 14 * Math.sin(x / 160 + z / 230)) * (1 - onTrail) * (1 - town) * Math.min(1, Math.abs(dOut) / 60);
    const hill = side * dOut + Math.min(1, Math.abs(dOut) / 300) * 40 * Math.sin(x / 260 + z / 400) * (1 - town) + lumps;
    // berms: the trail banks into every turn (steeper the tighter it turns)
    let berm = 0;
    if (z < CLIFF_W - 300) {
      const k = curv(z), bank = clamp(Math.abs(k) * 420 * 420 / G * 1.1, 0, 0.85);
      const outside = -Math.sign(k);                          // the outside of the turn is raised
      const dd = clamp(d * outside, -TW / 2, TW / 2 + 22);
      berm = bank * (dd + TW / 2) * smooth(TW / 2 + 50, TW / 2 + 22, ad + (d * outside > 0 ? 0 : 0));
      berm -= bank * TW / 2 * onTrail * 0;                     // (inside edge stays at trail level)
    }
    // table-tops
    let table = 0;
    for (const j of TABLES) {
      const dz = z - j.z;
      if (dz < -j.up || dz > j.deck + j.down) continue;
      const lat = smooth(TW / 2 + 26, TW / 2 - 4, ad);
      if (lat <= 0) continue;
      let h;
      if (dz < 0) h = j.h * Math.pow((dz + j.up) / j.up, 1.5);
      else if (dz < j.deck) h = j.h;
      else h = j.h * (1 - smooth(j.deck, j.deck + j.down, dz));
      table += h * lat;
    }
    // rollers along the trail
    const roll = 5 * Math.sin(z / 47) * onTrail * (1 - town) * (z < CLIFF_W - 400 ? 1 : 0);
    // the wingsuit cliff: a huge drop across everything
    const cliff = z > CLIFF_W - 20 ? -280 * smooth(CLIFF_W, CLIFF_W + 24, z) : 0;
    // valley below the cliff: gentle rolling
    const valley = z > CLIFF_W ? (1 - town) * (16 * Math.sin(x / 140 + z / 300) + 10 * Math.sin(z / 120 - x / 90)) : 0;
    return base(z) + hill + berm + table + roll + cliff + valley;
  }
  const gradX = (x, z) => (ground(x + 3, z) - ground(x - 3, z)) / 6;
  const gradZ = (x, z) => (ground(x, z + 3) - ground(x, z - 3)) / 6;

  // ground colors: forest floor + golden meadow, a red-dirt trail, Main Ave asphalt
  const C = { forest: [0.45, 0.5, 0.32], meadow: [0.74, 0.66, 0.44], trail: [0.62, 0.42, 0.28], berm: [0.55, 0.36, 0.24], road: [0.34, 0.35, 0.38], walk: [0.78, 0.76, 0.72], tmp: [0, 0, 0] };
  function paint(x, z) {
    const ad = Math.abs(x - cx(z));
    if (z > TOWN - 200) {
      if (ad < 72) return C.road;
      if (ad < 100) return C.walk;
    }
    const pd = Math.abs(perp(x, z));
    const tr = z < CLIFF_W ? smooth(TW / 2 + 26, TW / 2 + 4, pd) : 0;
    const g = clamp(0.5 + 0.6 * Math.sin(x / 300 + z / 500) * Math.sin(z / 900 - x / 400), 0, 1);
    for (let i = 0; i < 3; i++) C.tmp[i] = (C.forest[i] * (1 - g) + C.meadow[i] * g) * (1 - tr) + C.trail[i] * tr;
    return C.tmp;
  }

  // flight path for the wingsuit: from the cliff top down to Main Ave
  let flyY0 = 0, flyY1 = 0;
  function pathY(z) { const u = clamp((z - CLIFF_W) / (FLY_END - CLIFF_W), 0, 1); return flyY0 + (flyY1 - flyY0) * u + 50 * Math.sin(Math.PI * u); }

  // the forest: lots of pines (and some golden aspens) beside the trail, thinning far away
  function edgeScenery() {
    const e = [];
    for (let z = -300; z < TOWN - 300; z += 34) {
      const dir = trailDir(z), sec = 1 / Math.cos(dir);
      for (const side of [-1, 1]) for (let k = 0; k < 4; k++) {
        if (hash(z + k * 13, side + 3) > 0.55 - k * 0.08) continue;
        const off = (TW / 2 + 170 + k * 110 + hash(z, side * 7 + k) * 100) * sec;
        e.push({ type: "tree", z: z + hash(z, k) * 30, x: cx(z) + side * off, sz: 0.9 + hash(z, k + 9) * 0.8 });
      }
    }
    for (let z = CLIFF_W + 200; z < TOWN - 600; z += 60) for (const side of [-1, 1]) {   // the valley below the cliff
      if (hash(z, side + 40) < 0.5) e.push({ type: "tree", z, x: cx(z) + side * (200 + hash(z, side + 41) * 900), sz: 1 + hash(z, 3) * 0.6 });
    }
    return e;
  }

  // ---------- Setup ----------
  function reset() {
    s = {
      z: 0, x: 0, vx: 0, v: 0, boostT: 0, h: 0, air: false, lean: 0, camX: 0, t: 0,
      y: 0, vy: 0, heading: 0, airT: 0, comp: 0, tuck: 0, skid: 0, spinAcc: 0, spins: 0, lastSteer: 0,
      state: "intro", mode: "ride", flowers: 0, toes: 0, crashes: 0, rings: 0, gates: 0, gifts: 0, charm: false,
      objs: [], floaters: [], flags: {}, invuln: 0, white: 0, tumbleT: 0, fx: [], storm: 0, dusk: 0,
      zoom: 1, shrinkT: 0, smallPending: false, rivals: [], penaltyT: 0, chute: false, place: 0,
    };
    s.x = cx(0); s.camX = s.x; s.y = ground(s.x, 0);
    s.rivals = [
      { name: "CHAD", color: "#7b1e3a", lane: -22, gap: 70, on: false },
      { name: "BRAD", color: "#3a0ca3", lane: 22, gap: -40, on: false },
      { name: "TRENT", color: "#5f0f40", lane: 0, gap: 140, on: false },
    ];
    flyY0 = ground(cx(CLIFF_W), CLIFF_W - 4); flyY1 = ground(cx(FLY_END), FLY_END);
    Confetti.bits = [];
    populate();
    updateHud();
  }

  function populate() {
    const add = (o) => s.objs.push(o);
    const across = (z, k) => cx(z) + (hash(z, k) - 0.5) * (HALF * 2 - 80);
    const nearTrail = (o) => Math.abs(o.x - cx(o.z)) < 70;
    const sec = (z) => 1 / Math.cos(trailDir(z));
    add({ type: "sign", z: 300, x: cx(300) + 110, text: L.startSign, color: "#7b4a1f" });
    // trees right beside the trail (these you can hit if you leave it)
    for (let z = 600; z < CLIFF_W - 300; z += 46) for (const side of [-1, 1]) {
      if (hash(z, side + 50) > 0.62) continue;
      const off = (TW / 2 + 70 + hash(z, side + 51) * 120) * sec(z);
      add({ type: "tree", z, x: cx(z) + side * off, sz: 0.85 + hash(z, side + 52) * 0.6 });
    }
    // table-tops (+ flowers hanging over each gap)
    TABLES.forEach((j, i) => {
      add({ type: "kicker", z: j.z, x: cx(j.z), w: TW * sec(j.z) + 10 });
      for (let k = 0; k < 3; k++) { const zz = j.z + 150 + k * 170; add({ type: "flower", z: zz, x: cx(zz), h: [150, 220, 170][k], hue: (i + k) % 3 }); }
    });
    add({ type: "sign", z: TABLES[0].z - 400, x: cx(TABLES[0].z - 400) + 100 * sec(TABLES[0].z - 400), text: L.jumpSign, color: "#a47148" });
    // flowers along the trail, sitting in the line
    for (let z = 900; z < CLIFF_W - 400; z += 380 + Math.floor(hash(z, 11) * 200)) {
      for (let i = 0; i < 3; i++) { const zz = z + i * 50; add({ type: "flower", z: zz, x: cx(zz) + (hash(z, 12) - 0.5) * 30, h: 0, hue: (Math.floor(z / 10) + i) % 3 }); }
    }
    // the gifts (memories) glowing out on the hill
    GIFTS.forEach((z, n) => add({ type: "gift", z, x: cx(z), n }));
    // the race
    add({ type: "gate", z: RACE_START, x: cx(RACE_START), w: TW * sec(RACE_START) + 60, label: L.raceStartGate, color: "#e63946" });
    GATES.forEach((z, i) => add({ type: "gate", z, x: cx(z), w: TW * sec(z) + 50, label: "CHECKPOINT " + (i + 1), color: "#ff6b00", n: i }));
    add({ type: "sign", z: CLIFF_W - 600, x: cx(CLIFF_W - 600) + 110, text: L.cliffSign, color: "#e63946" });
    // wingsuit rings down the valley
    for (let z = CLIFF_W + 700, i = 0; z < FLY_END - 500; z += 600, i++) add({ type: "ring", z, x: cx(z) + 160 * Math.sin(i * 1.3), y: pathY(z), n: i });
    // town: Main Ave
    add({ type: "gate", z: TOWN + 300, x: cx(TOWN), w: 260, label: L.welcomeGate, color: "#2a9d8f" });
    add({ type: "gate", z: RACE_FINISH, x: cx(RACE_FINISH), w: 260, label: L.finishGate, color: "#e63946" });
    const shops = L.shops;
    let n = 0;
    for (let z = TOWN + 700; z < FINISH - 500; z += 190) for (const side of [-1, 1]) {
      const colors = ["#b5523b", "#d4a373", "#6d597a", "#3d5a80", "#a44a3f", "#588157"];
      add({ type: "building", z, x: cx(z) + side * 155, side, w: 150, h: 90 + hash(z, side) * 50, color: colors[n % colors.length], awning: ["#e63946", "#2a9d8f", "#f4a261"][n % 3], text: shops[n % shops.length] });
      n++;
    }
    add({ type: "charm", z: RACE_FINISH + 150, x: cx(RACE_FINISH), h: 0 });
    // fans on the sidewalks with signs
    L.fanSigns.forEach((text, i) => {
      const z = RACE_FINISH - 1800 + i * 260, side = i % 2 ? 1 : -1;
      add({ type: "fan", z, x: cx(z) + side * (86 + (i % 3) * 6), text, color: ["#e63946", "#2a9d8f", "#9b5de5", "#f4a261"][i % 4] });
    });
    add({ type: "house", z: FINISH + 140, x: cx(FINISH) });
    s.objs.sort((a, b) => a.z - b.z);
  }

  // ---------- Update ----------
  function update(dt) {
    s.t += dt;
    Confetti.update(dt, Engine.H);
    ToePrompt.update(dt);
    for (const f of s.floaters) { f.t += dt; f.y -= 30 * dt; }
    s.floaters = s.floaters.filter((f) => f.t < 1.8);
    Engine.shake = Math.max(0, Engine.shake - dt * 30);
    s.invuln = Math.max(0, s.invuln - dt);
    s.white = Math.max(0, s.white - dt * 0.8);
    s.penaltyT = Math.max(0, s.penaltyT - dt);
    s.shrinkT = Math.max(0, s.shrinkT - dt);
    s.zoom += ((s.shrinkT > 0 ? 0.5 : 1) - s.zoom) * Math.min(1, dt * (s.shrinkT > 0 ? 6 : 3));
    if (s.smallPending && s.zoom < 0.62) { s.smallPending = false; Engine.toast(pick(LINES.gotSmall), "water"); }
    Engine.presses.left = Engine.presses.right = Engine.presses.up = 0;
    const prevZ = s.z;
    if (s.mode === "fly" && s.state === "ride") fly(dt);
    else if (s.state === "ride" || s.state === "tumble" || s.state === "arrive") physics(dt);
    s.camX += (s.x - s.camX) * Math.min(1, dt * 4);
    if (s.state === "tumble") { s.tumbleT -= dt; if (s.tumbleT <= 0) { s.state = "ride"; s.invuln = 1.2; } }
    if (s.state === "ride") { events(dt); collide(prevZ); }
    updateGifts(dt);
    updateRivals(dt);
    if (s.z > TOWN) s.dusk = Math.min(0.6, s.dusk + dt * 0.05);
    updateHud();
  }

  // ---------- Bike physics (same model as the skis: gravity, grip, real airs) ----------
  function minSpeed(z) { return z > TOWN ? 360 : 380 + 120 * clamp(z / CLIFF_W, 0, 1); }

  // ---------- Bike physics ----------
  // Gravity along the real slope, air drag + rolling resistance, pedaling on the flats, and
  // tire grip that limits how hard you can turn (berms add grip). The bike naturally follows
  // the trail when you're not steering; steering picks your line.
  function physics(dt) {
    const steer = s.state === "ride" ? Engine.steer() : 0;
    const prevHeading = s.heading;
    let u = s.vx * Math.sin(s.heading) + s.v * Math.cos(s.heading);
    const d = perp(s.x, s.z), onTrail = Math.abs(d) < TW / 2 + 10;
    if (s.air && s.z < CLIFF_W - 200) {
      // air control: big jumps bend toward where the trail goes, so you land on it
      const sp = Math.hypot(s.vx, s.v), dir = Math.atan2(s.vx, s.v);
      const target = trailDir(s.z + 150) + clamp(-perp(s.x, s.z) / 120, -0.7, 0.7);
      const nd = dir + clamp(target - dir, -2.4 * dt, 2.4 * dt);
      s.vx = sp * Math.sin(nd); s.v = sp * Math.cos(nd);
      s.heading += nd - dir;
    }
    if (s.air) {
      // in the air left/right spins (slowly at first so bumps don't spin you out)
      const rate = s.airT < 0.28 ? 2.5 : 10;
      if (steer) { s.heading += steer * rate * dt; s.spinAcc += steer * rate * dt; }
      else if (s.airT > 0.28) {
        const dir = Math.atan2(s.vx, s.v), k = Math.round((s.heading - dir) / (Math.PI * 2));
        const step = clamp(dir + k * Math.PI * 2 - s.heading, -8 * dt, 8 * dt);
        s.heading += step; s.spinAcc += step;
      }
    } else {
      // how hard can she turn? grip (more on a berm, less off the trail) / speed
      const bank = Math.abs(gradX(s.x, s.z) * Math.cos(s.heading) - gradZ(s.x, s.z) * Math.sin(s.heading));
      const grip = (onTrail ? 1.0 : 0.6) * G + G * Math.min(0.8, bank);
      const maxRate = clamp(grip / Math.max(80, u), 0.8, 3.2);
      // follow the trail on your own: aim along it, and drift back toward the middle
      const along = trailDir(s.z + Math.max(60, u * 0.35));
      const back = clamp(-d / 260, -0.5, 0.5);
      const auto = (along + back) - s.heading;
      // steering adds to the trail-following (so holding into a turn tightens it, never fights it)
      const want = clamp(auto * 2.2 * (steer ? 0.4 : 1) + steer * maxRate, -maxRate, maxRate);
      s.turnRate = (s.turnRate || 0) + (want - (s.turnRate || 0)) * Math.min(1, dt * 10);
      s.heading += s.turnRate * dt;
      s.heading = clamp(s.heading, -1.4, 1.4);
    }
    const sn = Math.sin(s.heading), cs = Math.cos(s.heading);
    u = s.vx * sn + s.v * cs;
    let w = s.vx * cs - s.v * sn;
    if (!s.air || s.h < 8) {
      const ax = -G * gradX(s.x, s.z), az = -G * gradZ(s.x, s.z);
      const ah = ax * sn + az * cs;
      const roll = onTrail ? 18 : 160;                          // rolling resistance (dirt vs forest floor)
      u += (ah - 0.0011 * u * Math.abs(u) - roll * Math.sign(u)) * dt;
      if (s.boostT > 0) u += 260 * dt;
      // always fast, and only ever faster: a floor that rises down the mountain
      if (s.state !== "arrive") u = clamp(u, minSpeed(s.z), minSpeed(s.z) + 200);
      w += (ax * cs - az * sn) * 0.6 * dt;                      // a berm's slope pushes her into the turn
      w *= Math.exp(-(onTrail ? 10 : 6) * dt);                  // tires grip
      if (s.state === "tumble") { u *= 1 - 1.2 * dt; w *= 1 - 3 * dt; }
      if (s.state === "arrive") { u *= 1 - 2.2 * dt; w *= 1 - 4 * dt; if (s.z > FINISH - 60) u = Math.min(u, 8); }
      s.vx = u * sn + w * cs; s.v = u * cs - w * sn;
    }
    if (s.boostT > 0) s.boostT -= dt;
    s.v = Math.max(s.v, s.state === "arrive" ? 0 : 25);
    s.x += s.vx * dt; s.z += s.v * dt;
    // can't wander off into the mountain forever
    const d2 = perp(s.x, s.z), wall = s.z > TOWN ? 100 : 260;
    if (Math.abs(d2) > wall) { s.x = cx(s.z) + Math.sign(d2) * wall / Math.cos(trailDir(s.z)); s.vx *= 0.3; }
    const gNew = ground(s.x, s.z);
    if (!s.air) {
      const gv = (gNew - s.y) / dt;
      if (s.state === "ride" && gv < s.vy - G * dt * 1.6 - 30) {
        s.air = true; s.airT = 0; s.bigAir = false; s.spinAcc = 0;
        if (TABLES.some((j) => s.z > j.z - 30 && s.z < j.z + 60) && onTrail) { s.vy += 120; Sfx.tone(260, 0.4, "triangle", 0.09, 0, 900); }
        s.vy -= G_AIR * dt; s.y += s.vy * dt;
      } else { s.vy = gv; s.y = gNew; }
    } else {
      s.airT += dt;
      s.vy -= G_AIR * dt; s.y += s.vy * dt;
      if (s.airT > 0.7) s.bigAir = true;
      if (s.y <= gNew) { const vyi = s.vy; s.y = gNew; s.air = false; s.vy = 0; land(vyi); }
    }
    s.h = Math.max(0, s.y - gNew);
    // a bike leans into the turn: tan(lean) = v·ω / g
    const omega = (s.heading - prevHeading) / Math.max(dt, 1e-3);
    const leanT = s.air ? 0 : clamp(Math.atan(u * omega / G), -0.9, 0.9);
    s.lean += (leanT - s.lean) * Math.min(1, dt * 8);
    s.comp = Math.max(0, s.comp - dt * 2.5);
    if (s.state === "ride" && s.z > CLIFF_W - 4 && s.mode === "ride" && s.z < FLY_END) startFly();
  }

  function land(vyi) {
    if (vyi < 0) {
      const d = Math.atan2(s.vx, s.v), gA = gradX(s.x, s.z) * Math.sin(d) + gradZ(s.x, s.z) * Math.cos(d);
      const gain = Math.min(120, -vyi * Math.max(0, -gA) * 0.6), sp = Math.hypot(s.vx, s.v) || 1;
      s.vx += s.vx / sp * gain; s.v += s.v / sp * gain;
    }
    if (s.airT < 0.12) return;
    Sfx.noise(0.18, 0.2, true);
    s.comp = Math.min(1, 0.3 + s.airT);
    s.fx.push({ n: s.bigAir ? 40 : 18, spread: 120, up: 90 });
    const dir = Math.atan2(s.vx, s.v);
    let diff = s.heading - dir; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    s.heading = dir + diff;
    if (s.airT > 0.45 && Math.abs(diff) > 1.6) { s.heading = dir; crash(); Engine.toast(L.sideways, "bad"); return; }
    const spins = Math.floor((Math.abs(s.spinAcc) + 0.7) / (Math.PI * 2));
    if (spins > 0) {
      s.spins += spins; s.flowers += 2 * spins;
      Engine.toast(L.spinLanded[Math.min(spins, L.spinLanded.length) - 1], "good");
      Sfx.fanfare(); Confetti.burst(30 * spins, Engine.W);
      const sc = skScr(); s.floaters.push({ x: sc.x, y: sc.y - 60, text: "+" + 2 * spins + " 🌼", t: 0, good: true });
      return;
    }
    const rock = s.objs.find((o) => o.type === "rock" && !o.got && Math.abs(o.z - s.z) < 40 && Math.abs(o.x - s.x) < o.r + SKIER_R);
    if (rock) { rock.got = true; crash(); return; }
    if (s.bigAir) Engine.toast(pick(L.landed), "good");
  }

  // ---------- Wingsuit ----------
  function startFly() {
    s.mode = "fly"; s.air = true; s.airT = 0; s.chute = false; s.heading = 0;
    s.y = pathY(s.z);
    Engine.toast(L.wingsuit, "good");
    Sfx.tone(200, 0.8, "sawtooth", 0.05, 0, 900);
    for (const r of s.rivals) if (!r.crash) { r.mode = "fly"; }
  }

  function fly(dt) {
    const steer = Engine.steer();
    if (steer) s.heading += steer * 1.8 * dt; else s.heading -= s.heading * Math.min(1, 1.5 * dt);
    s.heading = clamp(s.heading, -0.75, 0.75);
    s.lean += (s.heading * 1.1 - s.lean) * Math.min(1, dt * 5);   // bank hard into the turn
    const sp = 540;
    s.vx = sp * Math.sin(s.heading); s.v = sp * Math.cos(s.heading);
    s.x += s.vx * dt; s.z += s.v * dt;
    s.x = clamp(s.x, cx(s.z) - 420, cx(s.z) + 420);
    s.y = pathY(s.z);
    s.h = s.y - ground(s.x, s.z);
    const u = (s.z - CLIFF_W) / (FLY_END - CLIFF_W);
    if (u > 0.84 && !s.chute) { s.chute = true; Engine.toast(L.chute, "good"); Sfx.noise(0.3, 0.2, true); }
    // rings
    for (const o of s.objs) {
      if (o.type !== "ring" || o.got || Math.abs(o.z - s.z) > 22) continue;
      if (Math.abs(o.x - s.x) < 52) { o.got = true; s.rings++; s.flowers++; Sfx.flower(); Sfx.blip(); const sc = skScr(); s.floaters.push({ x: sc.x, y: sc.y - 70, text: "+1 🌼", t: 0, good: true }); }
    }
    if (s.z >= FLY_END) {
      s.mode = "ride"; s.chute = false; s.air = false; s.y = ground(s.x, s.z); s.vy = 0; s.heading = 0;
      s.comp = 1; s.fx.push({ n: 40, spread: 140, up: 90 });
      Engine.toast(L.landTown, "good");
      for (const r of s.rivals) r.mode = "ride";
    }
  }

  // ---------- Events ----------
  function events(dt) {
    const z = s.z;
    const once = (k, cond, fn) => { if (!s.flags[k] && cond) { s.flags[k] = true; fn(); } };
    once("free", z > 400, () => Engine.toast(L.freeRide, "good"));
    once("berms", z > 1500, () => Engine.toast(L.berms, "good"));
    once("jumps", z > TABLES[0].z - 500, () => Engine.toast(L.jumpLine));
    once("raceSoon", z > RACE_START - 900, () => { Engine.toast(L.raceSoon, "bad"); for (const r of s.rivals) { r.on = true; r.z = s.z - 300 + r.gap; r.x = cx(r.z) + r.lane; r.v = s.v; } });
    once("go", z > RACE_START, () => { Engine.toast(L.raceGo, "bad"); Sfx.fanfare(); s.racing = true; });
    once("cliff", z > CLIFF_W - 900, () => Engine.toast(L.cliffWarn, "bad"));
    once("chadCrash", z > RACE_FINISH - 1600, () => {
      const c = s.rivals[0]; if (!c.crash) { c.crash = true; c.crashT = 0; Engine.toast(L.chadCrash, "good"); Engine.toast(pick(LINES.doesntLastLong)); }
    });
    once("finishLine", z > RACE_FINISH, raceDone);
    once("almostHome", z > FINISH - 1800, () => Engine.toast(L.almostHome, "good"));
    // checkpoint gates
    for (const o of s.objs) {
      if (o.type !== "gate" || o.n == null || o.passed || z < o.z) continue;
      o.passed = true;
      if (Math.abs(s.x - o.x) < o.w / 2 + 10) { s.gates++; Sfx.blip(); const sc = skScr(); s.floaters.push({ x: sc.x, y: sc.y - 70, text: "✓ " + (o.n + 1), t: 0, good: true }); }
      else { Engine.toast(L.missedGate, "bad"); s.penaltyT = 4; }
    }
    if (z >= FINISH - 400) finish();
  }

  function raceDone() {
    s.racing = false;
    s.place = place();
    Engine.toast(s.place === 1 ? L.raceWin : L.raceLose, s.place === 1 ? "good" : "bad");
    Sfx.fanfare(); Confetti.burst(120, Engine.W);
  }
  function place() { return 1 + s.rivals.filter((r) => r.on && !r.crash && r.z > s.z).length; }

  // ---------- Rivals (ΣΤΓ) ----------
  function updateRivals(dt) {
    const prog = clamp((s.z - RACE_START) / (RACE_FINISH - RACE_START), 0, 1);
    s.rivals.forEach((r, i) => {
      if (!r.on) return;
      r.t = (r.t || 0) + dt;
      if (r.crash) { r.crashT += dt; r.v = Math.max(0, (r.v || 0) - 500 * dt); r.z += r.v * dt; r.lean = 0; return; }
      // they race close; she pulls ahead in town (and loses ground if she misses a gate)
      let gap = r.gap + 90 * Math.sin(r.t * 0.35 + i * 2) - 260 * Math.pow(prog, 2) + (s.penaltyT > 0 ? 160 : 0);
      if (!s.racing && s.z > RACE_FINISH) gap = -400 - i * 80;
      const want = s.z + gap;
      r.v = clamp((s.v || 300) + clamp((want - r.z) * 1.1, -170, 220), 120, 760);
      r.z += r.v * dt;
      if (r.mode === "fly") {
        r.y = pathY(r.z) + 40 + i * 35 + 20 * Math.sin(r.t + i);   // fly a little above her, spread out
        r.x += (cx(r.z) + r.lane * 1.8 + 60 * Math.sin(r.t * 0.7 + i) - r.x) * Math.min(1, dt * 1.5);
      } else {
        const tx = cx(r.z) + (r.z > TOWN ? r.lane * 2 : r.lane) + 12 * Math.sin(r.t * 0.9 + i);
        const nx = r.x + (tx - r.x) * Math.min(1, dt * 4);
        const nh = clamp(Math.atan2(nx - r.x, Math.max(1, r.v * dt)), -1.3, 1.3);
        r.lean = clamp(Math.atan(r.v * (nh - (r.heading || 0)) / Math.max(dt, 1e-3) / G), -0.8, 0.8) * 0.5 + (r.lean || 0) * 0.5;
        r.heading = nh; r.x = nx;
      }
      // they hit the jumps too
      if (r.mode !== "fly" && !r.jump) { const j = TABLES.find((q) => r.z > q.z && r.z - r.v * dt <= q.z); if (j) r.jump = { t: 0, T: 2.0, H: 240 }; }
      if (r.jump) { r.jump.t += dt; const q = r.jump.t / r.jump.T; r.h = r.jump.H * 4 * q * (1 - q); if (q >= 1) { r.jump = null; r.h = 0; } }
      // don't ride through her
      if (Math.abs(r.z - s.z) < 40 && Math.abs(r.x - s.x) < 44) r.x += Math.sign(r.x - s.x || 1) * 120 * dt;
    });
  }

  // ---------- Collisions ----------
  function collide(prevZ) {
    const z0 = prevZ - 14, z1 = s.z + 14;
    for (const o of s.objs) {
      if (o.got || o.z < z0 - 200 || o.z > z1 + 200) continue;
      const hitZ = o.z >= z0 && o.z <= z1;
      const dx = Math.abs(o.x - s.x);
      if (o.type === "tree" && hitZ && dx < 22 * o.sz + SKIER_R && s.h < 70) { o.got = true; hitTree(); }
      else if (o.type === "rock" && hitZ && dx < o.r + SKIER_R - 4 && s.h < o.r) { o.got = true; crash(); }
      else if (o.type === "flower" && Math.abs(o.z - s.z) < 26 && dx < (o.h ? 46 : 34) && (o.h ? s.air && s.h > 30 : s.h < 45)) { o.got = true; s.flowers++; Sfx.flower(); }
      else if (o.type === "charm" && Math.abs(o.z - s.z) < 50 && dx < 70) { o.got = true; s.charm = true; Sfx.fanfare(); Confetti.burst(80, Engine.W); Engine.toast(L.gotCharm, "good"); }
      else if (o.type === "gift" && Math.abs(o.z - s.z) < 50 && dx < 70) { o.got = true; s.gifts++; Sfx.fanfare(); showMemory(o.n); }
    }
  }

  function loseFlower() {
    if (s.flowers > 0) { s.flowers--; const sc = skScr(); s.floaters.push({ x: sc.x, y: sc.y - 50, text: "-1 🌼", t: 0 }); }
  }
  function hitTree() {
    if (s.invuln > 0) return;
    s.invuln = 1; s.crashes++;
    s.v *= 0.7; s.vx *= -0.4; s.white = 0.5;
    s.fx.push({ n: 40, spread: 140, up: 120 });
    Sfx.crash(); Engine.shake = 6; loseFlower();
    Engine.toast(pick(L.treeHit), "bad");
  }
  function crash() {
    if (s.invuln > 0 || s.state !== "ride") return;
    s.state = "tumble"; s.tumbleT = 1.0; s.crashes++;
    s.air = false; s.h = 0; s.y = ground(s.x, s.z); s.vy = 0; s.heading *= 0.3;
    Sfx.crash(); Engine.shake = 7; loseFlower();
    s.fx.push({ n: 45, spread: 160, up: 120 });
    Engine.toast(pick(L.crash), "bad");
  }

  // ---------- Gifts (memories): drift to her, can't be missed ----------
  function updateGifts(dt) {
    if (s.state === "intro" || s.state === "done") return;
    for (const o of s.objs) {
      if ((o.type !== "gift" && o.type !== "charm") || o.got) continue;
      const ahead = o.z - s.z;
      if (ahead > -10 && ahead < 450) o.x += (s.x - o.x) * Math.min(1, dt * (ahead < 200 ? 8 : 3));
      if (ahead < -80) { o.z = s.z + 900; o.x = clamp(s.x, cx(o.z) - 300, cx(o.z) + 300); if (o.type === "gift") Engine.toast(L.giftMissed); s.objs.sort((a, b) => a.z - b.z); }
    }
  }

  function showMemory(n) {
    const key = "durango.gifts." + n;
    const photo = typeof PHOTOS !== "undefined" && PHOTOS[key];
    $("memoryLabel").textContent = "🎁 " + L.giftFound;
    $("memoryText").textContent = L.gifts[n] || "";
    const img = $("memoryImg");
    img.hidden = !photo;
    if (photo) img.src = photo;
    $("memoryBtn").textContent = L.keepRiding + " 🚲";
    $("memory").classList.add("show");
    Engine.paused = true;
    Voice.play(L.gifts[n], "interrupt");
    const close = (e) => {
      if (e) e.preventDefault();
      $("memory").classList.remove("show");
      Engine.paused = false;
      Engine.input.left = Engine.input.right = false;
      $("memoryBtn").removeEventListener("click", close);
      s.closeMemory = null;
    };
    $("memoryBtn").addEventListener("click", close);
    s.closeMemory = close;
  }

  // ---------- The finale ----------
  async function finish() {
    const me = s;
    s.state = "arrive";
    ToePrompt.cancel();
    await wait(2600);
    if (me.dead) return;
    s.state = "done";
    Sfx.fanfare();
    Confetti.burst(220, Engine.W);
    await wait(1200);
    if (me.dead) return;
    Confetti.burst(220, Engine.W);
    await Engine.say(L.finale);
    if (me.dead) return;
    Save.finish("durango", { flowers: s.flowers, toes: s.toes, charm: true });
    if ((s.place || place()) === 1) Save.bump("raceWins");
    Game.showFinale({
      flowers: s.flowers, toes: s.toes, place: s.place || place(),
      extra: [
        { icon: "🏁", value: ordinal(s.place || place()), label: "vs ΣΤΓ" },
        { icon: "🎁", value: s.gifts + "/" + GIFTS.length, label: "gifts found" },
        { icon: "🪂", value: s.rings, label: "rings" },
        { icon: "🌀", value: s.spins, label: "spins landed" },
        { icon: "💥", value: s.crashes, label: "crashes" },
      ],
    });
  }
  const ordinal = (n) => n + (["th", "st", "nd", "rd"][n] || "th");

  // ---------- Drawing (3D world + a 2D overlay) ----------
  let use3D = false;
  function skScr() {
    if (use3D) return Ski3D.skierScreen(s, Engine.W, Engine.H);
    return { x: Engine.W / 2, y: Engine.H * 0.6 };
  }

  function draw(ctx) {
    const W = Engine.W, H = Engine.H;
    if (use3D) {
      try { Ski3D.render(s, W, H, Engine.scale, Engine.dpr); }
      catch (e) { console.error(e); use3D = false; Ski3D.show(false); }
      ctx.clearRect(0, 0, W, H);
    } else {
      ctx.fillStyle = "#f3d9b1"; ctx.fillRect(0, 0, W, H);
    }
    if (s.white > 0) { ctx.fillStyle = `rgba(210,170,120,${Math.min(0.8, s.white)})`; ctx.fillRect(0, 0, W, H); }
    for (const f of s.floaters) {
      ctx.globalAlpha = 1 - f.t / 1.8; ctx.font = "800 18px 'Baloo 2', sans-serif"; ctx.textAlign = "center";
      ctx.fillStyle = f.good ? "#2a9d8f" : "#e63946"; ctx.fillText(f.text, f.x, f.y); ctx.globalAlpha = 1;
    }
    // race HUD
    if (s.racing || (s.z > RACE_START && s.z < RACE_FINISH + 400)) {
      const pl = s.racing ? place() : s.place;
      ctx.font = "800 17px 'Baloo 2', sans-serif"; ctx.textAlign = "center";
      const txt = `🏁 ${ordinal(pl || 1)} of 4   ·   ✓ ${s.gates}/${GATES.length}`;
      const w = ctx.measureText(txt).width + 24;
      ctx.fillStyle = "rgba(27,31,46,.72)"; Art.rr(ctx, W / 2 - w / 2, 92, w, 30, 15); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.fillText(txt, W / 2, 113);
    }
    if (s.mode === "fly" && !s.chute) {   // wind rushing past
      ctx.save(); ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.lineCap = "round";
      for (let i = 0; i < 22; i++) {
        const a = i * 2.39996, q = (s.t * 1.6 + i * 0.137) % 1, r0 = 60 + q * 520, len = 30 + q * 90;
        const cxp = W / 2, cyp = H * 0.45, ca = Math.cos(a), sa = Math.sin(a);
        ctx.globalAlpha = q * (1 - q) * 3; ctx.lineWidth = 1 + q * 2.5;
        ctx.beginPath(); ctx.moveTo(cxp + ca * r0, cyp + sa * r0 * 1.4); ctx.lineTo(cxp + ca * (r0 + len), cyp + sa * (r0 + len) * 1.4); ctx.stroke();
      }
      ctx.restore();
    }
    if (s.mode === "fly") {
      ctx.font = "800 15px 'Baloo 2', sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#1b1f2e";
      ctx.fillText(`🪂 rings ${s.rings}`, W / 2, 140);
    }
    Confetti.draw(ctx);
  }

  function updateHud() {
    $("hudFlowers").textContent = s.flowers;
    $("hudToes").textContent = s.toes;
    const p = clamp(s.z / FINISH, 0, 1);
    $("progressFill").style.width = p * 100 + "%";
    $("progressPeng").style.left = `calc(${p * 100}% - 10px)`;
  }

  return {
    id: "durango",
    async start() {
      reset();
      const me = s;
      Engine.setControls("◀ LEAN", "LEAN ▶");
      use3D = false;
      try {
        if (typeof THREE !== "undefined" && Ski3D.init($("stage"))) {
          Ski3D.build({ s, ground, cx, HALF, onIce: () => false, pitch, chutes: () => [], edge: edgeScenery(), paint, theme: { desert: true }, rider: "bike" });
          Ski3D.show(true); use3D = true;
        }
      } catch (e) { console.error(e); use3D = false; Ski3D.show(false); }
      await Engine.say(L.intro);
      if (me.dead) return;
      if (!use3D) {   // no 3D on this device: never lock her out of the finale
        await Engine.say(L.no3d);
        if (me.dead) return;
        s.z = FINISH - 401; s.state = "ride"; finish();
        return;
      }
      Engine.toast(L.clipIn);
      await new Promise((r) => ToePrompt.start((ok) => { if (ok) me.toes++; r(); }, 3.2));
      if (me.dead) return;
      Engine.presses.left = Engine.presses.right = 0;
      s.state = "ride";
    },
    update, draw,
    _debug: () => s,
    _cx: (z) => cx(z),
    _ground: (x, z) => ground(x, z),
    _3d: () => use3D,
    stop() { Ski3D.show(false); if (s.closeMemory) s.closeMemory(); ToePrompt.cancel(); s.state = "done"; s.dead = true; Engine.closeDialog(); Engine.hideBanner(); Confetti.bits = []; },
  };
})();
