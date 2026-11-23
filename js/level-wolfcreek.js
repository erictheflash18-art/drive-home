// LEVEL 4 — WOLF CREEK PASS
// Backcountry skiing, seen from behind the penguin looking down the mountain (pseudo-3D: things
// come up from the horizon and grow as they get close). Hold left/right to carve. Pillows and
// cliffs launch you. Glades, a creek, an icy face, ΣΤΓ on snowmobiles, and Chad sets off an
// avalanche on the last stretch. Notes in the snow hold memories. Starts with the car in a ditch.

const WolfCreekLevel = (() => {
  const L = LINES.wolfCreek;
  const FINISH = 50000;
  const HALF = 620;               // half the width of the open mountain (dune walls beyond)
  const D0 = 300;                 // camera focal length (world units)
  const VIEW = 2600;              // how far ahead we draw
  const POWDER = [0, 9000], GLADES = [9000, 15000], CREEK = 15600, PILLOWS = [23000, 24700];
  const GULLY = [19400, 22000];
  const CLIFFS = [22400, 25000], ICE = [26600, 32000], SLEDS = [34800, 41000];
  const MEMS = [18300, 33300, 42600];
  const CALM = MEMS.map((m) => [m - 300, m + 150]);  // just a little clear space around each note
  const CHADS = [35600, 38900];
  const GRANDPARENTS = 37800;
  const CHAD_FINALE = 44000, AVA_START = 44500, AVA_END = 48600;
  const CLEARS = 47200, CHARM = 48200;
  const SNICKERS = [3600, 7400, 13000, 21000, 28800, 36800, 40200, 45600];
  const SKIER_R = 16;
  const G = 900;                  // gravity on the snow
  const G_AIR = 520;              // floatier in the air (time to spin)
  const DRAG = 0.0013;            // air + snow drag (top speed ~370 on a normal pitch)
  const CLIFF_DROP = [120, 165];
  const CHUTES = (c) => [-2, -1, 0, 1, 2].map((k) => cx(c) + k * 400 + 90); // ramps through each cliff band
  const ROLLERS = [[5200, 8200], [37600, 40200]];
  // Kickers (wind lips): real ramps in the snow. Flowers hang in the air past the lip.
  const KICKERS = [[2600, 0], [4300, -220], [6100, 200], [7900, -60], [36300, 150], [46800, 0]].map(([z, dx]) => ({ z, x: cx(z) + dx, w: z === 46800 ? 280 : 170, h: 62, len: 115 }));
  const BRIDGES = [-250, 50, 350].map((d) => cx(CREEK) + d);
  // Pillows: round snow mounds that pop you into the air
  const PILLOW_T = (() => {
    const out = [];
    for (let z = PILLOWS[0] + 100; z < PILLOWS[1]; z += 170) for (let k = 0; k < 3; k++) {
      const hz = Math.sin(z * 12.9 + k * 78.2) * 43758.5; const h = hz - Math.floor(hz);
      out.push({ z: z + k * 50, x: cx(z) + (h - 0.5) * 900, r: 55, h: 34 });
    }
    return out;
  })();
  const gullyX = (z) => cx(z) + 160 * Math.sin((z - GULLY[0]) / 700);

  let s;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const hash = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  const within = (z, [a, b]) => z > a && z < b;
  const inCalm = (z) => CALM.find((c) => within(z, c));
  const calmAmount = (z) => { const c = inCalm(z); return c ? Math.min(1, (z - c[0]) / 400, (c[1] - z) / 200) : 0; };
  const onIce = (z) => within(z, ICE);

  // the run winds gently
  function cx(z) { return 140 * Math.sin(z / 2100) + 50 * Math.sin(z / 730 + 2); }
  // How steep the mountain is at each point (drives speed): flatter in the calm bowls, steeper
  // on the ice and the avalanche run, flattening out to the road.
  function pitch(z) {
    let p = 0.2;
    if (within(z, POWDER)) p = 0.19;
    else if (onIce(z)) p = 0.26;
    else if (z > CHAD_FINALE) p = 0.24;
    if (z > FINISH - 1800) p = Math.max(0.02, p * clamp((FINISH - z) / 1800, 0, 1));
    return p;
  }
  // base height = the integral of the pitch (table, 20 units per step)
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
  const smooth = (e0, e1, v) => { const u = clamp((v - e0) / (e1 - e0), 0, 1); return u * u * (3 - 2 * u); };
  // 3D height of the snow: uneven rolls, ridges and gullies, rollers, real cliffs, dune walls
  function ground(x, z) {
    const out = Math.max(0, Math.abs(x - cx(z)) - (HALF - 40));
    const roll = 14 * Math.sin(x / 130 + z / 460) + 8 * Math.sin(x / 57 - z / 230) + 6 * Math.sin(z / 170 + x / 300);
    const rv = 1 - Math.abs(Math.sin(x / 210 + 0.6 * Math.sin(z / 700)));
    const ridge = 20 * rv * rv;
    let roller = 0;
    for (const r of ROLLERS) if (z > r[0] && z < r[1]) roller += 26 * Math.pow(Math.max(0, Math.sin((z - r[0]) / 110)), 4) * smooth(r[0], r[0] + 300, z) * smooth(r[1], r[1] - 300, z);
    let cliff = 0;
    CLIFFS.forEach((c, i) => {
      if (z < c - 20) return;
      const d = Math.min(...CHUTES(c).map((q) => Math.abs(x - q)));
      const ramp = smooth(60, 120, d);           // 0 in a chute (gentle ramp), 1 on the face
      const w = 16 + (1 - ramp) * 300;
      cliff -= CLIFF_DROP[i] * smooth(c, c + w, z);
    });
    const dune = Math.min(1, out / 140) * (40 * Math.pow(Math.sin(x / 150 + z / 330), 2) + 22 * Math.sin(x / 61 + z / 170));
    // the Gully: a natural halfpipe
    let gully = 0, gf = 0;
    if (z > GULLY[0] && z < GULLY[1]) {
      gf = smooth(GULLY[0], GULLY[0] + 400, z) * smooth(GULLY[1], GULLY[1] - 400, z);
      const d = Math.min(Math.abs(x - gullyX(z)), 250);
      gully = gf * d * d * 0.0022;
    }
    // kickers
    let kick = 0;
    for (const k of KICKERS) {
      const dz = z - k.z;
      if (dz < -k.len || dz > 70) continue;
      const lat = smooth(k.w / 2 + 55, k.w / 2 - 10, Math.abs(x - k.x));
      if (lat <= 0) continue;
      kick += lat * (dz <= 0 ? k.h * Math.pow((dz + k.len) / k.len, 1.6) : k.h * (1 - smooth(0, 70, dz)));
    }
    // pillows
    let pil = 0;
    if (z > PILLOWS[0] && z < PILLOWS[1] + 200) for (const q of PILLOW_T) {
      if (Math.abs(z - q.z) > q.r) continue;
      const d = Math.hypot(x - q.x, z - q.z);
      if (d < q.r) { const u = 1 - (d / q.r) * (d / q.r); pil += q.h * u * u; }
    }
    // the creek: a ditch with a lip in front of it (snow bridges stay flat)
    let creek = 0;
    if (Math.abs(z - CREEK) < 160) {
      const br = Math.max(...BRIDGES.map((b) => smooth(75, 50, Math.abs(x - b))));
      creek = -28 * Math.exp(-Math.pow((z - CREEK) / 24, 2)) * (1 - br);
      const dz = z - (CREEK - 55);
      if (dz > -70 && dz < 12) creek += (1 - br) * (dz <= 0 ? 24 * Math.pow((dz + 70) / 70, 1.6) : 24 * (1 - dz / 12));
    }
    const calm = 1 - 0.75 * gf;
    return base(z) + (roll + ridge + roller) * calm + cliff + gully + kick + pil + creek + out * 0.35 + out * out * 0.0014 + dune;
  }
  const gradX = (x, z) => (ground(x + 3, z) - ground(x - 3, z)) / 6;
  const gradZ = (x, z) => (ground(x, z + 3) - ground(x, z - 3)) / 6;
  // trees and boulders off the run (3D view only)
  function edgeScenery() {
    const e = [];
    for (let z = -300; z < FINISH + 3000; z += 70) {
      for (const side of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          const h = hash(z + k * 17, side + 3);
          if (h > 0.62 - k * 0.12) continue;
          const off = HALF + 25 + k * 120 + hash(z, side * 7 + k) * 110;
          e.push({ type: "tree", z: z + hash(z, k) * 50, x: cx(z) + side * off, sz: 0.9 + hash(z, k + 9) * 0.7 });
        }
        if (hash(z, side + 21) < 0.06) e.push({ type: "boulder", z, x: cx(z) + side * (HALF + 60 + hash(z, 5) * 260), r: 40 + hash(z, 8) * 70 });
      }
    }
    return e;
  }

  // ---------- Setup ----------
  function reset() {
    s = {
      z: 0, x: 0, vx: 0, v: 0, boost: 0, boostT: 0, h: 0, vh: 0, air: false, lean: 0, camX: 0, t: 0,
      y: 0, vy: 0, heading: 0, airT: 0, comp: 0, tuck: 0, plant: null, lastSteer: 0, skid: 0, spinAcc: 0, spins: 0,
      state: "intro", flowers: 0, toes: 0, treesHit: 0, yardSales: 0, sledHits: 0, dunks: 0, notes: 0, charm: false,
      objs: [], flakes: [], floaters: [], flags: {}, invuln: 0, white: 0, tumbleT: 0, gear: [],
      zoom: 1, shrinkT: 0, smallPending: false, nextToe: 14, nextBeep: 6,
      chad: null, ava: null, storm: 1, gp: null, fx: [], zoneDeep: false,
    };
    s.x = cx(0); s.y = ground(s.x, 0);
    for (let i = 0; i < 140; i++) s.flakes.push({ x: Math.random() * 460 - 20, y: Math.random() * 900, r: rand(1, 3.2), v: rand(60, 160) });
    Confetti.bits = [];
    populate();
    updateHud();
  }

  function populate() {
    const add = (o) => s.objs.push(o);
    const clearOf = (z, pad) => !MEMS.concat([CHARM, CREEK, ...CLIFFS]).some((m) => Math.abs(z - m) < pad) && !inCalm(z) && !inCalm(z + 300);
    // the car in the ditch + signs at the top
    add({ type: "car", z: 60, x: cx(60) - 130 });
    add({ type: "sign", z: 260, x: cx(260) + 170, text: L.passSign });
    add({ type: "sign", z: 1400, x: cx(1400) - 190, text: L.wcSign, color: "#7b4a1f" });
    const across = (z, k) => cx(z) + (hash(z, k) - 0.5) * (HALF * 2 - 80);
    const nearCliff = (z, pad) => CLIFFS.some((c) => z > c - pad && z < c + 60);
    // trees: scattered everywhere, thick in the glades (with gaps that wander), sparse late
    for (let z = 900; z < FINISH - 1500; z += 90) {
      if (!clearOf(z, 260) || nearCliff(z, 140)) continue;
      if (within(z, GLADES)) {
        const gaps = [cx(z) + Math.sin(z / 900) * 300, cx(z) - 260 + Math.sin(z / 650 + 1) * 200];
        for (let x = cx(z) - HALF + 20; x < cx(z) + HALF - 10; x += 46 + hash(z, 3) * 26) {
          if (gaps.some((g) => Math.abs(x - g) < 85)) continue;
          if (hash(x, z) < 0.3) add({ type: "tree", z: z + hash(x, 1) * 40, x, sz: 0.85 + hash(x, z + 1) * 0.5 });
        }
      } else if (!onIce(z)) {
        const n = z > CHAD_FINALE ? 1 : 3;
        for (let k = 0; k < n; k++) if (hash(z, 4 + k) < 0.45) add({ type: "tree", z: z + hash(z, k) * 60, x: across(z, 20 + k), sz: 0.8 + hash(z, 6 + k) * 0.6 });
      }
    }
    // rocks: everywhere a little, lots on the ice and below the cliffs
    for (let z = 2000; z < FINISH - 1500; z += 120) {
      if (!clearOf(z, 220)) continue;
      const below = CLIFFS.some((c) => z > c + 150 && z < c + 900);
      const p = onIce(z) ? 0.5 : below ? 0.3 : 0.2;
      for (let k = 0; k < 3; k++) if (hash(z, 7 + k * 3) < p) add({ type: "rock", z: z + k * 30, x: across(z, 30 + k), r: 18 + hash(z, 9 + k) * 14 });
    }
    // pillows (part of the terrain) with flowers floating over some of them
    PILLOW_T.forEach((q, i) => { add({ type: "pillow", z: q.z, x: q.x }); if (i % 2 === 0) add({ type: "flower", z: q.z + 90, x: q.x, h: 40, hue: i % 3 }); });
    // kickers: flowers hang in the air past the lip (you only get them if you send it)
    KICKERS.forEach((k, i) => {
      add({ type: "kicker", z: k.z, x: k.x, w: k.w });
      if (k.z !== 46800) for (let j = 0; j < 3; j++) add({ type: "flower", z: k.z + 110 + j * 120, x: k.x, h: [95, 140, 150][j], hue: (i + j) % 3 });
    });
    // the Gully: flowers up on the walls
    for (let z = GULLY[0] + 500; z < GULLY[1] - 400; z += 260) {
      const side = (Math.floor(z / 260) % 2) ? 1 : -1;
      add({ type: "flower", z, x: gullyX(z) + side * 150, h: 0, hue: Math.floor(z / 260) % 3 });
    }
    CLIFFS.forEach((z) => add({ type: "cliff", z }));
    add({ type: "creek", z: CREEK, bridges: BRIDGES });
    // chrysanthemums in little lines all over
    for (let z = 1200; z < FINISH - 1500; z += 520 + Math.floor(hash(z, 11) * 260)) {
      if (!clearOf(z, 200)) continue;
      const x = cx(z) + (hash(z, 12) - 0.5) * (HALF * 1.4);
      for (let i = 0; i < 3; i++) add({ type: "flower", z: z + i * 60, x: x + Math.sin(i) * 12, h: 0, hue: (Math.floor(z / 10) + i) % 3 });
    }
    SNICKERS.forEach((z, i) => add({ type: "snickers", z, x: cx(z) + [-80, 70, 0, 90, -60, 40, -90, 30][i] }));
    MEMS.forEach((z, n) => add({ type: "note", z, x: cx(z) + (n % 2 ? 60 : -60), n }));
    // crossing snowmobiles in the ΣΤΓ section
    for (let z = SLEDS[0] + 300; z < SLEDS[1]; z += 1100) add({ type: "sled", z, x: 0, dir: hash(z, 13) < 0.5 ? 1 : -1, go: false, yell: pick(L.sledYell) });
    add({ type: "charm", z: 46800 + 150, x: cx(46800), h: 60 }); // above the last kicker
    add({ type: "road", z: FINISH });
    add({ type: "sign", z: FINISH - 120, x: cx(FINISH) + 220, text: L.roadSign, color: "#2d6a4f" });
    add({ type: "ditchSled", z: FINISH + 40, x: cx(FINISH) - 200 });
    // keep obstacles off the notes, charm and bridges
    const bad = (o) => (o.type === "tree" || o.type === "rock") &&
      ([...MEMS, CHARM].some((m) => Math.abs(o.z - m) < 200) || (Math.abs(o.z - CREEK) < 160) ||
       (o.z > GULLY[0] && o.z < GULLY[1] && Math.abs(o.x - gullyX(o.z)) < 300) ||
       KICKERS.some((k) => o.z > k.z - 260 && o.z < k.z + 650 && Math.abs(o.x - k.x) < k.w + 40) ||
       PILLOW_T.some((q) => Math.abs(o.z - q.z) < 90 && Math.abs(o.x - q.x) < 90));
    s.objs = s.objs.filter((o) => !bad(o));
    s.objs.sort((a, b) => a.z - b.z);
  }

  // ---------- Projection ----------
  const HY = () => Math.round(Engine.H * 0.27);   // horizon
  const GY = () => Engine.H - 230;                // skier's feet
  const kOf = (d) => D0 / (d + D0);
  const sy = (d) => HY() + (GY() - HY()) * kOf(d);
  const sx = (x, d) => Engine.W / 2 + (x - s.camX) * kOf(d);

  // ---------- Update ----------
  function update(dt) {
    s.t += dt;
    Confetti.update(dt, Engine.H);
    ToePrompt.update(dt);
    for (const f of s.floaters) { f.t += dt; f.y -= 30 * dt; }
    s.floaters = s.floaters.filter((f) => f.t < 1.8);
    Engine.shake = Math.max(s.ava && !s.ava.done ? 2 : 0, Engine.shake - dt * 30);
    s.invuln = Math.max(0, s.invuln - dt);
    s.white = Math.max(0, s.white - dt * 0.8);
    s.shrinkT = Math.max(0, s.shrinkT - dt);
    s.zoom += ((s.shrinkT > 0 ? 0.5 : 1) - s.zoom) * Math.min(1, dt * (s.shrinkT > 0 ? 6 : 3));
    if (s.smallPending && s.zoom < 0.62) { s.smallPending = false; Engine.toast(pick(LINES.gotSmall), "water"); }
    Engine.presses.left = Engine.presses.right = Engine.presses.up = 0;
    for (const g of s.gear) { g.t += dt; g.x += g.vx * dt; g.y += g.vy * dt; g.vy += 600 * dt; g.r += g.vr * dt; }
    s.gear = s.gear.filter((g) => g.t < 1.6);

    const prevZ = s.z;
    if (s.state === "ski" || s.state === "tumble" || s.state === "arrive") physics(dt);
    s.camX += (s.x - s.camX) * Math.min(1, dt * 4);
    s.zoneDeep = within(s.z, POWDER);
    if (s.state === "tumble") { s.tumbleT -= dt; if (s.tumbleT <= 0) { s.state = "ski"; s.invuln = 1.2; } }
    if (s.state === "ski") { events(dt); collide(prevZ); }
    updateNotes(dt);
    updateSleds(dt);
    updateChad(dt);
    updateAva(dt);
    updateGrandparents(dt);
    // snow falls (and streaks out from the middle when you're flying)
    if (s.z > CLEARS) s.storm = Math.max(0, s.storm - dt * 0.35);
    const vp = Engine.W / 2, spd = s.v / 330;
    for (const f of s.flakes) {
      f.y += (f.v + 120 * spd) * dt;
      f.x += ((f.x - vp) * 0.6 * spd - 25) * dt;
      if (f.y > Engine.H + 10 || f.x < -30 || f.x > Engine.W + 30) { f.y = rand(-40, Engine.H * 0.6); f.x = rand(-20, Engine.W + 20); }
    }
    updateHud();
  }

  // ---------- Ski physics ----------
  // Gravity pulls her down the terrain. She points her skis (heading) with left/right; the snow
  // grips sideways, so carving sheds speed. If the ground drops away faster than she falls
  // (rollers, cliffs), she leaves it and flies until she lands.
  function physics(dt) {
    const steer = s.state === "ski" ? Engine.steer() : 0;
    const ice = onIce(s.z);
    // pole plant on the inside when a turn starts
    if (steer && steer !== s.lastSteer && !s.air) s.plant = { side: steer, t: 0.4 };
    s.lastSteer = steer;
    if (s.plant) { s.plant.t -= dt; if (s.plant.t <= 0) s.plant = null; }
    // in the air left/right spins her (slowly at first, so little hops don't spin you out)
    const turnRate = s.air ? (s.airT < 0.28 ? 2.5 : 10) : ice ? 1.3 : 2.5;
    const prevHeading = s.heading;
    if (steer) { s.heading += steer * turnRate * dt; if (s.air) s.spinAcc += steer * turnRate * dt; }
    else if (!s.air) s.heading -= s.heading * Math.min(1, 1.4 * dt); // settles back to the fall line
    else if (s.airT > 0.28) {
      // let go mid-air and she rotates to the nearest clean landing (finishing a spin if she's past halfway)
      const dir = Math.atan2(s.vx, s.v), k = Math.round((s.heading - dir) / (Math.PI * 2));
      const want = dir + k * Math.PI * 2, step = clamp(want - s.heading, -8 * dt, 8 * dt);
      s.heading += step; s.spinAcc += step;
    }
    if (!s.air) s.heading = clamp(s.heading, -1.35, 1.35);
    const sn = Math.sin(s.heading), cs = Math.cos(s.heading);
    let u = s.vx * sn + s.v * cs;      // speed along the skis
    let w = s.vx * cs - s.v * sn;      // sideways slip
    if (!s.air || s.h < 8) {          // tiny hops still carve
      const ax = -G * gradX(s.x, s.z), az = -G * gradZ(s.x, s.z);
      const drag = DRAG * (s.zoneDeep ? 1.25 : 1) * (ice ? 0.85 : 1);
      const ah = ax * sn + az * cs;
      u += ((ah < 0 ? ah * 0.3 : ah) - drag * u * Math.abs(u)) * dt;   // going uphill (ramps, walls) barely slows her
      if (s.boostT > 0) u += 260 * dt;
      // always fast, and only ever faster: a floor that rises down the mountain
      if (s.state !== "arrive") u = clamp(u, minSpeed(s.z), minSpeed(s.z) + 170);
      w += (ax * cs - az * sn) * 0.25 * dt;                      // a little sidehill slip
      w *= Math.exp(-(ice ? 1.6 : 7) * dt);                       // edges grip (less on ice)
      if (s.state === "tumble") { u *= 1 - 0.25 * dt; w *= 1 - 3 * dt; }   // she rolls, keeps her speed
      if (s.state === "arrive") { u *= 1 - 2.2 * dt; w *= 1 - 4 * dt; if (s.z > FINISH - 80) u = Math.min(u, 10); }
      s.vx = u * sn + w * cs; s.v = u * cs - w * sn;
    }
    if (s.boostT > 0) { s.boostT -= dt; if (s.boostT <= 0) Engine.toast(pick(LINES.doesntLastLong)); }
    s.v = Math.max(s.v, s.state === "arrive" ? 0 : 25);           // never back uphill
    s.skid = w;
    s.x += s.vx * dt; s.z += s.v * dt;
    // walls of deep snow way out at the sides
    const off = s.x - cx(s.z);
    if (Math.abs(off) > HALF + 160) { s.x = cx(s.z) + Math.sign(off) * (HALF + 160); s.vx *= -0.2; }
    // vertical: stick to the snow, or fly
    const gNew = ground(s.x, s.z);
    if (!s.air) {
      const gv = (gNew - s.y) / dt;
      if (s.state === "ski" && gv < s.vy - G * dt * 1.6 - 30) {   // the ground fell away
        s.air = true; s.airT = 0; s.bigAir = false; s.spinAcc = 0;
        const offCliff = CLIFFS.some((c) => s.z > c - 10 && s.z < c + 40) && Math.min(...CHUTES(s.z).map((q) => Math.abs(s.x - q))) > 90;
        if (offCliff) { s.vy += 120; Engine.toast(pick(L.cliffSend), "good"); Sfx.tone(250, 0.4, "triangle", 0.09, 0, 800); }
        if (KICKERS.some((k) => Math.abs(s.z - k.z) < 50 && Math.abs(s.x - k.x) < k.w / 2 + 20)) { s.vy += 80; Sfx.tone(300, 0.3, "triangle", 0.08, 0, 700); } // pop off the lip
        s.vy -= G_AIR * dt; s.y += s.vy * dt;
      } else { s.vy = gv; s.y = gNew; }
    } else {
      s.airT += dt;
      s.vy -= G_AIR * dt; s.y += s.vy * dt;
      if (s.airT > 0.7) s.bigAir = true;
      if (s.y <= gNew) { const vyi = s.vy; s.y = gNew; s.air = false; s.vy = 0; land(vyi); }
    }
    s.h = Math.max(0, s.y - gNew);
    // the body: lean into turns, tuck when it's straight and fast, absorb landings
    const turning = (s.heading - prevHeading) / Math.max(dt, 1e-3);
    s.lean += (clamp(turning * Math.max(u, 60) / 700, -1, 1) * 0.55 - s.lean) * Math.min(1, dt * 7);
    s.tuck += ((!steer && !s.air && u > 300 ? 1 : 0) - s.tuck) * Math.min(1, dt * 3);
    s.comp = Math.max(0, s.comp - dt * 2.5);
  }

  function minSpeed(z) { return 350 + 110 * clamp(z / FINISH, 0, 1); }

  function events(dt) {
    const z = s.z;
    const once = (k, cond, fn) => { if (!s.flags[k] && cond) { s.flags[k] = true; fn(); } };
    once("beacon", z > 500, () => Engine.toast(L.beaconCheck));
    once("powder", z > 1800, () => Engine.toast(L.powder, "good"));
    once("powderEnds", z > POWDER[1] - 300, () => Engine.toast(L.powderEnds));
    once("glades", z > GLADES[0] - 500, () => Engine.toast(L.glades));
    once("creek", z > CREEK - 1100, () => Engine.toast(L.creekWarning, "bad"));
    once("pillows", z > PILLOWS[0] - 300, () => Engine.toast(L.pillows));
    once("kickHint", z > KICKERS[0].z - 900, () => Engine.toast(L.kickerHint, "good"));
    once("gully", z > GULLY[0], () => Engine.toast(L.gully, "good"));
    CLIFFS.forEach((c, i) => once("cliffW" + i, z > c - 700, () => Engine.toast(i ? L.cliff : L.cliffChoice, "bad")));
    once("ice", z > ICE[0] - 200, () => Engine.toast(L.ice, "bad"));
    once("sleds", z > SLEDS[0], () => { Engine.toast(L.sledsAppear, "bad"); Sfx.honk(); });
    CHADS.forEach((c, i) => once("chad" + i, z > c, () => spawnChad(i)));
    once("gp", z > GRANDPARENTS - 1500, () => { s.gp = { alt: 320 }; });
    once("finale", z > CHAD_FINALE, () => { if (s.chad) s.chad.done = true; spawnChad(2, true); });
    once("ava", z > AVA_START, startAva);
    once("clears", z > CLEARS, () => Engine.toast(L.stormClears, "good"));
    once("chadDitch", z > FINISH - 700, () => Engine.toast(L.chadDitch, "good"));
    // the beacon keeps quietly beeping
    s.nextBeep -= dt;
    if (s.nextBeep <= 0) { s.nextBeep = 9; Sfx.tone(2200, 0.05, "sine", 0.025); }
    // (only one HOOK THE TOE on this level: clicking into the bindings at the top)
    if (z >= FINISH - 400) finish();
  }

  function startToe(win) {
    ToePrompt.start((ok) => {
      if (ok) s.toes++;
      else if (s.state === "ski") yardSale(true);
    }, win);
  }

  // ---------- Collisions ----------
  function collide(prevZ) {
    const z0 = prevZ - 14, z1 = s.z + 14;
    for (const o of s.objs) {
      if (o.got || o.z < z0 - 200 || o.z > z1 + 200) continue;
      const hitZ = o.z >= z0 && o.z <= z1;
      const dx = Math.abs(o.x - s.x);
      switch (o.type) {
        case "tree":
          if (hitZ && dx < 22 * o.sz + SKIER_R && s.h < 70) { o.got = true; hitTree(); }
          break;
        case "rock":
          if (hitZ && dx < o.r + SKIER_R - 4 && s.h < o.r) { o.got = true; yardSale(); }
          break;

        case "creek":
          if (hitZ && !o.got && !s.air) {
            o.got = true;
            if (s.h < 10 && !o.bridges.some((b) => Math.abs(s.x - b) < 60)) { coldWater(); Engine.toast(L.creekDitch, "bad"); }
          }
          break;
        case "flower":
          if (Math.abs(o.z - s.z) < 26 && dx < (o.h ? 46 : 34) && (o.h ? s.air && s.h > 30 : s.h < 45)) { o.got = true; s.flowers++; Sfx.flower(); }
          break;
        case "snickers":
          if (Math.abs(o.z - s.z) < 24 && dx < 34) {
            o.got = true; s.boost = 130; s.boostT = 3.2; Sfx.boost(); Sfx.munch(); Engine.toast(L.snickers, "good");
          }
          break;
        case "note":
          if (Math.abs(o.z - s.z) < 26 && dx < 40) { o.got = true; s.notes++; Sfx.fanfare(); showMemory(o.n); }
          break;
        case "charm":
          if (Math.abs(o.z - s.z) < 30 && dx < 50 && Math.abs(s.h - (o.h || 0)) < 60) {
            o.got = true; s.charm = true; Sfx.fanfare(); Confetti.burst(80, Engine.W); Engine.toast(L.gotCharm, "good");
          }
          break;
        case "sled":
          if (o.go && Math.abs(o.z - s.z) < 30 && dx < 44 && s.h < 40) hitSled(o);
          break;
      }
    }
  }

  function launch(vh) {
    if (s.air) return;
    s.air = true; s.airT = 0; s.bigAir = false; s.vy = Math.max(s.vy, 0) + vh;
    Sfx.tone(300, 0.3, "triangle", 0.08, 0, 700);
  }

  function land(vyi) {
    // landing on a downslope turns the fall into speed (like real skiing)
    if (vyi < 0) {
      const d = Math.atan2(s.vx, s.v), gAlong = gradX(s.x, s.z) * Math.sin(d) + gradZ(s.x, s.z) * Math.cos(d);
      const gain = Math.min(120, -vyi * Math.max(0, -gAlong) * 0.6), sp = Math.hypot(s.vx, s.v) || 1;
      s.vx += s.vx / sp * gain; s.v += s.v / sp * gain;
    }
    if (s.airT < 0.12) return; // just a little hop
    Sfx.noise(0.18, 0.2, true);
    s.comp = Math.min(1, 0.3 + s.airT);
    s.fx.push({ n: s.bigAir ? 40 : 18, spread: 120, up: 90 });
    // landed sideways?
    const dir = Math.atan2(s.vx, s.v);
    let diff = s.heading - dir;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    s.heading = dir + diff;
    if (s.airT > 0.45 && Math.abs(diff) > 1.1) { s.heading = dir; yardSale(); Engine.toast(L.sideways, "bad"); return; }
    const spins = Math.floor((Math.abs(s.spinAcc) + 0.7) / (Math.PI * 2));
    if (spins > 0) {
      s.spins += spins; s.flowers += 2 * spins;
      Engine.toast(L.spinLanded[Math.min(spins, L.spinLanded.length) - 1], "good");
      Sfx.fanfare(); Confetti.burst(30 * spins, Engine.W);
      s.floaters.push({ x: skScr().x, y: skScr().y - 60, text: "+" + 2 * spins + " 🌼", t: 0, good: true });
      s.bigAir = false;
    }
    // landing on a rock = yard sale
    const rock = s.objs.find((o) => o.type === "rock" && !o.got && Math.abs(o.z - s.z) < 40 && Math.abs(o.x - s.x) < o.r + SKIER_R);
    if (rock) { rock.got = true; yardSale(); return; }
    if (s.bigAir) Engine.toast(pick(L.landed), "good");
    s.bigAir = false;
  }

  function loseFlower() {
    if (s.flowers > 0) { s.flowers--; const sc = skScr(); s.floaters.push({ x: sc.x, y: sc.y - 50, text: "-1 🌼", t: 0 }); }
  }

  function hitTree() {
    if (s.invuln > 0) return;
    s.invuln = 1; s.treesHit++;
    s.white = 1; s.v *= 0.6; s.vx *= -0.4;
    s.fx.push({ n: 50, spread: 140, up: 140 });
    Sfx.crash(); Sfx.noise(0.6, 0.3, true); Engine.shake = 6;
    loseFlower();
    Engine.toast(pick(L.treeHit), "bad");
    if (s.ava && !s.ava.done) s.ava.gap -= 70;
  }

  function yardSale(quiet) {
    if (s.invuln > 0 || s.state !== "ski") return;
    s.state = "tumble"; s.tumbleT = quiet ? 0.9 : 1.2; s.yardSales++;
    s.air = false; s.h = 0; s.y = ground(s.x, s.z); s.vy = 0; s.heading *= 0.3;
    ToePrompt.cancel();
    Sfx.crash(); Engine.shake = 7;
    loseFlower();
    const sc = skScr(), gx = sc.x, gy = sc.y;
    s.fx.push({ n: 45, spread: 160, up: 120 });
    for (const kind of ["ski", "ski", "pole", "pole", "hat"]) s.gear.push({ kind, x: gx, y: gy, vx: rand(-220, 220), vy: rand(-420, -220), r: 0, vr: rand(-12, 12), t: 0 });
    if (!quiet) Engine.toast(pick(L.yardSale), "bad");
    if (s.ava && !s.ava.done) s.ava.gap -= 90;
  }

  function coldWater() {
    s.dunks++;
    Sfx.splash(); Engine.shake = 5; s.v *= 0.4;
    Engine.toast(pick(LINES.waterCold), "water");
    s.shrinkT = 3.4; s.smallPending = true;
  }

  // ---------- Notes in the snow (memories): can't be missed ----------
  function updateNotes(dt) {
    if (s.state === "intro" || s.state === "done") return;
    for (const o of s.objs) {
      if ((o.type !== "note" && o.type !== "charm") || o.got) continue;
      if (o.type === "charm") { // the charm can't be missed either: it drifts to her (and down to her height)
        const ah = o.z - s.z;
        if (ah > -10 && ah < 420) { o.x += (s.x - o.x) * Math.min(1, dt * 2.6); o.h += (s.h - o.h) * Math.min(1, dt * 3); }
        if (ah < -60) { o.z = s.z + 700; o.x = s.x; o.h = 0; s.objs.sort((a, b) => a.z - b.z); }
        continue;
      }
      const ahead = o.z - s.z;
      if (ahead > -10 && ahead < 380) o.x += (s.x - o.x) * Math.min(1, dt * 2.4);
      if (ahead < -60) {
        o.z = s.z + 900; o.x = clamp(s.x, cx(o.z) - HALF + 40, cx(o.z) + HALF - 40);
        Engine.toast(L.memoryMissed); Sfx.blip();
        s.objs.sort((a, b) => a.z - b.z);
      }
    }
  }

  function showMemory(n) {
    const key = "wolfCreek.memories." + n;
    const photo = typeof PHOTOS !== "undefined" && PHOTOS[key];
    $("memoryLabel").textContent = "🎿 " + L.memoryFound;
    $("memoryText").textContent = L.memories[n] || "";
    const img = $("memoryImg");
    img.hidden = !photo;
    if (photo) img.src = photo;
    $("memoryBtn").textContent = L.keepSkiing + " ⛷️";
    $("memory").classList.add("show");
    Engine.paused = true;
    ToePrompt.cancel();
    Voice.play(L.memories[n], "interrupt");
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

  // ---------- ΣΤΓ snowmobiles ----------
  function updateSleds(dt) {
    for (const o of s.objs) {
      if (o.type !== "sled" || o.got) continue;
      const ahead = o.z - s.z;
      if (!o.go && ahead < 1500 && s.state === "ski") {
        o.go = true; o.x = s.x - o.dir * 560;
        // aim to cross right where she'll be when she gets there
        const tArrive = ahead / Math.max(150, s.v);
        o.vx = o.dir * 560 / Math.max(1.2, tArrive) * 1.1;
        Sfx.tone(90, 0.8, "sawtooth", 0.04, 0, 140);
      }
      if (o.go) { o.x += o.vx * dt; o.z -= 60 * dt; }
      if (ahead < -300) o.got = true;
    }
  }

  function hitSled(o) {
    if (s.invuln > 0) return;
    o.go = false; o.got = true;
    s.sledHits++;
    Engine.toast(pick(L.sledHit), "bad");
    yardSale(true);
  }

  // Chad: rides up from behind, revs (!!), then swerves at where you were
  function spawnChad(i, finale) {
    s.chad = { z: s.z - 220, x: s.x + (s.x < cx(s.z) ? 90 : -90), i, t: 0, phase: "approach", finale, done: false, fade: 0 };
    Engine.toast(finale ? L.chadFinale : L.chadAppear[i] || L.chadAppear[0], "bad");
    Sfx.honk();
  }

  function updateChad(dt) {
    const c = s.chad;
    if (!c) return;
    c.t += dt;
    const yours = s.state === "intro" ? 0 : s.v;
    if (c.done) {
      c.fade += dt * 0.8; c.z += (yours - 120) * dt;
      if (c.fade >= 1) s.chad = null;
      return;
    }
    const dz = c.z - s.z;
    if (c.finale) {
      // blows past her, flies off the cornice ahead... and the slope lets go behind
      c.z += (yours + 260) * dt; c.x += (cx(c.z) - c.x) * dt;
      if (dz > 120 && !c.sent) { c.sent = true; Sfx.tone(120, 1, "sawtooth", 0.06, 0, 60); }
      if (dz > 900) { c.done = true; c.fade = 1; s.chad = null; }
      return;
    }
    if (c.phase === "approach") {
      c.z += (yours + clamp((-dz + 10) * 1.4, -80, 200)) * dt;
      c.x += clamp(s.x + 80 * Math.sign(c.x - s.x || 1) - c.x, -90 * dt, 90 * dt);
      if (Math.abs(dz - 10) < 20 && s.state === "ski") {
        c.phase = "windup"; c.wt = 0.95 - c.i * 0.1; c.tx = s.x;
        Engine.toast(L.chadWindup, "bad"); Sfx.alarm();
      }
    } else if (c.phase === "windup") {
      c.z = s.z + 10; c.wt -= dt;
      if (c.wt <= 0) { c.phase = "lunge"; Sfx.tone(200, 0.3, "sawtooth", 0.08, 0, 500); }
    } else {
      c.z += (yours + 40) * dt;
      c.x += clamp(c.tx - c.x, -260 * dt, 260 * dt);
      if (s.state === "ski" && s.invuln <= 0 && Math.abs(c.z - s.z) < 40 && Math.abs(c.x - s.x) < 40 && s.h < 40) {
        c.got = true; c.done = true; s.sledHits++;
        Engine.toast(pick(L.sledHit), "bad"); yardSale(true);
      } else if (Math.abs(c.x - c.tx) < 4) { c.done = true; if (!c.got) Engine.toast(L.chadGiveUp, "good"); }
    }
    c.x = clamp(c.x, cx(c.z) - HALF + 20, cx(c.z) + HALF - 20);
    if (c.t > 12 && !c.done) { c.done = true; Engine.toast(L.chadGiveUp, "good"); }
  }

  // ---------- The avalanche: always a close call, never catches her ----------
  function startAva() {
    s.ava = { gap: 520, done: false, warned: 0 };
    Sfx.boom(); Engine.shake = 10;
    Engine.toast(L.avalanche, "bad");
    ToePrompt.cancel();
  }

  function updateAva(dt) {
    const a = s.ava;
    if (!a) return;
    if (a.done) { a.gap += 260 * dt; return; }
    if (s.state === "ski" || s.state === "tumble") {
      // it creeps up on her, harder the further ahead she is; the drama is guaranteed
      const left = (AVA_END - s.z) / (AVA_END - AVA_START);
      const want = 60 + 300 * clamp(left, 0, 1);
      const creep = a.gap > want ? 70 : 8;
      a.gap -= creep * dt;
      a.gap = Math.max(45, a.gap);
      if (Math.random() < dt * 3) Sfx.noise(0.3, 0.05);
      a.warned -= dt;
      if (a.gap < 110 && a.warned <= 0) { a.warned = 6; Engine.toast(L.avaClose, "bad"); }
    }
    if (s.z > AVA_END) { a.done = true; Engine.toast(L.avaStops, "good"); }
  }

  function updateGrandparents(dt) {
    if (!s.gp) return;
    s.gp.alt = Math.max(0, s.gp.alt - 80 * dt);
    if (s.gp.alt === 0 && !s.gp.said) { s.gp.said = true; Engine.toast(L.grandparents, "good"); }
  }

  // ---------- Arrival: ski out to the road ----------
  async function finish() {
    const me = s;
    s.state = "arrive";
    ToePrompt.cancel();
    await wait(2600);
    if (me.dead) return;
    s.state = "done";
    Sfx.fanfare();
    Confetti.burst(160, Engine.W);
    await wait(2000);
    if (me.dead) return;
    await Engine.say(L.outro);
    if (me.dead) return;
    Save.finish("wolfCreek", { flowers: s.flowers, toes: s.toes, charm: s.charm });
    Game.showComplete({
      title: L.completeTitle,
      flowers: s.flowers, toes: s.toes, charm: "🎿", charmName: "Skis",
      extra: [
        { icon: "🌲", value: s.treesHit, label: "trees hit" },
        { icon: "🧦", value: s.yardSales, label: "yard sales" },
        { icon: "🛷", value: s.sledHits, label: "times ΣΤΓ got you" },
        { icon: "💌", value: s.notes + "/" + MEMS.length, label: "notes found" },
        { icon: "🌀", value: s.spins, label: "spins landed" },
      ],
      note: L.note,
    });
  }

  // ---------- Drawing ----------
  let use3D = false;
  function skScr() {
    if (use3D) return Ski3D.skierScreen(s, Engine.W, Engine.H);
    return { x: Engine.W / 2 + (s.x - s.camX), y: GY() - 30 };
  }

  function draw(ctx) {
    if (!use3D) return draw2D(ctx);
    try { Ski3D.render(s, Engine.W, Engine.H, Engine.scale, Engine.dpr); }
    catch (e) { console.error(e); use3D = false; Ski3D.show(false); return draw2D(ctx); }
    ctx.clearRect(0, 0, Engine.W, Engine.H);
    overlays(ctx);
  }

  function draw2D(ctx) {
    const W = Engine.W, H = Engine.H, hy = HY(), gy = GY();
    ctx.save();
    if (Engine.shake) ctx.translate(rand(-1, 1) * Engine.shake, rand(-1, 1) * Engine.shake);
    const skX = W / 2 + (s.x - s.camX);
    ctx.translate(skX, gy); ctx.scale(s.zoom, s.zoom); ctx.translate(-skX, -gy);
    const ext = (1 / s.zoom - 1);
    const top = -H * ext - 20, left = -W * ext - 20, right = W + W * ext + 20, bot = H + H * ext + 20;

    // sky: stormy gray → bluebird
    const st = s.storm;
    const sky = ctx.createLinearGradient(0, top, 0, hy);
    sky.addColorStop(0, mix("#3a86c8", "#8d99ae", st)); sky.addColorStop(1, mix("#bde0fe", "#c9ced6", st));
    ctx.fillStyle = sky; ctx.fillRect(left, top, right - left, hy - top + 2);
    // San Juans on the horizon
    ctx.fillStyle = mix("#7d93b2", "#a3acb9", st);
    ctx.beginPath(); ctx.moveTo(left, hy);
    for (let x = left; x <= right; x += 20) ctx.lineTo(x, hy - 24 - 30 * Math.abs(Math.sin((x + s.camX * 0.05) / 47)) - 18 * Math.sin((x + s.camX * 0.05) / 19));
    ctx.lineTo(right, hy); ctx.fill();
    ctx.fillStyle = "#f8f9fa";
    for (let x = left; x <= right; x += 94) { const px = x - ((s.camX * 0.05) % 94); ctx.beginPath(); ctx.moveTo(px - 14, hy - 30); ctx.lineTo(px, hy - 52); ctx.lineTo(px + 14, hy - 30); ctx.fill(); }

    // the slope, row by row
    for (let y = hy; y < bot; y += 3) {
      const k = (y - hy) / (gy - hy);
      if (k <= 0.004) continue;
      const d = D0 / k - D0, z = s.z + d;
      const l = Engine.W / 2 + (cx(z) - HALF - s.camX) * k, r = Engine.W / 2 + (cx(z) + HALF - s.camX) * k;
      const band = Math.floor(z / 120) % 2;
      ctx.fillStyle = band ? "#2f5d46" : "#355f4a";                       // forest beyond the edges
      ctx.fillRect(left, y, right - left, 3.5);
      let snow = band ? "#f4f8fc" : "#e6eef7";
      if (onIce(z)) snow = band ? "#cbd9e6" : "#bccbd9";
      ctx.fillStyle = snow;
      ctx.fillRect(l, y, r - l, 3.5);
      ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fillRect(l - 6 * k, y, 6 * k, 3.5); ctx.fillRect(r, y, 6 * k, 3.5); // snowbanks
    }
    // edge forest: pines lining both sides
    const items = [];
    for (let i = Math.floor((s.z - 200) / 110); i < (s.z + VIEW) / 110; i++) {
      const z = i * 110;
      for (const side of [-1, 1]) items.push({ type: "edgeTree", z, x: cx(z) + side * (HALF + 30 + hash(i, side + 5) * 60), sz: 1 + hash(i, side + 7) * 0.4 });
    }
    for (const o of s.objs) if (!o.got || o.type === "cliff" || o.type === "creek") { if (o.z > s.z - 260 && o.z < s.z + VIEW) items.push(o); }
    if (s.chad) items.push({ type: "chad", z: s.chad.z, x: s.chad.x, c: s.chad });
    if (s.gp && s.z < GRANDPARENTS + 300) items.push({ type: "gp", z: GRANDPARENTS, x: cx(GRANDPARENTS) + HALF - 40 });
    items.push({ type: "me", z: s.z, x: s.x });
    items.sort((a, b) => b.z - a.z);
    for (const o of items) drawItem(ctx, o);

    // falling snow
    ctx.fillStyle = "rgba(255,255,255,.85)";
    for (const f of s.flakes) { if (Math.random() > 0.15 + 0.85 * st) continue; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    overlays(ctx);
  }

  function overlays(ctx) {
    const W = Engine.W, H = Engine.H;
    // the avalanche, roaring up from behind
    if (s.ava && s.ava.gap < 620) drawAva(ctx);
    // gear flying (yard sale)
    for (const g of s.gear) drawGear(ctx, g);
    // tree bomb whiteout
    if (s.white > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(0.92, s.white)})`; ctx.fillRect(0, 0, W, H); }
    for (const f of s.floaters) {
      ctx.globalAlpha = 1 - f.t / 1.8; ctx.font = "800 18px 'Baloo 2', sans-serif"; ctx.textAlign = "center";
      ctx.fillStyle = f.good ? "#2a9d8f" : "#e63946"; ctx.fillText(f.text, f.x, f.y); ctx.globalAlpha = 1;
    }
    if (s.ava && !s.ava.done && s.state !== "done") {
      ctx.font = "800 15px 'Baloo 2', sans-serif"; ctx.textAlign = "center";
      ctx.fillStyle = "#e63946"; ctx.fillText("▼ AVALANCHE " + Math.max(1, Math.round(s.ava.gap / 10)) + "m", W / 2, 96);
    }
    Confetti.draw(ctx);
  }

  function drawItem(ctx, o) {
    const d = o.z - s.z;
    if (d < -250) return;
    const k = kOf(d), y = sy(d), x = sx(o.x, d);
    if (y > Engine.H / s.zoom + 200 || k <= 0) return;
    const fade = clamp((VIEW - d) / 500, 0, 1);  // things fade in out of the storm
    ctx.save(); ctx.globalAlpha = fade;
    switch (o.type) {
      case "edgeTree": case "tree": pineTree(ctx, x, y, 92 * k * o.sz); break;
      case "rock": rock(ctx, x, y, o.r * k); break;
      case "pillow":
        ctx.fillStyle = "rgba(120,150,190,.35)"; ctx.beginPath(); ctx.ellipse(x, y + 2 * k, 50 * k, 12 * k, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.ellipse(x, y - 8 * k, 46 * k, 22 * k, 0, Math.PI, 0); ctx.fill();
        break;
      case "cliff": cliff(ctx, o, d, k, y); break;
      case "creek": creek(ctx, o, d, k, y); break;
      case "flower": shadowDot(ctx, x, y, 10 * k); ctx.translate(x, y - (o.h + 14) * k); ctx.scale(k, k); Art.flower(ctx, 0, 0, s.t, o.hue); break;
      case "snickers": ctx.translate(x, y - 22 * k); ctx.scale(k * 1.1, k * 1.1); Art.snickers(ctx, 0, 0, s.t); break;
      case "note": note(ctx, x, y, k); break;
      case "charm":
        ctx.fillStyle = "rgba(255,230,120,.4)"; ctx.beginPath(); ctx.arc(x, y - 30 * k, (34 + Math.sin(s.t * 5) * 4) * k, 0, Math.PI * 2); ctx.fill();
        ctx.font = `${Math.round(40 * k)}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🎿", x, y - 30 * k);
        break;
      case "sled": if (o.go) sled(ctx, x, y, k, o.dir, s.t, o.yell); break;
      case "chad": if (!(o.c.finale && o.c.sent && d > 600)) sled(ctx, x, y - (o.c.finale && d > 140 ? Math.min(60, (d - 140) * 0.4) * k : 0), k, 0, s.t, o.c.phase === "windup" ? "!!" : null, 1 - o.c.fade, true); break;
      case "gp": {
        const alt = s.gp.alt;
        [-34, 30].forEach((ox, i) => {
          const cxp = x + ox * k, cyp = y - (alt + 40 + i * 20) * k;
          ctx.fillStyle = i ? "#ff595e" : "#ffca3a"; ctx.beginPath(); ctx.arc(cxp, cyp - 40 * k, 26 * k, Math.PI, 0); ctx.fill();
          ctx.strokeStyle = "#555"; ctx.lineWidth = Math.max(1, k);
          ctx.beginPath(); ctx.moveTo(cxp - 26 * k, cyp - 40 * k); ctx.lineTo(cxp, cyp); ctx.lineTo(cxp + 26 * k, cyp - 40 * k); ctx.stroke();
          ctx.fillStyle = "#e9ecef"; ctx.beginPath(); ctx.arc(cxp, cyp, 6 * k, 0, Math.PI * 2); ctx.fill();
        });
        break;
      }
      case "car": ditchCar(ctx, x, y, k); break;
      case "ditchSled":
        ctx.translate(x, y); ctx.rotate(0.5); sled(ctx, 0, 0, k, 0, s.t, null, 1, true, true); break;
      case "sign": signPost(ctx, x, y, k, o.text, o.color); break;
      case "road": road(ctx, d, k, y); break;
      case "me": me(ctx); break;
    }
    ctx.restore();
  }

  function me(ctx) {
    const x = Engine.W / 2 + (s.x - s.camX), y = GY();
    // shadow stays on the snow when she's in the air
    ctx.fillStyle = "rgba(60,80,120,.25)"; ctx.beginPath(); ctx.ellipse(x, y + 2, 26 - Math.min(12, s.h / 12), 8, 0, 0, Math.PI * 2); ctx.fill();
    if (s.state === "tumble") {
      // face-down in the snow, feet up
      ctx.save(); ctx.translate(x, y - 10); ctx.rotate(Math.sin(s.t * 14) * 0.3 + 1.4);
      ctx.fillStyle = "#1b1f2e"; ctx.beginPath(); ctx.ellipse(0, 0, 16, 22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f7a21b"; ctx.beginPath(); ctx.ellipse(-6, 22, 6, 4, 0, 0, Math.PI * 2); ctx.ellipse(6, 22, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x - 18, y - 4, 9, 0, Math.PI * 2); ctx.arc(x + 16, y - 2, 11, 0, Math.PI * 2); ctx.fill();
      return;
    }
    const lift = s.h * 0.55;
    ctx.save(); ctx.translate(x, y - lift); ctx.rotate(s.lean + (s.air && s.bigAir ? Math.sin(s.t * 9) * 0.08 : 0));
    // powder spray when carving
    if (!s.air && Math.abs(s.vx) > 90 && s.state === "ski") {
      ctx.fillStyle = "rgba(255,255,255,.85)";
      for (let i = 0; i < 6; i++) { const q = (s.t * 4 + i / 6) % 1; ctx.beginPath(); ctx.arc(-Math.sign(s.vx) * (18 + q * 30), -q * 30, 4 + q * 7, 0, Math.PI * 2); ctx.fill(); }
    }
    // skis, pointing down the hill (away from us)
    ctx.strokeStyle = "#e63946"; ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-10, 4); ctx.lineTo(-8, -24); ctx.moveTo(10, 4); ctx.lineTo(8, -24); ctx.stroke();
    // poles
    ctx.strokeStyle = "#adb5bd"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-16, -30); ctx.lineTo(-30, -2); ctx.moveTo(16, -30); ctx.lineTo(30, -2); ctx.stroke();
    // penguin from behind: black back, little feet, party hat
    ctx.fillStyle = "#f7a21b"; ctx.beginPath(); ctx.ellipse(-8, -2, 6, 4, 0, 0, Math.PI * 2); ctx.ellipse(8, -2, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1b1f2e"; ctx.beginPath(); ctx.ellipse(0, -28, 17, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-17, -30, 5, 13, 0.5, 0, Math.PI * 2); ctx.ellipse(17, -30, 5, 13, -0.5, 0, Math.PI * 2); ctx.fill(); // flippers
    ctx.fillStyle = "#26304a"; ctx.beginPath(); ctx.arc(0, -54, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#9b5de5"; ctx.beginPath(); ctx.moveTo(-8, -62); ctx.lineTo(8, -62); ctx.lineTo(0, -84); ctx.fill();
    ctx.fillStyle = "#f15bb5"; ctx.beginPath(); ctx.arc(0, -85, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#4cc9f0"; ctx.fillRect(-11, -46, 22, 6); // backpack strap / beacon
    ctx.restore();
  }

  function pineTree(ctx, x, y, h) {
    if (h < 2) return;
    ctx.fillStyle = "rgba(40,60,90,.18)"; ctx.beginPath(); ctx.ellipse(x, y, h * 0.32, h * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#5c4033"; ctx.fillRect(x - h * 0.04, y - h * 0.15, h * 0.08, h * 0.15);
    for (let i = 0; i < 3; i++) {
      const yy = y - h * 0.12 - i * h * 0.27, w = h * (0.34 - i * 0.08);
      ctx.fillStyle = i % 2 ? "#2d6a4f" : "#1b4332";
      ctx.beginPath(); ctx.moveTo(x - w, yy); ctx.lineTo(x, yy - h * 0.4); ctx.lineTo(x + w, yy); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.9)";
      ctx.beginPath(); ctx.moveTo(x - w * 0.55, yy - h * 0.18); ctx.lineTo(x, yy - h * 0.4); ctx.lineTo(x + w * 0.5, yy - h * 0.2); ctx.lineTo(x, yy - h * 0.27); ctx.fill();
    }
  }

  function rock(ctx, x, y, r) {
    ctx.fillStyle = "#495057"; ctx.beginPath(); ctx.ellipse(x, y - r * 0.4, r, r * 0.7, 0, Math.PI, 0); ctx.lineTo(x + r, y); ctx.lineTo(x - r, y); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(x - r * 0.1, y - r * 0.95, r * 0.6, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  }

  function shadowDot(ctx, x, y, r) { ctx.fillStyle = "rgba(60,80,120,.2)"; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.35, 0, 0, Math.PI * 2); ctx.fill(); }

  function spanX(z, k) { return [Engine.W / 2 + (cx(z) - HALF - 30 - s.camX) * k, Engine.W / 2 + (cx(z) + HALF + 30 - s.camX) * k]; }

  function cliff(ctx, o, d, k, y) {
    const [l, r] = spanX(o.z, k);
    ctx.fillStyle = "#6c757d"; ctx.fillRect(l, y, r - l, 18 * k);
    ctx.fillStyle = "#495057";
    for (let x = l; x < r; x += 40 * k) { ctx.beginPath(); ctx.moveTo(x, y + 18 * k); ctx.lineTo(x + 20 * k, y + 40 * k); ctx.lineTo(x + 40 * k, y + 18 * k); ctx.fill(); }
    ctx.fillStyle = "#fff"; ctx.fillRect(l, y - 6 * k, r - l, 8 * k); // snowy lip
    if (d > 0) { ctx.font = `800 ${Math.max(9, Math.round(26 * k))}px 'Baloo 2', sans-serif`; ctx.textAlign = "center"; ctx.fillStyle = "#e63946"; ctx.fillText("⚠ CLIFF", Engine.W / 2 + (cx(o.z) - s.camX) * k, y - 16 * k); }
  }

  function creek(ctx, o, d, k, y) {
    const [l, r] = spanX(o.z, k);
    ctx.fillStyle = "#3f7fa8"; ctx.fillRect(l, y - 22 * k, r - l, 30 * k);
    ctx.fillStyle = "rgba(190,225,245,.6)";
    for (let x = l + ((s.t * 50 * k) % (30 * k)); x < r; x += 30 * k) ctx.fillRect(x, y - 10 * k, 12 * k, 2 * k);
    for (const b of o.bridges) {
      const bx = Engine.W / 2 + (b - s.camX) * k;
      ctx.fillStyle = "#fff"; Art.rr(ctx, bx - 55 * k, y - 26 * k, 110 * k, 38 * k, 10 * k); ctx.fill();
      ctx.fillStyle = "rgba(120,150,190,.3)"; ctx.fillRect(bx - 50 * k, y + 6 * k, 100 * k, 4 * k);
    }
  }

  function note(ctx, x, y, k) {
    ctx.fillStyle = "rgba(255,230,120,.38)"; ctx.beginPath(); ctx.arc(x, y - 36 * k, (36 + Math.sin(s.t * 5) * 4) * k, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8d5b3b"; ctx.fillRect(x - 2 * k, y - 40 * k, 4 * k, 40 * k);      // stake
    ctx.save(); ctx.translate(x, y - 50 * k); ctx.rotate(Math.sin(s.t * 2) * 0.12);
    ctx.fillStyle = "#fff8ec"; ctx.fillRect(-20 * k, -14 * k, 40 * k, 28 * k);
    ctx.strokeStyle = "#f4a6b5"; ctx.lineWidth = Math.max(1, 2 * k);
    ctx.beginPath(); ctx.moveTo(-20 * k, -14 * k); ctx.lineTo(0, 2 * k); ctx.lineTo(20 * k, -14 * k); ctx.stroke();
    ctx.fillStyle = "#e63946"; ctx.font = `${Math.round(12 * k)}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("♥", 0, 6 * k);
    ctx.restore();
  }

  // a ΣΤΓ snowmobile. dir: driving sideways (±1) or away from us (0)
  function sled(ctx, x, y, k, dir, t, yell, alpha, chad, stuck) {
    ctx.save(); ctx.globalAlpha *= alpha == null ? 1 : alpha;
    ctx.translate(x, y); ctx.scale(k, k);
    if (!stuck) { ctx.fillStyle = "rgba(255,255,255,.8)"; for (let i = 0; i < 4; i++) { const q = (t * 3 + i / 4) % 1; ctx.beginPath(); ctx.arc(-dir * (30 + q * 30), -6 - q * 16, 6 + q * 8, 0, Math.PI * 2); ctx.fill(); } }
    if (dir) {
      ctx.scale(dir, 1);
      ctx.fillStyle = "#212529"; Art.rr(ctx, -34, -10, 50, 10, 4); ctx.fill();          // track
      ctx.strokeStyle = "#212529"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(10, -2); ctx.lineTo(44, -2); ctx.lineTo(48, -8); ctx.stroke(); // ski
      ctx.fillStyle = "#7b1e3a"; ctx.beginPath(); ctx.moveTo(-34, -10); ctx.lineTo(-30, -26); ctx.lineTo(18, -26); ctx.lineTo(40, -12); ctx.lineTo(-34, -10); ctx.fill();
      ctx.fillStyle = "#f1e3c8"; ctx.font = "800 11px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.save(); ctx.scale(dir, 1); ctx.fillText("ΣΤΓ", 0, -17); ctx.restore();
      ctx.fillStyle = "#1d3557"; Art.rr(ctx, -16, -48, 16, 24, 5); ctx.fill();           // rider
      ctx.fillStyle = "#ffd7b5"; ctx.beginPath(); ctx.arc(-8, -54, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#7b1e3a"; ctx.beginPath(); ctx.arc(-8, -56, 7.5, Math.PI, 0); ctx.fill(); ctx.fillRect(-20, -57, 8, 3); // backwards cap
    } else {
      ctx.fillStyle = "#212529"; Art.rr(ctx, -20, -14, 40, 14, 4); ctx.fill();
      ctx.fillStyle = "#7b1e3a"; Art.rr(ctx, -26, -34, 52, 22, 8); ctx.fill();
      ctx.fillStyle = "#f1e3c8"; ctx.font = "800 12px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("ΣΤΓ", 0, -23);
      ctx.fillStyle = "#1d3557"; Art.rr(ctx, -12, -60, 24, 28, 7); ctx.fill();
      ctx.fillStyle = "#ffd7b5"; ctx.beginPath(); ctx.arc(0, -66, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#7b1e3a"; ctx.beginPath(); ctx.arc(0, -68, 9.5, Math.PI, 0); ctx.fill(); ctx.fillRect(-5, -66, 10, 5);
      ctx.strokeStyle = "#555"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(18, -30); ctx.lineTo(22, -78); ctx.stroke();   // antenna flag
      ctx.fillStyle = "#ff6b00"; ctx.beginPath(); ctx.moveTo(22, -78); ctx.lineTo(36, -73); ctx.lineTo(22, -68); ctx.fill();
      if (chad && !stuck) { ctx.fillStyle = "#fff"; ctx.font = "800 9px 'Baloo 2', sans-serif"; ctx.fillText("CHAD", 0, -46); }
    }
    ctx.restore();
    if (yell) {
      ctx.font = `800 ${Math.max(10, Math.round(16 * k))}px 'Baloo 2', sans-serif`; ctx.textAlign = "center";
      ctx.lineWidth = 4; ctx.strokeStyle = "#fff"; ctx.strokeText(yell, x, y - 80 * k);
      ctx.fillStyle = "#e63946"; ctx.fillText(yell, x, y - 80 * k);
    }
  }

  function ditchCar(ctx, x, y, k) {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.rotate(-0.28);
    ctx.fillStyle = "#4a6fa5"; Art.rr(ctx, -40, -46, 80, 34, 9); ctx.fill();
    ctx.fillStyle = "#bde0fe"; Art.rr(ctx, -30, -40, 60, 14, 5); ctx.fill();
    ctx.fillStyle = "#212529"; ctx.beginPath(); ctx.arc(-26, -10, 9, 0, Math.PI * 2); ctx.arc(26, -10, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(0, -48, 44, 10, 0, 0, Math.PI * 2); ctx.fill();     // snow on the roof
    ctx.beginPath(); ctx.ellipse(-10, -4, 50, 14, 0, 0, Math.PI * 2); ctx.fill();                              // buried in the ditch
    ctx.restore();
    ctx.font = `800 ${Math.max(10, Math.round(14 * k))}px 'Baloo 2', sans-serif`; ctx.textAlign = "center"; ctx.fillStyle = "#e63946";
    ctx.fillText("stuck. again.", x, y - 70 * k);
  }

  function signPost(ctx, x, y, k, text, color) {
    const fs = Math.max(6, Math.round(14 * k));
    ctx.font = `800 ${fs}px 'Baloo 2', sans-serif`;
    const w = ctx.measureText(text).width + 16 * k;
    const bx = clamp(x, w / 2 + 2, Engine.W - w / 2 - 2);
    ctx.fillStyle = "#5c4033"; ctx.fillRect(x - 3 * k, y - 60 * k, 6 * k, 60 * k);
    ctx.fillStyle = color || "#2d6a4f"; Art.rr(ctx, bx - w / 2, y - 92 * k, w, 32 * k, 6 * k); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(1, 1.5 * k); Art.rr(ctx, bx - w / 2 + 3 * k, y - 89 * k, w - 6 * k, 26 * k, 4 * k); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, bx, y - 75 * k);
  }

  function road(ctx, d, k, y) {
    const [l, r] = spanX(FINISH, k);
    ctx.fillStyle = "#495057"; ctx.fillRect(l - 200, y - 50 * k, r - l + 400, 60 * k);
    ctx.fillStyle = "#ffd60a";
    for (let x = l - 200; x < r + 200; x += 40 * k) ctx.fillRect(x, y - 22 * k, 20 * k, 4 * k);
  }

  function drawAva(ctx) {
    const W = Engine.W, H = Engine.H, a = s.ava;
    const close = clamp(1 - (a.gap - 45) / 560, 0, 1);
    const topY = H + 30 - (H + 30 - (skScr().y + 50)) * close;
    ctx.fillStyle = "rgba(235,242,250,.96)";
    ctx.fillRect(0, topY + 20, W, H - topY);
    for (let i = 0; i < 9; i++) {
      const x = (i / 8) * W, r = 46 + 18 * Math.sin(s.t * 3 + i * 1.7);
      ctx.fillStyle = i % 2 ? "#ffffff" : "#e2eaf3";
      ctx.beginPath(); ctx.arc(x, topY + 20 + Math.sin(s.t * 4 + i) * 8, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "rgba(200,212,228,.9)";
    for (let i = 0; i < 6; i++) { const q = (s.t * 0.9 + i / 6) % 1; ctx.beginPath(); ctx.arc((i * 83 + s.t * 30) % W, topY - q * 60, 6 + q * 6, 0, Math.PI * 2); ctx.fill(); }
  }

  function drawGear(ctx, g) {
    ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.r); ctx.globalAlpha = 1 - g.t / 1.6;
    if (g.kind === "ski") { ctx.fillStyle = "#e63946"; Art.rr(ctx, -4, -26, 8, 52, 4); ctx.fill(); }
    else if (g.kind === "pole") { ctx.fillStyle = "#adb5bd"; ctx.fillRect(-1.5, -24, 3, 48); }
    else { ctx.fillStyle = "#9b5de5"; ctx.beginPath(); ctx.moveTo(-9, 8); ctx.lineTo(9, 8); ctx.lineTo(0, -16); ctx.fill(); }
    ctx.restore();
  }

  function mix(a, b, t) {
    const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
    return "rgb(" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(",") + ")";
  }

  function updateHud() {
    $("hudFlowers").textContent = s.flowers;
    $("hudToes").textContent = s.toes;
    const p = clamp(s.z / FINISH, 0, 1);
    $("progressFill").style.width = p * 100 + "%";
    $("progressPeng").style.left = `calc(${p * 100}% - 10px)`;
  }

  return {
    id: "wolfCreek",
    async start() {
      reset();
      const me = s;
      Engine.setControls("◀ CARVE", "CARVE ▶");
      use3D = false;
      try {
        if (typeof THREE !== "undefined" && Ski3D.init($("stage"))) {
          Ski3D.build({ s, ground, cx, HALF, onIce, pitch, chutes: CHUTES, edge: edgeScenery(), GRANDPARENTS });
          Ski3D.show(true); use3D = true;
        }
      } catch (e) { console.error(e); use3D = false; Ski3D.show(false); }
      await Engine.say(L.intro);
      if (me.dead) return;
      // click in first
      Engine.toast(L.bindingPrompt);
      await new Promise((r) => ToePrompt.start((ok) => { if (ok) me.toes++; r(); }, 3.2));
      if (me.dead) return;
      Engine.presses.left = Engine.presses.right = 0;
      s.state = "ski";
    },
    update, draw,
    _debug: () => s, // used by the test script
    _cx: (z) => cx(z),
    _3d: () => use3D,
    _ground: (x, z) => ground(x, z),
    stop() { Ski3D.show(false); if (s.closeMemory) s.closeMemory(); ToePrompt.cancel(); s.state = "done"; s.dead = true; Engine.closeDialog(); Engine.hideBanner(); Confetti.bits = []; },
  };
})();
