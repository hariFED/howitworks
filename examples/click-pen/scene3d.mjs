// The click pen's solids for its 3D view (click-pen-3d.html), in the same world mm as parts.mjs:
// u is x (nose face u = 0, toward the button), v is y, and the sheet's cutting plane is z = 0.
// Pure data built with kit/solid3d.mjs, from model.mjs (the cam track, the axial layout, the spring)
// and parts.mjs (radii R, the cap CAP, the plunger PL, the refill's S0, the cutting plane THETA_S).
//
// Angles. θ is the model's cam angle about the axis. The sheet's cutting plane runs through θS (its
// top) and θS + 180° (its bottom) and the sheet projects a point at radius r and angle θ to
// v = r·cos(θ − θS); section B-B fixes the hand. In world mm that is
//     x = u,  y = r·cos(θ − θS),  z = r·sin(θ − θS),
// so the half z > 0 that the 3D cut removes is the half the sheet draws "in front of the plane", the
// long slot at the top and the short slot at the bottom are cut through their middles, as on the sheet.
//
// The cam (the ridge teeth, the rotator's lugs, the plunger's teeth) is wrapped round the axis: no kit
// solid does that, so wrapMesh() below builds those closed bodies as plain triangle arrays from the
// model's own edge functions (ridgeBottom, lugTop, plungerBottom) and the scene carries a placeholder
// box with a `wrap` spec; live3d.js swaps the geometry in before the first frame.
//
// As on the sheet, the rotator 11 and the plunger 13 are NOT CUT (WHOLE): live3d.js keeps them whole,
// so all three lugs and all six teeth show, and the rotator carries the accent.
//
// The cam annulus is a 0.85 mm shell between the guide and the plunger: assembled, the plunger hides
// it from every side. So the explosion keeps the cam where it works: the barrel, the cam guide and the
// rotator stay put (the rotator still driven by the model), the plunger, the top cap and the button
// slide out of the back along the axis, the nose and the bush out of the front, and the refill and its
// spring drop to a parallel axis below (a jogged explosion line). Exploded, the far half of the guide
// shows its ridge teeth, long and short slots with the lugs riding in them, the plunger's teeth beside.
//
// Moving parts are built at the sheet's reference pose: the refill, the spring's free end and the
// rotator at EXTENDED (rotator front face u_r = 96, lugs' leading corners at θ = 0, 120, 240), the
// plunger and the button fully out. live3d.js moves them from the model.

import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const R = P.R;
const TS = P.THETA_S;
const rad = (a) => (a * Math.PI) / 180;
const s1 = M.SLOPE * M.MMD; // axial mm per degree on every cam face

// (θ, u, r) → world [x, y, z]
export const at3 = (th, u, r) => [u, r * Math.cos(rad(th - TS)), r * Math.sin(rad(th - TS))];

// ---------------------------------------------------------------- wrapped solids (pure triangles)

// A polyline [[θ, u], …] with θ non-decreasing; two points with the same θ make a vertical step.
function densify(pl, step) {
  const out = [pl[0]];
  for (let i = 1; i < pl.length; i++) {
    const [a0, b0] = pl[i - 1];
    const [a1, b1] = pl[i];
    const n = Math.max(1, Math.ceil((a1 - a0) / step - 1e-9));
    for (let k = 1; k <= n; k++) out.push([a0 + ((a1 - a0) * k) / n, b0 + ((b1 - b0) * k) / n]);
  }
  return out;
}
// The polyline's value just left (L) and just right (R) of θ (they differ at a step).
function evalAt(pl, th) {
  const hits = pl.filter(([a]) => Math.abs(a - th) < 1e-9);
  if (hits.length) return { L: hits[0][1], R: hits[hits.length - 1][1] };
  for (let i = 1; i < pl.length; i++) {
    const [a0, b0] = pl[i - 1];
    const [a1, b1] = pl[i];
    if (th > a0 && th < a1) {
      const v = b0 + ((b1 - b0) * (th - a0)) / (a1 - a0);
      return { L: v, R: v };
    }
  }
  throw new Error(`wrapMesh: θ ${th} outside the polyline`);
}

// A closed body between radii r0 < r1 whose developed outline is the region between a bottom and a top
// polyline over one θ range (the top has no steps). periodic: the range is a full turn and the body
// closes on itself (a toothed tube). Returns non-indexed { position, normal } arrays, wound outward.
export function wrapMesh({ bottom, top, r0, r1, periodic = false, step = 1.5 }) {
  const B = densify(bottom, step);
  const T = densify(top, step);
  const ths = [...new Set([...B, ...T].map(([a]) => +a.toFixed(9)))].sort((a, b) => a - b);
  const n = ths.length;
  const col = ths.map((th) => ({ th, b: evalAt(B, th), t: evalAt(T, th).L }));
  const thOf = (i) => (periodic && i === n - 1 ? ths[0] : ths[i]); // the seam: the same vertices
  const position = [];
  const normal = [];
  const P3 = ([th, u], r) => at3(th, u, r);
  const radial = (th, sg) => [0, sg * Math.cos(rad(th - TS)), sg * Math.sin(rad(th - TS))];
  const tri = (a, b, c, na, nb, nc) => {
    position.push(...a, ...b, ...c);
    normal.push(...na, ...nb, ...nc);
  };
  // the two curved faces, one strip of the developed outline at a time (counter-clockwise in θ, u)
  for (let i = 0; i < n - 1; i++) {
    const a = col[i];
    const c = col[i + 1];
    const poly = [[thOf(i), a.b.R], [thOf(i + 1), c.b.L]];
    if (c.b.R > c.b.L) poly.push([thOf(i + 1), c.b.R]);
    poly.push([thOf(i + 1), c.t], [thOf(i), a.t]);
    if (a.b.L > a.b.R) poly.push([thOf(i), a.b.L]);
    let tris;
    if (poly.length === 4) tris = [[0, 1, 2], [0, 2, 3]];
    else {
      const k = poly.length;
      poly.push([poly.reduce((s, p) => s + p[0], 0) / k, poly.reduce((s, p) => s + p[1], 0) / k]);
      tris = Array.from({ length: k }, (_, j) => [k, j, (j + 1) % k]);
    }
    for (const [p, q, r] of tris) {
      tri(P3(poly[p], r1), P3(poly[q], r1), P3(poly[r], r1), radial(poly[p][0], 1), radial(poly[q][0], 1), radial(poly[r][0], 1));
      tri(P3(poly[p], r0), P3(poly[r], r0), P3(poly[q], r0), radial(poly[p][0], -1), radial(poly[r][0], -1), radial(poly[q][0], -1));
    }
  }
  // the walls: a radial quad on every boundary edge (region on the left going round)
  const loopB = [];
  for (let i = 0; i < n; i++) {
    loopB.push([thOf(i), col[i].b.L]);
    if (col[i].b.R !== col[i].b.L) loopB.push([thOf(i), col[i].b.R]);
  }
  const loopT = [];
  for (let i = n - 1; i >= 0; i--) loopT.push([thOf(i), col[i].t]);
  const chains = periodic ? [loopB, loopT] : [[...loopB, ...loopT, loopB[0]]];
  for (const ch of chains) {
    for (let i = 0; i < ch.length - 1; i++) {
      const p = ch[i];
      const q = ch[i + 1];
      if (Math.abs(p[0] - q[0]) < 1e-12 && Math.abs(p[1] - q[1]) < 1e-12) continue;
      const p0 = P3(p, r0);
      const q0 = P3(q, r0);
      const q1 = P3(q, r1);
      const p1 = P3(p, r1);
      const e1 = q0.map((v, k) => v - p0[k]);
      const e2 = q1.map((v, k) => v - p0[k]);
      let nn = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      const l = Math.hypot(...nn) || 1;
      nn = nn.map((v) => v / l);
      tri(p0, q0, q1, nn, nn, nn);
      tri(p0, q1, p1, nn, nn, nn);
    }
  }
  return { position, normal };
}

// A placeholder solid for a wrapped body: its bounding box, carrying the wrap spec for live3d.js.
function wrapped(spec, o = {}) {
  const m = wrapMesh(spec);
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < m.position.length; i++) {
    lo[i % 3] = Math.min(lo[i % 3], m.position[i]);
    hi[i % 3] = Math.max(hi[i % 3], m.position[i]);
  }
  return S.box(lo, hi, { wrap: spec, ...o });
}

// ---------------------------------------------------------------- the cam, from the model

// One ridge of the cam guide: from a long slot's right wall (base) to the next long slot's left wall
// (base + 105°), over two ridge teeth, the first ending in a short slot (the notch), as View E draws it.
export function ridgeBottomLine(base) {
  const pts = [];
  for (let k = 0; k < 2; k++) {
    const e = base + 60 * k;
    pts.push([e, M.Y_G], [e + 45, M.Y_G + s1 * 45]);
    if (k === 0) pts.push([e + 45, M.ridgeBottom(e + 45.001)], [e + 60, M.Y_V + M.NOTCH]);
  }
  return pts;
}
const ridge = (base) => wrapped({ bottom: ridgeBottomLine(base), top: [[base, M.GUIDE_TOP], [base + 105, M.GUIDE_TOP]], r0: R.ridge, r1: R.guideI });

// A lug of the rotator, its leading corner at phi, built with the corner at height Y_N (EXTENDED).
export const LUG = { a: M.LUG_W - 0.5, b: 0.5 }; // the lug spans phi − 14.5° … phi − 0.5°, as the sheet
const lug = (phi) =>
  wrapped({
    bottom: [[phi - LUG.a, M.U_R_EXT + 1], [phi - LUG.b, M.U_R_EXT + 1]],
    top: [[phi - LUG.a, M.lugTop(phi - LUG.a, phi, M.Y_N)], [phi - LUG.b, M.lugTop(phi - LUG.b, phi, M.Y_N)]],
    r0: R.hub,
    r1: R.lugO,
    step: 1,
  });

// The plunger's six V teeth: a tube Ø4×Ø5.9 whose bottom edge is the model's plungerBottom, tips at yPt.
const YP = M.YPT_TOP;
export const BORE = 6; // the plunger's bore for the rotator's hub, from the tooth tips
function plungerTeeth() {
  const bottom = [];
  for (let th = -15; th <= 345 + 1e-9; th += 1.25) bottom.push([th, M.plungerBottom(th, YP)]);
  return wrapped({ bottom, top: [[-15, YP + P.PL.tube], [345, YP + P.PL.tube]], r0: R.plI, r1: R.plO, periodic: true, step: 1.25 });
}
// A key in each long slot (105°–120° on the sheet), so the plunger never turns.
const key = (c) => {
  const pts = [];
  for (let th = c - LUG.a; th <= c - LUG.b + 1e-9; th += 1) pts.push([R.lugO * Math.sin(rad(th - TS)), R.lugO * Math.cos(rad(th - TS))]);
  for (let th = c - LUG.b; th >= c - LUG.a - 1e-9; th -= 1) pts.push([R.plO * Math.sin(rad(th - TS)), R.plO * Math.cos(rad(th - TS))]);
  return S.extrude(pts, { along: "x", from: YP + P.PL.key, to: YP + P.PL.tube });
};

// ---------------------------------------------------------------- the rest, from the sheet's profiles

const S0 = P.S0; // u of the refill's s = 0 at EXTENDED
const atS = (loop) => loop.map(([r, s]) => [r, s + S0]); // a refill profile [r, s] → [r, u]
const AX = { axis: "x", at: 0 };

// the spring, built at EXTENDED from its seat on the nose cone to the holder's collar
export const SPRING = { from: M.SEAT_U, to: M.refillEnd(M.Y_N) - M.REFILL_L + M.COLLAR_S, radius: M.SPRING.D / 2, wire: M.SPRING.d, turns: M.SPRING.n };
export const SPRING_LEN = SPRING.to - SPRING.from;
function coilPoint(k) {
  const t = k / (4 * SPRING.turns);
  const a = 2 * Math.PI * SPRING.turns * t;
  return [SPRING.from + SPRING.wire / 2 + t * (SPRING_LEN - SPRING.wire), -SPRING.radius * Math.sin(a), 0];
}

// the clip: the sheet's strip path, 0.5 thick, 3 wide, on the barrel's top
const CLIP_PATH = [[121.75, 4.85], [121.75, 5.85], [121.2, 6.3], [118.5, 6.35], [86, 5.75], [82.2, 5.6]];
function strip(path, t) {
  const left = [];
  const right = [];
  for (let i = 0; i < path.length; i++) {
    const a = path[Math.max(0, i - 1)];
    const b = path[Math.min(path.length - 1, i + 1)];
    const n = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / n;
    const ny = (b[0] - a[0]) / n;
    left.push([path[i][0] + (nx * t) / 2, path[i][1] + (ny * t) / 2]);
    right.push([path[i][0] - (nx * t) / 2, path[i][1] - (ny * t) / 2]);
  }
  return [...left, ...right.reverse()];
}
export const CLIP_W = 1.5; // half width

// Explode (see the header): the cam stays, the rest leaves along the axis; JOG is the refill's axis.
export const JOG = -60;
// The explode comes apart in two stages. Up to REST only the cam stack opens along the axis (rotator,
// plunger, button, top cap: the toggle's three toothed members drawn apart, so the teeth read); the
// rest of the pen follows after. The page opens at REST (live3d.js): a slightly exploded cam stack.
export const REST = 0.3;
const LATE = { stage: [REST, 1] };
// a cam part that is drawn out by `mm` at REST and reaches its full explode `full` later
const early = (mm, full) => ({ stage: [0, (REST * full) / mm] });
const B = M.YPT_TOP + P.PL.button; // the button's skirt, button out

export function parts() {
  const refill = (id, name, solids, o, dx = 0) => S.part(id, name, solids, { ...o, ...LATE, explode: { to: [dx, JOG, 0] } });
  return [
    S.part(1, "BARREL TUBE Ø9.7×0.35", [S.tube({ ...AX, r0: R.barrelI, r1: R.barrelO, from: 15, to: 121.5 })], {
      hatch: "solid", anchor: { cut: [86, R.barrelI + 0.175, 0], out: { c: [86, 0, 0], r: R.barrelO, axis: "x" } },
    }),
    S.part(2, "THREAD BUSH M8×0.5", [S.lathe([[4.0, 15], [4.5, 15], [4.5, 24], [3.3, 24], [3.3, 21.6], [4.0, 21]], AX)], {
      mat: "brass", angle: 45, ...LATE, explode: [-26, 0, 0], anchor: { cut: [17.5, -4.25, 0], out: { c: [17.5, 0, 0], r: 4.5, axis: "x" } },
    }),
    S.part(3, "NOSE CONE M8×0.5", [S.lathe([
      [1.3, 0], [2.0, 0], [4.85, 15], [4.0, 15], [4.0, 20.6], [3.75, 21], [3.2, 21],
      [3.2, 13], [2.5, 13], [2.5, M.SEAT_U], [1.7, M.SEAT_U], [1.7, 1], [1.3, 1],
    ], AX)], { mat: "brass", angle: 135, ...LATE, explode: [-52, 0, 0], anchor: { cut: [10, -3.2, 0], out: { c: [8, 0, 0], r: 3.5, axis: "x" } } }),
    S.part(4, "RETURN SPRING Ø0.4×Ø4.3×19, 10 TURNS", [S.helix({ ...AX, ...SPRING, pivot: [SPRING.from, 0, 0], live: "spring" })], {
      hatch: "solid", ...LATE, explode: { to: [-30, JOG, 0] }, anchor: { cut: coilPoint(9), out: { c: [10, 0, 0], r: 2.35, axis: "x" }, solid: 0 },
    }),
    refill(5, "POINT, 5 INK GROOVES", [S.lathe(atS([[0.62, 0.3], [1.15, 3.5], [1.15, 14], [0.6, 14], [0.6, 2.6], [0.2, 2.6], [0.2, 0.96], [0.354, 0.854], [0.51, 0.62], [0.51, 0.45], [0.462, 0.3]]), AX)], {
      mat: "bronze", angle: 135, anchor: { cut: [S0 + 8, 0.875, 0], out: { c: [S0 + 8, 0, 0], r: 1.15, axis: "x" } },
    }, -3),
    refill(6, "BALL Ø1.0 ISO 12757-2", [S.sphere([S0 + 0.5, 0, 0], 0.5)], {
      anchor: { cut: [S0 + 0.5, -0.2, 0], out: { c: [S0 + 0.5, 0, 0], r: 0.5, axis: "sphere" } },
    }, -6),
    refill(7, "POINT HOLDER", [S.lathe(atS([[1.15, 10], [1.4, 10], [1.8, 11.6], [1.8, M.COLLAR_S], [2.9, M.COLLAR_S], [2.9, 23], [2.7, 23], [2.7, 28], [0.9, 28], [0.9, 14], [1.15, 14]]), AX)], {
      mat: "brass", angle: 45, anchor: { cut: [S0 + 21.5, -2.35, 0], out: { c: [S0 + 21.5, 0, 0], r: 2.9, axis: "x" } },
    }),
    refill(8, "REFILL TUBE Ø6×0.3", [S.tube({ ...AX, r0: 2.7, r1: 3.0, from: S0 + 23, to: S0 + 96 })], {
      hatch: "solid", anchor: { cut: [S0 + 82, -2.85, 0], out: { c: [S0 + 82, 0, 0], r: 3, axis: "x" } },
    }),
    refill(9, "INK FOLLOWER", [S.cylinder({ ...AX, r: 2.7, from: S0 + 70, to: S0 + 74 })], {
      mat: "rubber", angle: 45, anchor: { cut: [S0 + 72, -1.6, 0], out: { c: [S0 + 72, 0, 0], r: 3, axis: "x" } },
    }),
    refill(10, "END PLUG", [S.lathe(atS([[0, 93], [2.7, 93], [2.7, 96], [3.0, 96], [3.0, 98], [0, 98]]), AX)], {
      mat: "plastic", angle: 135, anchor: { cut: [S0 + 95.5, -1.4, 0], out: { c: [S0 + 97, 0, 0], r: 3, axis: "x" } },
    }, 6),
    refill(17, "INK, ISO 12757-2 G2", [S.lathe(atS([[0, 0.96], [0.2, 0.96], [0.2, 2.6], [0.6, 2.6], [0.6, 14], [0.9, 14], [0.9, 28], [2.7, 28], [2.7, 70], [0, 70]]), AX)], {
      mat: "foam", angle: 45, anchor: { cut: [S0 + 50, 1.2, 0], out: { c: [S0 + 50, 0, 0], r: 3, axis: "x" } },
    }),
    // ---- the cam end
    S.part(12, "CAM GUIDE, 3 LONG + 3 SHORT SLOTS", [
      S.lathe([[R.guideI, 91.4], [R.guideI + 0.4, 91], [R.barrelI, 91], [R.barrelI, M.GUIDE_TOP], [R.guideI, M.GUIDE_TOP]], AX),
      ...[0, 120, 240].map((base) => ridge(base)),
    ], { mat: "plastic", angle: 45, anchor: { cut: [106, 4.2, 0], out: { c: [106, 0, 0], r: 4.5, axis: "x" } } }),
    S.part(11, "ROTATOR, 3 LUGS", [
      S.lathe([[0, M.U_R_EXT], [R.base, M.U_R_EXT], [R.base, M.U_R_EXT + 1], [0, M.U_R_EXT + 1]], { ...AX, live: "base" }),
      S.lathe([[0, M.U_R_EXT + 1], [R.hub, M.U_R_EXT + 1], [R.hub, M.U_R_EXT + 8], [0, M.U_R_EXT + 8]], { ...AX, live: "hub" }),
      ...[0, 120, 240].map((phi) => lug(phi)),
    ], {
      explode: { to: [18, 0, 0] }, ...early(12, 18),
      anchor: { cut: [M.U_R_EXT + 0.5, R.base * Math.SQRT1_2, R.base * Math.SQRT1_2], out: { c: [M.U_R_EXT + 0.5, 0, 0], r: R.base, axis: "x" } },
    }),
    S.part(13, "PLUNGER, 6 TEETH", [
      plungerTeeth(),
      S.cylinder({ ...AX, r: R.plI, from: YP + BORE, to: YP + P.PL.tube }),
      S.cylinder({ ...AX, r: R.collar, from: YP + P.PL.tube, to: YP + P.PL.collar }),
      S.cylinder({ ...AX, r: R.stem, from: YP + P.PL.collar, to: YP + P.PL.stem }),
      ...[0, 120, 240].map((c) => key(c)),
    ], {
      explode: { to: [26, 0, 0] }, ...early(20, 26),
      anchor: { cut: [YP + 10, R.plO * Math.SQRT1_2, R.plO * Math.SQRT1_2], out: { c: [YP + 10, 0, 0], r: R.plO, axis: "x" } },
    }),
    S.part(14, "BUTTON CAP", [S.lathe([
      [2.5, B], [3.5, B],
      ...[0, 15, 30, 45, 60, 75, 90].map((a) => [3.5 * Math.cos(rad(a)), B + 3.3 + 1.2 * Math.sin(rad(a))]),
      [0, B + P.PL.buttonH], [0, B + 3.5], [2.5, B + 3.5],
    ].filter((p, i, a) => i === 0 || Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > 1e-6), AX)], {
      mat: "steel", angle: 135, explode: { to: [50, 0, 0] }, ...early(30, 50), anchor: { cut: [B + 1.75, 3.0, 0], out: { c: [B + 1.75, 0, 0], r: 3.5, axis: "x" } },
    }),
    S.part(15, "TOP CAP", [S.lathe([[2.6, P.CAP.spigot], [R.barrelI, P.CAP.spigot], [R.barrelI, P.CAP.flange], [R.barrelO, P.CAP.flange], [R.barrelO, P.CAP.top - 0.5], [R.barrelO - 0.5, P.CAP.top], [2.6, P.CAP.top]], AX)], {
      mat: "brass", angle: 45, explode: [52, 0, 0], ...early(26, 52), anchor: { cut: [123.6, 3.6, 0], out: { c: [123.6, 0, 0], r: R.barrelO, axis: "x" } },
    }),
    S.part(16, "CLIP, 0.5 STRIP", [
      S.tube({ ...AX, r0: R.barrelI, r1: R.barrelO, from: 121.5, to: 122 }),
      S.extrude(strip(CLIP_PATH, 0.5), { along: "z", from: -CLIP_W, to: CLIP_W }),
      S.cylinder({ axis: "z", at: [81.6, 5.35], r: 0.5, from: -CLIP_W, to: CLIP_W }),
    ], { hatch: "solid", ...LATE, explode: [0, 9, 0], anchor: { cut: [100, 6.05, 0], out: { c: [100, 6.05, CLIP_W] } } }),
  ];
}

// centre lines: the pen's axis; the refill's and the cam end's ride with their parts when exploded
export const centres = () => [
  [[-6, 0, 0], [140, 0, 0]],
  { line: [[S0 - 4, 0, 0], [S0 + 101, 0, 0]], part: 8 },
  { line: [[YP - 2, 0, 0], [YP + P.PL.stem + 6, 0, 0]], part: 13 },
];

export const REFILL = [5, 6, 7, 8, 9, 10, 17];
export const WHOLE = [11, 13]; // not cut (live3d.js)
export const scene = () => ({ parts: parts(), fluids: [], centres: centres() });
