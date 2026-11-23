// Real 3D view for Wolf Creek (three.js): a low chase camera behind the penguin, open rolling
// powder, hazy sky, chunky low-poly rocks, and big powder spray. The level owns all the game
// logic; this file only draws it. If WebGL isn't available the level falls back to its 2D view.

const Ski3D = (() => {
  let renderer, glCanvas, scene, camera, sun, hemi, sky, fog;
  let terrain, tGeo, trees, rocks, pillows, shadow, peng, spray, snow, mountains;
  let built = [], dyn = {}, texCache = {};
  let world, lastT = 0, camY = null, camLX = 0, camYaw = 0, originKey = "";
  const NX = 46, NZ = 104, CELL_X = 34, CELL_Z = 28;
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
  function treeGeo() {
    const parts = [{ geo: new THREE.CylinderGeometry(3, 4, 16, 6), color: "#5c4033", m: M(0, 8, 0) }];
    for (let i = 0; i < 3; i++) {
      const y = 14 + i * 22, r = 30 - i * 8;
      parts.push({ geo: new THREE.ConeGeometry(r, 34, 7), color: i % 2 ? "#2d6a4f" : "#1f5040", m: M(0, y + 17, 0) });
      parts.push({ geo: new THREE.ConeGeometry(r * 0.62, 14, 7), color: "#f4f8fc", m: M(0, y + 28, 0) });
    }
    return merge(parts);
  }
  function rockGeo() {
    const r = new THREE.DodecahedronGeometry(1, 0);
    const cap = new THREE.DodecahedronGeometry(0.75, 0);
    return merge([{ geo: r, color: "#4a5363", m: M(0, 0.35, 0, 1, 0.8, 1) },
      { geo: cap, color: "#f4f8fc", m: M(0.05, 0.92, 0, 0.9, 0.28, 0.9) }]);
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
    if (scene) dispose();
    scene = new THREE.Scene();
    fog = new THREE.Fog("#c9d3df", 300, 2300);
    scene.fog = fog;
    camera = new THREE.PerspectiveCamera(66, 0.5, 2, 9000);
    hemi = new THREE.HemisphereLight("#eef6ff", "#9fb4cc", 0.95); scene.add(hemi);
    sun = new THREE.DirectionalLight("#fff3e0", 0.6); sun.position.set(-0.5, 1, 0.35); scene.add(sun); scene.add(sun.target);

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
    terrain = new THREE.Mesh(tGeo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    terrain.frustumCulled = false;
    scene.add(terrain);
    originKey = "";

    trees = new THREE.InstancedMesh(treeGeo(), new THREE.MeshLambertMaterial({ vertexColors: true }), MAX_TREES);
    rocks = new THREE.InstancedMesh(rockGeo(), new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 0 }), MAX_ROCKS);
    const pg = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    pillows = new THREE.InstancedMesh(pg, new THREE.MeshLambertMaterial({ color: "#f7fafd" }), MAX_PILLOWS);
    for (const im of [trees, rocks, pillows]) { im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(im); }

    shadow = new THREE.Mesh(new THREE.CircleGeometry(16, 20), new THREE.MeshBasicMaterial({ color: "#5a6f8c", transparent: true, opacity: 0.28, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
    peng = makePenguin(); scene.add(peng);

    spray = makePoints(420); spray.userData = { i: 0, p: [] }; scene.add(spray);
    for (let i = 0; i < 420; i++) spray.userData.p.push({ life: 0 });
    snow = makePoints(600); scene.add(snow);
    snow.userData = { p: [] };
    for (let i = 0; i < 600; i++) snow.userData.p.push({ v: rand(30, 70) });

    // per-object models
    const s = w.s;
    dyn = { sleds: [], notes: [], flowers: [], snickers: [] };
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
      } else if (o.type === "sled") {
        m = makeSled(false);
        const y = textSprite(o.yell, "#e63946", 14); y.position.set(0, 80, 0); m.add(y);
        m.visible = false; dyn.sleds.push([o, m]);
      }
      if (!m) continue;
      o.mesh = m;
      if (o.type === "note") dyn.notes.push([o, m]);
      if (o.type === "flower" || o.type === "snickers" || o.type === "charm") dyn.flowers.push([o, m]);
      scene.add(m); built.push(m);
    }
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
    const x0 = Math.floor((s.x - NX * CELL_X / 2) / CELL_X) * CELL_X;
    const z0 = Math.floor((s.z - 420) / CELL_Z) * CELL_Z;
    const key = x0 + ":" + z0;
    if (key === originKey) return;
    originKey = key;
    const p = tGeo.attributes.position, col = tGeo.attributes.color;
    const snowC = new THREE.Color("#f6f9fd"), iceC = new THREE.Color("#b9cbdc"), bermC = new THREE.Color("#e9f0f8");
    const c = new THREE.Color();
    for (let iz = 0; iz <= NZ; iz++) {
      const z = z0 + iz * CELL_Z;
      const ice = world.onIce(z), cxz = world.cx(z);
      for (let ix = 0; ix <= NX; ix++) {
        const i = iz * (NX + 1) + ix, x = x0 + ix * CELL_X;
        p.setXYZ(i, x, world.ground(x, z), -z);
        const out = Math.max(0, Math.abs(x - cxz) - world.HALF);
        c.copy(ice && out < 20 ? iceC : snowC).lerp(bermC, Math.min(1, out / 200));
        col.setXYZ(i, c.r, c.g, c.b);
      }
    }
    // steep faces (cliffs, gully walls) show rock
    const rockC = new THREE.Color("#5b6474"), rockL = new THREE.Color("#7d8696");
    for (let iz = 0; iz < NZ; iz++) for (let ix = 0; ix <= NX; ix++) {
      const i = iz * (NX + 1) + ix, j = i + NX + 1;
      const drop = (p.getY(i) - p.getY(j)) / CELL_Z - world.pitch(z0 + iz * CELL_Z);
      if (drop > 0.9) { c.copy(hash2(ix + x0, iz + z0) > 0.5 ? rockC : rockL); col.setXYZ(i, c.r, c.g, c.b); col.setXYZ(j, c.r, c.g, c.b); }
    }
    p.needsUpdate = true; col.needsUpdate = true;
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
      else if (o.type === "pillow" && np < MAX_PILLOWS) { o.gy = o.gy ?? world.ground(o.x, o.z); put(pillows, np++, o.x, o.gy - 4, o.z, 48, 24, 40, 0); }
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
    if (s.state === "ski" && !s.air) {
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
    spray.material.uniforms.uScale.value = uScale; snow.material.uniforms.uScale.value = uScale;

    regenTerrain(s);
    // skier
    const gy = world.ground(s.x, s.z);
    const sy = gy + s.h * 0.7;
    peng.position.set(s.x, sy, -s.z);
    if (s.state === "tumble") { peng.rotation.set(Math.sin(s.t * 12) * 0.4 - 1.3, s.t * 6, 0.6); peng.position.y = gy + 4; }
    else {
      // skis follow the slope under them, she faces where her skis point
      const nx = (world.ground(s.x + 4, s.z) - world.ground(s.x - 4, s.z)) / 8, nz = (world.ground(s.x, s.z + 4) - world.ground(s.x, s.z - 4)) / 8;
      const pitch = s.air ? clamp(-s.vy / 900, -0.5, 0.4) : Math.atan(nz * Math.cos(s.heading) + nx * Math.sin(s.heading));
      peng.rotation.set(pitch, -s.heading, 0, "YXZ");
      pose(s, dt);
    }
    peng.scale.setScalar(s.zoom);
    shadow.position.set(s.x, gy + 0.6, -s.z); shadow.scale.setScalar(Math.max(0.4, 1 - s.h / 260));

    // chase camera: low and close, smoothed so it floats over the rolls
    // chase camera: trails behind along her direction of travel, floats over the bumps
    const back = 205 / Math.max(0.6, s.zoom), up = 72 / Math.max(0.6, s.zoom);
    const travel = s.state === "tumble" ? camYaw : clamp(Math.atan2(s.vx, Math.max(30, s.v)), -0.9, 0.9);
    camYaw += (travel - camYaw) * Math.min(1, dt * 2.2);
    const cx = s.x - Math.sin(camYaw) * back, cz = s.z - Math.cos(camYaw) * back;
    camLX = cx;
    const ty = Math.max(world.ground(cx, cz), sy + 6) + up;
    camY = camY == null ? ty : camY + (ty - camY) * Math.min(1, dt * 3.5);
    const shake = Engine.shake || 0;
    camera.position.set(cx + rand(-1, 1) * shake * 0.8, camY + rand(-1, 1) * shake * 0.8, -cz);
    const lx = s.x + Math.sin(camYaw) * 330, lz = s.z + Math.cos(camYaw) * 330;
    camera.lookAt(lx, Math.min(world.ground(lx, lz), sy) + 4, -lz);
    camera.rotateZ(-s.lean * 0.1);

    placeInstances(s);
    for (const [o, m] of dyn.flowers) { m.visible = !o.got && o.z > s.z - 260 && o.z < s.z + 2700; if (m.visible && o.type !== "flower") m.position.y = world.ground(o.x, o.z) + 34 + Math.sin(s.t * 4) * 4; }
    for (const [o, m] of dyn.notes) { m.visible = !o.got; m.position.set(o.x, world.ground(o.x, o.z), -o.z); }
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
    if (s.gp && s.z < world.GRANDPARENTS + 400) {
      dyn.gp.visible = true;
      const gx = world.cx(world.GRANDPARENTS) + world.HALF - 30;
      dyn.gp.position.set(gx, world.ground(gx, world.GRANDPARENTS) + s.gp.alt, -world.GRANDPARENTS);
    } else dyn.gp.visible = false;

    // weather: storm → bluebird
    const st = s.storm;
    const horizon = lerpColor("#bfe0fb", "#c9d3df", st), zenith = lerpColor("#3d8fd8", "#9aa7b8", st);
    fog.color.copy(horizon); fog.near = 260 + 260 * (1 - st); fog.far = 2100 + 1400 * (1 - st);
    const sc = sky.geometry.attributes.color, sp = sky.geometry.attributes.position;
    for (let i = 0; i < sc.count; i++) { const t = clamp(sp.getY(i) / 3500, 0, 1); const cc = horizon.clone().lerp(zenith, Math.pow(t, 0.6)); sc.setXYZ(i, cc.r, cc.g, cc.b); }
    sc.needsUpdate = true;
    sky.position.copy(camera.position);
    mountains.position.set(camera.position.x, camera.position.y - 200, camera.position.z);
    mountains.children[0].material.color.copy(lerpColor("#b4c6dc", "#c6ced8", st));
    sun.intensity = 0.45 + 0.35 * (1 - st);
    hemi.intensity = 0.95 - 0.1 * (1 - st);

    updateParticles(s, dt);
    renderer.render(scene, camera);
  }

  // where the penguin is on the 2D overlay (for gear flying, -1 flower)
  function skierScreen(s, W, H) {
    if (!camera) return { x: W / 2, y: H * 0.6 };
    const v = V(s.x, world.ground(s.x, s.z) + 20, -s.z).project(camera);
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

  return { init, build, render, show, skierScreen, _cam: () => camera, _peng: () => peng, get ok() { return !!renderer; } };
})();
