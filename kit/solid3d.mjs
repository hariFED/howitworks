// 3D mode: a live, sectioned, exploded technical illustration of an example, from the same model
// and the same profile numbers as its 2D sheet. See references/3d.md.
//
// Two halves in one module:
//   SPECS (pure, Node-safe): lathe, cylinder, tube, extrude, box, sphere, torus, helix, gear, disc,
//     part, fluid, bore. A scene is plain data: parts made of closed solids, in world mm (x right,
//     y up, z toward the viewer; the 2D sheet's u is x and v is y, its cutting plane is z = 0).
//   RUNTIME (browser): create(opts) builds the three.js scene from that data and returns a view
//     with poses, explode, fluids, drag, balloons, live dimensions and the loop (kit/live.mjs).
//
// THREE is not imported here: the page's module script does `import * as THREE from "three"`
// (writePage3d in kit/page.mjs) and this module is inlined after it, so the runtime half uses that
// binding. Nothing at the top level touches THREE or the DOM, so Node can import the spec half.
//
// How the drawing is made, three passes a frame:
//   1. ids: a part id and a "cut face" flag per pixel, plus depth, into a render target;
//   2. colour: toon tones on surfaces. While the section is open every closed solid is drawn double
//      sided; its back faces are only ever seen through the opening, so they are shaded as the cut
//      face (paper and the part's hatch, computed where the view ray meets the plane). Creases come
//      from EdgesGeometry and skip pixels that pass 1 marked as a cut face;
//   3. outlines: thick lines where the id, the flag or the depth's second difference jumps.
//
// URL parameters every 3D page supports:
//   ?t=1.0 deterministic frame of the tour   ?view=iso|front|side|top   ?cut=0|1   ?offset=mm
//   ?explode=0..1   ?zoom=k   ?look=x,y,z (mm)   ?theme=blueprint|paper|white|dark   ?balloons=0
//   ?embed=1 (no page chrome)   ?check=1 (render stats)   ?selftest=1 (drive the controls)
//   ?bench=1 (time a frame)   ?dbg=1 (tint bores, fluids and outlines)

import * as K from "./draft.mjs";
import * as L from "./live.mjs";

// ================================================================ SPECS (pure)

const AXIS = { y: "y", v: "y", x: "x", u: "x", z: "z" };
const pair = (at) => (Array.isArray(at) ? [at[0] ?? 0, at[1] ?? 0] : [at ?? 0, 0]);

// A body of revolution from a closed half-profile [[r, s], …] in mm: the same loops K.revolve takes.
// axis "y" (or "v"): vertical, through x = at[0], z = at[1]. axis "x" (or "u"): through y = at[0],
// z = at[1]. axis "z": through x = at[0], y = at[1]. A number `at` means [at, 0].
// A solid profile touches the axis along one edge (two consecutive points with r = 0).
export function lathe(loop, { axis = "y", at = 0, ...o } = {}) {
  return { kind: "lathe", loop, axis: AXIS[axis], at: pair(at), ...o };
}
export function cylinder({ axis = "y", at = 0, r, from, to, ...o }) {
  return lathe([[0, from], [r, from], [r, to], [0, to]], { axis, at, ...o });
}
export function tube({ axis = "y", at = 0, r0, r1, from, to, ...o }) {
  return lathe([[r0, from], [r1, from], [r1, to], [r0, to]], { axis, at, ...o });
}

// A prism: an outline [[a, b], …] (with optional holes) swept from `from` to `to` along an axis.
//   along "z": a = x, b = y      along "y": a = x, b = z      along "x": a = z, b = y
// bevel rounds the edges and grows the outline by itself, so give a bevelled outline inset by it.
// conform { x, r }: vertices on the face x = conform.x move onto the cylinder of radius r round
// the y axis, so a boss of a casting meets a turned body exactly (castings without CSG).
export function extrude(shape, { along = "z", from, to, holes = [], bevel = 0, conform = null, ...o }) {
  return { kind: "extrude", shape, holes, along: AXIS[along], from, to, bevel, conform, ...o };
}
export const box = (min, max, o = {}) => ({ kind: "box", min, max, ...o });
export const sphere = (c, r, o = {}) => ({ kind: "sphere", c, r, ...o });
// A ring of tube radius r on a circle of radius R round an axis through c; arc [a0, a1] in degrees.
export const torus = (c, R, r, { axis = "y", arc = [0, 360], ...o } = {}) => ({ kind: "torus", c, R, r, axis: AXIS[axis], arc, ...o });
// A coil spring of wire diameter `wire` from s = from to s = to along an axis, coil radius `radius`.
export const helix = ({ axis = "x", at = 0, from, to, radius, wire, turns, ...o }) => ({ kind: "helix", axis: AXIS[axis], at: pair(at), from, to, radius, wire, turns, ...o });
// A flat disc facing +normal (a dial face, a hole mouth). texture(ctx, size, tokens) draws on it.
export const disc = (c, r, { normal = "y", ...o } = {}) => ({ kind: "disc", c, r, normal, ...o });

// An involute spur gear outline round (cx, cy): `teeth`, `module` (mm), pressure angle in degrees.
// phase (degrees) turns the teeth. Returns [[a, b], …] for extrude().
export function gearOutline({ teeth, module: m, pressure = 20, addendum = 1, dedendum = 1.25, steps = 5, cx = 0, cy = 0, phase = 0 }) {
  const r = (m * teeth) / 2;
  const rb = r * Math.cos((pressure * Math.PI) / 180);
  const ra = r + addendum * m;
  const rf = Math.max(0.1, r - dedendum * m);
  const inv = (a) => Math.tan(a) - a;
  const a0 = (pressure * Math.PI) / 180;
  // half the tooth's angular thickness at radius ρ (involute flanks)
  const half = (rho) => Math.PI / (2 * teeth) + inv(a0) - inv(Math.acos(Math.min(1, rb / rho)));
  const lo = Math.max(rf, rb);
  const out = [];
  const at = (rho, ang) => out.push([cx + rho * Math.cos(ang), cy + rho * Math.sin(ang)]);
  for (let k = 0; k < teeth; k++) {
    const c = (2 * Math.PI * k) / teeth + (phase * Math.PI) / 180;
    if (rf < rb) at(rf, c - half(rb));
    for (let i = 0; i <= steps; i++) {
      const rho = lo + ((ra - lo) * i) / steps;
      at(rho, c - half(rho));
    }
    for (let i = steps; i >= 0; i--) {
      const rho = lo + ((ra - lo) * i) / steps;
      at(rho, c + half(rho));
    }
    if (rf < rb) at(rf, c + half(rb));
    // root arc to the next tooth
    const n = (2 * Math.PI * (k + 1)) / teeth + (phase * Math.PI) / 180;
    const e0 = c + half(lo);
    const e1 = n - half(lo);
    for (let i = 1; i < 3; i++) at(rf, e0 + ((e1 - e0) * i) / 3);
  }
  return out;
}
// A spur gear: the outline extruded along its axis, with a bore. `at` is the gear centre in the
// outline's plane (see extrude); give the part or the solid a pivot there to turn it.
export function gear({ teeth, module: m, along = "z", at = [0, 0], from, to, bore = 0, phase = 0, pressure = 20, ...o }) {
  const [cx, cy] = pair(at);
  const holes = bore > 0 ? [circle(cx, cy, bore, 48)] : [];
  return extrude(gearOutline({ teeth, module: m, cx, cy, phase, pressure }), { along, from, to, holes, ...o });
}

// A part: one balloon number, one name, one or more closed solids that share its hatch.
//   mat, angle: a kit material (K.MATERIALS) and angle (K.ANGLES), as the 2D sheet hatches it;
//   hatch: "solid" (blacked in: thin walls, springs) or "none" (rods, nuts, balls: not hatched).
//   explode: [dx, dy, dz] at explode = 1, or { to: [x, y, z] } (an absolute place from rest).
//   anchor: { cut: [x, y, z] on its cut face, out: { c, r, axis: "y"|"x"|"z"|"box"|"sphere" } }
//   pivot: [x, y, z] the part turns about when its pose has `rot`.
//   layer: 1 for a part that runs through another part's bore and out behind it (a shaft through a
//     gear pocket, a crank through its case, a bolt through a hole): its cut face must win there.
// Each solid may override hatch, give role (bore, fluid, glass, decal, mouth, ink), own: true (its
// own outline against the other solids of the part), explode (an extra offset of that solid),
// pivot (to turn or scale that solid alone, see V.solid) and live (a name for V.solid).
export function part(id, name, solids, { mat, angle = 45, hatch, explode = null, anchor = null, pivot = null, layer } = {}) {
  const h = hatch ?? (mat ? [mat, angle] : "none");
  return { id, name, explode, anchor, pivot, solids: solids.map((s) => ({ hatch: h, ...(layer ? { layer } : {}), ...s })) };
}
// A bore or passage inside a solid of the same part: its far wall shows through the cut, and only
// where the view ray crosses the plane inside it. Lathe or extrude only (it is tested in shape).
export const bore = (s) => ({ ...s, role: "void", hatch: "none" });
// A fluid volume (air, oil, water): stippled in the accent, density set at run time. Lathe or
// extrude only. stretch: { from } lets the vertices beyond s = from move with V.fluid(...).stretch.
export const fluid = (name, s, { stretch = null } = {}) => ({ ...s, role: "fluid", name, stretch });

// Outline helpers in mm.
export function circle(cx, cy, r, n = 32) {
  return Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), cy + r * Math.sin((i / n) * 2 * Math.PI)]);
}
export function polygon(n, R, cx = 0, cy = 0, rot = 0) {
  return Array.from({ length: n }, (_, i) => [cx + R * Math.cos(rot + (i * 2 * Math.PI) / n), cy + R * Math.sin(rot + (i * 2 * Math.PI) / n)]);
}
// A hexagon across flats `af`, corners on the a axis (a nut seen along its axis).
export const hexagon = (af, cx = 0, cy = 0) => polygon(6, af / 2 / Math.cos(Math.PI / 6), cx, cy);
export const rrectAt = (cx, cy, hx, hy, r, steps = 4) => K.rrect(cx - hx, cy - hy, cx + hx, cy + hy, r, steps);
// A block with a cylindrical cross bore that touches its bottom face: one simple outline (U shape).
export function saddle(a0, a1, b0, b1, bc, r) {
  const arc = K.arc((a0 + a1) / 2, bc, r, -88, 268, 72);
  return [[a1, b0], [a1, b1], [a0, b1], [a0, b0], ...arc.reverse()];
}

// ================================================================ RUNTIME (browser, needs THREE)

const VIEWS = { iso: [45, 35.264], front: [0, 0], side: [90, 0], top: [0, 90] };
const NEAR = 1;
const FAR = 9000;
const MATKIND = { lines: 1, pairs: 2, dashed: 3, cross: 4, dots: 5, grain: 1 };
const ROLES = { solid: 0, void: 1, fluid: 2, glass: 3, decal: 4, mouth: 5, ink: 6 };
const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

const VERT = /* glsl */ `
uniform float uLiftFrom, uLift; uniform vec3 uAxisP, uAxisD;
varying vec3 vW; varying vec3 vN;
#ifdef DECAL
varying vec2 vUv;
#endif
void main() {
  vec3 p = position;
  if (dot(p - uAxisP, uAxisD) > uLiftFrom) p += uAxisD * uLift;
  vec4 w = modelMatrix * vec4(p, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
#ifdef DECAL
  vUv = uv;
#endif
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAG = /* glsl */ `
uniform float uMode, uCutOn, uKind, uGap, uPair, uAngle, uRole, uEdge, uDensity, uPx, uDpr, uCapBias, uWash, uLayer, uLayerBias;
uniform vec4 uCut; uniform vec3 uCamDir, uLight, uLit, uMid, uDark, uPaper, uInk, uAccent; uniform vec4 uHatch;
uniform vec2 uProf[64]; uniform int uProfN, uProfKind; uniform vec3 uAxisP, uAxisD, uPA, uPB; uniform vec2 uRange;
uniform float uLiftFrom, uLift; uniform mat4 uInv; uniform vec3 uShift;
uniform sampler2D tIds; uniform vec2 uRes;
varying vec3 vW; varying vec3 vN;
#ifdef DECAL
uniform sampler2D uTex; varying vec2 vUv;
#endif

float lines(float f, float widthPx) {
  float d = abs(fract(f + 0.5) - 0.5);
  return clamp(0.5 * widthPx - d / max(fwidth(f), 1e-5) + 0.5, 0.0, 1.0);
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// Is the plane point h inside this volume, in the mesh's own rest frame? Bores and fluids are
// volumes inside other solids, not holes in them, so their far walls may show only where the view
// ray crosses the plane inside them; elsewhere the cut face in front of them is the truth.
bool inside(vec3 hw) {
  if (uProfKind == 0) return true;
  vec3 h = (uInv * vec4(hw, 1.0)).xyz;
  float s = dot(h - uAxisP, uAxisD);
  if (s > uLiftFrom + uLift) s -= uLift; else if (s > uLiftFrom) s = uLiftFrom;
  vec2 q;
  if (uProfKind == 1) q = vec2(length((h - uAxisP) - uAxisD * dot(h - uAxisP, uAxisD)), s);
  else {
    if (s < uRange.x || s > uRange.y) return false;
    q = vec2(dot(h, uPA), dot(h, uPB));
  }
  bool inn = false;
  for (int i = 0; i < 64; i++) {
    if (i >= uProfN) break;
    vec2 a = uProf[i];
    vec2 b = uProf[i + 1 < uProfN ? i + 1 : 0];
    if ((a.y > q.y) != (b.y > q.y) && q.x < a.x + (q.y - a.y) / (b.y - a.y) * (b.x - a.x)) inn = !inn;
  }
  return inn;
}

void main() {
  bool cutting = uCutOn > 0.5;
  // the plane travels with the part's explode offset, so an exploded part keeps its own half-section
  float side = dot(uCut.xyz, vW - uShift) - uCut.w;
  if (cutting && side > 0.0) discard;
  float dn = dot(uCut.xyz, uCamDir);
  vec3 h = abs(dn) < 1e-4 ? vW - uCut.xyz * side : vW - uCamDir * (side / dn);
  vec3 up = abs(uCut.y) > 0.9 ? vec3(0.0, 0.0, -1.0) : vec3(0.0, 1.0, 0.0);
  vec3 e1 = normalize(cross(up, uCut.xyz));
  vec3 e2 = cross(uCut.xyz, e1);
  vec2 uv = vec2(dot(h - uShift, e1), dot(h - uShift, e2)) * uPx;

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

  vec2 cell = floor(uv / (3.2 * unit));
  vec2 jit = vec2(hash(cell), hash(cell + 7.3)) * 0.5 + 0.25;
  float dd = length((uv / (3.2 * unit) - cell - jit) * 3.2 * unit);
  float stip = step(hash(cell + 3.1), uDensity) * clamp(0.8 * unit - dd + 0.5, 0.0, 1.0);

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
    if (front || !cutting || !inside(h)) discard;
    k = -k;
  } else if (role == 2) {
    if (front || !cutting || uMode > 0.5 || !inside(h)) discard;
    // a cut face is on the plane, in front of any fluid: fluid shows only where no solid is cut
    if (texture2D(tIds, gl_FragCoord.xy / uRes).g > 0.5) discard;
    alpha = max(stip, uWash);
#ifdef DBG
    alpha = 1.0;
#endif
    if (alpha < 0.01) discard;
    col = uAccent;
  } else if (role == 3) {
    if (front || !cutting || !inside(h)) discard;
    cap = true;
  } else if (role == 4 || role == 5) {
    if (!front) discard;
  }

  // a cut face is drawn just in front of its back face; a solid running through another part's bore
  // (layer 1+) is pulled well forward, so its cut face wins over the bore and the part around it
  float capZ = gl_FragCoord.z - uCapBias - uLayer * uLayerBias;
  if (uMode > 0.5) {
    gl_FragColor = vec4(uEdge / 255.0, cap ? 1.0 : 0.0, 0.0, 1.0);
    gl_FragDepth = cap ? capZ : gl_FragCoord.z;
    return;
  }
  if (cap) {
    if (kind == 6) col = uInk;
    else col = mix(uPaper, uHatch.rgb, hv * uHatch.a);
  } else if (role == 2) {
  } else if (role == 5) {
    col = mix(uDark, uInk, 0.25);
  } else if (role == 6) {
    col = uInk;
  } else {
#ifdef DECAL
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
  gl_FragDepth = cap ? capZ : gl_FragCoord.z - (role == 2 ? uCapBias : 0.0);
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
uniform float uCutOn, uPx, uDpr, uDash, uAlpha, uCull; uniform vec4 uCut; uniform vec3 uInk, uShift;
uniform sampler2D tIds; uniform vec2 uRes;
varying vec3 vW; varying float vDist;
void main() {
  if (uCutOn > 0.5 && dot(uCut.xyz, vW - uShift) > uCut.w + 0.01) discard;
  // a cut face lies on the plane, in front of anything left: creases never draw on one
  if (uCull > 0.5 && texture2D(tIds, gl_FragCoord.xy / uRes).g > 0.5) discard;
  if (uDash > 0.5) {
    float u = mod(vDist * uPx / (1.4 * uDpr), 22.2); // ISO 128 long dash dot: 15 2.6 2 2.6
    if ((u > 15.0 && u < 17.6) || u > 19.6) discard;
  }
  gl_FragColor = vec4(uInk, uAlpha);
}`;

const EDGE_FRAG = /* glsl */ `
uniform sampler2D tId, tDepth; uniform vec2 uTexel; uniform vec3 uInk; uniform float uW, uRange, uThr;
varying vec2 vUv;
vec4 at(vec2 d) { return texture2D(tId, vUv + d * uTexel * uW); }
bool same(vec4 a, vec4 b) { return abs(a.r - b.r) < 0.5 / 255.0 && abs(a.g - b.g) < 0.5; }
// a pixel unlike all four neighbours is a pinhole (a ray slipping through a crack between triangles)
bool speck(vec2 d) {
  vec4 c = at(d);
  return !same(c, at(d + vec2(1.0, 0.0))) && !same(c, at(d - vec2(1.0, 0.0))) && !same(c, at(d + vec2(0.0, 1.0))) && !same(c, at(d - vec2(0.0, 1.0)));
}
void main() {
  vec4 c = at(vec2(0.0));
  if (speck(vec2(0.0))) discard;
  float e = 0.0;
  vec2 o[4];
  o[0] = vec2(1.0, 0.0); o[1] = vec2(-1.0, 0.0); o[2] = vec2(0.0, 1.0); o[3] = vec2(0.0, -1.0);
  for (int i = 0; i < 4; i++) if (!same(at(o[i]), c) && !speck(o[i])) e = 1.0;
  if (e < 0.5 && c.a > 0.5 && c.g < 0.5) {
    float d0 = texture2D(tDepth, vUv).x;
    for (int i = 0; i < 2; i++) {
      vec2 st = o[2 * i] * uTexel * uW;
      float dl = texture2D(tDepth, vUv - st).x, dr = texture2D(tDepth, vUv + st).x;
      if (abs(dl + dr - 2.0 * d0) * uRange > uThr) e = 1.0;
    }
  }
  if (e < 0.5) discard;
  gl_FragColor = vec4(uInk, 1.0);
#ifdef DBG
  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
#endif
}`;

// ---------------------------------------------------------------- geometry from specs

// A closed body of revolution round local Y, one strip per profile edge (every corner a crease),
// wound outward whichever way the profile runs.
function latheGeometry(loop, seg) {
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

// local Y → the spec's axis, through `at`
function axisMatrix(axis, [a, b]) {
  const m = new THREE.Matrix4();
  if (axis === "x") m.makeRotationZ(-Math.PI / 2).setPosition(0, a, b);
  else if (axis === "z") m.makeRotationX(Math.PI / 2).setPosition(a, b, 0);
  else m.makeTranslation(a, 0, b);
  return m;
}
const axisDir = (axis) => (axis === "x" ? [1, 0, 0] : axis === "z" ? [0, 0, 1] : [0, 1, 0]);
const axisPoint = (axis, [a, b]) => (axis === "x" ? [0, a, b] : axis === "z" ? [a, b, 0] : [a, 0, b]);
// extrude: outline (a, b) and sweep s, as world vectors
const PRISM = {
  z: { A: [1, 0, 0], B: [0, 1, 0], D: [0, 0, 1] },
  y: { A: [1, 0, 0], B: [0, 0, 1], D: [0, 1, 0] },
  x: { A: [0, 0, 1], B: [0, 1, 0], D: [1, 0, 0] },
};

function extrudeGeometry({ shape, holes = [], along, from, to, bevel = 0, conform }) {
  // local (X, Y) is the outline, local Z the sweep; rotations below put them on (a, b, s)
  const flip = along === "y" ? ([a, b]) => [a, -b] : along === "x" ? ([a, b]) => [-a, b] : (p) => p;
  // three.js only fixes hole winding when it reverses the outline, so normalise both here, after the
  // flip: outline clockwise, holes counter-clockwise. Any input winding then gives outward hole walls.
  const area = (pts) => pts.reduce((s, [x0, y0], i) => { const [x1, y1] = pts[(i + 1) % pts.length]; return s + x0 * y1 - x1 * y0; }, 0);
  const wind = (pts, cw) => ((area(pts) < 0) === cw ? pts : pts.slice().reverse());
  const sh = new THREE.Shape(wind(shape.map(flip), true).map((p) => new THREE.Vector2(...p)));
  for (const hole of holes) sh.holes.push(new THREE.Path(wind(hole.map(flip), false).map((p) => new THREE.Vector2(...p))));
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
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      if (Math.abs(p.getX(i) - conform.x) < 1e-3) p.setX(i, Math.sign(conform.x) * Math.sqrt(Math.max(0, conform.r ** 2 - p.getZ(i) ** 2)));
    }
    geo.computeVertexNormals();
  }
  return geo;
}

function helixGeometry(s) {
  class Helix extends THREE.Curve {
    getPoint(t, out = new THREE.Vector3()) {
      const a = 2 * Math.PI * s.turns * t;
      // along local Y; axisMatrix turns it onto the spec's axis
      return out.set(s.radius * Math.sin(a), s.from + s.wire / 2 + t * (s.to - s.from - s.wire), s.radius * Math.cos(a));
    }
  }
  return new THREE.TubeGeometry(new Helix(), Math.max(80, Math.round(s.turns * 60)), s.wire / 2, 10, false).applyMatrix4(axisMatrix(s.axis, s.at));
}

export function geometryOf(s) {
  const seg = (r) => (r > 20 ? 144 : r > 6 ? 96 : 48);
  if (s.kind === "lathe") return latheGeometry(s.loop, seg(Math.max(...s.loop.map(([r]) => r)))).applyMatrix4(axisMatrix(s.axis, s.at));
  if (s.kind === "extrude") return extrudeGeometry(s);
  if (s.kind === "sphere") return new THREE.SphereGeometry(s.r, 48, 32).translate(...s.c);
  if (s.kind === "helix") return helixGeometry(s);
  if (s.kind === "box") {
    const size = s.max.map((v, i) => v - s.min[i]);
    return new THREE.BoxGeometry(...size).translate(...s.min.map((v, i) => v + size[i] / 2));
  }
  if (s.kind === "torus") {
    const [a0, a1] = s.arc;
    const g = new THREE.TorusGeometry(s.R, s.r, 14, 120, ((a1 - a0) * Math.PI) / 180);
    g.rotateZ((a0 * Math.PI) / 180);
    // the torus lies in local XY round local Z: turn local Z onto the axis
    if (s.axis === "y") g.rotateX(-Math.PI / 2);
    if (s.axis === "x") g.rotateY(Math.PI / 2);
    return g.translate(...s.c);
  }
  if (s.kind === "disc") {
    const g = new THREE.CircleGeometry(s.r, 96);
    if (s.normal === "y") g.rotateX(-Math.PI / 2);
    if (s.normal === "x") g.rotateY(Math.PI / 2);
    return g.translate(...s.c);
  }
  throw new Error("solid3d: unknown solid kind " + s.kind);
}

// the shape a bore, fluid or glass is tested against (see inside() in FRAG): at most 64 points, so a
// longer outline (a fine circle) is resampled evenly round its perimeter
const PROF_MAX = 64;
function resample(loop) {
  if (loop.length <= PROF_MAX) return loop;
  const seg = loop.map((p, i) => Math.hypot(loop[(i + 1) % loop.length][0] - p[0], loop[(i + 1) % loop.length][1] - p[1]));
  const total = seg.reduce((a, b) => a + b, 0);
  const out = [];
  let i = 0;
  let acc = 0;
  for (let k = 0; k < PROF_MAX; k++) {
    const want = (k / PROF_MAX) * total;
    while (acc + seg[i] < want) acc += seg[i++];
    const t = seg[i] ? (want - acc) / seg[i] : 0;
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}
function profileOf(s) {
  if (s.kind === "lathe") return { kind: 1, loop: resample(s.loop), P: axisPoint(s.axis, s.at), D: axisDir(s.axis), A: [1, 0, 0], B: [0, 1, 0], range: [0, 0] };
  if (s.kind === "extrude") {
    const b = PRISM[s.along];
    return { kind: 2, loop: resample(s.shape), P: [0, 0, 0], D: b.D, A: b.A, B: b.B, range: [s.from, s.to] };
  }
  return null;
}

// ---------------------------------------------------------------- create

// create({ scene: { parts, fluids, centres }, sheet2d, title }) → V. Call after the page's DOM (writePage3d).
export function create({ scene, title = "" } = {}) {
  const $ = (id) => document.getElementById(id);
  const host = $("stage");
  const canvas = $("gl");
  const overlay = $("ov");
  const Qs = new URLSearchParams(location.search);
  const num = (k, d) => (Qs.has(k) && Number.isFinite(Number(Qs.get(k))) ? Number(Qs.get(k)) : d);
  const flag = (k, d) => (Qs.has(k) ? Qs.get(k) !== "0" : d);
  const q = {
    view: Qs.get("view"),
    cut: flag("cut", true),
    explode: clamp01(num("explode", 0)),
    zoom: num("zoom", 1),
    look: Qs.get("look") ? Qs.get("look").split(",").map(Number) : null,
    balloons: flag("balloons", true),
    offset: num("offset", 0),
    embed: flag("embed", false),
    check: Qs.has("check"),
    selftest: Qs.has("selftest"),
    bench: Qs.has("bench"),
    dbg: Qs.has("dbg"),
  };
  if (q.embed) document.documentElement.classList.add("v3-embed");
  L.setupPage(host);
  THREE.ColorManagement.enabled = false; // the tokens are sRGB and the shaders write them unchanged

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: Qs.has("t") || q.bench || q.check });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setClearColor(0x000000, 0);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, NEAR, FAR);
  const world = new THREE.Scene();
  const root = new THREE.Group();
  world.add(root);

  const C = () => new THREE.Color();
  const U = {
    uMode: { value: 0 },
    uCutOn: { value: q.cut ? 1 : 0 },
    uCut: { value: new THREE.Vector4(0, 0, 1, q.offset) },
    uCamDir: { value: new THREE.Vector3(0, 0, -1) },
    uPx: { value: 1 },
    uDpr: { value: 1 },
    uLight: { value: new THREE.Vector3(-0.42, 0.72, 0.55).normalize() },
    uLit: { value: C() },
    uMid: { value: C() },
    uDark: { value: C() },
    uPaper: { value: C() },
    uInk: { value: C() },
    uHatch: { value: new THREE.Vector4() },
    uAccent: { value: C() },
    // depth bias of cut faces: must stay below the thinnest wall seen edge-on (0.25 mm)
    uCapBias: { value: 0.25 / (FAR - NEAR) },
    uLineBias: { value: (2 * 0.6) / (FAR - NEAR) },
    // layer 1+ cut faces come this far forward, assembled only (exploded parts may sit in front)
    uLayerBias: { value: 1000 / (FAR - NEAR) },
    tIds: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
  };
  const dbg = q.dbg ? { DBG: 1 } : {};
  const allMats = [];
  const decals = [];

  function material(s, edge) {
    const role = s.role ?? "solid";
    const hatch = s.hatch ?? (role === "ink" ? "solid" : "none");
    let kind = 0;
    let gap = 3;
    let pairGap = 0;
    let angle = 45;
    if (hatch === "solid" || role === "ink") kind = 6;
    else if (Array.isArray(hatch)) {
      const m = K.MATERIALS[hatch[0]];
      if (!m) throw new Error("solid3d: unknown material " + hatch[0]);
      kind = MATKIND[m.kind];
      gap = m.gap;
      pairGap = m.pair ?? 0;
      angle = hatch[1] ?? 45;
    }
    const prof = role === "void" || role === "fluid" || role === "glass" ? profileOf(s) : null;
    let tex = null;
    if (role === "decal") {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 1024;
      tex = new THREE.CanvasTexture(cv);
      tex.anisotropy = 4;
      decals.push({ cv, tex, draw: s.texture });
    }
    const st = s.stretch && prof ? s.stretch.from : 1e9;
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        ...U,
        uKind: { value: kind },
        uGap: { value: gap },
        uPair: { value: pairGap },
        uAngle: { value: angle },
        uRole: { value: ROLES[role] },
        uEdge: { value: edge },
        uDensity: { value: 0.3 },
        uWash: { value: 0.08 },
        uLiftFrom: { value: st },
        uLift: { value: 0 },
        uTex: { value: tex },
        uInv: { value: new THREE.Matrix4() },
        uShift: { value: new THREE.Vector3() },
        uLayer: { value: s.layer ?? 0 },
        uProf: { value: Array.from({ length: PROF_MAX }, (_, i) => new THREE.Vector2(...(prof?.loop[i] ?? [0, 0]))) },
        uProfN: { value: prof ? prof.loop.length : 0 },
        uProfKind: { value: prof ? prof.kind : 0 },
        uAxisP: { value: new THREE.Vector3(...(prof?.P ?? [0, 0, 0])) },
        uAxisD: { value: new THREE.Vector3(...(prof?.D ?? [0, 1, 0])) },
        uPA: { value: new THREE.Vector3(...(prof?.A ?? [1, 0, 0])) },
        uPB: { value: new THREE.Vector3(...(prof?.B ?? [0, 1, 0])) },
        uRange: { value: new THREE.Vector2(...(prof?.range ?? [0, 0])) },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      defines: { ...(tex ? { DECAL: 1 } : {}), ...dbg },
      // never BackSide: three.js draws it by flipping the GL front face, which flips gl_FrontFacing too
      side: role === "void" || role === "fluid" || role === "glass" ? THREE.DoubleSide : THREE.FrontSide,
      transparent: role === "fluid",
      depthWrite: role !== "fluid",
    });
    mat.userData.role = role;
    allMats.push(mat);
    return mat;
  }
  const lineMat = (dash, alpha = 1) =>
    new THREE.ShaderMaterial({
      uniforms: { ...U, uDash: { value: dash ? 1 : 0 }, uAlpha: { value: alpha }, uCull: { value: dash ? 0 : 1 }, uShift: { value: new THREE.Vector3() } },
      vertexShader: LINE_VERT,
      fragmentShader: LINE_FRAG,
      transparent: alpha < 1,
    });

  // ---- build
  const PARTS = new Map();
  const FLUIDS = new Map();
  let edgeSeq = 0;
  const syncInv = (mesh) => {
    mesh.onBeforeRender = () => mesh.material.uniforms.uInv.value.copy(mesh.matrixWorld).invert();
  };
  function addSolid(rec, s, k, shared) {
    const role = s.role ?? "solid";
    const holder = new THREE.Group();
    const pivot = s.pivot ?? [0, 0, 0];
    holder.position.set(...pivot);
    const inner = new THREE.Group();
    inner.position.set(-pivot[0], -pivot[1], -pivot[2]);
    holder.add(inner);
    rec.inner.add(holder);
    const edge = role === "mouth" || s.own || !shared ? ++edgeSeq : shared;
    if (edge > 255) throw new Error("solid3d: more than 255 outlined solids");
    rec.edges.add(edge);
    const geo = geometryOf(s);
    const mesh = new THREE.Mesh(geo, material(s, edge));
    syncInv(mesh);
    inner.add(mesh);
    let lines = null;
    if (role === "solid" || role === "void" || role === "glass" || role === "ink") {
      lines = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 35), lineMat(false)); // own material: own uShift
      lines.userData.crease = true;
      inner.add(lines);
    }
    const h = { holder, inner, mesh, lines, spec: s, pivot, k };
    rec.holders.push(h);
    if (s.live) rec.live[s.live] = h;
    return h;
  }
  for (const spec of scene.parts) {
    const group = new THREE.Group();
    const pivot = spec.pivot ?? [0, 0, 0];
    const inner = new THREE.Group();
    inner.position.set(-pivot[0], -pivot[1], -pivot[2]);
    group.add(inner);
    root.add(group);
    const rec = { id: spec.id, name: spec.name, spec, group, inner, pivot, holders: [], centres: [], edges: new Set(), live: {}, base: { pos: [0, 0, 0], rot: [0, 0, 0] } };
    const shared = ++edgeSeq;
    spec.solids.forEach((s, k) => addSolid(rec, s, k, shared));
    PARTS.set(spec.id, rec);
  }
  const fluidGroup = new THREE.Group();
  root.add(fluidGroup);
  for (const f of scene.fluids ?? []) {
    const mesh = new THREE.Mesh(geometryOf(f), material({ ...f, role: "fluid" }, 0));
    mesh.renderOrder = 2;
    mesh.frustumCulled = false; // the stretch moves vertices past the rest-pose bounding sphere
    syncInv(mesh);
    fluidGroup.add(mesh);
    FLUIDS.set(f.name, mesh);
  }
  function centreLine([a, b], parent = root) {
    const A = new THREE.Vector3(...a);
    const B = new THREE.Vector3(...b);
    const geo = new THREE.BufferGeometry().setFromPoints([A, B]);
    geo.setAttribute("dist", new THREE.Float32BufferAttribute([0, A.distanceTo(B)], 1));
    const l = new THREE.Line(geo, lineMat(true, 0.85));
    l.userData.crease = true;
    parent.add(l);
    return l;
  }
  for (const c of scene.centres ?? []) {
    const l = centreLine(c.line ?? c, c.part ? PARTS.get(c.part).inner : root);
    if (c.part) PARTS.get(c.part).centres.push(l);
  }

  // ---- outline pass
  const idTarget = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthTexture: new THREE.DepthTexture(4, 4) });
  U.tIds.value = idTarget.texture;
  const edgeMat = new THREE.ShaderMaterial({
    uniforms: { tId: { value: idTarget.texture }, tDepth: { value: idTarget.depthTexture }, uTexel: { value: new THREE.Vector2() }, uInk: U.uInk, uW: { value: 1 }, uRange: { value: FAR - NEAR }, uThr: { value: 2.0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: EDGE_FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    defines: dbg,
  });
  const edgeScene = new THREE.Scene();
  edgeScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), edgeMat));
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // ---- theme
  const token = (name) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const m = v.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const [r, g, b, a = 1] = m[1].split(",").map(Number);
      return { c: new THREE.Color(r / 255, g / 255, b / 255), a, css: v };
    }
    return { c: new THREE.Color(v || "#888"), a: 1, css: v };
  };
  function applyTheme() {
    for (const [u, name] of [["uLit", "--bp3-lit"], ["uMid", "--bp3-mid"], ["uDark", "--bp3-dark"], ["uPaper", "--bp-paper"], ["uInk", "--bp-ink"], ["uAccent", "--bp-accent"]]) U[u].value.copy(token(name).c);
    const h = token("--bp-hatch");
    U.uHatch.value.set(h.c.r, h.c.g, h.c.b, h.a);
    const tk = { paper: token("--bp-paper").css, ink: token("--bp-ink").css, muted: token("--bp-muted").css, accent: token("--bp-accent").css };
    for (const d of decals) {
      const g = d.cv.getContext("2d");
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = tk.paper;
      g.fillRect(0, 0, d.cv.width, d.cv.height);
      d.draw?.(g, d.cv.width, tk);
      d.tex.needsUpdate = true;
    }
    redraw();
  }
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  // ---- view state
  const start = VIEWS[q.view] ?? VIEWS.iso;
  const cam = { az: start[0], el: start[1], azT: start[0], elT: start[1], zoom: q.zoom, pan: new THREE.Vector3() };
  const st = { explode: q.explode, explodeT: q.explode, balloons: q.balloons };

  // ---- poses: the page sets base poses, explode adds on top
  function applyPoses() {
    const e = st.explode;
    for (const rec of PARTS.values()) {
      const ex = rec.spec.explode;
      const [bx, by, bz] = rec.base.pos;
      let off = [0, 0, 0];
      if (Array.isArray(ex)) off = ex.map((v) => v * e);
      else if (ex?.to) off = [(ex.to[0] - bx) * e, (ex.to[1] - by) * e, (ex.to[2] - bz) * e];
      rec.group.position.set(rec.pivot[0] + bx + off[0], rec.pivot[1] + by + off[1], rec.pivot[2] + bz + off[2]);
      rec.group.rotation.set(...rec.base.rot);
      for (const h of rec.holders) {
        const sx = h.spec.explode ?? [0, 0, 0];
        h.holder.position.set(h.pivot[0] + sx[0] * e, h.pivot[1] + sx[1] * e, h.pivot[2] + sx[2] * e);
        const shift = [off[0] + sx[0] * e, off[1] + sx[1] * e, off[2] + sx[2] * e];
        h.mesh.material.uniforms.uShift.value.set(...shift);
        h.lines?.material.uniforms.uShift.value.set(...shift);
      }
      for (const l of rec.centres) l.material.uniforms.uShift.value.set(...off);
    }
    fluidGroup.visible = e < 0.01 && U.uCutOn.value > 0.5;
  }

  // ---- framing: the union of the page's envelope poses, assembled and exploded
  let B0 = null;
  let B1 = null;
  function measure(poses, e) {
    const keep = st.explode;
    st.explode = e;
    const box = new THREE.Box3();
    for (const p of poses) {
      p();
      applyPoses();
      root.updateMatrixWorld(true);
      for (const rec of PARTS.values()) box.expandByObject(rec.group);
    }
    st.explode = keep;
    return box;
  }
  let envelope = [() => {}];
  function frame(poses) {
    envelope = poses?.length ? poses : [() => {}];
    B0 = measure(envelope, 0);
    B1 = measure(envelope, 1);
  }

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
    U.uRes.value.set(Math.round(W * dpr), Math.round(H * dpr));
    overlay.setAttribute("viewBox", `0 0 ${W} ${H}`);
    redraw();
  }
  const margin = () => {
    const side = st.balloons ? Math.min(150, Math.round(W * 0.16)) : Math.min(40, Math.round(W * 0.05));
    if (q.embed) return { l: side, r: side, t: 16, b: 16 };
    return { l: side, r: side, t: 34, b: W < 640 ? 64 : 34 };
  };
  const lerpBox = () => {
    const k = smooth(clamp01(st.explode));
    return new THREE.Box3(B0.min.clone().lerp(B1.min, k), B0.max.clone().lerp(B1.max, k));
  };
  function placeCamera() {
    const az = (cam.az * Math.PI) / 180;
    const el = (Math.min(89.9, cam.el) * Math.PI) / 180;
    const dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    const box = lerpBox();
    const centre = q.look ? new THREE.Vector3(...q.look) : box.getCenter(new THREE.Vector3());
    camera.position.copy(centre).addScaledVector(dir, FAR / 2);
    camera.up.set(0, 1, 0);
    camera.lookAt(centre);
    camera.updateMatrixWorld(true);
    const inv = camera.matrixWorldInverse;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).applyMatrix4(inv);
      x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
    }
    const MG = margin();
    const fit = Math.min((W - MG.l - MG.r) / Math.max(1, x1 - x0), (H - MG.t - MG.b) / Math.max(1, y1 - y0));
    const zoom = fit * cam.zoom;
    const off = q.look ? new THREE.Vector3() : new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, 0).applyMatrix3(new THREE.Matrix3().setFromMatrix4(camera.matrixWorld));
    camera.position.add(off).add(cam.pan);
    camera.position.addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1), -(MG.b - MG.t) / 2 / zoom);
    camera.left = -W / 2 / zoom;
    camera.right = W / 2 / zoom;
    camera.top = H / 2 / zoom;
    camera.bottom = -H / 2 / zoom;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    U.uCamDir.value.copy(dir).negate();
    U.uPx.value = zoom * dpr;
    U.uDpr.value = dpr;
  }
  const project = (v) => {
    const p = (Array.isArray(v) ? new THREE.Vector3(...v) : v.clone()).project(camera);
    return [((p.x + 1) / 2) * W, ((1 - p.y) / 2) * H];
  };

  // ---- balloons
  function anchorWorld(rec) {
    const a = rec.spec.anchor;
    let p;
    if (U.uCutOn.value > 0.5 && a.cut) p = new THREE.Vector3(...a.cut);
    else {
      const o = a.out ?? { c: a.cut };
      p = new THREE.Vector3(...o.c);
      const d = U.uCamDir.value.clone().negate();
      if (o.axis === "y") d.y = 0;
      if (o.axis === "x") d.x = 0;
      if (o.axis === "z") d.z = 0;
      if (o.axis === "box") {
        d.y = 0;
        d.divideScalar(Math.max(Math.abs(d.x), Math.abs(d.z)) || 1);
        p.addScaledVector(d, o.r);
      } else if (o.r) p.addScaledVector(d.normalize(), o.r);
    }
    const holder = a.solid != null ? rec.holders[a.solid].inner : rec.inner;
    return p.applyMatrix4(holder.matrixWorld);
  }
  const pix = new Uint8Array(4);
  const seen = new Map();
  let visFrame = 0;
  function visibleAt(rec, sx, sy) {
    if (sx < 0 || sy < 0 || sx >= W || sy >= H) return false;
    renderer.readRenderTargetPixels(idTarget, Math.round(sx * dpr), Math.round((H - sy) * dpr), 1, 1, pix);
    return rec.edges.has(pix[0]) || pix[0] === 0;
  }
  function balloons() {
    const recs = [...PARTS.values()].filter((r) => r.spec.anchor);
    if (!recs.length) return "";
    const items = recs.map((rec) => {
      const [ax, ay] = project(anchorWorld(rec));
      return { rec, ax, ay };
    });
    const box = lerpBox();
    const pts = [];
    for (let i = 0; i < 8; i++) pts.push(project(new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z)));
    const minX = Math.min(...pts.map((p) => p[0]));
    const maxX = Math.max(...pts.map((p) => p[0]));
    const c0 = project(box.getCenter(new THREE.Vector3()).setY(box.min.y));
    const c1 = project(box.getCenter(new THREE.Vector3()).setY(box.max.y));
    const axisX = (y) => c0[0] + ((y - c0[1]) / (c1[1] - c0[1] || 1)) * (c1[0] - c0[0]);
    const R = W < 640 ? 8 : 10;
    const cols = { l: Math.max(R + 14, minX - 46), r: Math.min(W - R - 14, maxX + 46) };
    const refresh = visFrame++ % 3 === 0;
    // each balloon to the column on its anchor's side of the model's centre line; the fuller column
    // then gives its anchors nearest the line to the other, so neither holds much more than half
    for (const it of items) {
      it.d = it.ax - axisX(it.ay);
      it.side = it.d < -0.5 ? "l" : "r";
    }
    for (;;) {
      const nl = items.filter((it) => it.side === "l").length;
      const nr = items.length - nl;
      if (Math.abs(nl - nr) <= 3) break;
      const from = nl > nr ? "l" : "r";
      const pick = items.filter((it) => it.side === from).sort((a, b) => Math.abs(a.d) - Math.abs(b.d))[0];
      pick.side = from === "l" ? "r" : "l";
    }
    let out = "";
    for (const side of ["l", "r"]) {
      const col = items.filter((it) => it.side === side).sort((a, b) => a.ay - b.ay);
      const top = R + 18;
      const lim = H - R - (q.embed ? 14 : 44); // clear of the hint line
      const gap = Math.min(2 * R + 6, (lim - top) / Math.max(1, col.length - 1));
      const ys = col.map((c) => Math.min(lim, Math.max(top, c.ay)));
      for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + gap);
      if (ys.length && ys[ys.length - 1] > lim) {
        ys[ys.length - 1] = lim;
        for (let i = ys.length - 2; i >= 0; i--) ys[i] = Math.min(ys[i], ys[i + 1] - gap);
      }
      col.forEach((c, i) => {
        const bx = cols[side];
        const by = ys[i];
        const id = c.rec.id;
        if (refresh || !seen.has(id)) seen.set(id, visibleAt(c.rec, c.ax, c.ay));
        const vis = seen.get(id);
        const dx = c.ax - bx;
        const dy = c.ay - by;
        const d = Math.hypot(dx, dy) || 1;
        const f = (v) => v.toFixed(1);
        out += `<path class="${vis ? "thin" : "hid"}" d="M${f(bx + (dx / d) * R)} ${f(by + (dy / d) * R)}L${f(c.ax)} ${f(c.ay)}"/>`;
        out += `<circle class="${vis ? "dot" : "balloon"}" cx="${f(c.ax)}" cy="${f(c.ay)}" r="1.7"/>`;
        out += `<g data-part="${id}"><title>${id} ${c.rec.name}</title><circle class="balloon" cx="${f(bx)}" cy="${f(by)}" r="${R}"/><text class="t" x="${f(bx)}" y="${f(by + 3.4)}" text-anchor="middle">${id}</text></g>`;
      });
    }
    return out;
  }

  // A linear dimension between two world points, drawn on screen beside them: extension lines,
  // a dimension line `off` px to the side, arrowheads when there is room, the text along it.
  function dim(a, b, { text = "", off = 26 } = {}) {
    const A = project(a);
    const B = project(b);
    const ax = [B[0] - A[0], B[1] - A[1]];
    const len = Math.hypot(...ax);
    const nrm = len > 0.5 ? [-ax[1] / len, ax[0] / len] : [1, 0];
    const side = nrm[0] < 0 ? -1 : 1;
    const o = off * side;
    const a2 = [A[0] + nrm[0] * o, A[1] + nrm[1] * o];
    const b2 = [B[0] + nrm[0] * o, B[1] + nrm[1] * o];
    const f = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    const ext = (p, p2) => `M${f([p[0] + nrm[0] * 4 * side, p[1] + nrm[1] * 4 * side])}L${f([p2[0] + nrm[0] * 5 * side, p2[1] + nrm[1] * 5 * side])}`;
    let s = `<path class="thin" d="${ext(A, a2)}${len > 1 ? ext(B, b2) : ""}M${f(a2)}L${f(b2)}"/>`;
    if (len > 16) {
      const u = [ax[0] / len, ax[1] / len];
      const head = (p, sg) => {
        const t = [p[0] + u[0] * 7 * sg, p[1] + u[1] * 7 * sg];
        return `M${f(p)}L${f([t[0] + nrm[0] * 1.6, t[1] + nrm[1] * 1.6])}L${f([t[0] - nrm[0] * 1.6, t[1] - nrm[1] * 1.6])}Z`;
      };
      s += `<path class="head" d="${head(a2, 1)}${head(b2, -1)}"/>`;
    }
    const mx = (a2[0] + b2[0]) / 2 + nrm[0] * 9 * side;
    const my = (a2[1] + b2[1]) / 2 + nrm[1] * 9 * side;
    const ang = (Math.atan2(ax[1], ax[0]) * 180) / Math.PI + (len > 0.5 ? 0 : 90);
    const rot = ((ang + 360 + 90) % 180) - 90;
    s += `<text class="t" x="${mx.toFixed(1)}" y="${my.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rot.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)})">${text}</text>`;
    return `<g data-role="dim">${s}</g>`;
  }

  // ---- draw
  let overlayFn = null;
  let pageRender = null;
  function draw() {
    applyPoses();
    if (!B0) frame(envelope);
    applyPoses();
    const cutting = U.uCutOn.value > 0.5;
    for (const m of allMats) if (m.userData.role === "solid" || m.userData.role === "ink") m.side = cutting ? THREE.DoubleSide : THREE.FrontSide;
    placeCamera();
    root.updateMatrixWorld(true);
    U.uLayerBias.value = st.explode < 0.01 ? 1000 / (FAR - NEAR) : 0;
    // 1: ids and depth, without lines or fluids (and not sampling the target it draws into)
    U.uMode.value = 1;
    U.tIds.value = null;
    world.traverse((o) => o.userData.crease && (o.visible = false));
    const fl = fluidGroup.visible;
    fluidGroup.visible = false;
    renderer.setRenderTarget(idTarget);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(world, camera);
    world.traverse((o) => o.userData.crease && (o.visible = true));
    fluidGroup.visible = fl;
    // 2: colour
    U.uMode.value = 0;
    U.tIds.value = idTarget.texture;
    renderer.setRenderTarget(null);
    renderer.render(world, camera);
    // 3: outlines
    renderer.autoClear = false;
    renderer.render(edgeScene, quadCam);
    renderer.autoClear = true;
    let svg = st.balloons ? balloons() : "";
    if (overlayFn) svg += overlayFn() ?? "";
    overlay.innerHTML = svg;
    syncControls();
  }

  // ---- controls (the ids writePage3d writes)
  const ui = {
    cut: $("cut"),
    offset: $("offset"),
    explode: $("explode"),
    balloons: $("balloons"),
    views: [...document.querySelectorAll("[data-view]")],
  };
  function syncControls() {
    ui.cut?.setAttribute("aria-pressed", String(U.uCutOn.value > 0.5));
    ui.balloons?.setAttribute("aria-pressed", String(st.balloons));
    if (ui.explode && document.activeElement !== ui.explode) ui.explode.value = String(st.explodeT);
    for (const b of ui.views) {
      const [az, el] = VIEWS[b.dataset.view];
      b.setAttribute("aria-pressed", String(Math.abs(cam.azT - az) < 0.01 && Math.abs(cam.elT - el) < 0.01));
    }
  }
  let lv = null;
  function redraw() {
    if (!lv) return;
    if (lv.frozen) render(lv);
    else lv.wake?.();
  }
  function input() {
    if (!lv) return;
    if (lv.frozen) render(lv);
    else lv.input();
  }
  function setView(name) {
    const [az, el] = VIEWS[name];
    cam.az = ((((cam.az - az) % 360) + 540) % 360) - 180 + az; // the short way round
    cam.azT = az;
    cam.elT = el;
    cam.pan.set(0, 0, 0);
    input();
  }
  const toggleCut = () => {
    U.uCutOn.value = U.uCutOn.value > 0.5 ? 0 : 1;
    input();
  };
  for (const b of ui.views) b.addEventListener("click", () => setView(b.dataset.view));
  ui.cut?.addEventListener("click", toggleCut);
  if (ui.offset) {
    ui.offset.value = String(q.offset);
    ui.offset.addEventListener("input", () => {
      U.uCut.value.w = Number(ui.offset.value);
      U.uCutOn.value = 1;
      input();
    });
  }
  ui.explode?.addEventListener("input", () => {
    st.explodeT = Number(ui.explode.value);
    input();
  });
  ui.balloons?.addEventListener("click", () => {
    st.balloons = !st.balloons;
    input();
  });

  // pointer: drag a registered part to drive it, drag elsewhere to orbit, shift or right drag to pan
  const ray = new THREE.Raycaster();
  const drags = [];
  let drag = null;
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("pointerdown", (e) => {
    const r = canvas.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    ray.setFromCamera(new THREE.Vector2((px / W) * 2 - 1, 1 - (py / H) * 2), camera);
    let hit = null;
    if (st.explode < 0.05 && e.button === 0 && !e.shiftKey) {
      let best = Infinity;
      for (const d of drags) {
        const h = ray.intersectObjects(d.meshes, false)[0];
        if (h && h.distance < best) {
          best = h.distance;
          hit = d;
        }
      }
    }
    drag = { mode: hit ? "part" : e.button === 2 || e.shiftKey ? "pan" : "orbit", d: hit, px, py, az: cam.azT, el: cam.elT, pan: cam.pan.clone() };
    if (hit) {
      // the screen direction and length of the drag's full travel, from its start
      const o = new THREE.Vector3();
      hit.meshes[0].getWorldPosition(o);
      const a = project(o);
      const b = project(o.clone().addScaledVector(new THREE.Vector3(...hit.axis), hit.length));
      drag.axis = [b[0] - a[0], b[1] - a[1]];
      drag.v0 = hit.start?.() ?? 0;
    }
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}
    canvas.classList.add("v3-grab");
    input();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const r = canvas.getBoundingClientRect();
    const dx = e.clientX - r.left - drag.px;
    const dy = e.clientY - r.top - drag.py;
    if (drag.mode === "part") {
      const [ax, ay] = drag.axis;
      const l2 = ax * ax + ay * ay;
      drag.d.move(drag.v0 + (l2 > 4 ? (dx * ax + dy * ay) / l2 : dy / 200));
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
    if (drag.mode === "part") drag.d.end?.();
    drag = null;
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

  const keys = new Map();
  host.addEventListener("keydown", (e) => {
    const k = e.key;
    const own = keys.get(k) ?? keys.get(k.toLowerCase());
    if (own) own(e);
    else if (k === "e" || k === "E") st.explodeT = st.explodeT > 0.5 ? 0 : 1;
    else if (k === "c" || k === "C") U.uCutOn.value = U.uCutOn.value > 0.5 ? 0 : 1;
    else if (k === "b" || k === "B") st.balloons = !st.balloons;
    else if (k === "s" || k === "S") lv.slow = lv.slow === 1 ? 0.2 : lv.slow === 0.2 ? 0.05 : 1;
    else if ("1234".includes(k) && k.length === 1) setView(["iso", "front", "side", "top"][Number(k) - 1]);
    else return;
    e.preventDefault();
    input();
  });

  // ---- the loop
  function render(l) {
    pageRender?.(l);
    draw();
  }
  const tests = [];

  const V = {
    THREE,
    renderer,
    camera,
    world,
    host,
    params: q,
    // part record: { id, name, group, inner, holders: [{ holder, inner, mesh, lines, spec }], live }
    part: (id) => PARTS.get(id),
    // the holder of one solid, to turn or scale it about its own pivot; key: index or `live` name
    solid: (id, key) => {
      const rec = PARTS.get(id);
      return (typeof key === "number" ? rec.holders[key] : rec.live[key]).holder;
    },
    // the base pose of a part, before explode: pos [x, y, z] in mm, rot [rx, ry, rz] about its pivot
    set(id, { pos, rot } = {}) {
      const rec = PARTS.get(id);
      if (pos) rec.base.pos = pos;
      if (rot) rec.base.rot = rot;
    },
    // replace one solid's geometry (a part whose shape changes: a seal, a bellows)
    reshape(id, key, spec) {
      const rec = PARTS.get(id);
      const h = typeof key === "number" ? rec.holders[key] : rec.live[key];
      const geo = geometryOf({ ...h.spec, ...spec });
      h.mesh.geometry.dispose();
      h.mesh.geometry = geo;
      if (h.lines) {
        h.lines.geometry.dispose();
        h.lines.geometry = new THREE.EdgesGeometry(geo, 35);
      }
    },
    // a fluid's look: density 0..1 (stipple), wash 0..1 (flat tint), stretch mm, offset [x, y, z]
    fluid(name, { density, wash, stretch, offset, visible } = {}) {
      const m = FLUIDS.get(name);
      if (!m) throw new Error("solid3d: no fluid " + name);
      const u = m.material.uniforms;
      if (density != null) u.uDensity.value = density;
      if (wash != null) u.uWash.value = wash;
      if (stretch != null) u.uLift.value = stretch;
      if (offset) m.position.set(...offset);
      if (visible != null) m.visible = visible;
    },
    // poses whose union the camera frames: each sets the page's pose (via V.set) for one extreme
    frame,
    // drag a part to drive the model: axis [x, y, z] it moves along as the value grows by 1 over
    // `length` mm; start() returns the value at the press, move(v) sets it, end() on release
    drag(ids, { axis, length, start, move, end }) {
      const meshes = [];
      for (const id of [].concat(ids)) PARTS.get(id).group.traverse((o) => o.isMesh && meshes.push(o));
      drags.push({ meshes, axis, length, start, move, end });
    },
    key: (k, fn) => keys.set(k, fn),
    test: (name, fn) => tests.push([name, fn]),
    project,
    dim,
    get explode() {
      return st.explode;
    },
    get cut() {
      return U.uCutOn.value > 0.5;
    },
    input,
    redraw,
    // start: step(dt, live) advances the page's model (return true while settling); render(live)
    // sets poses and fluids; overlay() returns extra SVG (dimensions); still: the tour time shown
    // under reduced motion
    run({ step, render: r, overlay, still = 6, idleAfter = 5 }) {
      pageRender = r;
      overlayFn = overlay ?? null;
      resize();
      applyTheme();
      new ResizeObserver(resize).observe(host);
      lv = L.run({
        root: host,
        step: (dt, l) => {
          const busy = step(dt, l);
          const snap = l.reduced || l.frozen;
          cam.az = snap ? cam.azT : L.follow(cam.az, cam.azT, 9, dt);
          cam.el = snap ? cam.elT : L.follow(cam.el, cam.elT, 9, dt);
          st.explode = snap ? st.explodeT : L.follow(st.explode, st.explodeT, 5, dt);
          return busy || Math.abs(cam.az - cam.azT) > 0.01 || Math.abs(cam.el - cam.elT) > 0.01 || Math.abs(st.explode - st.explodeT) > 1e-3;
        },
        render,
        idleAfter,
        onFrozen: () => {
          document.body.setAttribute("data-ready", "1");
          if (q.check) report();
        },
      });
      if (lv.reduced && !lv.frozen) {
        const fake = { touring: true, reduced: false, frozen: true, clock: 0 };
        for (let t = 0; t < still; t += 1 / 240) step(1 / 240, fake);
        render(lv);
      }
      window.__v3ok = true;
      if (q.selftest) setTimeout(selftest, 50);
      if (q.bench) bench();
      return lv;
    },
  };

  // ---- ?check=1: the frame is drawn and not blank
  function report() {
    const gl = renderer.getContext();
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let cover = 0;
    let n = 0;
    let s1 = 0;
    let s2 = 0;
    for (let i = 0; i < px.length; i += 16) {
      n++;
      if (px[i + 3] > 0) cover++;
      const l = 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2];
      s1 += l;
      s2 += l * l;
    }
    const d = gl.getExtension("WEBGL_debug_renderer_info");
    out("check3d", { webgl: gl instanceof WebGL2RenderingContext ? 2 : 1, gpu: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : "?", cover: +(cover / n).toFixed(4), variance: +(s2 / n - (s1 / n) ** 2).toFixed(1), parts: PARTS.size, fluids: FLUIDS.size });
  }
  function out(id, data) {
    const el = document.createElement("pre");
    el.id = id;
    el.hidden = true;
    el.textContent = JSON.stringify(data);
    document.body.appendChild(el);
  }

  // ---- ?selftest=1: drive the kit's controls with synthetic events, then the page's own tests
  function selftest() {
    const res = [];
    const r = canvas.getBoundingClientRect();
    const ptr = (type, x, y) => canvas.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, clientX: r.left + x, clientY: r.top + y, button: 0 }));
    const key = (k) => host.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
    const ok = (name, pass, info) => res.push({ name, pass: !!pass, info });
    draw();
    document.querySelector('[data-view="front"]')?.click();
    ok("front button", cam.azT === 0 && cam.elT === 0, [cam.azT, cam.elT]);
    key("1");
    ok("key 1 iso", cam.azT === 45, [cam.azT, cam.elT]);
    key("e");
    ok("key E explode", st.explodeT === 1, st.explodeT);
    key("e");
    const c0 = U.uCutOn.value;
    key("c");
    ok("key C cut", U.uCutOn.value !== c0, U.uCutOn.value);
    key("c");
    const z0 = cam.zoom;
    canvas.dispatchEvent(new WheelEvent("wheel", { deltaY: -300, clientX: r.left + W / 2, clientY: r.top + H / 2, bubbles: true, cancelable: true }));
    ok("wheel zoom", cam.zoom > z0, [z0, cam.zoom]);
    cam.zoom = z0;
    cam.pan.set(0, 0, 0);
    const az0 = cam.azT;
    ptr("pointerdown", 6, 6);
    ptr("pointermove", 106, 6);
    ptr("pointerup", 106, 6);
    ok("orbit drag", Math.abs(cam.azT - az0) > 10, [az0, cam.azT]);
    key("1");
    cam.az = cam.azT;
    cam.el = cam.elT;
    draw();
    for (const [name, fn] of tests) {
      try {
        const t = fn({ ptr, key, project, draw });
        ok(name, t?.pass ?? t, t?.info);
      } catch (err) {
        ok(name, false, String(err));
      }
    }
    out("selftest", res);
  }

  // ---- ?bench=1: time a frame, GPU drained (readPixels forces it)
  function bench() {
    const one = new Uint8Array(4);
    const gl = renderer.getContext();
    renderer.info.autoReset = false;
    const time = (n) => {
      const ts = [];
      for (let i = 0; i < n; i++) {
        renderer.info.reset();
        const t0 = performance.now();
        render(lv);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, one);
        ts.push(performance.now() - t0);
      }
      ts.sort((a, b) => a - b);
      return { median: +ts[n >> 1].toFixed(1), p90: +ts[Math.floor(n * 0.9)].toFixed(1) };
    };
    time(10);
    const all = time(60);
    const info = { triangles: renderer.info.render.triangles, calls: renderer.info.render.calls };
    st.balloons = false;
    const bare = time(60);
    const d = gl.getExtension("WEBGL_debug_renderer_info");
    out("bench", { frame: all, noBalloons: bare, ...info, size: [W, H, dpr], gpu: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : "?" });
  }

  return V;
}
