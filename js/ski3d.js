// Real 3D view for Wolf Creek (three.js): a low chase camera behind the penguin, open rolling
// powder, hazy sky, chunky low-poly rocks, and big powder spray. The level owns all the game
// logic; this file only draws it. If WebGL isn't available the level falls back to its 2D view.

const Ski3D = (() => {
  let renderer, glCanvas, scene, camera, sun, hemi, sky, fog;
  let sparkle, tracks, theme = {};
  let terrain, tGeo, trees, rocks, pillows, shadow, peng, spray, snow, mountains;
  let built = [], dyn = {}, texCache = {};
  let world, lastT = 0, camY = null, camLX = 0, camYaw = 0, originKey = "";
  const NX = 72, NZ = 150;
  // grid offsets: ~25 units apart near her, stretching to ±2900 sideways and 3800 ahead
  const XOFF = Array.from({ length: NX + 1 }, (_, i) => { const u = i / NX * 2 - 1; return Math.sign(u) * (Math.abs(u) * 600 + Math.pow(Math.abs(u), 3) * 2300); });
  const ZOFF = Array.from({ length: NZ + 1 }, (_, i) => { const v = i / NZ; return -560 + v * 1900 + Math.pow(v, 3) * 2460; });
  const MAX_TREES = 1500, MAX_ROCKS = 500, MAX_PILLOWS = 80;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---------- helpers ----------
  const hash2 = (a, b) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };
  function lerpColor(a, b, t) { return new THREE.Color(a).lerp(new THREE.Color(b), t); }

  // merge simple geometries (each with a flat color) into one vertex-colored geometry
  function merge(parts) {
    const pos = [], col = [];
    for (const { geo, color, m } of parts) {
      const g = (geo.index ? geo.toNonIndexed() : geo).clone();
      if (m) g.applyMatrix4(m);
      const p = g.attributes.position.array, c = new THREE.Color(color);
      for (let i = 0; i < p.length; i += 3) { pos.push(p[i], p[i + 1], p[i + 2]); col.push(c.r, c.g, c.b); }
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    out.computeVertexNormals();
    return out;
  }
  const M = (x, y, z, sx, sy, sz, ry) => {
    const m = new THREE.Matrix4();
    m.compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry || 0, 0)), V(sx || 1, sy || 1, sz || 1));
    return m;
  };

  function canvasTex(key, w, h, draw) {
    if (texCache[key]) return texCache[key];
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d"); draw(x, w, h);
    const t = new THREE.CanvasTexture(c);
    t.minFilter = THREE.LinearFilter;
    texCache[key] = { tex: t, w, h };
    return texCache[key];
  }
  function sprite(key, w, h, draw, worldW, bottom) {
    const { tex } = canvasTex(key, w, h, draw);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.scale.set(worldW, worldW * h / w, 1);
    if (bottom) sp.center.set(0.5, 0);
    return sp;
  }
  function textSprite(text, color, worldH, bg) {
    const fs = 44;
    const meas = document.createElement("canvas").getContext("2d");
    meas.font = `800 ${fs}px 'Baloo 2', sans-serif`;
    const w = Math.ceil(meas.measureText(text).width) + 40, h = 72;
    return sprite("txt:" + text + color + bg, w, h, (x) => {
      x.font = `800 ${fs}px 'Baloo 2', sans-serif`; x.textAlign = "center"; x.textBaseline = "middle";
      if (bg) { x.fillStyle = bg; Art.rr(x, 2, 2, w - 4, h - 4, 14); x.fill(); x.fillStyle = color; x.fillText(text, w / 2, h / 2 + 2); return; }
      x.lineWidth = 10; x.strokeStyle = "#fff"; x.strokeText(text, w / 2, h / 2 + 2);
      x.fillStyle = color; x.fillText(text, w / 2, h / 2 + 2);
    }, worldH * w / h, true);
  }

  // soft round points (spray + snowfall) with per-point size and alpha
  function pointsMaterial() {
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uScale: { value: 400 }, uColor: { value: new THREE.Color("#ffffff") } },
      vertexShader: `attribute float size; attribute float alpha; varying float vA; uniform float uScale;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * uScale / max(1.0, -mv.z);
        gl_Position = projectionMatrix * mv; vA = alpha; }`,
      fragmentShader: `varying float vA; uniform vec3 uColor;
        void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
        gl_FragColor = vec4(uColor, vA * smoothstep(0.5, 0.05, d)); }`,
    });
  }
  function makePoints(n) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("size", new THREE.Float32BufferAttribute(new Float32Array(n), 1));
    g.setAttribute("alpha", new THREE.Float32BufferAttribute(new Float32Array(n), 1));
    const p = new THREE.Points(g, pointsMaterial());
    p.frustumCulled = false;
    return p;
  }

  // ---------- models ----------
  function treeGeo(desert) {
    const parts = [{ geo: new THREE.CylinderGeometry(3, 4, 16, 6), color: "#5c4033", m: M(0, 8, 0) }];
    for (let i = 0; i < 3; i++) {
      const y = 14 + i * 22, r = 30 - i * 8;
      parts.push({ geo: new THREE.ConeGeometry(r, 34, 7), color: i % 2 ? "#2d6a4f" : "#1f5040", m: M(0, y + 17, 0) });
      parts.push({ geo: new THREE.ConeGeometry(r * 0.62, 14, 7), color: desert ? "#2f6b4a" : "#f4f8fc", m: M(0, y + 28, 0) });
    }
    return merge(parts);
  }
  function rockGeo(desert) {
    const r = new THREE.DodecahedronGeometry(1, 0);
    const cap = new THREE.DodecahedronGeometry(0.75, 0);
    return merge([{ geo: r, color: desert ? "#a5553a" : "#4a5363", m: M(0, 0.35, 0, 1, 0.8, 1) },
      { geo: cap, color: desert ? "#c98a5e" : "#f4f8fc", m: M(0.05, 0.92, 0, 0.9, 0.28, 0.9) }]);
  }

  // The penguin, rigged: skis on the snow, legs, a body that crouches/leans, arms that hold poles.
  function makePenguin() {
    const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
    const black = mat("#1b1f2e"), red = mat("#e63946"), orange = mat("#f7a21b"), grey = mat("#adb5bd");
    const root = new THREE.Group();
    const rig = { root, skis: [], legs: [], arms: [], poles: [] };
    for (const sx of [-1, 1]) {
      const ski = new THREE.Group(); ski.position.set(sx * 6, 0, 0);
      const plank = new THREE.Mesh(new THREE.BoxGeometry(4, 1.4, 54), red); plank.position.set(0, 0.7, -6); ski.add(plank);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(4, 1.4, 7), red); tip.position.set(0, 2.4, -35); tip.rotation.x = 0.5; ski.add(tip);
      const boot = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 10), mat("#4cc9f0")); boot.position.set(0, 4, -1); ski.add(boot);
      root.add(ski); rig.skis.push(ski);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3, 10, 6), black); leg.position.set(sx * 5.5, 11, 0); root.add(leg); rig.legs.push(leg);
    }
    const body = new THREE.Group(); body.position.y = 15; root.add(body); rig.body = body;
    const torso = new THREE.Mesh(new THREE.SphereGeometry(11, 14, 12), black); torso.scale.set(1, 1.3, 0.92); torso.position.y = 9; body.add(torso);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(8.5, 12, 10), mat("#f8f9fa")); belly.scale.set(1, 1.3, 0.6); belly.position.set(0, 8, -6); body.add(belly);
    const head = new THREE.Mesh(new THREE.SphereGeometry(8.5, 12, 10), mat("#26304a")); head.position.y = 27; body.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(2.4, 7, 6), orange); beak.rotation.x = -Math.PI / 2; beak.position.set(0, 26, -9); body.add(beak);
    const goggles = new THREE.Mesh(new THREE.BoxGeometry(14, 4, 3), mat("#ffbe0b")); goggles.position.set(0, 29.5, -6.5); body.add(goggles);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(5.5, 15, 10), mat("#9b5de5")); hat.position.y = 41; hat.rotation.x = 0.15; body.add(hat);
    const pom = new THREE.Mesh(new THREE.SphereGeometry(2.6, 8, 6), mat("#f15bb5")); pom.position.set(0, 49, 1); body.add(pom);
    const pack = new THREE.Mesh(new THREE.BoxGeometry(14, 16, 6), mat("#e76f51")); pack.position.set(0, 12, 10.5); body.add(pack);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(18, 3, 1.5), mat("#4cc9f0")); strap.position.set(0, 17, 13.6); body.add(strap);
    for (const sx of [-1, 1]) {
      const shoulder = new THREE.Group(); shoulder.position.set(sx * 10.5, 15, 0); body.add(shoulder);
      const flip = new THREE.Mesh(new THREE.SphereGeometry(3.6, 8, 6), black); flip.scale.set(0.55, 2.2, 1); flip.position.y = -7; shoulder.add(flip);
      const hand = new THREE.Group(); hand.position.y = -14; shoulder.add(hand);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 38, 5), grey); pole.position.y = -16; hand.add(pole);
      const basket = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.6, 8), grey); basket.position.y = -31; hand.add(basket);
      rig.arms.push(shoulder); rig.poles.push(hand);
    }
    root.userData.rig = rig;
    return root;
  }

  // The penguin on her mountain bike (white helmet under the party hat, like the photos)
  function makeBiker(frameColor, rival) {
    const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
    const black = mat(rival ? "#1d3557" : "#1b1f2e"), tire = mat("#222"), frame = mat(frameColor || "#2a9d8f"), grey = mat("#adb5bd");
    const root = new THREE.Group();
    const rig = { root, bike: new THREE.Group(), wheels: [], cranks: [] };
    root.add(rig.bike);
    for (const z of [-24, 22]) {
      const w = new THREE.Mesh(new THREE.TorusGeometry(12, 2.6, 8, 20), tire); w.rotation.y = Math.PI / 2; w.position.set(0, 13, z); rig.bike.add(w); rig.wheels.push(w);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 4, 6), grey); hub.rotation.z = Math.PI / 2; hub.position.set(0, 13, z); rig.bike.add(hub);
    }
    const bar = (len, x, y, z, rx) => { const b = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, len), frame); b.position.set(x, y, z); b.rotation.x = rx; rig.bike.add(b); };
    bar(34, 0, 24, -2, 0.12);     // top tube
    bar(30, 0, 18, -8, -0.55);    // down tube
    bar(22, 0, 16, 13, 0.5);      // chain stay
    const fork = new THREE.Mesh(new THREE.BoxGeometry(2.4, 18, 2.4), frame); fork.position.set(0, 20, -22); fork.rotation.x = -0.3; rig.bike.add(fork);
    const hb = new THREE.Mesh(new THREE.BoxGeometry(26, 2, 2), grey); hb.position.set(0, 30, -19); rig.bike.add(hb);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(5, 2, 10), mat("#111")); seat.position.set(0, 30, 9); rig.bike.add(seat);
    const body = new THREE.Group(); body.position.set(0, 32, 4); root.add(body); rig.body = body;
    const torso = new THREE.Mesh(new THREE.SphereGeometry(10, 14, 12), black); torso.scale.set(1, 1.25, 0.95); torso.position.y = 9; body.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(8, 12, 10), mat(rival ? "#ffd7b5" : "#26304a")); head.position.set(0, 25, -2); body.add(head);
    if (rival) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(8.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat("#7b1e3a")); cap.position.set(0, 26, -2); body.add(cap);
    } else {
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(8.8, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat("#f8f9fa")); helmet.position.set(0, 27, -2); body.add(helmet);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(14, 3.5, 3), mat("#6c5ce7")); visor.position.set(0, 27, -10); body.add(visor);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(2.2, 6, 6), mat("#f7a21b")); beak.rotation.x = -Math.PI / 2; beak.position.set(0, 23, -10.5); body.add(beak);
      const hat = new THREE.Mesh(new THREE.ConeGeometry(5, 13, 10), mat("#9b5de5")); hat.position.set(0, 40, -2); body.add(hat);
      const pom = new THREE.Mesh(new THREE.SphereGeometry(2.4, 8, 6), mat("#f15bb5")); pom.position.set(0, 47, -2); body.add(pom);
      const pack = new THREE.Mesh(new THREE.BoxGeometry(12, 12, 5), mat("#e63946")); pack.position.set(0, 12, 9); body.add(pack);
    }
    for (const sx of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 22, 6), black); arm.position.set(sx * 9, 8, -10); arm.rotation.x = -1.0; body.add(arm);
      const crank = new THREE.Group(); crank.position.set(sx * 4, 16, 2); root.add(crank); rig.cranks.push(crank);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 14, 6), black); leg.position.set(0, 7, 0); crank.add(leg);
      const foot = new THREE.Mesh(new THREE.SphereGeometry(3.2, 8, 6), mat("#f7a21b")); foot.scale.set(1, 0.6, 1.4); foot.position.set(0, 0, -1); crank.add(foot);
    }
    // wingsuit wings + parachute (hidden until the cliff)
    const wingMat = new THREE.MeshLambertMaterial({ color: "#f15bb5", side: THREE.DoubleSide });
    rig.wings = new THREE.Mesh(new THREE.PlaneGeometry(64, 26), wingMat); rig.wings.rotation.x = -Math.PI / 2; rig.wings.position.set(0, 10, 0); rig.wings.visible = false; body.add(rig.wings);
    root.userData.rig = rig;
    return root;
  }

  function poseBike(r, s, dt, speed) {
    const fly = s.mode === "fly";
    r.bike.visible = !fly;
    r.wings.visible = fly;
    r.cranks.forEach((c) => (c.visible = !fly));
    const spin = speed * dt / 12;
    r.wheels.forEach((w) => (w.rotation.x -= spin));
    r.crank = (r.crank || 0) + (s.air || fly ? 0 : spin * 0.5);
    r.cranks.forEach((c, i) => { const a = r.crank + i * Math.PI; c.position.set((i ? 1 : -1) * 4, 16 + Math.sin(a) * 5, 2 + Math.cos(a) * 5); });
    if (fly) { r.body.position.set(0, 22, 0); r.body.rotation.set(-1.35, 0, -(s.lean || 0) * 0.6); return; }
    const crouch = (s.comp || 0) + (s.air ? 0.3 : 0);
    r.body.position.set((s.lean || 0) * 4, 32 - crouch * 6, 4);
    r.body.rotation.set(-0.35 - crouch * 0.3, 0, 0);
  }

  // pose the rig from the skier's state
  function pose(s, dt) {
    const r = peng.userData.rig;
    const crouch = 0.25 + 0.45 * s.tuck + 0.6 * s.comp + (s.air ? 0.25 : 0);
    const lean = s.lean;
    // skis tip onto their edges in a turn; spread a touch in the air
    r.skis.forEach((k, i) => { k.rotation.z = -lean * 0.7; k.position.x = (i ? 1 : -1) * (6 + (s.air ? 2 : 0)); k.rotation.x = s.air ? -0.12 : 0; });
    // hips drop and shift into the turn (angulation)
    r.body.position.set(lean * 9, 15 - crouch * 7, crouch * 2);
    r.body.rotation.set(-0.25 - crouch * 0.45, 0, -lean * 0.85);
    r.legs.forEach((l, i) => { l.position.set((i ? 1 : -1) * 5.5 + lean * 4, 10 - crouch * 3, 0); l.rotation.z = -lean * 0.9; l.scale.y = 1 - crouch * 0.35; });
    // arms: forward and ready; tucked when straight; out wide in the air; reach to plant a pole
    r.arms.forEach((a, i) => {
      const sx = i ? 1 : -1;
      let ax = -0.7, az = sx * 0.35, px = 0.5;
      ax += s.tuck * -0.6; az -= sx * s.tuck * 0.25; px += s.tuck * 1.1;  // tuck: hands forward, poles back
      if (s.air) { ax = -0.4; az = sx * (1.1 + Math.sin(s.t * 8) * 0.15); px = 0.2; }
      if (s.plant && s.plant.side === sx && !s.air) { const q = Math.sin((1 - s.plant.t / 0.4) * Math.PI); ax -= 0.6 * q; px -= 0.9 * q; }
      a.rotation.set(ax, 0, az);
      r.poles[i].rotation.set(px, 0, 0);
    });
  }

  function makeSled(chad) {
    const g = new THREE.Group();
    const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
    const track = new THREE.Mesh(new THREE.BoxGeometry(20, 9, 40), mat("#212529")); track.position.set(0, 5, 6); g.add(track);
    const body = new THREE.Mesh(new THREE.BoxGeometry(26, 13, 30), mat("#7b1e3a")); body.position.set(0, 15, -6); g.add(body);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(24, 9, 16), mat("#7b1e3a")); nose.position.set(0, 12, -24); nose.rotation.x = -0.35; g.add(nose);
    for (const sx of [-1, 1]) { const ski = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 30), mat("#212529")); ski.position.set(sx * 12, 1, -24); g.add(ski); }
    const rider = new THREE.Mesh(new THREE.CylinderGeometry(7, 8, 22, 8), mat("#1d3557")); rider.position.set(0, 32, 4); g.add(rider);
    const head = new THREE.Mesh(new THREE.SphereGeometry(6.5, 10, 8), mat("#ffd7b5")); head.position.set(0, 48, 4); g.add(head);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(6.8, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat("#7b1e3a")); cap.position.set(0, 49, 4); g.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(8, 1.5, 7), mat("#7b1e3a")); brim.position.set(0, 49, 11); g.add(brim); // backwards cap
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 46, 4), mat("#555")); ant.position.set(10, 40, 18); g.add(ant);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), new THREE.MeshLambertMaterial({ color: "#ff6b00", side: THREE.DoubleSide })); flag.position.set(16, 59, 18); g.add(flag);
    const label = textSprite(chad ? "ΣΤΓ · CHAD" : "ΣΤΓ", "#f1e3c8", 9, "#7b1e3a"); label.position.set(0, 62, 0); g.add(label);
    return g;
  }

  function makeCar() {
    const g = new THREE.Group();
    const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
    const body = new THREE.Mesh(new THREE.BoxGeometry(44, 20, 80), mat("#4a6fa5")); body.position.y = 14; g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(40, 16, 44), mat("#bde0fe")); cab.position.set(0, 30, 4); g.add(cab);
    const roof = new THREE.Mesh(new THREE.SphereGeometry(24, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat("#f4f8fc")); roof.scale.set(1, 0.3, 1.3); roof.position.set(0, 38, 4); g.add(roof);
    const drift = new THREE.Mesh(new THREE.SphereGeometry(40, 12, 8), mat("#f4f8fc")); drift.scale.set(1.2, 0.45, 1.5); drift.position.set(-14, 2, 0); g.add(drift);
    g.rotation.z = 0.3; g.rotation.y = 0.4;
    return g;
  }

  // a ribbon that lies on the snow across the run (creek, road)
  function ribbon(z, width, color, extra) {
    const span = world.HALF * 2 + 900, n = 60;
    const geo = new THREE.PlaneGeometry(span, width, n, 1);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, c0 = world.cx(z);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + c0, zz = z - p.getZ(i);
      p.setX(i, x); p.setZ(i, -zz); p.setY(i, world.ground(x, zz) + (extra || 1.5));
    }
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }));
  }

  // a soft snow surface: faint wind ripples and speckles, tiled in world space
  function snowTexture() {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const x = c.getContext("2d");
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 26; i++) {                          // wind ripples
      const y0 = (i / 26) * 256 + Math.sin(i * 7.1) * 6;
      x.strokeStyle = `rgba(150,175,210,${0.05 + 0.05 * Math.abs(Math.sin(i * 3.3))})`; x.lineWidth = 2 + (i % 3);
      x.beginPath();
      for (let k = 0; k <= 256; k += 8) x.lineTo(k, y0 + Math.sin(k / 30 + i) * 4 + Math.sin(k / 11 + i * 2) * 1.5);
      x.stroke();
    }
    for (let i = 0; i < 1400; i++) {                        // speckles
      const a = Math.random() * 0.08;
      x.fillStyle = Math.random() < 0.7 ? `rgba(130,160,200,${a})` : `rgba(255,255,255,${a * 4})`;
      x.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
    return t;
  }

  // ski tracks: two grooves behind her, as a strip that follows the last few hundred units
  const TRACK_N = 160;
  function makeTracks() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(TRACK_N * 2 * 2 * 3), 3));
    const idx = [];
    for (let k = 0; k < 2; k++) for (let i = 0; i < TRACK_N - 1; i++) {
      const a = (k * TRACK_N + i) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: "#a9bdd6", transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
    m.frustumCulled = false; m.renderOrder = 1;
    m.userData.pts = [];
    return m;
  }
  function updateTracks(s) {
    const pts = tracks.userData.pts;
    const last = pts[pts.length - 1];
    const onSnow = !s.air && s.state !== "tumble" && s.h < 3;
    if (!last || Math.hypot(s.x - last.x, s.z - last.z) > 9) {
      pts.push({ x: s.x, z: s.z, hd: s.heading, on: onSnow });
      if (pts.length > TRACK_N) pts.shift();
    }
    const p = tracks.geometry.attributes.position;
    for (let k = 0; k < 2; k++) {
      const side = k ? 1 : -1;
      for (let i = 0; i < TRACK_N; i++) {
        const q = pts[Math.max(0, pts.length - TRACK_N + i)] || pts[0];
        const base = (k * TRACK_N + i) * 2;
        if (!q) { p.setXYZ(base, 0, -1e5, 0); p.setXYZ(base + 1, 0, -1e5, 0); continue; }
        const cs = Math.cos(q.hd), sn = Math.sin(q.hd);
        const ox = cs * side * 6, oz = -sn * side * 6;       // perpendicular to the skis
        const y = q.on ? world.ground(q.x + ox, q.z + oz) + 0.6 : -1e5;
        p.setXYZ(base, q.x + ox - cs * 1.6, y, -(q.z + oz + sn * 1.6));
        p.setXYZ(base + 1, q.x + ox + cs * 1.6, y, -(q.z + oz - sn * 1.6));
      }
    }
    p.needsUpdate = true;
  }

  function dirtTexture() {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const x = c.getContext("2d");
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      const a = Math.random() * 0.12;
      x.fillStyle = Math.random() < 0.6 ? `rgba(90,60,30,${a})` : `rgba(255,240,210,${a * 2})`;
      x.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
    for (let i = 0; i < 160; i++) { // grass tufts
      x.strokeStyle = `rgba(80,90,40,${0.1 + Math.random() * 0.15})`; x.lineWidth = 1;
      const px = Math.random() * 256, py = Math.random() * 256;
      for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(px, py); x.lineTo(px + rand(-4, 4), py - rand(4, 9)); x.stroke(); }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
    return t;
  }

  // a storefront on Main Ave (faces the street)
  function makeBuilding(o) {
    const g = new THREE.Group();
    const key = "bld" + o.color + o.text;
    const { tex } = canvasTex(key, 256, 256, (x) => {
      x.fillStyle = o.color; x.fillRect(0, 0, 256, 256);
      x.fillStyle = "rgba(255,255,255,.12)"; for (let yy = 0; yy < 256; yy += 16) x.fillRect(0, yy, 256, 2);   // brick lines
      x.fillStyle = "#2b2d42"; for (let k = 0; k < 3; k++) { x.fillRect(24 + k * 76, 40, 52, 60); }          // upstairs windows
      x.fillStyle = "#ffe8a3"; for (let k = 0; k < 3; k++) { x.fillRect(28 + k * 76, 44, 44, 52); }
      x.fillStyle = "#1b1f2e"; x.fillRect(16, 150, 224, 96);                                              // shop window
      x.fillStyle = "#ffd166"; x.fillRect(22, 156, 212, 84);
      x.fillStyle = o.awning || "#e63946"; x.fillRect(8, 118, 240, 26);
      x.fillStyle = "#fff"; x.font = "800 22px 'Baloo 2', sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(o.text, 128, 132);
    });
    const front = new THREE.MeshLambertMaterial({ map: tex }), side = new THREE.MeshLambertMaterial({ color: o.color });
    const b = new THREE.Mesh(new THREE.BoxGeometry(o.w, o.h, 70), [side, side, side, side, front, side]);
    b.position.set(0, o.h / 2, 0); g.add(b);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(o.w + 6, 6, 76), new THREE.MeshLambertMaterial({ color: "#4a4e69" })); roof.position.y = o.h + 3; g.add(roof);
    return g;
  }

  function makeHouse(o) {
    const g = new THREE.Group();
    const wall = new THREE.MeshLambertMaterial({ color: "#f4e1c1" }), roofM = new THREE.MeshLambertMaterial({ color: "#7b3f2b" });
    const b = new THREE.Mesh(new THREE.BoxGeometry(150, 80, 110), wall); b.position.y = 40; g.add(b);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(115, 60, 4), roofM); roof.rotation.y = Math.PI / 4; roof.position.y = 110; roof.scale.set(1, 1, 0.8); g.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(26, 44, 2), new THREE.MeshLambertMaterial({ color: "#2a9d8f" })); door.position.set(0, 22, 56); g.add(door);
    const banner = textSprite("HAPPY BIRTHDAY REESE", "#fff", 18, "#f15bb5"); banner.position.set(0, 150, 60); banner.center.set(0.5, 0.5); g.add(banner);
    ["#f15bb5", "#ffd60a", "#4cc9f0", "#9b5de5", "#06d6a0"].forEach((c, i) => {
      const bl = new THREE.Mesh(new THREE.SphereGeometry(9, 10, 8), new THREE.MeshLambertMaterial({ color: c })); bl.scale.set(1, 1.2, 1);
      bl.position.set(-70 + i * 35, 120 + (i % 2) * 14, 64); g.add(bl);
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 40, 3), new THREE.MeshBasicMaterial({ color: "#888" })); str.position.set(-70 + i * 35, 96, 64); g.add(str);
    });
    g.rotation.y = Math.PI; // door faces up the street toward her
    return g;
  }

  // ---------- build ----------
  function init(stage) {
    if (renderer) return true;
    try {
      glCanvas = document.createElement("canvas");
      glCanvas.id = "gl";
      glCanvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:none;";
      stage.insertBefore(glCanvas, stage.firstChild);
      renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      return true;
    } catch (e) { console.error(e); renderer = null; return false; }
  }

  function build(w) {
    world = w;
    theme = w.theme || {};
    const desert = !!theme.desert;
    if (scene) dispose();
    scene = new THREE.Scene();
    fog = new THREE.Fog(desert ? "#efd9b6" : "#dde4ec", 300, 2300);
    scene.fog = fog;
    camera = new THREE.PerspectiveCamera(66, 0.5, 2, 9000);
    hemi = desert ? new THREE.HemisphereLight("#fff4e0", "#9c7a55", 0.85) : new THREE.HemisphereLight("#ffffff", "#8fb0dc", 0.9); scene.add(hemi);
    sun = new THREE.DirectionalLight("#fff6e8", 0.55); sun.position.set(-0.6, 0.8, -0.5); scene.add(sun); scene.add(sun.target);

    // sky dome
    const skyGeo = new THREE.SphereGeometry(7000, 24, 12);
    skyGeo.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(skyGeo.attributes.position.count * 3), 3));
    sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    sky.renderOrder = -1;
    scene.add(sky);

    // far peaks (the San Juans)
    mountains = new THREE.Group();
    const peakGeo = new THREE.ConeGeometry(1, 1, 6);
    const peakMat = new THREE.MeshPhongMaterial({ shininess: 0, color: "#c3d0e0", flatShading: true, fog: false, transparent: true, opacity: 0.6 });
    const capMat = new THREE.MeshPhongMaterial({ shininess: 0, color: "#f4f8fc", flatShading: true, fog: false, transparent: true, opacity: 0.8 });
    for (let i = 0; i < 16; i++) {
      const x = (i - 7.5) * 900 + Math.sin(i * 3.1) * 300, h = 900 + 700 * Math.abs(Math.sin(i * 1.7)), r = 700 + 300 * Math.abs(Math.cos(i * 2.3));
      const pk = new THREE.Mesh(peakGeo, peakMat); pk.scale.set(r, h, r); pk.position.set(x, h / 2 - 1250, -6400 - Math.abs(Math.sin(i)) * 600); mountains.add(pk);
      const cp = new THREE.Mesh(peakGeo, capMat); cp.scale.set(r * 0.38, h * 0.38, r * 0.38); cp.position.set(x, pk.position.y + h * 0.31, pk.position.z); mountains.add(cp);
    }
    scene.add(mountains);

    // terrain: a grid that follows the skier
    tGeo = new THREE.PlaneGeometry(1, 1, NX, NZ);
    tGeo.rotateX(-Math.PI / 2);
    tGeo.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(tGeo.attributes.position.count * 3), 3));
    terrain = new THREE.Mesh(tGeo, new THREE.MeshPhongMaterial({ vertexColors: true, map: desert ? dirtTexture() : snowTexture(), shininess: desert ? 4 : 18, specular: new THREE.Color(desert ? "#1a1208" : "#2a3440"), side: THREE.DoubleSide }));
    terrain.frustumCulled = false;
    scene.add(terrain);
    originKey = "";

    trees = new THREE.InstancedMesh(treeGeo(desert), new THREE.MeshLambertMaterial({ vertexColors: true }), MAX_TREES);
    rocks = new THREE.InstancedMesh(rockGeo(desert), new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 0 }), MAX_ROCKS);
    const pg = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    pillows = new THREE.InstancedMesh(pg, new THREE.MeshLambertMaterial({ color: "#f7fafd" }), MAX_PILLOWS);
    for (const im of [trees, rocks, pillows]) { im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(im); }

    shadow = new THREE.Mesh(new THREE.CircleGeometry(16, 20), new THREE.MeshBasicMaterial({ color: "#5a6f8c", transparent: true, opacity: 0.28, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
    peng = w.rider === "bike" ? makeBiker() : makePenguin(); scene.add(peng);

    spray = makePoints(420); spray.userData = { i: 0, p: [] }; scene.add(spray);
    if (desert) spray.material.uniforms.uColor.value.set("#c9a27a");
    for (let i = 0; i < 420; i++) spray.userData.p.push({ life: 0 });
    snow = makePoints(600); scene.add(snow);
    sparkle = makePoints(260); scene.add(sparkle);
    sparkle.userData = { p: [] };
    for (let i = 0; i < 260; i++) sparkle.userData.p.push({ ph: Math.random() * 6.28, rate: rand(2, 5) });
    tracks = makeTracks(); scene.add(tracks);
    if (desert) { tracks.material.color.set("#6e4a30"); sparkle.visible = false; snow.visible = !!theme.snow; }
    snow.userData = { p: [] };
    for (let i = 0; i < 600; i++) snow.userData.p.push({ v: rand(30, 70) });

    // per-object models
    const s = w.s;
    dyn = { sleds: [], notes: [], flowers: [], snickers: [], gates: [], rings: [], rivals: [], fans: [] };
    for (const o of s.objs) {
      let m = null;
      if (o.type === "flower") {
        m = sprite("flower" + o.hue, 64, 64, (x) => { x.translate(32, 32); x.scale(2.2, 2.2); Art.flower(x, 0, 0, 0, o.hue); }, 26);
        m.position.set(o.x, w.ground(o.x, o.z) + 16 + o.h, -o.z);
      } else if (o.type === "snickers") {
        m = sprite("snickers", 160, 96, (x) => { x.translate(80, 48); x.scale(1.9, 1.9); Art.snickers(x, 0, 0, 0); }, 70);
        m.position.set(o.x, w.ground(o.x, o.z) + 28, -o.z);
      } else if (o.type === "note") {
        m = sprite("note", 128, 192, drawNote, 46, true);
      } else if (o.type === "gift") {
        m = new THREE.Group();
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(10, 18, 900, 12, 1, true), new THREE.MeshBasicMaterial({ color: "#ffe066", transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, fog: false }));
        beam.position.y = 450; m.add(beam);   // a light beam so she can find it from far away
        const box = sprite("gift", 128, 128, (x) => { const g = x.createRadialGradient(64, 64, 8, 64, 64, 64); g.addColorStop(0, "rgba(255,230,120,.9)"); g.addColorStop(1, "rgba(255,230,120,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128); x.font = "76px serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("🎁", 64, 70); }, 64);
        box.position.y = 30; m.add(box);
        m.position.set(o.x, w.ground(o.x, o.z), -o.z);
      } else if (o.type === "charm") {
        m = sprite("charm", 128, 128, (x) => {
          const g = x.createRadialGradient(64, 64, 10, 64, 64, 64); g.addColorStop(0, "rgba(255,230,120,.9)"); g.addColorStop(1, "rgba(255,230,120,0)");
          x.fillStyle = g; x.fillRect(0, 0, 128, 128); x.font = "72px serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("🎿", 64, 68);
        }, 70, false);
        m.position.set(o.x, w.ground(o.x, o.z) + 40, -o.z);
      } else if (o.type === "sign") {
        m = signSprite(o.text, o.color);
        m.position.set(o.x, w.ground(o.x, o.z), -o.z);
      } else if (o.type === "car") {
        m = makeCar(); m.position.set(o.x, w.ground(o.x, o.z) - 6, -o.z);
        const lbl = textSprite("stuck. again.", "#e63946", 16); lbl.position.set(0, 62, 0); m.add(lbl);
      } else if (o.type === "ditchSled") {
        m = makeSled(true); m.position.set(o.x, w.ground(o.x, o.z) - 8, -o.z); m.rotation.set(0.6, 0.8, 0.3);
      } else if (o.type === "creek") {
        m = new THREE.Group();
        m.add(ribbon(o.z, 38, "#3f7fa8", 1.2));
        for (const b of o.bridges) {
          const br = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), new THREE.MeshLambertMaterial({ color: "#f7fafd" }));
          br.scale.set(56, 8, 26); br.position.set(b, w.ground(b, o.z) + 2, -o.z); m.add(br);
        }
      } else if (o.type === "road") {
        m = new THREE.Group();
        m.add(ribbon(o.z, 80, "#4a4f57", 2));
        const dashMat = new THREE.MeshBasicMaterial({ color: "#ffd60a" });
        for (let x = w.cx(o.z) - w.HALF - 400; x < w.cx(o.z) + w.HALF + 400; x += 50) {
          const d = new THREE.Mesh(new THREE.BoxGeometry(24, 1, 4), dashMat); d.position.set(x, w.ground(x, o.z) + 3, -o.z); m.add(d);
        }
      } else if (o.type === "cliff") {
        m = new THREE.Group();
        const rm = new THREE.MeshPhongMaterial({ color: "#4a5363", flatShading: true, shininess: 0 });
        const chutes = w.chutes(o.z);
        for (let x = w.cx(o.z) - w.HALF; x < w.cx(o.z) + w.HALF; x += 26) {
          if (chutes.some((q) => Math.abs(x - q) < 90)) continue;
          for (const dz of [8, 18]) {   // rock bands down the face
            const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), rm);
            const sz = 12 + Math.abs(Math.sin(x * 3 + dz)) * 14;
            r.scale.set(sz * 1.4, sz, sz * 0.8); r.position.set(x + dz, w.ground(x, o.z + dz) + sz * 0.2, -(o.z + dz)); r.rotation.set(x, x * 2, 0); m.add(r);
          }
        }
        const warn = textSprite("⚠ CLIFF", "#e63946", 22); warn.position.set(w.cx(o.z), w.ground(w.cx(o.z), o.z) + 40, -o.z); m.add(warn);
      } else if (o.type === "kicker") {
        // orange marker poles on both sides of the lip
        m = new THREE.Group();
        const pm = new THREE.MeshLambertMaterial({ color: "#ff6b00" });
        for (const sx of [-1, 1]) {
          const px = o.x + sx * (o.w / 2 + 14);
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 46, 6), pm); pole.position.set(px, w.ground(px, o.z) + 23, -o.z); m.add(pole);
          const fl = new THREE.Mesh(new THREE.PlaneGeometry(14, 9), new THREE.MeshLambertMaterial({ color: "#ff6b00", side: THREE.DoubleSide }));
          fl.position.set(px + sx * 7, w.ground(px, o.z) + 41, -o.z); m.add(fl);
        }
      } else if (o.type === "gate") {
        // checkpoint arch over the trail
        m = new THREE.Group();
        const pm = new THREE.MeshLambertMaterial({ color: o.color || "#ff6b00" });
        for (const sx of [-1, 1]) { const px = o.x + sx * o.w / 2; const post = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 90, 8), pm); post.position.set(px, w.ground(px, o.z) + 45, -o.z); m.add(post); }
        const banner = textSprite(o.label, "#fff", 22, o.color || "#ff6b00"); banner.position.set(o.x, Math.max(w.ground(o.x - o.w / 2, o.z), w.ground(o.x + o.w / 2, o.z)) + 82, -o.z); banner.center.set(0.5, 0.5); m.add(banner);
        dyn.gates.push([o, m]);
      } else if (o.type === "ring") {
        m = new THREE.Mesh(new THREE.TorusGeometry(46, 5, 10, 32), new THREE.MeshBasicMaterial({ color: "#ffd60a" }));
        m.position.set(o.x, o.y, -o.z); dyn.rings.push([o, m]);
      } else if (o.type === "building") {
        m = makeBuilding(o); m.position.set(o.x, w.ground(o.x, o.z), -o.z); m.rotation.y = o.side > 0 ? -Math.PI / 2 : Math.PI / 2;
      } else if (o.type === "house") {
        m = makeHouse(o); m.position.set(o.x, w.ground(o.x, o.z), -o.z);
      } else if (o.type === "fan") {
        // a penguin fan holding up a sign
        m = new THREE.Group();
        const body = new THREE.Mesh(new THREE.SphereGeometry(9, 10, 8), new THREE.MeshLambertMaterial({ color: "#1b1f2e" })); body.scale.set(1, 1.4, 1); body.position.y = 13; m.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(6.5, 10, 8), new THREE.MeshLambertMaterial({ color: "#26304a" })); head.position.y = 30; m.add(head);
        const sign = textSprite(o.text, "#fff", 13, o.color); sign.position.y = 42; m.add(sign);
        m.position.set(o.x, w.ground(o.x, o.z), -o.z); dyn.fans.push(m);
      } else if (o.type === "deck") {
        // a wooden drop: deck + ramp off the edge
        m = new THREE.Group();
        const wood = new THREE.MeshLambertMaterial({ color: "#a47148" });
        const deck = new THREE.Mesh(new THREE.BoxGeometry(o.w, 6, 120), wood); deck.position.set(o.x, w.ground(o.x, o.z - 60) + 2, -(o.z - 60)); m.add(deck);
        for (let k = -1; k <= 1; k += 2) for (const dz of [0, 100]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(5, 60, 5), wood); leg.position.set(o.x + k * o.w / 2.4, w.ground(o.x, o.z - dz) - 26, -(o.z - dz)); m.add(leg); }
      } else if (o.type === "sled") {
        m = makeSled(false);
        const y = textSprite(o.yell, "#e63946", 14); y.position.set(0, 80, 0); m.add(y);
        m.visible = false; dyn.sleds.push([o, m]);
      }
      if (!m) continue;
      o.mesh = m;
      if (o.type === "note") dyn.notes.push([o, m]);
      if (o.type === "flower" || o.type === "snickers" || o.type === "charm" || o.type === "gift") dyn.flowers.push([o, m]);
      scene.add(m); built.push(m);
    }
    for (const r of s.rivals || []) { const m = makeBiker(r.color, true); const lbl = textSprite(r.name, "#f1e3c8", 9, "#7b1e3a"); lbl.position.set(0, 68, 0); m.add(lbl); scene.add(m); dyn.rivals.push([r, m]); }
    dyn.chute = sprite("bigchute", 160, 120, (x) => { x.fillStyle = "#ff595e"; x.beginPath(); x.arc(80, 70, 74, Math.PI, 0); x.fill(); x.fillStyle = "#ffca3a"; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(80, 70); x.arc(80, 70, 74, Math.PI + k * Math.PI / 4, Math.PI + (k + 0.5) * Math.PI / 4); x.fill(); } }, 110, false);
    dyn.chute.visible = false; scene.add(dyn.chute);
    dyn.chad = makeSled(true); dyn.chad.visible = false; scene.add(dyn.chad);
    dyn.bang = textSprite("!!", "#e63946", 26); dyn.bang.position.set(0, 86, 0); dyn.chad.add(dyn.bang);
    dyn.gp = new THREE.Group();
    ["#ffca3a", "#ff595e"].forEach((c, i) => {
      const ch = sprite("chute" + i, 128, 160, (x) => {
        x.fillStyle = c; x.beginPath(); x.arc(64, 60, 56, Math.PI, 0); x.fill();
        x.strokeStyle = "#555"; x.lineWidth = 3; x.beginPath(); x.moveTo(8, 60); x.lineTo(64, 140); x.lineTo(120, 60); x.stroke();
        x.fillStyle = "#e9ecef"; x.beginPath(); x.arc(64, 142, 12, 0, Math.PI * 2); x.fill();
        x.fillStyle = "#adb5bd"; x.beginPath(); x.arc(64, 132, 9, Math.PI, 0); x.fill(); // grandma hair
      }, 60, true);
      ch.position.set(i ? 40 : -40, i * 30, 0); dyn.gp.add(ch);
    });
    dyn.gp.visible = false; scene.add(dyn.gp);
    lastT = s.t; camY = null; camLX = s.x; camYaw = 0;
  }

  function drawNote(x) {
    const g = x.createRadialGradient(64, 70, 8, 64, 70, 64); g.addColorStop(0, "rgba(255,230,120,.85)"); g.addColorStop(1, "rgba(255,230,120,0)");
    x.fillStyle = g; x.fillRect(0, 0, 128, 140);
    x.fillStyle = "#8d5b3b"; x.fillRect(60, 90, 8, 102);
    x.fillStyle = "#fff8ec"; x.fillRect(24, 46, 80, 56);
    x.strokeStyle = "#f4a6b5"; x.lineWidth = 4; x.beginPath(); x.moveTo(24, 46); x.lineTo(64, 78); x.lineTo(104, 46); x.stroke();
    x.fillStyle = "#e63946"; x.font = "28px serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("♥", 64, 88);
  }

  function signSprite(text, color) {
    const fs = 40, meas = document.createElement("canvas").getContext("2d");
    meas.font = `800 ${fs}px 'Baloo 2', sans-serif`;
    const w = Math.ceil(meas.measureText(text).width) + 60, h = 200;
    return sprite("sign:" + text, w, h, (x) => {
      x.fillStyle = "#5c4033"; x.fillRect(w / 2 - 7, 70, 14, 130);
      x.fillStyle = color || "#2d6a4f"; Art.rr(x, 4, 4, w - 8, 80, 14); x.fill();
      x.strokeStyle = "#fff"; x.lineWidth = 4; Art.rr(x, 14, 14, w - 28, 60, 9); x.stroke();
      x.fillStyle = "#fff"; x.font = `800 ${fs}px 'Baloo 2', sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(text, w / 2, 46);
    }, w * 0.42, true);
  }

  // ---------- per frame ----------
  function regenTerrain(s) {
    const x0 = Math.floor(s.x / 80) * 80;
    const z0 = Math.floor(s.z / 60) * 60;
    const key = x0 + ":" + z0;
    if (key === originKey) return;
    originKey = key;
    const p = tGeo.attributes.position, col = tGeo.attributes.color, uv = tGeo.attributes.uv;
    const snowC = new THREE.Color("#ffffff"), iceC = new THREE.Color("#c4d6ea"), bermC = new THREE.Color("#f1f6fc");
    const c = new THREE.Color();
    for (let iz = 0; iz <= NZ; iz++) {
      const z = z0 + ZOFF[iz];
      const ice = world.onIce(z), cxz = world.cx(z);
      for (let ix = 0; ix <= NX; ix++) {
        const i = iz * (NX + 1) + ix, x = x0 + XOFF[ix];
        p.setXYZ(i, x, world.ground(x, z), -z);
        uv.setXY(i, x / 160, z / 160);
        const out = Math.max(0, Math.abs(x - cxz) - world.HALF);
        if (world.paint) { const pc = world.paint(x, z); col.setXYZ(i, pc[0], pc[1], pc[2]); continue; }
        c.copy(ice && out < 20 ? iceC : snowC).lerp(bermC, Math.min(1, out / 200));
        col.setXYZ(i, c.r, c.g, c.b);
      }
    }
    // steep faces (cliffs, gully walls) show rock
    const rockC = new THREE.Color(theme.desert ? "#9a4a30" : "#5b6474"), rockL = new THREE.Color(theme.desert ? "#b8683f" : "#7d8696");
    for (let iz = 0; iz < NZ; iz++) for (let ix = 0; ix <= NX; ix++) {
      const i = iz * (NX + 1) + ix, j = i + NX + 1;
      const drop = (p.getY(i) - p.getY(j)) / (ZOFF[iz + 1] - ZOFF[iz]) - world.pitch(z0 + ZOFF[iz]);
      if (drop > 0.9) { c.copy(hash2(ix + x0, iz + z0) > 0.5 ? rockC : rockL); col.setXYZ(i, c.r, c.g, c.b); col.setXYZ(j, c.r, c.g, c.b); }
    }
    p.needsUpdate = true; col.needsUpdate = true; uv.needsUpdate = true;
    tGeo.computeVertexNormals();
    tGeo.computeBoundingSphere();
  }

  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
  function placeInstances(s) {
    const lo = s.z - 260, hi = s.z + 2700;
    let nt = 0, nr = 0, np = 0;
    const put = (im, n, x, y, z, sx, sy, sz, ry) => { _e.set(0, ry, 0); _q.setFromEuler(_e); _p.set(x, y, -z); _s.set(sx, sy, sz); _m.compose(_p, _q, _s); im.setMatrixAt(n, _m); };
    for (const o of s.objs) {
      if (o.z < lo || o.z > hi || o.got) continue;
      if (o.type === "tree" && nt < MAX_TREES) { o.gy = o.gy ?? world.ground(o.x, o.z); put(trees, nt++, o.x, o.gy - 2, o.z, o.sz, o.sz, o.sz, o.z); }
      else if (o.type === "rock" && nr < MAX_ROCKS) { o.gy = o.gy ?? world.ground(o.x, o.z); put(rocks, nr++, o.x, o.gy - o.r * 0.25, o.z, o.r * 1.25, o.r * 1.1, o.r, o.z); }
      else if (o.type === "pillow" && np < MAX_PILLOWS) { o.gy = o.gy ?? world.ground(o.x, o.z); put(pillows, np++, o.x, o.gy - 30, o.z, 52, 33, 50, 0); }
    }
    for (const o of world.edge) {
      if (o.z < lo || o.z > hi) continue;
      o.gy = o.gy ?? world.ground(o.x, o.z);
      if (o.type === "tree" && nt < MAX_TREES) put(trees, nt++, o.x, o.gy - 3, o.z, o.sz, o.sz, o.sz, o.z);
      else if (o.type === "boulder" && nr < MAX_ROCKS) put(rocks, nr++, o.x, o.gy - o.r * 0.3, o.z, o.r * 1.5, o.r, o.r * 1.2, o.z);
    }
    trees.count = nt; rocks.count = nr; pillows.count = np;
    trees.instanceMatrix.needsUpdate = rocks.instanceMatrix.needsUpdate = pillows.instanceMatrix.needsUpdate = true;
  }

  function emit(s, n, x, y, z, spread, up, back) {
    const u = spray.userData;
    for (let k = 0; k < n; k++) {
      const p = u.p[u.i]; u.i = (u.i + 1) % u.p.length;
      p.x = x + rand(-6, 6); p.y = y + rand(0, 6); p.z = z + rand(-4, 4);
      p.vx = rand(-1, 1) * spread; p.vy = rand(0.4, 1) * up; p.vz = s.v * rand(0.65, 0.95) - back;
      p.life = p.max = rand(0.4, 0.9); p.size = rand(6, 12);
    }
  }

  function updateParticles(s, dt) {
    // spray: off the downhill ski when carving, a little trail always, huge on landings/crashes
    if ((s.state === "ski" || s.state === "ride") && !s.air && s.mode !== "fly") {
      const carve = Math.abs(s.vx) / 300;
      const n = Math.floor(rand(0, 1) + dt * (25 + 160 * carve) + (s.zoneDeep ? dt * 40 : 0));
      const side = -Math.sign(s.vx || 1);
      if (n) emit(s, n, s.x + side * 14, world.ground(s.x, s.z) + 2, s.z + 6, 40 + 90 * carve, 40 + 60 * carve, 0);
    }
    if (s.fx) { for (const f of s.fx) emit(s, f.n, s.x, world.ground(s.x, s.z) + 4, s.z, f.spread, f.up, 0); s.fx = []; }
    const u = spray.userData, pos = spray.geometry.attributes.position, size = spray.geometry.attributes.size, al = spray.geometry.attributes.alpha;
    u.p.forEach((p, i) => {
      if (p.life > 0) {
        p.life -= dt; p.vy -= 160 * dt; p.vx *= 1 - 1.5 * dt; p.vz *= 1 - 1.2 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        pos.setXYZ(i, p.x, p.y, -p.z);
        size.setX(i, p.size * (1.6 - p.life / p.max));
        al.setX(i, 0.85 * Math.min(1, p.life / p.max * 1.6));
      } else al.setX(i, 0);
    });
    pos.needsUpdate = size.needsUpdate = al.needsUpdate = true;
    // snowfall around the camera (world positions, respawned when they leave the box)
    const sp = snow.geometry.attributes.position, ss = snow.geometry.attributes.size, sa = snow.geometry.attributes.alpha;
    const cy = camera.position.y;
    snow.userData.p.forEach((f, i) => {
      if (f.wy == null || f.wy < cy - 160 || f.wz < s.z - 140 || Math.abs(f.wx - s.camX) > 520) {
        f.wx = s.camX + rand(-500, 500); f.wy = cy + rand(-60, 260); f.wz = s.z + rand(-60, 1400);
      }
      f.wy -= f.v * dt; f.wx -= 25 * dt;
      sp.setXYZ(i, f.wx, f.wy, -f.wz);
      ss.setX(i, 3.2); sa.setX(i, 0.12 + 0.75 * s.storm);
    });
    sp.needsUpdate = ss.needsUpdate = sa.needsUpdate = true;
  }

  function render(s, W, H, scale, dpr) {
    if (!renderer || !scene) return;
    const dt = clamp(s.t - lastT, 0, 0.05); lastT = s.t;
    const cssW = Math.round(W * scale), cssH = Math.round(H * scale);
    const sz = renderer.getSize(new THREE.Vector2());
    if (sz.x !== cssW || sz.y !== cssH) renderer.setSize(cssW, cssH, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    const bufH = renderer.getDrawingBufferSize(new THREE.Vector2()).y;
    const uScale = bufH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    spray.material.uniforms.uScale.value = uScale; snow.material.uniforms.uScale.value = uScale; sparkle.material.uniforms.uScale.value = uScale;

    regenTerrain(s);
    // skier
    const gy = world.ground(s.x, s.z);
    const sy = s.mode === "fly" ? s.y : gy + s.h * 0.7;
    peng.position.set(s.x, sy, -s.z);
    if (s.state === "tumble") { peng.rotation.set(-s.tumbleT * 14, -s.heading, 0, "YXZ"); peng.position.y = gy + 16; if (world.rider !== "bike") pose(s, dt); }
    else {
      // skis follow the slope under them, she faces where her skis point
      const nx = (world.ground(s.x + 4, s.z) - world.ground(s.x - 4, s.z)) / 8, nz = (world.ground(s.x, s.z + 4) - world.ground(s.x, s.z - 4)) / 8;
      const pitch = s.air ? clamp(Math.atan2(s.vy, Math.hypot(s.vx, s.v)) * 0.8, -0.7, 0.5) : Math.atan(nz * Math.cos(s.heading) + nx * Math.sin(s.heading));
      peng.rotation.set(s.mode === "fly" ? 0 : pitch, -s.heading, world.rider === "bike" ? -s.lean * 1.2 : 0, "YXZ");
      if (world.rider === "bike") poseBike(peng.userData.rig, s, dt, Math.hypot(s.vx, s.v));
      else pose(s, dt);
    }
    peng.scale.setScalar(s.zoom);
    shadow.position.set(s.x, gy + 0.6, -s.z); shadow.scale.setScalar(Math.max(0.4, 1 - s.h / 260));

    // chase camera: low and close, smoothed so it floats over the rolls
    // chase camera: trails behind along her direction of travel, floats over the bumps
    const back = (s.mode === "fly" ? 240 : 205) / Math.max(0.6, s.zoom), up = (s.mode === "fly" ? 95 : 72) / Math.max(0.6, s.zoom);
    const travel = s.state === "tumble" ? camYaw : clamp(Math.atan2(s.vx, Math.max(30, s.v)), -0.9, 0.9);
    camYaw += (travel - camYaw) * Math.min(1, dt * 2.2);
    const cx = s.x - Math.sin(camYaw) * back, cz = s.z - Math.cos(camYaw) * back;
    camLX = cx;
    const ty = Math.max(world.ground(cx, cz), sy + 6) + up;
    camY = camY == null ? ty : camY + (ty - camY) * Math.min(1, dt * 3.5);
    // never let the camera sink into the snow (or behind a lip between it and her)
    camY = Math.max(camY, world.ground(cx, cz) + 30, world.ground((cx + s.x) / 2, (cz + s.z) / 2) + 26);
    const shake = Engine.shake || 0;
    camera.position.set(cx + rand(-1, 1) * shake * 0.8, camY + rand(-1, 1) * shake * 0.8, -cz);
    const lx = s.x + Math.sin(camYaw) * 330, lz = s.z + Math.cos(camYaw) * 330;
    camera.lookAt(lx, s.mode === "fly" ? sy - 70 : Math.min(world.ground(lx, lz), sy) + 4, -lz);
    camera.rotateZ(-s.lean * 0.1);

    placeInstances(s);
    for (const [o, m] of dyn.flowers) {
      m.visible = !o.got && o.z > s.z - 260 && o.z < s.z + 2700;
      if (m.visible && o.type !== "flower") m.position.set(o.x, world.ground(o.x, o.z) + 34 + (o.h || 0) + Math.sin(s.t * 4) * 4, -o.z);
    }
    for (const [o, m] of dyn.notes) { m.visible = !o.got; m.position.set(o.x, world.ground(o.x, o.z), -o.z); }
    for (const [o, m] of dyn.flowers) if (o.type === "gift" && m.visible) m.position.set(o.x, world.ground(o.x, o.z), -o.z);
    for (const [o, m] of dyn.gates) m.visible = o.z > s.z - 200 && o.z < s.z + 3000;
    for (const [o, m] of dyn.rings) { m.visible = !o.got && o.z > s.z - 100; m.rotation.z = s.t; }
    for (const [r, m] of dyn.rivals) {
      m.visible = r.on && Math.abs(r.z - s.z) < 2600;
      if (!m.visible) continue;
      const ry = r.mode === "fly" ? r.y : world.ground(r.x, r.z) + (r.h || 0);
      m.position.set(r.x, ry, -r.z);
      m.rotation.set(r.crash ? -r.crashT * 10 : 0, -(r.heading || 0), -(r.lean || 0), "YXZ");
      poseBike(m.userData.rig, r, dt, r.v || 300);
    }
    dyn.fans.forEach((m, i) => { m.children[2].position.y = 42 + Math.abs(Math.sin(s.t * 6 + i)) * 8; });   // fans bounce their signs
    dyn.chute.visible = !!s.chute;
    if (s.chute) dyn.chute.position.set(s.x, sy + 110, -s.z);
    for (const [o, m] of dyn.sleds) {
      m.visible = o.go && !o.got;
      if (m.visible) { m.position.set(o.x, world.ground(o.x, o.z), -o.z); m.rotation.y = o.dir > 0 ? -Math.PI / 2 : Math.PI / 2; }
    }
    const c = s.chad;
    dyn.chad.visible = !!c && !(c.finale && c.sent && c.z - s.z > 700);
    if (c) {
      const lift = c.finale && c.z - s.z > 140 ? Math.min(90, (c.z - s.z - 140) * 0.5) : 0;
      dyn.chad.position.set(c.x, world.ground(c.x, c.z) + lift, -c.z);
      dyn.chad.rotation.set(0, c.phase === "lunge" && !c.finale ? Math.sign(c.tx - c.x) * -0.6 : 0, 0);
      dyn.bang.visible = c.phase === "windup";
      dyn.chad.traverse((m) => { if (m.material) { m.material.transparent = c.fade > 0; m.material.opacity = 1 - c.fade; } });
    }
    if (s.gp && world.GRANDPARENTS && s.z < world.GRANDPARENTS + 400) {
      dyn.gp.visible = true;
      const gx = world.cx(world.GRANDPARENTS) + world.HALF - 30;
      dyn.gp.position.set(gx, world.ground(gx, world.GRANDPARENTS) + s.gp.alt, -world.GRANDPARENTS);
    } else dyn.gp.visible = false;

    // weather: storm → bluebird
    const st = s.storm;
    const horizon = theme.desert ? lerpColor("#f7dcb0", "#f4c99a", s.dusk || 0) : lerpColor("#d6ebfb", "#dde4ec", st), zenith = theme.desert ? lerpColor("#3f8fdc", "#6a5acd", s.dusk || 0) : lerpColor("#3d8fd8", "#a9b6c6", st);
    fog.color.copy(horizon); fog.near = 260 + 260 * (1 - st); fog.far = 2300 + 1300 * (1 - st);
    const sc = sky.geometry.attributes.color, sp = sky.geometry.attributes.position;
    for (let i = 0; i < sc.count; i++) { const t = clamp(sp.getY(i) / 3500, 0, 1); const cc = horizon.clone().lerp(zenith, Math.pow(t, 0.6)); sc.setXYZ(i, cc.r, cc.g, cc.b); }
    sc.needsUpdate = true;
    sky.position.copy(camera.position);
    mountains.position.set(camera.position.x, camera.position.y - 200, camera.position.z);
    mountains.children[0].material.color.copy(theme.desert ? new THREE.Color("#a08cb0") : lerpColor("#b4c6dc", "#c6ced8", st));
    sun.intensity = 0.4 + 0.45 * (1 - st);
    hemi.intensity = 0.92 - 0.12 * (1 - st);

    updateParticles(s, dt);
    updateTracks(s);
    // sparkles: glints on the snow around her (more when the sun's out)
    const kp = sparkle.geometry.attributes.position, ks = sparkle.geometry.attributes.size, ka = sparkle.geometry.attributes.alpha;
    sparkle.userData.p.forEach((q, i) => {
      if (q.z == null || q.z < s.z - 60 || q.z > s.z + 900 || Math.abs(q.x - s.x) > 420) {
        q.z = s.z + rand(20, 900); q.x = s.x + rand(-400, 400); q.y = world.ground(q.x, q.z) + 1.5;
      }
      kp.setXYZ(i, q.x, q.y, -q.z);
      ks.setX(i, 2.2);
      ka.setX(i, Math.pow(Math.max(0, Math.sin(s.t * q.rate + q.ph)), 12) * (0.5 + 0.5 * (1 - st)));
    });
    kp.needsUpdate = ks.needsUpdate = ka.needsUpdate = true;
    renderer.render(scene, camera);
  }

  // where the penguin is on the 2D overlay (for gear flying, -1 flower)
  function skierScreen(s, W, H) {
    if (!camera) return { x: W / 2, y: H * 0.6 };
    const v = V(s.x, (s.mode === "fly" ? s.y : world.ground(s.x, s.z)) + 20, -s.z).project(camera);
    return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H };
  }

  function show(on) { if (glCanvas) glCanvas.style.display = on ? "block" : "none"; }

  function dispose() {
    scene.traverse((m) => {
      if (m.geometry) m.geometry.dispose();
      if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((mt) => mt.dispose());
    });
    built = []; scene = null;
  }

  return { init, build, render, show, skierScreen, _r: () => renderer, _cam: () => camera, _peng: () => peng, get ok() { return !!renderer; } };
})();
