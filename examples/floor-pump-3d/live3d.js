// Page code for floor-pump-3d.html, an ES module. THREE comes from the import map; K (kit/draft.mjs),
// L (kit/live.mjs), M (../floor-pump/model.mjs), P (../floor-pump/parts.mjs) and G (geom3d.mjs) are
// inlined above this script as namespaces, so the physics is the 2D sheet's, unchanged.
//
// Rendering, three passes a frame:
//   1. colour: toon tones on every surface; while the section is open each closed solid is drawn
//      double-sided and its back faces, which are only ever seen through the opening, are shaded as
//      the cut face (paper and the part's hatch, computed where the view ray meets the plane);
//   2. ids: the same scene into a target, a part id and a "cut face" flag per pixel, plus depth;
//   3. outlines: thick lines wherever the id, the flag or the depth's second difference jumps, laid
//      over pass 1. Creases come from EdgesGeometry (thin), drawn in pass 1.

const $ = (id) => document.getElementById(id);
const host = $("stage");
const canvas = $("gl");
const overlay = $("ov");
const Qs = new URLSearchParams(location.search);
const num = (k, d) => (Qs.has(k) && Number.isFinite(Number(Qs.get(k))) ? Number(Qs.get(k)) : d);
const q = {
  view: Qs.get("view"),
  cut: Qs.has("cut") ? Qs.get("cut") !== "0" : true,
  explode: Math.min(1, Math.max(0, num("explode", 0))),
  zoom: num("zoom", 1),
  look: Qs.get("look") ? Qs.get("look").split(",").map(Number) : null,
  balloons: Qs.has("balloons") ? Qs.get("balloons") !== "0" : true,
  bench: Qs.has("bench"),
  offset: num("offset", 0),
};
L.setupPage(host); // theme buttons, ?theme
// the tokens are sRGB and the shaders write them as they are: no linear working space
THREE.ColorManagement.enabled = false;

// ---------------------------------------------------------------- renderer and shared uniforms
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: Qs.has("t") || q.bench });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setClearColor(0x000000, 0);
const NEAR = 1;
const FAR = 9000;
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, NEAR, FAR);
const scene = new THREE.Scene();

const color = () => new THREE.Color();
const U = {
  uMode: { value: 0 },
  uCutOn: { value: q.cut ? 1 : 0 },
  uCut: { value: new THREE.Vector4(0, 0, 1, q.offset) },
  uCamDir: { value: new THREE.Vector3(0, 0, -1) },
  uPx: { value: 1 },
  uDpr: { value: 1 },
  uLight: { value: new THREE.Vector3(-0.42, 0.72, 0.55).normalize() },
  uLit: { value: color() },
  uMid: { value: color() },
  uDark: { value: color() },
  uPaper: { value: color() },
  uInk: { value: color() },
  uHatch: { value: new THREE.Vector4() },
  uAccent: { value: color() },
  uCapBias: { value: 0.25 / (FAR - NEAR) },
  uLineBias: { value: (2 * 0.6) / (FAR - NEAR) },
};

const VERT = /* glsl */ `
uniform float uLiftFrom; uniform float uLift;
varying vec3 vW; varying vec3 vN;
#ifdef DIAL
varying vec2 vUv;
#endif
void main() {
  vec3 p = position;
  if (p.y > uLiftFrom) p.y += uLift;
  vec4 w = modelMatrix * vec4(p, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
#ifdef DIAL
  vUv = uv;
#endif
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAG = /* glsl */ `
uniform float uMode, uCutOn, uKind, uGap, uPair, uAngle, uRole, uEdge, uDensity, uPx, uDpr, uCapBias, uWash;
uniform vec4 uCut; uniform vec3 uCamDir, uLight, uLit, uMid, uDark, uPaper, uInk, uAccent; uniform vec4 uHatch;
uniform vec3 uGlass; uniform vec2 uGlassC;
varying vec3 vW; varying vec3 vN;
#ifdef DIAL
uniform sampler2D uTex; varying vec2 vUv;
#endif

// coverage of lines at the integers of f, widthPx wide, antialiased by the screen derivative
float lines(float f, float widthPx) {
  float d = abs(fract(f + 0.5) - 0.5);
  return clamp(0.5 * widthPx - d / max(fwidth(f), 1e-5) + 0.5, 0.0, 1.0);
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  bool cutting = uCutOn > 0.5;
  if (cutting && dot(uCut.xyz, vW) > uCut.w) discard;
  // where the view ray through this fragment meets the cutting plane (the cut face, if this is one)
  float side = dot(uCut.xyz, vW) - uCut.w;
  float dn = dot(uCut.xyz, uCamDir);
  vec3 h = abs(dn) < 1e-4 ? vW - uCut.xyz * side : vW - uCamDir * (side / dn);
  vec3 e1 = normalize(cross(vec3(0.0, 1.0, 0.0), uCut.xyz));
  vec3 e2 = cross(uCut.xyz, e1);
  vec2 uv = vec2(dot(h, e1), dot(h, e2)) * uPx; // device px on the plane

  // the material's hatch, in sheet units (x1.4 px), angle as on the 2D sheet
  float a = radians(uAngle);
  vec2 dir = vec2(sin(a), cos(a));
  vec2 perp = vec2(cos(a), -sin(a));
  float qx = dot(uv, perp), qy = dot(uv, dir);
  float unit = 1.4 * uDpr;
  float g = uGap * unit;
  float lw = 0.8 * uDpr;
  int kind = int(uKind + 0.5);
  float hv = 0.0;
  if (kind == 1) hv = lines(qx / g, lw);
  else if (kind == 2) hv = max(lines(qx / g, lw), lines((qx - uPair * unit) / g, lw));
  else if (kind == 3) hv = max(lines(qx / g, lw), step(0.5, fract(qy / (2.6 * unit))) * lines(qx / g - 0.5, lw));
  else if (kind == 4) hv = max(lines(qx / g, lw), lines(qy / g, lw));
  else if (kind == 5) { vec2 c = (fract(vec2(qx, qy) / g) - 0.5) * g; hv = clamp(0.62 * unit - length(c) + 0.5, 0.0, 1.0); }

  // stipple for air: one dot per cell, kept with probability = density
  vec2 cell = floor(uv / (3.2 * unit));
  vec2 jit = vec2(hash(cell), hash(cell + 7.3)) * 0.5 + 0.25;
  float dd = length((uv / (3.2 * unit) - cell - jit) * 3.2 * unit);
  float stip = step(hash(cell + 3.1), uDensity) * clamp(0.8 * unit - dd + 0.5, 0.0, 1.0);

  // toon tones, light locked to the camera
  vec3 nv = normalize((viewMatrix * vec4(normalize(vN), 0.0)).xyz);
  float k = dot(nv, uLight);
  float aa = max(fwidth(k), 1e-4);

  int role = int(uRole + 0.5);
  bool front = gl_FrontFacing;
  bool cap = false;
  float alpha = 1.0;
  vec3 col = uMid;
  if (role == 0 || role == 6) {
    if (!front) { if (!cutting) discard; cap = true; }
  } else if (role == 1) {
    // a bore: its far wall, seen through the cut, lit from inside
    if (front || !cutting) discard;
    k = -k;
  } else if (role == 2) {
    if (front || !cutting || uMode > 0.5) discard;
    alpha = max(stip, uWash);
    if (alpha < 0.01) discard;
    col = uAccent;
  } else if (role == 3) {
    if (front || !cutting) discard;
    if (h.y < uGlass.x || h.y > uGlass.y || length(h.xz - uGlassC) > uGlass.z) discard;
    cap = true;
  } else if (role == 5) {
    if (!front) discard;
  }

  if (uMode > 0.5) {
    gl_FragColor = vec4(uEdge / 255.0, cap ? 1.0 : 0.0, 0.0, 1.0);
    gl_FragDepth = gl_FragCoord.z - (cap ? uCapBias : 0.0);
    return;
  }
  if (cap) {
    if (kind == 6) col = uInk;
    else col = mix(uPaper, uHatch.rgb, hv * uHatch.a);
  } else if (role == 2) {
    // col and alpha set above
  } else if (role == 5) {
    col = mix(uDark, uInk, 0.25);
  } else if (role == 6) {
    col = uInk;
  } else {
#ifdef DIAL
    col = texture2D(uTex, vUv).rgb;
#else
    float t1 = smoothstep(0.1 - aa, 0.1 + aa, k);
    float t2 = smoothstep(0.58 - aa, 0.58 + aa, k);
    col = mix(mix(uDark, uMid, t1), uLit, t2);
    if (role == 1) col = mix(col, uDark, 0.45);
#ifdef DBG
    if (role == 1) col = vec3(1.0, 0.0, 0.0);
#endif
#endif
  }
  gl_FragColor = vec4(col, alpha);
  gl_FragDepth = gl_FragCoord.z - ((cap || role == 2) ? uCapBias : 0.0);
}`;

const LINE_VERT = /* glsl */ `
uniform float uLineBias;
attribute float dist;
varying vec3 vW; varying float vDist;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz; vDist = dist;
  gl_Position = projectionMatrix * viewMatrix * w;
  gl_Position.z -= uLineBias * gl_Position.w;
}`;
const LINE_FRAG = /* glsl */ `
uniform float uCutOn, uPx, uDpr, uDash, uAlpha; uniform vec4 uCut; uniform vec3 uInk;
varying vec3 vW; varying float vDist;
void main() {
  if (uCutOn > 0.5 && dot(uCut.xyz, vW) > uCut.w + 0.01) discard;
  if (uDash > 0.5) {
    // ISO 128 long-dash dot, in sheet units like the 2D sheet's .ctr: 15 2.6 2 2.6
    float u = mod(vDist * uPx / (1.4 * uDpr), 22.2);
    if ((u > 15.0 && u < 17.6) || u > 19.6) discard;
  }
  gl_FragColor = vec4(uInk, uAlpha);
}`;

const MATKIND = { lines: 1, pairs: 2, dashed: 3, cross: 4, dots: 5, grain: 1 };
const ROLES = { solid: 0, void: 1, air: 2, glass: 3, dial: 4, mouth: 5, ink: 6 };
const allMats = [];
function material({ role = "solid", hatch = "none", edge = 0, dial = null, glass = null, glassC = null }) {
  let kind = 0;
  let gap = 3;
  let pair = 0;
  let angle = 45;
  if (hatch === "solid") kind = 6;
  else if (Array.isArray(hatch)) {
    const m = K.MATERIALS[hatch[0]];
    kind = MATKIND[m.kind];
    gap = m.gap;
    pair = m.pair ?? 0;
    angle = hatch[1];
  }
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      ...U,
      uKind: { value: kind },
      uGap: { value: gap },
      uPair: { value: pair },
      uAngle: { value: angle },
      uRole: { value: ROLES[role] },
      uEdge: { value: edge },
      uDensity: { value: 0.2 },
      uWash: { value: 0 },
      uLiftFrom: { value: 1e9 },
      uLift: { value: 0 },
      uGlass: { value: new THREE.Vector3(...(glass ? [glass.y0, glass.y1, glass.r] : [0, 0, 0])) },
      uGlassC: { value: new THREE.Vector2(...(glassC ?? [0, 0])) },
      uTex: { value: dial },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    defines: { ...(dial ? { DIAL: 1 } : {}), ...(Qs.has("dbg") ? { DBG: 1 } : {}) },
    // not BackSide: three.js draws BackSide by flipping the GL front face, which also flips gl_FrontFacing
    side: role === "void" || role === "air" || role === "glass" ? THREE.DoubleSide : THREE.FrontSide,
    transparent: role === "air",
    depthWrite: role !== "air",
  });
  mat.userData.role = role;
  allMats.push(mat);
  return mat;
}
const lineMat = (dash, alpha = 1) =>
  new THREE.ShaderMaterial({
    uniforms: { ...U, uDash: { value: dash ? 1 : 0 }, uAlpha: { value: alpha } },
    vertexShader: LINE_VERT,
    fragmentShader: LINE_FRAG,
    transparent: alpha < 1,
  });
const CREASE = lineMat(false);

// ---------------------------------------------------------------- geometry builders
// A closed body of revolution from a half-profile [r, s], one strip per profile edge so every corner
// is a crease, wound outward whatever the profile's direction.
function lathe(loop, seg) {
  const n = loop.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [r0, s0] = loop[i];
    const [r1, s1] = loop[(i + 1) % n];
    area += r0 * s1 - r1 * s0;
  }
  const sign = area > 0 ? 1 : -1;
  const pos = [];
  const nor = [];
  const idx = [];
  const P3 = (i) => new THREE.Vector3(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]);
  for (let i = 0; i < n; i++) {
    const [r0, s0] = loop[i];
    const [r1, s1] = loop[(i + 1) % n];
    if (r0 === 0 && r1 === 0) continue;
    const dr = r1 - r0;
    const ds = s1 - s0;
    const len = Math.hypot(dr, ds);
    if (len < 1e-9) continue;
    const nr = (sign * ds) / len;
    const ns = (-sign * dr) / len;
    const base = pos.length / 3;
    for (let j = 0; j <= seg; j++) {
      const t = (j / seg) * Math.PI * 2;
      const c = Math.cos(t);
      const sn = Math.sin(t);
      pos.push(r0 * c, s0, -r0 * sn, r1 * c, s1, -r1 * sn);
      nor.push(nr * c, ns, -nr * sn, nr * c, ns, -nr * sn);
    }
    for (let j = 0; j < seg; j++) {
      const a = base + 2 * j;
      for (const [i0, i1, i2] of [[a, a + 1, a + 3], [a, a + 3, a + 2]]) {
        const p0 = P3(i0);
        const cr = P3(i1).sub(p0).cross(P3(i2).sub(p0));
        if (cr.lengthSq() < 1e-12) continue;
        const want = new THREE.Vector3(nor[3 * i0], nor[3 * i0 + 1], nor[3 * i0 + 2]);
        if (cr.dot(want) >= 0) idx.push(i0, i1, i2);
        else idx.push(i0, i2, i1);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}

function placeOnAxis(geo, axis, at) {
  if (axis === "x") {
    geo.applyMatrix4(new THREE.Matrix4().makeRotationZ(-Math.PI / 2));
    geo.translate(0, at, 0);
  } else geo.translate(at, 0, 0);
  return geo;
}

function extrude({ shape, holes = [], along, from, to, bevel = 0, conform }) {
  const sh = new THREE.Shape(shape.map(([a, b]) => new THREE.Vector2(a, b)));
  for (const h of holes) sh.holes.push(new THREE.Path(h.map(([a, b]) => new THREE.Vector2(a, b))));
  const geo = new THREE.ExtrudeGeometry(sh, {
    depth: to - from - 2 * bevel,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    steps: conform ? 24 : 1,
    curveSegments: 24,
  });
  geo.translate(0, 0, from + bevel);
  if (along === "y") geo.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
  if (along === "x") geo.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI / 2));
  if (conform) {
    // the face at x = conform.x lands on the cylinder of radius r round the pump's axis
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      if (Math.abs(p.getX(i) - conform.x) < 1e-3) p.setX(i, Math.sign(conform.x) * Math.sqrt(conform.r ** 2 - p.getZ(i) ** 2));
    }
    geo.computeVertexNormals();
  }
  return geo;
}

class Helix extends THREE.Curve {
  constructor(s) {
    super();
    this.s = s;
  }
  getPoint(t, out = new THREE.Vector3()) {
    const { from, to, at, radius, wire, turns } = this.s;
    const a = 2 * Math.PI * turns * t;
    return out.set(from + wire / 2 + t * (to - from - wire), at + radius * Math.cos(a), radius * Math.sin(a));
  }
}

function solidGeometry(s) {
  const seg = (r) => (r > 20 ? 144 : r > 6 ? 96 : 48);
  if (s.kind === "lathe") return placeOnAxis(lathe(s.loop, seg(Math.max(...s.loop.map(([r]) => r)))), s.axis, s.at);
  if (s.kind === "extrude") return extrude(s);
  if (s.kind === "sphere") return new THREE.SphereGeometry(s.r, 48, 32).translate(...s.c);
  if (s.kind === "helix") return new THREE.TubeGeometry(new Helix(s), 260, s.wire / 2, 10, false);
  if (s.kind === "box") {
    const size = s.max.map((v, i) => v - s.min[i]);
    return new THREE.BoxGeometry(...size).translate(...s.min.map((v, i) => v + size[i] / 2));
  }
  if (s.kind === "torus") {
    const [a0, a1] = s.arc;
    const g = new THREE.TorusGeometry(s.R, s.r, 14, 120, ((a1 - a0) * Math.PI) / 180);
    g.rotateZ((a0 * Math.PI) / 180);
    g.rotateX(-Math.PI / 2);
    return g.translate(...s.c);
  }
  if (s.kind === "disc") return new THREE.CircleGeometry(s.r, 96).rotateX(-Math.PI / 2).translate(...s.c);
  if (s.kind === "needle") {
    const a = (al, ac) => new THREE.Vector2(al, ac);
    const sh = new THREE.Shape([a(27, 0), a(0, 0.9), a(-7, 0.7), a(-7, -0.7), a(0, -0.9)]);
    return new THREE.ExtrudeGeometry(sh, { depth: 0.5, bevelEnabled: false }).rotateX(-Math.PI / 2);
  }
  throw new Error("unknown solid " + s.kind);
}

// ---------------------------------------------------------------- the dial face, drawn from the 2D sheet's dial
const dialCanvas = document.createElement("canvas");
dialCanvas.width = dialCanvas.height = 1024;
const dialTex = new THREE.CanvasTexture(dialCanvas);
dialTex.anisotropy = 4;
function drawDial(paper, ink) {
  const g = dialCanvas.getContext("2d");
  const S = 512 / 31.4; // px per mm
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = paper;
  g.fillRect(0, 0, 1024, 1024);
  g.translate(512, 512);
  g.strokeStyle = g.fillStyle = ink;
  const pt = (r, deg) => [r * S * Math.cos((deg * Math.PI) / 180), -r * S * Math.sin((deg * Math.PI) / 180)];
  g.lineWidth = 0.35 * S;
  g.beginPath();
  g.arc(0, 0, 29 * S, (45 * Math.PI) / 180, (-225 * Math.PI) / 180, true);
  g.stroke();
  for (let i = 0; i <= 55; i++) {
    const deg = P.needleAngle(i / 5);
    const [x0, y0] = pt(i % 5 === 0 ? 25.6 : 27.2, deg);
    const [x1, y1] = pt(29, deg);
    g.lineWidth = (i % 5 === 0 ? 0.5 : 0.3) * S;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
  }
  g.font = `600 ${3.6 * S}px ui-monospace, Consolas, monospace`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  for (let bar = 0; bar <= 11; bar++) g.fillText(String(bar), ...pt(21.4, P.needleAngle(bar)));
  g.font = `${3 * S}px ui-monospace, Consolas, monospace`;
  g.fillText("bar", 0, 13 * S);
  dialTex.needsUpdate = true;
}

// ---------------------------------------------------------------- build the pump
const root = new THREE.Group();
scene.add(root);
const PARTS = new Map(); // id -> { id, group, holders: [{ obj, solid }], edges: Set }
let edgeSeq = 0;
const edgeOwner = new Map(); // edge id -> part id
const live = { cup: null, needle: null, spring: null };

function addSolid(part, s, holder, edge) {
  const role = s.role ?? "solid";
  const geo = solidGeometry(s);
  const mat = material({ role, hatch: s.hatch ?? (role === "ink" ? "solid" : "none"), edge, dial: role === "dial" ? dialTex : null, glass: s.glass, glassC: s.glass ? [G_GAUGE, 0] : null });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.part = part.id;
  holder.add(mesh);
  let lines = null;
  if (role === "solid" || role === "void" || role === "glass" || role === "ink") {
    lines = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 35), CREASE);
    lines.userData.crease = true;
    holder.add(lines);
  }
  return { mesh, lines };
}
const G_GAUGE = P.GAUGE_U;

for (const spec of G.parts(0)) {
  const group = new THREE.Group();
  group.userData.part = spec.id;
  root.add(group);
  const rec = { id: spec.id, spec, group, holders: [], edges: new Set() };
  const shared = spec.id === 1 || spec.id === 13 ? ++edgeSeq : 0;
  for (const s of spec.solids) {
    const holder = new THREE.Group();
    group.add(holder);
    const edge = s.role === "mouth" || s.edge || !shared ? ++edgeSeq : shared;
    edgeOwner.set(edge, spec.id);
    rec.edges.add(edge);
    const made = addSolid(spec, s, holder, edge);
    rec.holders.push({ obj: holder, solid: s });
    if (s.live === "cup") live.cup = { holder, made, s, edge, fold: 0 };
    if (s.live === "needle") {
      // pivot on the gauge's axis, just above the needle hub
      holder.position.set(G_GAUGE, 92.2, 0);
      live.needle = holder;
    }
  }
  if (spec.id === 18) live.spring = rec;
  PARTS.set(spec.id, rec);
}

// air, stippled in the accent by pressure
const airGroup = new THREE.Group();
root.add(airGroup);
const airMats = { p: [], pt: [] };
for (const a of G.air()) {
  const mat = material({ role: "air" });
  if (a.liftFrom) mat.uniforms.uLiftFrom.value = a.liftFrom;
  airMats[a.pressure].push(mat);
  const mesh = new THREE.Mesh(placeOnAxis(lathe(a.loop, 64), a.axis, a.at), mat);
  mesh.renderOrder = 2;
  airGroup.add(mesh);
}

// centre lines: the pump's axis, the valve's and the gauge's (the handle's rides with it)
function centreLine(a, b, parent = root) {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]);
  geo.setAttribute("dist", new THREE.Float32BufferAttribute([0, new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b))], 1));
  const l = new THREE.Line(geo, lineMat(true, 0.85));
  l.userData.crease = true;
  parent.add(l);
  return l;
}
const axisLine = centreLine([0, -12, 0], [0, 860, 0]);
centreLine([30, M.PASSAGE_V, 0], [G.HOSE_END + 10, M.PASSAGE_V, 0]);
centreLine([G_GAUGE, 52, 0], [G_GAUGE, 106, 0]);
const handleAxis = centreLine([-150, G.REST.HC, 0], [150, G.REST.HC, 0], PARTS.get(14).group);

// ---------------------------------------------------------------- the outline pass
const idTarget = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthTexture: new THREE.DepthTexture(4, 4) });
const edgeMat = new THREE.ShaderMaterial({
  uniforms: { tId: { value: idTarget.texture }, tDepth: { value: idTarget.depthTexture }, uTexel: { value: new THREE.Vector2() }, uInk: U.uInk, uW: { value: 1 }, uRange: { value: FAR - NEAR }, uThr: { value: 2.0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */ `
uniform sampler2D tId, tDepth; uniform vec2 uTexel; uniform vec3 uInk; uniform float uW, uRange, uThr;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tId, vUv);
  float e = 0.0;
  vec2 o[4];
  o[0] = vec2(1.0, 0.0); o[1] = vec2(-1.0, 0.0); o[2] = vec2(0.0, 1.0); o[3] = vec2(0.0, -1.0);
  for (int i = 0; i < 4; i++) {
    vec4 n = texture2D(tId, vUv + o[i] * uTexel * uW);
    if (abs(n.r - c.r) > 0.5 / 255.0 || abs(n.g - c.g) > 0.5) e = 1.0;
  }
  if (e < 0.5 && c.a > 0.5 && c.g < 0.5) {
    // a fold or an overlap within one part: depth is not linear across the pixel
    float d0 = texture2D(tDepth, vUv).x;
    for (int i = 0; i < 2; i++) {
      vec2 st = o[2 * i] * uTexel * uW;
      float dl = texture2D(tDepth, vUv - st).x, dr = texture2D(tDepth, vUv + st).x;
      if (abs(dl + dr - 2.0 * d0) * uRange > uThr) e = 1.0;
    }
  }
  if (e < 0.5) discard;
  gl_FragColor = vec4(uInk, 1.0);
}`,
  transparent: true,
  depthTest: false,
  depthWrite: false,
});
const edgeScene = new THREE.Scene();
edgeScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), edgeMat));
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// ---------------------------------------------------------------- theme
function cssColor(name) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const m = v.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b, a = 1] = m[1].split(",").map(Number);
    return { c: new THREE.Color(r / 255, g / 255, b / 255), a, css: v };
  }
  return { c: new THREE.Color(v), a: 1, css: v };
}
function applyTheme() {
  for (const [u, name] of [["uLit", "--bp3-lit"], ["uMid", "--bp3-mid"], ["uDark", "--bp3-dark"], ["uPaper", "--bp-paper"], ["uInk", "--bp-ink"], ["uAccent", "--bp-accent"]]) U[u].value.copy(cssColor(name).c);
  const h = cssColor("--bp-hatch");
  U.uHatch.value.set(h.c.r, h.c.g, h.c.b, h.a);
  drawDial(cssColor("--bp-paper").css, cssColor("--bp-ink").css);
  wake();
}
new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

// ---------------------------------------------------------------- state: the 2D sheet's, from the same model
const air = M.pump();
let x = 0;
let target = 0;
let fold = 0;
let lift = 0;
let needle = M.START_GAUGE;
let auto = false;
let dragging = false;

const PERIOD = 1.8;
const DOWN = 0.56;
const tour = { t: 0, cycle: 0, mode: "pump", modeT: 0, from: 0 };
function tourTarget(h) {
  tour.modeT += h;
  if (tour.mode === "pump") {
    tour.t += h;
    const cycle = Math.floor(tour.t / PERIOD);
    if (cycle !== tour.cycle) {
      tour.cycle = cycle;
      if (M.gauge(air.pt) >= M.RESET_GAUGE) {
        tour.mode = "hold";
        tour.modeT = 0;
        return 0;
      }
    }
    const phase = (tour.t % PERIOD) / PERIOD;
    return phase < DOWN ? L.ease(phase / DOWN) : 1 - L.ease((phase - DOWN) / (1 - DOWN));
  }
  if (tour.mode === "hold" && tour.modeT > 1.4) {
    tour.mode = "deflate";
    tour.modeT = 0;
    tour.from = M.gauge(air.pt);
  }
  if (tour.mode === "deflate") {
    const k = Math.min(1, tour.modeT / 1.8);
    M.setTyre(air, tour.from + (M.START_GAUGE - tour.from) * L.ease(k));
    if (k >= 1) {
      air.strokes = 0;
      tour.mode = "pump";
      tour.modeT = 0;
      tour.t = 0;
      tour.cycle = 0;
    }
  }
  return 0;
}

// view state
const VIEWS = { iso: [45, 35.264], front: [0, 0], side: [90, 0], top: [0, 90] };
const start = VIEWS[q.view] ?? VIEWS.iso;
const cam = { az: start[0], el: start[1], azT: start[0], elT: start[1], zoom: q.zoom, pan: new THREE.Vector3() };
let explode = q.explode;
let explodeT = q.explode;
let showBalloons = q.balloons;

function step(dt, lv) {
  const n = Math.max(1, Math.ceil(dt * 480));
  const h = dt / n;
  const driven = (lv.touring || auto) && !dragging;
  for (let i = 0; i < n; i++) {
    if (driven) target = tourTarget(h);
    x = lv.reduced && !driven ? target : L.follow(x, target, driven ? 30 : 18, h);
    x = Math.min(1, Math.max(0, x));
    M.advance(air, x);
    lift = L.follow(lift, air.open ? M.BALL_LIFT : 0, air.open ? 60 : 22, h);
    fold = L.follow(fold, air.intake ? 1.2 : 0, 26, h);
    needle = L.follow(needle, M.gauge(air.pt), 10, h);
  }
  const snap = lv.reduced || lv.frozen;
  cam.az = snap ? cam.azT : L.follow(cam.az, cam.azT, 9, dt);
  cam.el = snap ? cam.elT : L.follow(cam.el, cam.elT, 9, dt);
  explode = snap ? explodeT : L.follow(explode, explodeT, 5, dt);
  return (
    Math.abs(x - target) > 1e-4 || lift > 1e-3 || fold > 1e-3 || Math.abs(needle - M.gauge(air.pt)) > 1e-3 ||
    Math.abs(cam.az - cam.azT) > 0.01 || Math.abs(cam.el - cam.elT) > 0.01 || Math.abs(explode - explodeT) > 1e-3
  );
}

// ---------------------------------------------------------------- poses
const smooth = (t) => t * t * (3 - 2 * t);
function pose(xs, e) {
  const L0 = M.STROKE * (1 - xs);
  for (const rec of PARTS.values()) {
    const ex = G.EXPLODE[rec.id];
    const g = rec.group;
    if (Array.isArray(ex)) g.position.set(ex[0] * e, ex[1] * e, ex[2] * e);
    else g.position.set(0, L0 + (ex.lift - L0) * e, 0);
    if (ex.side) for (const hd of rec.holders) hd.obj.position.x = hd.solid.side * ex.side * e;
  }
  // the check valve: the ball rides off its seat, the spring shortens against the barb
  const du = P.ballU(lift) - P.ballU(0);
  PARTS.get(17).group.position.x += du;
  const s0 = 66 - (P.ballU(0) + M.BALL_D / 2);
  const sNow = 66 - (P.ballU(lift) + M.BALL_D / 2);
  const sp = PARTS.get(18).holders[0].obj;
  sp.scale.x = sNow / s0;
  sp.position.x = 66 * (1 - sNow / s0);
}

function rebuildCup() {
  if (Math.abs(fold - live.cup.fold) < 0.01) return;
  live.cup.fold = fold;
  const { mesh, lines } = live.cup.made;
  const geo = placeOnAxis(lathe(P.cupLoop(G.REST.VP, fold), 96), "y", 0);
  mesh.geometry.dispose();
  mesh.geometry = geo;
  lines.geometry.dispose();
  lines.geometry = new THREE.EdgesGeometry(geo, 35);
}

// bounds for framing: assembled with the handle up, and fully exploded
function boundsAt(e) {
  pose(0, e);
  airGroup.visible = false;
  root.updateMatrixWorld(true);
  const b = new THREE.Box3();
  for (const rec of PARTS.values()) b.expandByObject(rec.group);
  return b;
}
const B0 = boundsAt(0);
const B1 = boundsAt(1);

// ---------------------------------------------------------------- camera
let W = 1;
let H = 1;
let dpr = 1;
function resize() {
  const r = host.getBoundingClientRect();
  W = Math.max(1, Math.round(r.width));
  H = Math.max(1, Math.round(r.height));
  dpr = renderer.getPixelRatio();
  renderer.setSize(W, H, false);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  idTarget.setSize(Math.round(W * dpr), Math.round(H * dpr));
  edgeMat.uniforms.uTexel.value.set(1 / (W * dpr), 1 / (H * dpr));
  edgeMat.uniforms.uW.value = Math.max(1, Math.round(dpr * 0.75));
  overlay.setAttribute("viewBox", `0 0 ${W} ${H}`);
  wake();
}
const MARGIN = { l: 150, r: 150, t: 34, b: 34 };
function placeCamera() {
  const az = (cam.az * Math.PI) / 180;
  const el = (Math.min(89.9, cam.el) * Math.PI) / 180;
  const dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
  const k = smooth(Math.min(1, Math.max(0, explode)));
  const box = new THREE.Box3(B0.min.clone().lerp(B1.min, k), B0.max.clone().lerp(B1.max, k));
  const centre = q.look ? new THREE.Vector3(...q.look) : box.getCenter(new THREE.Vector3());
  camera.position.copy(centre).addScaledVector(dir, FAR / 2);
  camera.up.set(0, 1, 0);
  camera.lookAt(centre);
  camera.updateMatrixWorld(true);
  // fit the box's eight corners, in camera space, inside the margins
  const inv = camera.matrixWorldInverse;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).applyMatrix4(inv);
    x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
  }
  const fit = Math.min((W - MARGIN.l - MARGIN.r) / (x1 - x0), (H - MARGIN.t - MARGIN.b) / (y1 - y0));
  const zoom = fit * cam.zoom;
  // centre the fitted box (it is not symmetric about the look point) unless a point was asked for
  const off = q.look ? new THREE.Vector3() : new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, 0).applyMatrix3(new THREE.Matrix3().setFromMatrix4(camera.matrixWorld));
  camera.position.add(off).add(cam.pan);
  camera.left = -W / 2 / zoom;
  camera.right = W / 2 / zoom;
  camera.top = H / 2 / zoom;
  camera.bottom = -H / 2 / zoom;
  camera.zoom = 1;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  U.uCamDir.value.copy(dir).negate();
  U.uPx.value = zoom * dpr;
  U.uDpr.value = dpr;
  return zoom;
}

// ---------------------------------------------------------------- overlay: balloons, leaders, live dimension
const NS = "http://www.w3.org/2000/svg";
const project = (v) => {
  const p = v.clone().project(camera);
  return [((p.x + 1) / 2) * W, ((1 - p.y) / 2) * H];
};
const camDirWorld = () => U.uCamDir.value.clone().negate();
function anchorWorld(id) {
  const a = G.ANCHORS[id];
  const rec = PARTS.get(id);
  let p;
  if (U.uCutOn.value > 0.5 && explode < 0.5) p = new THREE.Vector3(...a.cut);
  else {
    const o = a.out;
    p = new THREE.Vector3(...o.c);
    const d = camDirWorld();
    if (o.axis === "y") d.y = 0;
    if (o.axis === "x") d.x = 0;
    if (o.axis === "box") {
      d.y = 0;
      d.divideScalar(Math.max(Math.abs(d.x), Math.abs(d.z)) || 1);
      p.addScaledVector(d, o.r);
    } else if (o.r) p.addScaledVector(d.normalize(), o.r);
  }
  // in its part's frame (explode, stroke, the ball's lift); a grip or plug takes its own side
  const holder = id === 15 || id === 16 ? rec.holders[0].obj : rec.group;
  return p.applyMatrix4(holder.matrixWorld);
}
const pix = new Uint8Array(4);
const visibleCache = new Map();
let visFrame = 0;
function visibleAt(id, sx, sy) {
  if (sx < 0 || sy < 0 || sx >= W || sy >= H) return false;
  renderer.readRenderTargetPixels(idTarget, Math.round(sx * dpr), Math.round((H - sy) * dpr), 1, 1, pix);
  return PARTS.get(id).edges.has(pix[0]) || pix[0] === 0;
}

function drawOverlay(zoom) {
  let out = "";
  const ids = [...PARTS.keys()];
  if (showBalloons) {
    const items = ids.map((id) => {
      const [ax, ay] = project(anchorWorld(id));
      return { id, ax, ay };
    });
    // the model's screen box, for the two balloon columns
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const k = smooth(Math.min(1, Math.max(0, explode)));
      const b0 = B0, b1 = B1;
      const v = new THREE.Vector3(
        i & 1 ? THREE.MathUtils.lerp(b0.max.x, b1.max.x, k) : THREE.MathUtils.lerp(b0.min.x, b1.min.x, k),
        i & 2 ? THREE.MathUtils.lerp(b0.max.y, b1.max.y, k) : THREE.MathUtils.lerp(b0.min.y, b1.min.y, k),
        i & 4 ? THREE.MathUtils.lerp(b0.max.z, b1.max.z, k) : THREE.MathUtils.lerp(b0.min.z, b1.min.z, k)
      );
      pts.push(project(v));
    }
    const minX = Math.min(...pts.map((p) => p[0]));
    const maxX = Math.max(...pts.map((p) => p[0]));
    const mid = (minX + maxX) / 2;
    const R = 10;
    const cols = { l: Math.max(R + 14, minX - 46), r: Math.min(W - R - 14, maxX + 46) };
    const refresh = visFrame++ % 3 === 0;
    for (const side of ["l", "r"]) {
      const col = items.filter((it) => (it.ax < mid ? "l" : "r") === side).sort((a, b) => a.ay - b.ay);
      const gap = 2 * R + 6;
      const ys = col.map((c) => c.ay);
      for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + gap);
      const lim = H - R - 8;
      if (ys.length && ys[ys.length - 1] > lim) {
        ys[ys.length - 1] = lim;
        for (let i = ys.length - 2; i >= 0; i--) ys[i] = Math.min(ys[i], ys[i + 1] - gap);
      }
      col.forEach((c, i) => {
        const bx = cols[side];
        const by = Math.max(R + 8, ys[i]);
        if (refresh || !visibleCache.has(c.id)) visibleCache.set(c.id, visibleAt(c.id, c.ax, c.ay));
        const seen = visibleCache.get(c.id);
        const dx = c.ax - bx, dy = c.ay - by, d = Math.hypot(dx, dy) || 1;
        const lx = bx + (dx / d) * R, ly = by + (dy / d) * R;
        out += `<path class="${seen ? "thin" : "hid"}" d="M${lx.toFixed(1)} ${ly.toFixed(1)}L${c.ax.toFixed(1)} ${c.ay.toFixed(1)}"/>`;
        out += seen ? `<circle class="dot" cx="${c.ax.toFixed(1)}" cy="${c.ay.toFixed(1)}" r="1.7"/>` : `<circle class="balloon" cx="${c.ax.toFixed(1)}" cy="${c.ay.toFixed(1)}" r="1.7"/>`;
        out += `<g data-part="${c.id}"><title>${c.id} ${G.BOM[c.id]}</title><circle class="balloon" cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${R}"/><text class="t" x="${bx.toFixed(1)}" y="${(by + 3.4).toFixed(1)}" text-anchor="middle">${c.id}</text></g>`;
      });
    }
  }
  // live stroke dimension beside the handle's right end, while assembled
  if (explode < 0.05) {
    const hcTop = P.handleCentre(M.pistonV(0));
    const travel = M.STROKE * x;
    const A = project(new THREE.Vector3(140, hcTop, 0));
    const B = project(new THREE.Vector3(140, hcTop - travel, 0));
    const ax = [B[0] - A[0], B[1] - A[1]];
    const len = Math.hypot(...ax);
    // offset to the right of the axis on screen
    const nrm = len > 0.5 ? [-ax[1] / len, ax[0] / len] : [1, 0];
    const side = nrm[0] < 0 ? -1 : 1;
    const o = 26 * side;
    const a2 = [A[0] + nrm[0] * o, A[1] + nrm[1] * o];
    const b2 = [B[0] + nrm[0] * o, B[1] + nrm[1] * o];
    const f = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    const ext = (p, p2) => `M${f([p[0] + nrm[0] * 4 * side, p[1] + nrm[1] * 4 * side])}L${f([p2[0] + nrm[0] * 5 * side, p2[1] + nrm[1] * 5 * side])}`;
    let dim = `<path class="thin" d="${ext(A, a2)}${len > 1 ? ext(B, b2) : ""}M${f(a2)}L${f(b2)}"/>`;
    if (len > 16) {
      const u = [ax[0] / len, ax[1] / len];
      const head = (p, s) => {
        const t = [p[0] + u[0] * 7 * s, p[1] + u[1] * 7 * s];
        return `M${f(p)}L${f([t[0] + nrm[0] * 1.6, t[1] + nrm[1] * 1.6])}L${f([t[0] - nrm[0] * 1.6, t[1] - nrm[1] * 1.6])}Z`;
      };
      dim += `<path class="head" d="${head(a2, 1)}${head(b2, -1)}"/>`;
    }
    const mx = (a2[0] + b2[0]) / 2 + nrm[0] * 9 * side;
    const my = (a2[1] + b2[1]) / 2 + nrm[1] * 9 * side;
    const ang = (Math.atan2(ax[1], ax[0]) * 180) / Math.PI + (len > 0.5 ? 0 : 90);
    const rot = ((ang + 360 + 90) % 180) - 90;
    dim += `<text class="t" x="${mx.toFixed(1)}" y="${my.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rot.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)})">s=${Math.round(travel)}</text>`;
    out += `<g data-role="dim">${dim}</g>`;
  }
  overlay.innerHTML = out;
}

// ---------------------------------------------------------------- render
const say = L.announcer($("sr"), 2);
const tint = (p) => 0.18 + 0.82 * Math.min(1, Math.max(0, M.gauge(p) / 7));
function render(lv) {
  rebuildCup();
  pose(x, explode);
  live.needle.rotation.y = (P.needleAngle(needle) * Math.PI) / 180;
  airGroup.visible = explode < 0.01 && U.uCutOn.value > 0.5;
  for (const m of airMats.p) {
    m.uniforms.uDensity.value = tint(air.p);
    m.uniforms.uWash.value = 0.05 + 0.1 * tint(air.p);
    m.uniforms.uLift.value = M.STROKE * (1 - x);
  }
  for (const m of airMats.pt) {
    m.uniforms.uDensity.value = tint(air.pt);
    m.uniforms.uWash.value = 0.05 + 0.1 * tint(air.pt);
  }
  const cutting = U.uCutOn.value > 0.5;
  for (const m of allMats) if (m.userData.role === "solid" || m.userData.role === "ink") m.side = cutting ? THREE.DoubleSide : THREE.FrontSide;
  const zoom = placeCamera();
  root.updateMatrixWorld(true);

  // 1: colour
  U.uMode.value = 0;
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
  // 2: ids and depth, without lines or air
  U.uMode.value = 1;
  scene.traverse((o) => o.userData.crease && (o.visible = false));
  const airWas = airGroup.visible;
  airGroup.visible = false;
  renderer.setRenderTarget(idTarget);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, camera);
  scene.traverse((o) => o.userData.crease && (o.visible = true));
  airGroup.visible = airWas;
  U.uMode.value = 0;
  // 3: outlines over the colour
  renderer.setRenderTarget(null);
  renderer.autoClear = false;
  renderer.render(edgeScene, quadCam);
  renderer.autoClear = true;

  drawOverlay(zoom);
  const travel = M.STROKE * x;
  const g = M.gauge(air.p);
  $("readout").textContent = `s ${Math.round(travel)} mm · CHAMBER ${g.toFixed(2)} bar · TYRE ${M.gauge(air.pt).toFixed(2)} bar · F ${Math.round(M.force(air.p))} N · VALVE ${air.open ? "OPEN" : "SHUT"}`;
  say(`Travel ${Math.round(travel)} millimetres, chamber ${g.toFixed(1)} bar, tyre ${M.gauge(air.pt).toFixed(1)} bar, handle force ${Math.round(M.force(air.p))} newtons.`, lv.clock);
  syncControls();
}

// ---------------------------------------------------------------- controls
const ui = {
  cut: $("cut"),
  offset: $("offset"),
  explode: $("explode"),
  balloons: $("balloons"),
  views: [...document.querySelectorAll("[data-view]")],
};
function syncControls() {
  ui.cut.setAttribute("aria-pressed", String(U.uCutOn.value > 0.5));
  ui.balloons.setAttribute("aria-pressed", String(showBalloons));
  if (document.activeElement !== ui.explode) ui.explode.value = String(explodeT);
  for (const b of ui.views) {
    const [az, el] = VIEWS[b.dataset.view];
    b.setAttribute("aria-pressed", String(Math.abs(cam.azT - az) < 0.01 && Math.abs(cam.elT - el) < 0.01));
  }
}
let lv = null;
// A frozen frame (?t=) has no loop: anything that clears the canvas (a resize, a theme) redraws it here.
function wake() {
  if (!lv) return;
  if (lv.frozen) render(lv);
  else lv.wake?.();
}
function input() {
  if (lv?.frozen) render(lv);
  else lv?.input();
}
function setView(name) {
  const [az, el] = VIEWS[name];
  // take the short way round
  cam.az = ((((cam.az - az) % 360) + 540) % 360) - 180 + az;
  cam.azT = az;
  cam.elT = el;
  cam.pan.set(0, 0, 0);
  input();
}
for (const b of ui.views) b.addEventListener("click", () => setView(b.dataset.view));
ui.cut.addEventListener("click", () => {
  U.uCutOn.value = U.uCutOn.value > 0.5 ? 0 : 1;
  input();
});
ui.offset.value = String(q.offset);
ui.offset.addEventListener("input", () => {
  U.uCut.value.w = Number(ui.offset.value);
  U.uCutOn.value = 1;
  input();
});
ui.explode.addEventListener("input", () => {
  explodeT = Number(ui.explode.value);
  input();
});
ui.balloons.addEventListener("click", () => {
  showBalloons = !showBalloons;
  input();
});
$("pump").addEventListener("click", () => {
  auto = !auto;
  input();
});

// pointer: drag the handle to pump, drag elsewhere to orbit, shift or right drag to pan, wheel to zoom
const ray = new THREE.Raycaster();
const handleMeshes = [];
for (const id of [13, 14, 15, 16]) PARTS.get(id).group.traverse((o) => o.isMesh && handleMeshes.push(o));
let drag = null;
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("pointerdown", (e) => {
  const r = canvas.getBoundingClientRect();
  const px = e.clientX - r.left;
  const py = e.clientY - r.top;
  ray.setFromCamera(new THREE.Vector2((px / W) * 2 - 1, 1 - (py / H) * 2), camera);
  const hit = explode < 0.05 && e.button === 0 && !e.shiftKey && ray.intersectObjects(handleMeshes, false).length > 0;
  const a = project(new THREE.Vector3(0, 400, 0));
  const b = project(new THREE.Vector3(0, 400 - M.STROKE, 0));
  drag = { mode: hit ? "pump" : e.button === 2 || e.shiftKey ? "pan" : "orbit", px, py, x0: x, az: cam.azT, el: cam.elT, pan: cam.pan.clone(), axis: [b[0] - a[0], b[1] - a[1]] };
  if (hit) {
    dragging = true;
    auto = false;
    target = x;
  }
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add("v3-grab");
  input();
});
canvas.addEventListener("pointermove", (e) => {
  if (!drag) {
    return;
  }
  const r = canvas.getBoundingClientRect();
  const dx = e.clientX - r.left - drag.px;
  const dy = e.clientY - r.top - drag.py;
  if (drag.mode === "pump") {
    const [ax, ay] = drag.axis;
    const l2 = ax * ax + ay * ay;
    target = Math.min(1, Math.max(0, drag.x0 + (l2 > 4 ? (dx * ax + dy * ay) / l2 : dy / (M.STROKE * 0.5))));
  } else if (drag.mode === "orbit") {
    cam.azT = cam.az = drag.az - dx * 0.4;
    cam.elT = cam.el = Math.min(90, Math.max(-60, drag.el + dy * 0.4));
  } else {
    const zoom = U.uPx.value / dpr;
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    cam.pan.copy(drag.pan).addScaledVector(right, -dx / zoom).addScaledVector(up, dy / zoom);
  }
  input();
});
const endDrag = () => {
  if (!drag) return;
  drag = null;
  dragging = false;
  canvas.classList.remove("v3-grab");
  input();
};
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const sx = e.clientX - r.left - W / 2;
    const sy = H / 2 - (e.clientY - r.top);
    const z0 = U.uPx.value / dpr;
    const before = cam.zoom;
    cam.zoom = Math.min(16, Math.max(0.3, cam.zoom * Math.exp(-e.deltaY * 0.0015)));
    const z1 = (z0 * cam.zoom) / before;
    // keep the point under the cursor where it is
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    cam.pan.addScaledVector(right, sx / z0 - sx / z1).addScaledVector(up, sy / z0 - sy / z1);
    input();
  },
  { passive: false }
);
canvas.addEventListener("dblclick", () => {
  cam.zoom = 1;
  cam.pan.set(0, 0, 0);
  input();
});

host.addEventListener("keydown", (e) => {
  const k = e.key;
  if (k === "ArrowDown" || k === "ArrowUp") target = Math.min(1, Math.max(0, target + (k === "ArrowDown" ? 0.1 : -0.1)));
  else if (k === "End") target = 1;
  else if (k === "Home") target = 0;
  else if (k === " ") auto = !auto;
  else if (k === "e" || k === "E") explodeT = explodeT > 0.5 ? 0 : 1;
  else if (k === "c" || k === "C") U.uCutOn.value = U.uCutOn.value > 0.5 ? 0 : 1;
  else if (k === "b" || k === "B") showBalloons = !showBalloons;
  else if (k === "r" || k === "R") {
    M.setTyre(air, M.START_GAUGE);
    air.strokes = 0;
  } else if (k === "s" || k === "S") lv.slow = lv.slow === 1 ? 0.2 : lv.slow === 0.2 ? 0.05 : 1;
  else if ("1234".includes(k)) setView(["iso", "front", "side", "top"][Number(k) - 1]);
  else return;
  e.preventDefault();
  if (k.length > 1) auto = false;
  input();
});

// ---------------------------------------------------------------- go
resize();
applyTheme();
new ResizeObserver(resize).observe(host);
lv = L.run({
  root: host,
  step,
  render,
  idleAfter: 5,
  onFrozen: () => document.body.setAttribute("data-ready", "1"),
});
if (lv.reduced && !lv.frozen) {
  // a still, true moment: the tour played to 9 s, drawn once
  const fake = { touring: true, reduced: false, frozen: true, clock: 0 };
  for (let t = 0; t < 9; t += 1 / 240) step(1 / 240, fake);
  render(lv);
}
window.__v3ok = true;

if (q.bench) {
  // time the three passes with the GPU drained each frame (readPixels forces it)
  const one = new Uint8Array(4);
  const gl = renderer.getContext();
  const times = [];
  for (let i = 0; i < 60; i++) {
    const t0 = performance.now();
    x = (i % 30) / 30;
    M.advance(air, x);
    render(lv);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, one);
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const info = renderer.info.render;
  $("bench").textContent = JSON.stringify({ median: times[30].toFixed(2), p90: times[54].toFixed(2), triangles: info.triangles, calls: info.calls, size: [W, H, dpr], gpu: (() => { const d = gl.getExtension("WEBGL_debug_renderer_info"); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : "?"; })() });
}
