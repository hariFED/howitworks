// The differential's solids for its 3D view (differential-3d.html), from the 2D sheet's own numbers:
// model.mjs (gear sets, pitch cones, module) and parts.mjs (the bevel tooth points CROWN, PIN, SIDE,
// SPID, the bearings, the shaft flange). Pure data, built with kit/solid3d.mjs plus the meshes below.
//
// Frame: x = the sheet's u (the axle, to the vehicle's right), y = its v (forward, the pinion end),
// z up out of the plan. The cutting plane z = 0 is the plan section through the axle and pinion axes.
// The origin is the apex of every pitch cone, as on the sheet.
//
// What the kit lacks, built here as plain triangle meshes (live3d.js swaps them in for a placeholder
// box that carries the key, as the click-pen does):
//   - bevel gear teeth: a closed band of straight teeth on the pitch cone, the tooth form taken from
//     the back cone's virtual spur gear (Tredgold), tips and roots from the sheet's own points;
//   - the housing bowl: a body of revolution round the pinion axis with the two axle bosses let into
//     it (a true hole and hole wall, no CSG), so the bearing bores read through the section;
//   - lathes with fewer segments than the kit's 144 (the triangle budget), rollers, balls, splines.
//
// What the sheet does not draw and the 3D view had to choose, kept plain: the bowl's shape away from
// the plan (round about the pinion axis, a spherical inside clearing the crown wheel); no carrier
// windows; spiral bevel teeth drawn straight; the tubes and shafts unbroken at the sheet's shortened
// length; no wheel-bearing shields, no cover gasket, no tapped holes.

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const deg = Math.PI / 180;
const add = ([a, b], [c, d], k = 1) => [a + c * k, b + d * k];

// ---------------------------------------------------------------- frames
// A lathe or gear is built round local Y (point (r cos φ, s, -r sin φ)) and put on a world axis by a
// proper rotation, so a turn about local Y is the same turn about that world axis.
export const FRAMES = {
  "+y": ([X, Y, Z]) => [X, Y, Z],
  "-y": ([X, Y, Z]) => [X, -Y, -Z],
  "+x": ([X, Y, Z]) => [Y, -X, Z],
  "-x": ([X, Y, Z]) => [-Y, X, Z],
};
const UNFRAME = {
  "+y": ([x, y, z]) => [x, y, z],
  "-y": ([x, y, z]) => [x, -y, -z],
  "+x": ([x, y, z]) => [-y, x, z],
  "-x": ([x, y, z]) => [y, -x, z],
};
export const AXIS = { "+y": [0, 1, 0], "-y": [0, -1, 0], "+x": [1, 0, 0], "-x": [-1, 0, 0] };

// ---------------------------------------------------------------- triangle meshes { p, n }
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a) => {
  const l = Math.hypot(...a) || 1;
  return a.map((v) => v / l);
};
const mesh = () => ({ p: [], n: [] });
// a triangle wound so that its face normal agrees with `want`; normals: per vertex, or the face's
function tri(m, a, b, c, want, ns = null) {
  const f = cross(sub(b, a), sub(c, a));
  if (Math.hypot(...f) < 1e-10) return;
  let [A, B, C] = [a, b, c];
  let N = ns;
  if (dot(f, want) < 0) {
    [B, C] = [C, B];
    if (N) N = [N[0], N[2], N[1]];
  }
  const fn = unit(dot(f, want) < 0 ? f.map((v) => -v) : f);
  m.p.push(...A, ...B, ...C);
  if (N) m.n.push(...N[0], ...N[1], ...N[2]);
  else m.n.push(...fn, ...fn, ...fn);
}
const quad = (m, a, b, c, d, want, ns) => {
  tri(m, a, b, c, want, ns && [ns[0], ns[1], ns[2]]);
  tri(m, a, c, d, want, ns && [ns[0], ns[2], ns[3]]);
};
export function merge(...ms) {
  const out = mesh();
  for (const m of ms) {
    out.p.push(...m.p);
    out.n.push(...m.n);
  }
  return out;
}
// put a local mesh on a frame, then translate
function place(m, frame = "+y", t = [0, 0, 0]) {
  const F = FRAMES[frame];
  const out = mesh();
  for (let i = 0; i < m.p.length; i += 3) {
    const q = F([m.p[i], m.p[i + 1], m.p[i + 2]]);
    out.p.push(q[0] + t[0], q[1] + t[1], q[2] + t[2]);
    out.n.push(...F([m.n[i], m.n[i + 1], m.n[i + 2]]));
  }
  return out;
}

// A body of revolution round local Y from a closed half-profile [[r, s], …] (the kit's lathe, with
// a chosen number of segments): one strip per profile edge, smooth round, creased at every corner.
export function latheMesh(loop, seg) {
  const m = mesh();
  const n = loop.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [r0, s0] = loop[i];
    const [r1, s1] = loop[(i + 1) % n];
    area += r0 * s1 - r1 * s0;
  }
  const sign = area > 0 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const [r0, s0] = loop[i];
    const [r1, s1] = loop[(i + 1) % n];
    if (r0 === 0 && r1 === 0) continue;
    const len = Math.hypot(r1 - r0, s1 - s0);
    if (len < 1e-9) continue;
    const nr = (sign * (s1 - s0)) / len;
    const ns = (-sign * (r1 - r0)) / len;
    for (let j = 0; j < seg; j++) {
      const t0 = (j / seg) * 2 * Math.PI;
      const t1 = ((j + 1) / seg) * 2 * Math.PI;
      const P3 = (r, s, t) => [r * Math.cos(t), s, -r * Math.sin(t)];
      const N3 = (t) => [nr * Math.cos(t), ns, -nr * Math.sin(t)];
      const tm = (t0 + t1) / 2;
      quad(m, P3(r0, s0, t0), P3(r1, s1, t0), P3(r1, s1, t1), P3(r0, s0, t1), N3(tm), [N3(t0), N3(t0), N3(t1), N3(t1)]);
    }
  }
  return m;
}

// A straight prism along local Y over a star-shaped outline [[a, b], …] (local X = a, Z = b).
function prismMesh(shape, from, to) {
  const m = mesh();
  let area = 0;
  shape.forEach(([a0, b0], i) => {
    const [a1, b1] = shape[(i + 1) % shape.length];
    area += a0 * b1 - a1 * b0;
  });
  const sh = area > 0 ? shape : shape.slice().reverse();
  const P3 = ([a, b], s) => [a, s, b];
  sh.forEach((p, i) => {
    const q = sh[(i + 1) % sh.length];
    const out = [q[1] - p[1], 0, -(q[0] - p[0])];
    quad(m, P3(p, from), P3(q, from), P3(q, to), P3(p, to), out);
    tri(m, [0, from, 0], P3(p, from), P3(q, from), [0, -1, 0]);
    tri(m, [0, to, 0], P3(p, to), P3(q, to), [0, 1, 0]);
  });
  return m;
}

// A tapered roller between two world points with end radii r0, r1 (a closed frustum).
function frustumMesh(a, b, r0, r1, seg = 10) {
  const v = unit(sub(b, a));
  const u = unit(Math.abs(v[0]) < 0.9 ? cross([1, 0, 0], v) : cross([0, 1, 0], v));
  const w = cross(u, v);
  const L = Math.hypot(...sub(b, a));
  const loc = latheMesh([[0, 0], [r0, 0], [r1, L], [0, L]], seg);
  const out = mesh();
  for (let i = 0; i < loc.p.length; i += 3) {
    const [X, Y, Z] = [loc.p[i], loc.p[i + 1], loc.p[i + 2]];
    const [nx, ny, nz] = [loc.n[i], loc.n[i + 1], loc.n[i + 2]];
    out.p.push(...[0, 1, 2].map((k) => a[k] + X * u[k] + Y * v[k] + Z * w[k]));
    out.n.push(...[0, 1, 2].map((k) => nx * u[k] + ny * v[k] + nz * w[k]));
  }
  return out;
}

function sphereMesh(c, r, nu = 12, nv = 8) {
  const m = mesh();
  const P3 = (i, j) => {
    const th = (i / nu) * 2 * Math.PI;
    const ph = (j / nv) * Math.PI;
    return [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)];
  };
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const d = [P3(i, j), P3(i + 1, j), P3(i + 1, j + 1), P3(i, j + 1)];
      const pts = d.map((q) => q.map((v, k) => c[k] + r * v));
      const mid = unit(d.reduce((s, q) => s.map((v, k) => v + q[k]), [0, 0, 0]));
      quad(m, ...pts, mid, d);
    }
  }
  return m;
}

// ---------------------------------------------------------------- bevel gear teeth
// A closed band of z straight teeth on a pitch cone of half angle gamma round local Y, apex at the
// origin, from cone distance A - F (toe) to A (heel). a, b: addendum and dedendum at the heel (the
// sheet's), m: heel module. The band reaches `delta` below the roots into the blank. phase: the angle
// (rad, about local Y) of tooth 0's centre line. Teeth taper to the apex, so one outline in (φ, h)
// serves both ends, scaled by the cone distance.
export function bevelTeeth({ z, gamma, A, F, a, b, m, phase = 0, delta = 0.6, steps = 5, alpha = 20 }) {
  const sg = Math.sin(gamma);
  const cg = Math.cos(gamma);
  const rp = A * sg;
  const rv = A * Math.tan(gamma); // the back cone's radius: the virtual spur gear
  const zv = z / cg;
  const al = alpha * deg;
  const rb = rv * Math.cos(al);
  const inv = (x) => Math.tan(x) - x;
  const halfArc = (h) => {
    const rho = Math.max(rv + h, rb);
    const hv = Math.PI / (2 * zv) + inv(al) - inv(Math.acos(Math.min(1, rb / rho)));
    return Math.max(hv * rho, 0.12 * m);
  };
  const ang = (h) => halfArc(h) / (rp + h * cg);
  const pitch = (2 * Math.PI) / z;
  const outline = [];
  for (let k = 0; k < z; k++) {
    const c = phase + k * pitch;
    for (let i = 0; i <= steps; i++) {
      const h = -b + ((a + b) * i) / steps;
      outline.push([c - ang(h), h]);
    }
    for (let i = steps; i >= 0; i--) {
      const h = -b + ((a + b) * i) / steps;
      outline.push([c + ang(h), h]);
    }
    const e0 = c + ang(-b);
    const e1 = c + pitch - ang(-b);
    for (let i = 1; i < 3; i++) outline.push([e0 + ((e1 - e0) * i) / 3, -b]);
  }
  const hin = -b - delta;
  const pt = (phi, h, rho) => {
    const k = rho / A;
    const R = rho * sg + h * k * cg;
    const s = rho * cg - h * k * sg;
    return [R * Math.cos(phi), s, -R * Math.sin(phi)];
  };
  const eP = (phi) => [-Math.sin(phi), 0, -Math.cos(phi)]; // increasing φ
  const eH = (phi) => [cg * Math.cos(phi), -sg, -cg * Math.sin(phi)]; // toward the tips
  const eR = (phi) => [sg * Math.cos(phi), cg, -sg * Math.sin(phi)]; // along the generator
  const out = mesh();
  const r0 = A - F;
  const N = outline.length;
  for (let i = 0; i < N; i++) {
    const [p0, h0] = outline[i];
    const [p1raw, h1] = outline[(i + 1) % N];
    const p1 = i === N - 1 ? p1raw + 2 * Math.PI : p1raw;
    const pm = (p0 + p1) / 2;
    // outward in (arc, h): the left of travel, φ increasing round the band, material below
    const R = rp + ((h0 + h1) / 2) * cg;
    const want = eP(pm).map((v, k) => -(h1 - h0) * v + R * (p1 - p0) * eH(pm)[k]);
    quad(out, pt(p0, h0, r0), pt(p1, h1, r0), pt(p1, h1, A), pt(p0, h0, A), want);
    quad(out, pt(p0, hin, r0), pt(p1, hin, r0), pt(p1, hin, A), pt(p0, hin, A), eH(pm).map((v) => -v));
    quad(out, pt(p0, hin, r0), pt(p1, hin, r0), pt(p1, h1, r0), pt(p0, h0, r0), eR(pm).map((v) => -v));
    quad(out, pt(p0, hin, A), pt(p1, hin, A), pt(p1, h1, A), pt(p0, h0, A), eR(pm));
  }
  return out;
}

// The angle (rad, about local Y) at which a frame's local direction points along world `d`.
export function localAngle(frame, d) {
  const [x, , z] = UNFRAME[frame](d);
  return Math.atan2(-z, x);
}
// Rolling: the turn of gear 2 (about world axis a2) per turn of gear 1 (about a1), touching at p.
export function ratio(a1, a2, p) {
  const v1 = cross(a1, p);
  const v2 = cross(a2, p);
  return dot(v1, v2) / dot(v2, v2);
}

// ---------------------------------------------------------------- the housing bowl
// Round the pinion axis (y), the sheet's plan section for its profile, with the two axle bosses let
// in: for |y| < BOSS.r the bowl wall is pierced where it lies within BOSS.r of the axle (the boss
// fills that hole), and the hole's wall closes the solid. The band's outside is the cylinder r = RO,
// its inside the sphere r = RI that clears the crown wheel.
export const BOSS = { r: 53, RO: 136, RI: 123 };
const KB = 20; // stations through the band
const bandY = Array.from({ length: KB + 1 }, (_, j) => BOSS.r * Math.cos((j / KB) * Math.PI)); // 53 → -53
export function bowlLoop() {
  const outer = [[47, 229], [52, 218], [55, 205], [55, 160], [62, 140], [78, 129], [100, 119], [118, 101], [127, 80], [131, 60]];
  const rear = [[131, -62], [126, -80], [122, -96], [132, -100], [132, -110], [108, -110], [108, -90], [104, -68]];
  const front = [[105, 62], [109, 80], [99, 102], [80, 115], [60, 120], [45, 118], [40, 116], [40, 148.75], [33, 148.75], [33, 196], [36, 196], [36, 229]];
  return [
    ...outer,
    ...bandY.map((y) => [BOSS.RO, y]),
    ...rear,
    ...bandY.slice().reverse().map((y) => [Math.sqrt(BOSS.RI ** 2 - y * y), y]),
    ...front,
  ];
}
export function bowlMesh(half = 32) {
  const loop = bowlLoop();
  const m = mesh();
  const n = loop.length;
  let area = 0;
  for (let i = 0; i < n; i++) area += loop[i][0] * loop[(i + 1) % n][1] - loop[(i + 1) % n][0] * loop[i][1];
  const sign = area > 0 ? 1 : -1;
  const R2 = BOSS.r ** 2;
  const hole = ([r, y]) => (Math.abs(y) < BOSS.r - 1e-9 ? Math.asin(Math.min(1, Math.sqrt(R2 - y * y) / r)) : 0);
  const P3 = (r, y, t) => [r * Math.cos(t), y, -r * Math.sin(t)];
  for (let i = 0; i < n; i++) {
    const A = loop[i];
    const B = loop[(i + 1) % n];
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    if (len < 1e-9) continue;
    const nr = (sign * (B[1] - A[1])) / len;
    const ny = (-sign * (B[0] - A[0])) / len;
    const N3 = (t) => [nr * Math.cos(t), ny, -nr * Math.sin(t)];
    const ha = hole(A);
    const hb = hole(B);
    for (const base of [0, Math.PI]) {
      for (let j = 0; j < half; j++) {
        const ta0 = base + ha + ((Math.PI - 2 * ha) * j) / half;
        const ta1 = base + ha + ((Math.PI - 2 * ha) * (j + 1)) / half;
        const tb0 = base + hb + ((Math.PI - 2 * hb) * j) / half;
        const tb1 = base + hb + ((Math.PI - 2 * hb) * (j + 1)) / half;
        const tm = base + Math.PI * ((j + 0.5) / half);
        quad(m, P3(A[0], A[1], ta0), P3(B[0], B[1], tb0), P3(B[0], B[1], tb1), P3(A[0], A[1], ta1), N3(tm), [N3(ta0), N3(tb0), N3(tb1), N3(ta1)]);
      }
    }
  }
  // the hole walls, on the boss cylinder, through the same stations as the surfaces' hole edges
  const ring = [];
  bandY.forEach((y) => ring.push([y, Math.sqrt(Math.max(0, R2 - y * y))]));
  for (let j = KB - 1; j >= 1; j--) ring.push([bandY[j], -Math.sqrt(Math.max(0, R2 - bandY[j] ** 2))]);
  for (const sx of [1, -1]) {
    for (let k = 0; k < ring.length; k++) {
      const [y0, z0] = ring[k];
      const [y1, z1] = ring[(k + 1) % ring.length];
      const xo = (y, z) => sx * Math.sqrt(BOSS.RO ** 2 - z * z);
      const xi = (y, z) => sx * Math.sqrt(BOSS.RI ** 2 - y * y - z * z);
      const want = [0, -(y0 + y1) / 2, -(z0 + z1) / 2];
      quad(m, [xi(y0, z0), y0, z0], [xo(y0, z0), y0, z0], [xo(y1, z1), y1, z1], [xi(y1, z1), y1, z1], want);
    }
  }
  return m;
}

// ---------------------------------------------------------------- mesh placeholders
// A solid the kit cannot make: its bounding box, carrying a key; live3d.js swaps the mesh in.
export const MESHES = {};
let seq = 0;
function solid(m, o = {}) {
  const key = `m${seq++}`;
  MESHES[key] = m;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < m.p.length; i++) {
    lo[i % 3] = Math.min(lo[i % 3], m.p[i]);
    hi[i % 3] = Math.max(hi[i % 3], m.p[i]);
  }
  return S.box(lo, hi, { mesh: key, ...o });
}
const segOf = (loop) => {
  const r = Math.max(...loop.map(([q]) => q));
  return r > 80 ? 72 : r > 30 ? 56 : r > 12 ? 40 : 20;
};
const lathe = (loop, frame = "+y", o = {}, at = [0, 0, 0], seg = segOf(loop)) => solid(place(latheMesh(loop, seg), frame, at), o);

// ---------------------------------------------------------------- the sheet's profiles
// parts.mjs keeps these private: its numbers, retyped from crown(), sideGears(), spiders(), pinionGear().
const n = (g) => g.n;
const below = (g, pt, d, k = 1) => add(pt, n(g), -d * k); // a point moved d toward the axis, normal to the cone
const kToe = (A, F) => (A - F) / A;
const DELTA = 0.6;
function crownBlank() {
  const C = P.CROWN;
  const k = kToe(M.CONE, M.FACE);
  return [below(C, C.rootT, DELTA, k), below(C, C.rootH, DELTA), add(C.rootH, C.n, -2), [109.4, 47.5], [107.5, 50], [91, 50], [91, 34.5], [79, 34.5], [79, 50], [63, 50], [63, 35], [66, 33], add(C.rootT, C.n, -2)];
}
const pinionBlank = () => {
  const G = P.PIN;
  const k = kToe(M.CONE, M.FACE);
  return [[0, 79.6], below(G, G.rootT, DELTA, k), below(G, G.rootH, DELTA), [25, 113], [25, 116], [17.5, 116], [17.5, 148.75], [16, 150.5], [16, 196], [15, 197], [15, 216.75], [14, 217.75], [14, 262], [12, 263], [12, 281], [11, 282.5], [0, 282.5]];
};
const sideBlank = () => {
  const G = P.SIDE;
  const k = kToe(M.DIFF_CONE, M.DIFF_FACE);
  return [[14, 12.73], below(G, G.rootT, DELTA, k), below(G, G.rootH, DELTA), [30.2, 26.4], [22, 26.4], [22, 46], [14, 46]];
};
const spiderBlank = () => {
  const G = P.SPID;
  const k = kToe(M.DIFF_CONE, M.DIFF_FACE);
  const arc = K.arc(0, 0, 40, Math.atan2(G.rootH[1], G.rootH[0]) / deg, Math.atan2(38.73, 10) / deg, 5).slice(1);
  return [[10, G.rootT[1]], below(G, G.rootT, DELTA, k), below(G, G.rootH, DELTA), ...arc];
};

// The parts list's taper bearing shapes (parts.mjs taperShapes, retyped): local x from the cone's
// back face, r from the axis.
function taperShapes({ d, D, T, B, C, alpha = 13 }) {
  const h = (D - d) / 2;
  const sl = Math.tan(alpha * deg);
  const rc0 = d / 2 + 0.4 * h;
  const Dw = 0.36 * h;
  const rc = (x) => rc0 - sl * x;
  const ro = (x) => rc(x) + Dw * (1 - (0.25 * x) / T);
  const rib = 0.14 * T;
  const Bf = B - 0.07 * T;
  const cone = [[0, d / 2], [0, rc0 + 0.3 * Dw], [rib, rc0 + 0.3 * Dw], [rib, rc(rib)], [Bf, rc(Bf)], [Bf, rc(Bf) + 0.18 * Dw], [B, rc(Bf) + 0.18 * Dw], [B, d / 2]];
  const cup = [[T - C, ro(T - C) + 0.2], [T - C, D / 2], [T, D / 2], [T, ro(T)]];
  const x1 = Math.max(rib + 0.3, T - C + 0.25);
  const x2 = Bf - 0.4;
  return { cone, cup, x1, x2, rc, ro, T, C, D };
}
// A taper bearing on a frame: s = s0 + dir·x along the axis. Cone, cup, and its rollers in one mesh.
function taperSolids(spec, frame, s0, dir, { ex = [0, 0, 0] } = {}) {
  const sh = taperShapes(spec);
  const toRS = (pts) => pts.map(([x, r]) => [r, s0 + dir * x]);
  const rollers = [];
  const rm = (sh.rc((sh.x1 + sh.x2) / 2) + sh.ro((sh.x1 + sh.x2) / 2)) / 2;
  const dw = sh.ro(sh.x1) - sh.rc(sh.x1) - 0.3;
  const count = Math.floor((2 * Math.PI * rm) / (dw * 1.22));
  for (let k = 0; k < count; k++) {
    const t = (k / count) * 2 * Math.PI;
    const at = (x) => {
      const r = (sh.rc(x) + sh.ro(x)) / 2;
      return [r * Math.cos(t), s0 + dir * x, -r * Math.sin(t)];
    };
    const half = (x) => (sh.ro(x) - sh.rc(x)) / 2 - 0.15;
    rollers.push(frustumMesh(at(sh.x1), at(sh.x2), half(sh.x1), half(sh.x2), 10));
  }
  return [
    lathe(toRS(sh.cone), frame, { hatch: ["steel", 45], own: true, explode: ex }),
    lathe(toRS(sh.cup), frame, { hatch: ["steel", 135], own: true, explode: ex }),
    solid(place(merge(...rollers), frame), { hatch: "none", own: true, explode: ex }),
  ];
}
// a point on a taper bearing's cup, mid-width, for a balloon: [r, s]
function cupMid(spec, s0, dir) {
  const sh = taperShapes(spec);
  const x = sh.T - sh.C / 2;
  return [(sh.ro(x) + sh.D / 2) / 2 + 0.5, s0 + dir * x];
}

// ---------------------------------------------------------------- explode
// Along the axle: the gear cluster stays on its line and opens outward in assembly order, the shafts
// furthest. The housing (with the tubes and the pinion group) is jogged up the pinion axis and the
// carrier with the crown wheel down, so the axle line is clear, as a draftsman jogs an explosion line.
export const EX = { housing: 330, carrier: -270, cover: -50, screws: -95, side: 60, sideWasher: 75, spider: 50, spiderWasher: 75, brg: 110, shim: 125, shaft: 150, wheelBrg: 120, studs: 175, bolts: 70, rollPin: 150, seal: 22, flange: 45, nut: 75 };
const EXH = [0, EX.housing, 0];
const EXC = [0, EX.carrier, 0];
const sx2 = (sx, d) => [sx * d, 0, 0];

// The parts that are not cut: the gears (so they read whole in their mesh) and the shafts and pins
// that the sheet draws in view. live3d.js gives their materials their own cut switch, held off.
export const WHOLE = [5, 17, 19, 21, 22, 23, 25];
export const STUD_PCD = P.FL.pcd;
export const BOLT_R = 85;
export const SPLINES = 28;

// tooth phases: a tooth of one gear faces a space of the other where they touch (in the plane z = 0)
export const MESH = {
  // the crown wheel's teeth meet the pinion's at the pitch point on +y
  crown: { frame: "+x", d: [0, 1, 0], tooth: true },
  pinion: { frame: "+y", d: [1, 0, 0], tooth: false },
  sideR: { frame: "+x", d: [0, 1, 0], tooth: true },
  sideL: { frame: "-x", d: [0, 1, 0], tooth: true },
  spiderT: { frame: "+y", d: [1, 0, 0], tooth: false },
  spiderB: { frame: "-y", d: [1, 0, 0], tooth: false },
};
const phaseOf = (key, z) => localAngle(MESH[key].frame, MESH[key].d) + (MESH[key].tooth ? 0 : Math.PI / z);

function gearTeeth(key, z, gamma, A, F, g, m, o = {}) {
  return bevelTeeth({ z, gamma, A, F, a: Math.hypot(...sub([...g.tipH, 0], [...g.pH, 0])), b: Math.hypot(...sub([...g.rootH, 0], [...g.pH, 0])), m, phase: phaseOf(key, z), delta: DELTA, ...o });
}

export function parts() {
  seq = 0;
  for (const k of Object.keys(MESHES)) delete MESHES[k];
  const out = [];

  // 1 HOUSING: the bowl round the pinion axis, the two axle bosses (bearing bore, shoulder, tube socket)
  const boss = [[40, 99], [BOSS.r, 99], [BOSS.r, 136], [50, 190], [38, 190], [38, 128], [31, 128], [31, 117], [40, 117]];
  out.push(
    S.part(1, "AXLE HOUSING, SALISBURY TYPE", [solid(bowlMesh()), lathe(boss, "+x", {}, [0, 0, 0], 64), lathe(boss, "-x", {}, [0, 0, 0], 64)], {
      mat: "iron", angle: 45, explode: EXH, anchor: { cut: [-117, 88, 0], out: { c: [0, 20, 0], r: 136, axis: "y" } },
    }),
  );

  // 2 COVER, pressed dish; 3 HEX SCREWS M8×20, ten on Ø240
  const top = [[0, -135], [35, -133.5], [70, -127.5], [96, -115.5], [106, -110], [132, -110]];
  const cover = [...top, ...top.map(([r, y]) => [r, y - 2.5]).reverse()];
  out.push(S.part(2, "REAR COVER 2.5", [lathe(cover, "+y")], { hatch: "solid", explode: [0, EX.housing + EX.cover, 0], anchor: { cut: [-60, -130.4, 0], out: { c: [0, -131, 0], r: 60, axis: "y" } } }));
  const screws = [];
  for (let k = 0; k < 10; k++) {
    const t = k * 36 * deg;
    const at = [120 * Math.cos(t), 0, -120 * Math.sin(t)];
    screws.push(place(latheMesh([[0, -112.5], [4, -112.5], [4, -93], [3.4, -92.4], [0, -92.4]], 16), "+y", at));
    screws.push(place(prismMesh(S.hexagon(13), -117.8, -112.5), "+y", at));
  }
  out.push(S.part(3, "HEX SCREW M8×20 ISO 4017", [solid(merge(...screws))], { hatch: "none", explode: [0, EX.housing + EX.screws, 0], anchor: { cut: [-120, -115, 0], out: { c: [-120, -115, 0] } } }));

  // 4 AXLE TUBES, each with its end flange (the sheet breaks them; here they run unbroken, shortened)
  const tube = [[32, 128], [38, 128], [38, 226.5], [41.5, 230], [32, 230]];
  const flange = [[32, 230], [44, 230], [44, 238], [68, 238], [70, 240], [70, 245], [68, 247], [46, 247], [46, 252], [36, 252], [36, 235], [32, 235]];
  out.push(
    S.part(4, "AXLE TUBE Ø76×6, END FLANGE", [
      lathe(tube, "+x", { hatch: ["steel", 135] }), lathe(flange, "+x", { hatch: ["steel", 30], own: true }),
      lathe(tube, "-x", { hatch: ["steel", 135] }), lathe(flange, "-x", { hatch: ["steel", 30], own: true }),
    ], { mat: "steel", angle: 135, explode: EXH, anchor: { cut: [-200, 35, 0], out: { c: [-200, 0, 0], r: 38, axis: "x" } } }),
  );

  // 5 DRIVE PINION, whole: the shaft and its ten teeth; 6, 7 its taper bearings; 8 spacer; 9 seal;
  // 10 companion flange; 11 nut
  const pinion = merge(latheMesh(pinionBlank(), 40), gearTeeth("pinion", M.Z_PINION, M.GAMMA_PINION, M.CONE, M.FACE, P.PIN, M.MODULE));
  out.push(S.part(5, "DRIVE PINION 10T, SPIRAL BEVEL", [solid(place(pinion, "+y"))], { hatch: "none", explode: EXH, anchor: { cut: [-16, 98, 0], out: { c: [0, 98, 0], r: 24, axis: "y" } } }));
  const head = cupMid(P.BRG_HEAD, 116, 1);
  const tail = cupMid(P.BRG_TAIL, 216.75, -1);
  out.push(
    S.part(6, "TAPER ROLLER BRG 32307 ISO 355", taperSolids(P.BRG_HEAD, "+y", 116, 1), { mat: "steel", angle: 45, explode: EXH, anchor: { cut: [-head[0], head[1], 0], out: { c: [0, head[1], 0], r: 40, axis: "y" }, solid: 1 } }),
    S.part(7, "TAPER ROLLER BRG 30306 ISO 355", taperSolids(P.BRG_TAIL, "+y", 216.75, -1), { mat: "steel", angle: 45, explode: EXH, anchor: { cut: [tail[0], tail[1], 0], out: { c: [0, tail[1], 0], r: 36, axis: "y" }, solid: 1 } }),
  );
  const spacer = [[16.5, 147.4], [16.5, 163], [20.4, 172], [16.5, 181], [16.5, 197.6], [18.5, 197.6], [18.5, 181.6], [22.4, 172], [18.5, 162.4], [18.5, 147.4]];
  out.push(S.part(8, "COLLAPSIBLE SPACER Ø37×2", [lathe(spacer, "+y")], { hatch: "solid", explode: EXH, anchor: { cut: [21.4, 172, 0], out: { c: [0, 172, 0], r: 22, axis: "y" } } }));
  const caseL = [[34.6, 219.2], [36, 219.2], [36, 229], [26.4, 229], [26.4, 227.6], [34.6, 227.6]];
  const lip = [[22.5, 220.4], [24.2, 219.2], [34, 219.2], [34, 227], [26.6, 227], [25, 224.6], [22.5, 223.4]];
  const exSeal = [0, EX.housing + EX.seal, 0];
  out.push(
    S.part(9, "SHAFT SEAL 45×72×10 ISO 6194", [lathe(lip, "+y"), lathe(caseL, "+y", { hatch: "solid", own: true }), lathe(S.circle(26.2, 222.6, 1, 12), "+y", { hatch: "solid", own: true }, [0, 0, 0], 40)], {
      mat: "rubber", angle: 45, explode: exSeal, anchor: { cut: [29, 223, 0], out: { c: [0, 224, 0], r: 36, axis: "y" } },
    }),
  );
  const cflange = [[14, 216.75], [22.5, 216.75], [22.5, 243], [25, 245], [54, 245], [55, 246], [55, 254], [54, 255], [30, 257.5], [25, 262], [14, 262]];
  out.push(S.part(10, "COMPANION FLANGE Ø110", [lathe(cflange, "+y")], { mat: "steel", angle: 135, explode: [0, EX.housing + EX.flange, 0], anchor: { cut: [-42, 250, 0], out: { c: [0, 250, 0], r: 55, axis: "y" } } }));
  const nut = [[12, 262], [17, 262], [18, 263], [18, 277], [17, 278], [12, 278]];
  out.push(S.part(11, "PINION NUT M24×1.5, COLLAR", [lathe(nut, "+y")], { hatch: "none", explode: [0, EX.housing + EX.nut, 0], anchor: { cut: [15, 270, 0], out: { c: [0, 270, 0], r: 18, axis: "y" } } }));

  // 12 CROWN WHEEL: the blank hatched to the root cone, the teeth (unhatched, as on the sheet) on it
  out.push(
    S.part(12, "CROWN WHEEL 39T, Ø224 PCD", [
      lathe(crownBlank(), "+x", {}, [0, 0, 0], 80),
      solid(place(gearTeeth("crown", M.Z_CROWN, M.GAMMA_CROWN, M.CONE, M.FACE, P.CROWN, M.MODULE), "+x"), { hatch: "none", own: true }),
    ], { mat: "steel", angle: 45, explode: EXC, anchor: { cut: [42, 98, 0], out: { c: [40, 0, 0], r: 110, axis: "x" }, solid: 0 } }),
  );
  // 13 HEX BOLTS M12×1.5×30, ten on the carrier flange into the crown wheel
  const bolts = [];
  for (let k = 0; k < 10; k++) {
    const t = k * 36 * deg;
    const at = [0, BOLT_R * Math.cos(t), BOLT_R * Math.sin(t)];
    const shank = place(latheMesh([[0, 35.5], [5.3, 35.5], [6, 36.2], [6, 60], [0, 60]], 16), "+x");
    const hd = place(prismMesh(S.hexagon(17), 60, 67.7), "+x");
    for (const q of [shank, hd]) {
      for (let i = 0; i < q.p.length; i += 3) {
        q.p[i + 1] += at[1];
        q.p[i + 2] += at[2];
      }
    }
    bolts.push(shank, hd);
  }
  out.push(S.part(13, "HEX BOLT M12×1.5×30 ISO 8765", [solid(merge(...bolts))], { hatch: "none", explode: [EX.bolts, EX.carrier, 0], anchor: { cut: [64, BOLT_R, 0], out: { c: [64, BOLT_R, 0] } } }));

  // 14 DIFFERENTIAL CARRIER: one body of revolution round the axle, the sheet's halves joined at the
  // pin bosses (the cross pin passes through them in the cutting plane)
  const sph = [];
  for (let i = 0; i <= 12; i++) {
    const s = 28.4 - (56.8 * i) / 12;
    sph.push([Math.sqrt(41.5 ** 2 - s * s), s]);
  }
  const carrier = [
    [16, -117], [25, -117], [25, -95], [35, -95], [35, -93], [38.5, -80], [44.5, -62], [47.5, -52], [49.5, -32], [53, -22], [56, -17],
    [56, 17], [55, 22], [58.5, 35], [63, 35], [63, 50], [100, 50], [100, 59], [99, 60], [44, 60], [41.5, 66], [38.5, 80], [35, 95], [25, 95],
    [25, 117], [16, 117], [16, 46], [22, 46], [22, 28.4], ...sph, [22, -28.4], [22, -46], [16, -46],
  ];
  out.push(S.part(14, "DIFFERENTIAL CARRIER", [lathe(carrier, "+x", {}, [0, 0, 0], 72)], { mat: "iron", angle: 135, explode: EXC, anchor: { cut: [-75, 30, 0], out: { c: [-75, 0, 0], r: 40, axis: "x" } } }));

  // 15 TAPER ROLLER BRG 32010 X on the carrier hubs; 16 shim packs behind their cups
  const cb = [];
  for (const [fr, sx] of [["+x", 1], ["-x", -1]]) cb.push(...taperSolids(P.BRG_CARRIER, fr, 95, 1, { ex: sx2(sx, EX.brg) }));
  const cm = cupMid(P.BRG_CARRIER, 95, 1);
  out.push(S.part(15, "TAPER ROLLER BRG 32010 X ISO 355", cb, { mat: "steel", angle: 45, anchor: { cut: [cm[1], cm[0], 0], out: { c: [cm[1], 0, 0], r: 40, axis: "x" }, solid: 1 } }));
  const shim = [[32, 115.2], [40, 115.2], [40, 116.9], [32, 116.9]];
  out.push(S.part(16, "SHIM PACK Ø80/Ø64", [lathe(shim, "+x", { explode: sx2(1, EX.shim) }), lathe(shim, "-x", { explode: sx2(-1, EX.shim) })], { hatch: "solid", anchor: { cut: [116, -36, 0], out: { c: [116, 0, 0], r: 40, axis: "x" }, solid: 0 } }));

  // 17 SIDE GEARS (whole): right on +x, left on −x
  const side = (key) => merge(latheMesh(sideBlank(), 40), gearTeeth(key, M.Z_SIDE, M.GAMMA_SIDE, M.DIFF_CONE, M.DIFF_FACE, P.SIDE, M.DIFF_MODULE));
  out.push(
    S.part(17, "SIDE GEAR 16T m4.2, 28T SPLINE", [solid(place(side("sideR"), "+x"), { explode: sx2(1, EX.side) }), solid(place(side("sideL"), "-x"), { explode: sx2(-1, EX.side) })], {
      hatch: "none", anchor: { cut: [26, -26, 0], out: { c: [26, 0, 0], r: 34, axis: "x" }, solid: 0 },
    }),
  );
  // 18 THRUST WASHERS behind the side gears
  const sw = [[22.3, 26.6], [29.6, 26.6], [29.6, 28.2], [22.3, 28.2]];
  out.push(S.part(18, "THRUST WASHER Ø60/Ø45×0.8", [lathe(sw, "+x", { explode: sx2(1, EX.sideWasher) }), lathe(sw, "-x", { explode: sx2(-1, EX.sideWasher) })], { hatch: "solid", anchor: { cut: [27.4, 27, 0], out: { c: [27.4, 0, 0], r: 30, axis: "x" }, solid: 0 } }));

  // 19 SPIDER GEARS (whole, the accent): on the cross pin, +y and −y
  const spider = (key) => merge(latheMesh(spiderBlank(), 40), gearTeeth(key, M.Z_SPIDER, M.GAMMA_SPIDER, M.DIFF_CONE, M.DIFF_FACE, P.SPID, M.DIFF_MODULE));
  out.push(
    S.part(19, "SPIDER GEAR 10T m4.2", [solid(place(spider("spiderT"), "+y"), { explode: [0, EX.spider, 0] }), solid(place(spider("spiderB"), "-y"), { explode: [0, -EX.spider, 0] })], {
      hatch: "none", anchor: { cut: [-15, 30, 0], out: { c: [0, 30, 0], r: 24, axis: "y" }, solid: 0 },
    }),
  );
  // 20 SPHERICAL WASHERS behind the spiders
  const ws = [];
  for (let i = 0; i <= 6; i++) {
    const r = 10 + (8.2 * i) / 6;
    ws.push([r, Math.sqrt(41.4 ** 2 - r * r)]);
  }
  for (let i = 6; i >= 0; i--) {
    const r = 10 + (8.2 * i) / 6;
    ws.push([r, Math.sqrt(40.1 ** 2 - r * r)]);
  }
  out.push(S.part(20, "SPHERICAL WASHER SR40×1.3", [lathe(ws, "+y", { explode: [0, EX.spiderWasher, 0] }), lathe(ws, "-y", { explode: [0, -EX.spiderWasher, 0] })], { hatch: "solid", anchor: { cut: [14, 38.27, 0], out: { c: [0, 38.27, 0], r: 16, axis: "y" }, solid: 0 } }));

  // 21 CROSS PIN Ø20×112 (whole); 22 SPRING PIN Ø6×32 through it and the carrier
  out.push(S.part(21, "CROSS PIN Ø20×112", [lathe([[0, -56], [9.2, -56], [10, -55], [10, 55], [9.2, 56], [0, 56]], "+y", {}, [0, 0, 0], 32)], { hatch: "none", anchor: { cut: [0, -50, 0], out: { c: [0, -50, 0], r: 10, axis: "y" } } }));
  out.push(S.part(22, "SPRING PIN Ø6×32 ISO 8752", [lathe([[0, -16], [2.4, -16], [3, -15.4], [3, 15.4], [2.4, 16], [0, 16]], "+x", {}, [0, 47.5, 0], 16)], { hatch: "none", explode: [EX.rollPin, EX.carrier, 0], anchor: { cut: [11, 47.5, 0], out: { c: [11, 47.5, 0], r: 3, axis: "x" } } }));

  // 23 HALF-SHAFTS (whole), each with its 28-tooth spline and wheel flange
  const shaftLoop = [[0, 11.6], [13.2, 11.6], [14, 12.4], [14, 48], [15, 50], [15, 233], [17.5, 234], [17.5, 252], [20, 252], [20, 261], [69, 262], [70, 263], [70, 270], [30, 270], [30, 276], [29, 277], [0, 277]];
  const spl = [];
  for (let k = 0; k < SPLINES; k++) {
    const c = (k / SPLINES) * 2 * Math.PI;
    const w = Math.PI / SPLINES;
    for (const [da, r] of [[-0.62 * w, 13.9], [-0.42 * w, 15], [0.42 * w, 15], [0.62 * w, 13.9]]) spl.push([r * Math.cos(c + da), -r * Math.sin(c + da)]);
  }
  const shaft = merge(latheMesh(shaftLoop, 32), prismMesh(spl, 12.4, 48));
  out.push(
    S.part(23, "HALF-SHAFT Ø30, 28T SPLINE", [solid(place(shaft, "+x"), { explode: sx2(1, EX.shaft) }), solid(place(shaft, "-x"), { explode: sx2(-1, EX.shaft) })], {
      hatch: "none", anchor: { cut: [-165, 0, 0], out: { c: [-165, 0, 0], r: 15, axis: "x" }, solid: 1 },
    }),
  );
  // 24 BALL BEARINGS 6207-2RS: inner ring, outer ring and balls on each side
  const wb = [];
  for (const [fr, sx] of [["+x", 1], ["-x", -1]]) {
    const ex = sx2(sx, EX.wheelBrg);
    const balls = [];
    for (let k = 0; k < 9; k++) {
      const t = (k / 9) * 2 * Math.PI;
      balls.push(sphereMesh([26.75 * Math.cos(t), 243.5, -26.75 * Math.sin(t)], 5.55));
    }
    wb.push(
      lathe([[17.5, 235.3], [21.9, 235.3], [21.9, 251.7], [17.5, 251.7]], fr, { hatch: ["steel", 45], own: true, explode: ex }),
      lathe([[31.6, 235.3], [36, 235.3], [36, 251.7], [31.6, 251.7]], fr, { hatch: ["steel", 135], own: true, explode: ex }),
      solid(place(merge(...balls), fr), { hatch: "none", own: true, explode: ex }),
    );
  }
  out.push(S.part(24, "BALL BEARING 6207-2RS ISO 15", wb, { mat: "steel", angle: 45, anchor: { cut: [-243.5, -33.8, 0], out: { c: [-243.5, 0, 0], r: 36, axis: "x" }, solid: 4 } }));
  // 25 WHEEL STUDS M12×1.5×45 (whole), five on Ø114.3 in each shaft flange
  const studs = [];
  for (const [fr, sx] of [["+x", 1], ["-x", -1]]) {
    const one = [];
    for (let k = 0; k < 5; k++) {
      const t = (k / 5) * 2 * Math.PI;
      const m = place(latheMesh([[0, 262], [6, 262], [6, 291], [5, 292], [0, 292]], 16), fr);
      for (let i = 0; i < m.p.length; i += 3) {
        m.p[i + 1] += STUD_PCD * Math.cos(t);
        m.p[i + 2] += STUD_PCD * Math.sin(t);
      }
      one.push(m);
    }
    studs.push(solid(merge(...one), { explode: sx2(sx, EX.studs) }));
  }
  out.push(S.part(25, "WHEEL STUD M12×1.5×45", studs, { hatch: "none", anchor: { cut: [285, STUD_PCD, 0], out: { c: [285, STUD_PCD, 0] }, solid: 0 } }));
  return out;
}

// centre lines: the axle and the pinion axis, as the sheet draws them
export const centres = () => [
  [[-310, 0, 0], [310, 0, 0]],
  [[0, -150, 0], [0, 300, 0]],
];

export const scene = () => ({ parts: parts(), fluids: [], centres: centres() });
