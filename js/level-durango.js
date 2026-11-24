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
  const ROCK_GARDEN = [17000, 19000];
  const BERMS = [21000, 23400];
  const CREEK = 25200;
  const CLIFF_W = 30500, FLY_END = 37500, TOWN = 37500;
  const DROP = 6000;               // the wooden drop in the free-ride zone
  const GIFTS = [[3200, -320], [7000, 330], [10600, -260]];
  const SKIER_R = 16;

  let s;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const hash = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  const within = (z, [a, b]) => z > a && z < b;
  const smooth = (e0, e1, v) => { const u = clamp((v - e0) / (e1 - e0), 0, 1); return u * u * (3 - 2 * u); };

  // the trail winds down the hill, then runs straight down Main Ave
  function cxRaw(z) { return 150 * Math.sin(z / 2100) + 60 * Math.sin(z / 730 + 2); }
  function cx(z) { const t = smooth(TOWN - 1500, TOWN, z); return cxRaw(z) * (1 - t) + cxRaw(TOWN) * t; }

  const KICKERS = [
    [4200, 0, 120, 40, 90], [4550, 0, 120, 40, 90], [4900, 0, 120, 40, 90], [5250, 0, 120, 40, 90], // dirt jump line
    [8500, 150, 170, 62, 115], [9600, -200, 170, 62, 115],
    [15200, 0, 170, 55, 110], [20000, 0, 170, 55, 110], [27400, 0, 170, 55, 110],
  ].map(([z, dx, w, h, len]) => ({ z, x: cx(z) + dx, w, h, len }));

  function pitch(z) {
    if (z > TOWN) return 0.035;
    if (z > TOWN - 600) return 0.2 - 0.165 * smooth(TOWN - 600, TOWN, z);
    return 0.2;
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
  const bermX = (z) => cx(z) + 170 * Math.sin((z - BERMS[0]) / 500);

  function ground(x, z) {
    const out = Math.max(0, Math.abs(x - cx(z)) - (HALF - 40));
    const town = smooth(TOWN - 300, TOWN + 200, z);
    const roll = (12 * Math.sin(x / 130 + z / 460) + 7 * Math.sin(x / 57 - z / 230) + 5 * Math.sin(z / 170 + x / 300)) * (1 - town);
    const rv = 1 - Math.abs(Math.sin(x / 210 + 0.6 * Math.sin(z / 700)));
    const ridge = 16 * rv * rv * (1 - town);
    // flat road in town
    const road = town * smooth(150, 90, Math.abs(x - cx(z)));
    let berm = 0, bf = 0;
    if (z > BERMS[0] && z < BERMS[1]) {
      bf = smooth(BERMS[0], BERMS[0] + 400, z) * smooth(BERMS[1], BERMS[1] - 400, z);
      const d = Math.min(Math.abs(x - bermX(z)), 240);
      berm = bf * d * d * 0.0022;
    }
    let kick = 0;
    for (const k of KICKERS) {
      const dz = z - k.z;
      if (dz < -k.len || dz > 70) continue;
      const lat = smooth(k.w / 2 + 55, k.w / 2 - 10, Math.abs(x - k.x));
      if (lat <= 0) continue;
      kick += lat * (dz <= 0 ? k.h * Math.pow((dz + k.len) / k.len, 1.6) : k.h * (1 - smooth(0, 70, dz)));
    }
    // the wooden drop: a sharp step on the trail, a gentle roll-down everywhere else
    let drop = 0;
    if (z > DROP - 20) { const d = Math.abs(x - cx(DROP)); const w = 12 + smooth(80, 160, d) * 300; drop = -70 * smooth(DROP, DROP + w, z); }
    // the wingsuit cliff: a huge drop across everything
    let cliff = 0;
    if (z > CLIFF_W - 20) cliff = -280 * smooth(CLIFF_W, CLIFF_W + 24, z);
    let creek = 0;
    if (Math.abs(z - CREEK) < 160) {
      const br = smooth(75, 50, Math.abs(x - cx(CREEK)));
      creek = -26 * Math.exp(-Math.pow((z - CREEK) / 24, 2)) * (1 - br);
      const dz = z - (CREEK - 55);
      if (dz > -70 && dz < 12) creek += (1 - br) * (dz <= 0 ? 22 * Math.pow((dz + 70) / 70, 1.6) : 22 * (1 - dz / 12));
    }
    const dune = Math.min(1, out / 140) * (40 * Math.pow(Math.sin(x / 150 + z / 330), 2) + 22 * Math.sin(x / 61 + z / 170));
    const bumps = (roll + ridge) * (1 - 0.75 * bf) * (1 - road);
    return base(z) + bumps + berm + kick + drop + cliff + creek + out * 0.35 + out * out * 0.0014 + dune;
  }
  const gradX = (x, z) => (ground(x + 3, z) - ground(x - 3, z)) / 6;
  const gradZ = (x, z) => (ground(x, z + 3) - ground(x, z - 3)) / 6;

  // ground colors: golden grass, a red-dirt trail, Main Ave asphalt and sidewalks
  const C = { grass: [0.78, 0.7, 0.5], grass2: [0.62, 0.6, 0.42], trail: [0.6, 0.4, 0.27], road: [0.34, 0.35, 0.38], walk: [0.78, 0.76, 0.72], tmp: [0, 0, 0] };
  function paint(x, z) {
    const d = Math.abs(x - cx(z));
    if (z > TOWN - 200) {
      if (d < 72) return C.road;
      if (d < 100) return C.walk;
    }
    const tr = z < CLIFF_W ? smooth(46, 30, d) : 0;
    const g = 0.5 + 0.5 * Math.sin(x / 90 + z / 140) * Math.sin(z / 260 - x / 180);
    for (let i = 0; i < 3; i++) C.tmp[i] = (C.grass[i] * g + C.grass2[i] * (1 - g)) * (1 - tr) + C.trail[i] * tr;
    return C.tmp;
  }

  // flight path for the wingsuit: from the cliff top down to Main Ave
  let flyY0 = 0, flyY1 = 0;
  function pathY(z) { const u = clamp((z - CLIFF_W) / (FLY_END - CLIFF_W), 0, 1); return flyY0 + (flyY1 - flyY0) * u + 50 * Math.sin(Math.PI * u); }

  function edgeScenery() {
    const e = [];
    for (let z = -300; z < FINISH + 3000; z += 70) {
      if (z > TOWN - 400) continue;
      for (const side of [-1, 1]) for (let k = 0; k < 3; k++) {
        if (hash(z + k * 17, side + 3) > 0.62 - k * 0.12) continue;
        const off = HALF + 25 + k * 120 + hash(z, side * 7 + k) * 110;
        e.push({ type: "tree", z: z + hash(z, k) * 50, x: cx(z) + side * off, sz: 0.9 + hash(z, k + 9) * 0.7 });
      }
      for (const side of [-1, 1]) if (hash(z, side + 21) < 0.08) e.push({ type: "boulder", z, x: cx(z) + side * (HALF + 60 + hash(z, 5) * 260), r: 40 + hash(z, 8) * 70 });
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
      { name: "CHAD", color: "#7b1e3a", lane: -90, gap: 70, on: false },
      { name: "BRAD", color: "#3a0ca3", lane: 95, gap: -30, on: false },
      { name: "TRENT", color: "#5f0f40", lane: 170, gap: 130, on: false },
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
    add({ type: "sign", z: 300, x: cx(300) + 170, text: L.startSign, color: "#7b4a1f" });
    // trees: scattered over the hill, never on the trail
    for (let z = 700; z < CLIFF_W - 300; z += 90) {
      for (let k = 0; k < 3; k++) if (hash(z, 4 + k) < 0.45) {
        const o = { type: "tree", z: z + hash(z, k) * 60, x: across(z, 20 + k), sz: 0.8 + hash(z, 6 + k) * 0.6 };
        if (!nearTrail(o)) add(o);
      }
    }
    // rocks: some everywhere, a real rock garden on the race course
    for (let z = 1500; z < CLIFF_W - 300; z += 120) {
      const garden = within(z, ROCK_GARDEN);
      for (let k = 0; k < (garden ? 4 : 2); k++) {
        if (hash(z, 7 + k * 3) > (garden ? 0.7 : 0.18)) continue;
        const x = garden ? cx(z) + (hash(z, 31 + k) - 0.5) * 260 : across(z, 30 + k);
        add({ type: "rock", z: z + k * 30, x, r: 14 + hash(z, 9 + k) * 12 });
      }
    }
    // kickers (+ flowers hanging in the air past each lip)
    KICKERS.forEach((k, i) => {
      add({ type: "kicker", z: k.z, x: k.x, w: k.w });
      for (let j = 0; j < 2; j++) add({ type: "flower", z: k.z + 110 + j * 120, x: k.x, h: [95, 130][j], hue: (i + j) % 3 });
    });
    add({ type: "deck", z: DROP, x: cx(DROP), w: 140 });
    add({ type: "sign", z: DROP - 500, x: cx(DROP) + 150, text: L.dropSign, color: "#a47148" });
    add({ type: "sign", z: KICKERS[0].z - 500, x: cx(KICKERS[0].z) - 150, text: L.jumpSign, color: "#a47148" });
    // flowers along the trail
    for (let z = 1000; z < CLIFF_W - 400; z += 600 + Math.floor(hash(z, 11) * 300)) {
      const x = cx(z) + (hash(z, 12) - 0.5) * 300;
      for (let i = 0; i < 3; i++) add({ type: "flower", z: z + i * 60, x: x + Math.sin(i) * 12, h: 0, hue: (Math.floor(z / 10) + i) % 3 });
    }
    // the gifts (memories) glowing out on the hill
    GIFTS.forEach(([z, dx], n) => add({ type: "gift", z, x: cx(z) + dx, n }));
    // the race
    add({ type: "gate", z: RACE_START, x: cx(RACE_START), w: 220, label: L.raceStartGate, color: "#e63946" });
    GATES.forEach((z, i) => add({ type: "gate", z, x: cx(z), w: 200, label: "CHECKPOINT " + (i + 1), color: "#ff6b00", n: i }));
    add({ type: "sign", z: CLIFF_W - 600, x: cx(CLIFF_W) + 170, text: L.cliffSign, color: "#e63946" });
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
  function minSpeed(z) { return z > TOWN ? 300 : 330 + 90 * clamp(z / CLIFF_W, 0, 1); }

  function physics(dt) {
    const steer = s.state === "ride" ? Engine.steer() : 0;
    const turnRate = s.air ? (s.airT < 0.28 ? 2.5 : 10) : 2.6;
    const prevHeading = s.heading;
    if (steer) { s.heading += steer * turnRate * dt; if (s.air) s.spinAcc += steer * turnRate * dt; }
    else if (!s.air) s.heading -= s.heading * Math.min(1, 1.6 * dt);
    else if (s.airT > 0.28) {
      const dir = Math.atan2(s.vx, s.v), k = Math.round((s.heading - dir) / (Math.PI * 2));
      const step = clamp(dir + k * Math.PI * 2 - s.heading, -8 * dt, 8 * dt);
      s.heading += step; s.spinAcc += step;
    }
    if (!s.air) s.heading = clamp(s.heading, -1.3, 1.3);
    const sn = Math.sin(s.heading), cs = Math.cos(s.heading);
    let u = s.vx * sn + s.v * cs, w = s.vx * cs - s.v * sn;
    if (!s.air || s.h < 8) {
      const ax = -G * gradX(s.x, s.z), az = -G * gradZ(s.x, s.z);
      const ah = ax * sn + az * cs;
      u += ((ah < 0 ? ah * 0.3 : ah) - DRAG * u * Math.abs(u)) * dt;
      if (s.boostT > 0) u += 260 * dt;
      if (s.state !== "arrive") u = clamp(u, minSpeed(s.z), minSpeed(s.z) + 170);
      w += (ax * cs - az * sn) * 0.25 * dt;
      w *= Math.exp(-9 * dt);                                  // tires grip
      if (s.state === "tumble") w *= 1 - 3 * dt;
      if (s.state === "arrive") { u *= 1 - 2.2 * dt; w *= 1 - 4 * dt; if (s.z > FINISH - 60) u = Math.min(u, 8); }
      s.vx = u * sn + w * cs; s.v = u * cs - w * sn;
    }
    if (s.boostT > 0) s.boostT -= dt;
    s.v = Math.max(s.v, s.state === "arrive" ? 0 : 25);
    s.x += s.vx * dt; s.z += s.v * dt;
    const off = s.x - cx(s.z);
    const wall = s.z > TOWN ? 110 : HALF + 160;              // town: stay on Main Ave
    if (Math.abs(off) > wall) { s.x = cx(s.z) + Math.sign(off) * wall; s.vx *= -0.2; s.heading *= 0.5; }
    const gNew = ground(s.x, s.z);
    if (!s.air) {
      const gv = (gNew - s.y) / dt;
      if (s.state === "ride" && gv < s.vy - G * dt * 1.6 - 30) {
        s.air = true; s.airT = 0; s.bigAir = false; s.spinAcc = 0;
        if (KICKERS.some((k) => Math.abs(s.z - k.z) < 50 && Math.abs(s.x - k.x) < k.w / 2 + 20)) { s.vy += 80; Sfx.tone(300, 0.3, "triangle", 0.08, 0, 700); }
        if (Math.abs(s.z - DROP) < 50 && Math.abs(s.x - cx(DROP)) < 90) { s.vy += 90; Engine.toast(pick(L.dropSend), "good"); }
        s.vy -= G_AIR * dt; s.y += s.vy * dt;
      } else { s.vy = gv; s.y = gNew; }
    } else {
      s.airT += dt;
      s.vy -= G_AIR * dt; s.y += s.vy * dt;
      if (s.airT > 0.7) s.bigAir = true;
      if (s.y <= gNew) { const vyi = s.vy; s.y = gNew; s.air = false; s.vy = 0; land(vyi); }
    }
    s.h = Math.max(0, s.y - gNew);
    const turning = (s.heading - prevHeading) / Math.max(dt, 1e-3);
    s.lean += (clamp(turning * Math.max(u, 60) / 700, -1, 1) * 0.5 - s.lean) * Math.min(1, dt * 7);
    s.comp = Math.max(0, s.comp - dt * 2.5);
    // the wingsuit cliff
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
    if (s.airT > 0.45 && Math.abs(diff) > 1.1) { s.heading = dir; crash(); Engine.toast(L.sideways, "bad"); return; }
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
    s.lean += (-steer * 0.0 + s.heading * 0.6 - s.lean) * Math.min(1, dt * 5);
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
    once("jumps", z > KICKERS[0].z - 600, () => Engine.toast(L.jumpLine));
    once("drop", z > DROP - 500, () => Engine.toast(L.dropHint));
    once("raceSoon", z > RACE_START - 900, () => { Engine.toast(L.raceSoon, "bad"); for (const r of s.rivals) { r.on = true; r.z = s.z - 300 + r.gap; r.x = cx(r.z) + r.lane; r.v = s.v; } });
    once("go", z > RACE_START, () => { Engine.toast(L.raceGo, "bad"); Sfx.fanfare(); s.racing = true; });
    once("rocks", z > ROCK_GARDEN[0] - 400, () => Engine.toast(L.rockGarden, "bad"));
    once("berms", z > BERMS[0], () => Engine.toast(L.berms, "good"));
    once("creek", z > CREEK - 900, () => Engine.toast(L.creek, "bad"));
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
        const tx = cx(r.z) + (r.z > TOWN ? r.lane * 0.4 : r.lane) + 40 * Math.sin(r.t * 0.9 + i);
        const nx = r.x + (tx - r.x) * Math.min(1, dt * 1.5);
        r.heading = clamp(Math.atan2(nx - r.x, Math.max(1, r.v * dt)), -0.8, 0.8);
        r.lean = r.heading * 0.4;
        r.x = nx;
      }
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
      else if (o.type === "charm" && Math.abs(o.z - s.z) < 40 && dx < 60) { o.got = true; s.charm = true; Sfx.fanfare(); Confetti.burst(80, Engine.W); Engine.toast(L.gotCharm, "good"); }
      else if (o.type === "gift" && Math.abs(o.z - s.z) < 40 && dx < 50) { o.got = true; s.gifts++; Sfx.fanfare(); showMemory(o.n); }
    }
    // the creek
    if (prevZ < CREEK && s.z >= CREEK && s.h < 10 && Math.abs(s.x - cx(CREEK)) > 60) {
      Sfx.splash(); Engine.shake = 5;
      Engine.toast(pick(LINES.waterCold), "water");
      s.shrinkT = 3.4; s.smallPending = true;
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
      if (ahead > -10 && ahead < 450) o.x += (s.x - o.x) * Math.min(1, dt * (o.type === "charm" ? 3 : 1.6));
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
