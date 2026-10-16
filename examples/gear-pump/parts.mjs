// The gear pump's parts, in world mm. Two frames:
//   A-A, across the shafts: u right, v up (inlet at the bottom, outlet at the top); the drive
//       gear's axis at (−RW, 0), the driven gear's at (+RW, 0). Looking from the rear toward the flange.
//   B-B, along the shafts: the same u, and the sheet's up is −z (the flange and the shaft end are
//       at the top). Parts are written in (u, z) and turned into view points by uz().
// The gears turn, so their outlines are functions of the turned angle th (rad): the drive gear
// turns clockwise by th, the driven gear anticlockwise.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;
export const uz = (pts) => pts.map(([u, z]) => [u, -z]);
const pol = (cu, cv, r, a) => [cu + r * Math.cos(a), cv + r * Math.sin(a)];

// A cut face with holes (bolt bores): paper, hatch and outline over several sub-paths, even-odd.
export function cutEO(V, polys, { mat = "steel", angle = 45 } = {}) {
  const dd = polys.map((p) => K.d(V, p)).join("");
  return `<path class="paper eo" d="${dd}"/><path class="eo" fill="url(#h-${mat}-${angle})" d="${dd}"/><path class="vis" d="${dd}"/>`;
}

// ---------------------------------------------------------------- gear geometry

export const C1 = [-M.RW, 0];
export const C2 = [M.RW, 0];
export const rot1 = (th) => -th;
export const rot2 = (th) => M.PITCH / 2 + th;

const THB = M.halfAngle(M.RB);
const FILLET = 0.7;
const GAP = FILLET / (M.RF + FILLET);
const TA = Math.sqrt((M.RA / M.RB) ** 2 - 1);

// One flank, root to tip, about the tooth centre line at angle c. side −1: the flank at c − θ.
function flank(cu, cv, c, side) {
  const out = [];
  // root fillet, tangent to the root circle and to the radial part of the flank
  const a0 = c + side * THB;
  const n = [Math.cos(a0), Math.sin(a0)];
  const t = [-Math.sin(a0) * side, Math.cos(a0) * side]; // toward the space
  const fc = [cu + n[0] * (M.RF + FILLET) + t[0] * FILLET, cv + n[1] * (M.RF + FILLET) + t[1] * FILLET];
  for (let i = 0; i <= 4; i++) {
    const w = (Math.PI / 2) * (i / 4);
    out.push([fc[0] - FILLET * (n[0] * Math.cos(w) + t[0] * Math.sin(w)), fc[1] - FILLET * (n[1] * Math.cos(w) + t[1] * Math.sin(w))]);
  }
  for (let i = 0; i <= 9; i++) {
    const tt = (TA * i) / 9;
    const rho = M.RB * Math.sqrt(1 + tt * tt);
    out.push(pol(cu, cv, rho, c + side * M.halfAngle(rho)));
  }
  return out;
}

const rootArc = (cu, cv, a0, a1) => {
  const out = [];
  for (let i = 1; i < 4; i++) out.push(pol(cu, cv, M.RF, a0 + ((a1 - a0) * i) / 4));
  return out;
};

export function gearPoly([cu, cv], rot) {
  const pts = [];
  for (let k = 0; k < M.Z; k++) {
    const c = rot + k * M.PITCH;
    pts.push(...flank(cu, cv, c, -1));
    pts.push(pol(cu, cv, M.RA, c));
    pts.push(...flank(cu, cv, c, 1).reverse());
    pts.push(...rootArc(cu, cv, c + THB + GAP, c + M.PITCH - THB - GAP));
  }
  return pts;
}

// The tooth space after the tooth centred at c, closed by the bore.
export function spacePoly([cu, cv], c) {
  const out = [...flank(cu, cv, c, 1).reverse()];
  out.push(...rootArc(cu, cv, c + THB + GAP, c + M.PITCH - THB - GAP));
  out.push(...flank(cu, cv, c + M.PITCH, -1));
  const a0 = c + M.PITCH - M.TIP_HALF;
  const a1 = c + M.TIP_HALF;
  for (let i = 0; i <= 4; i++) out.push(pol(cu, cv, M.BORE_R, a0 + ((a1 - a0) * i) / 4));
  return out;
}

// Every tooth space of both gears with its state and pressure (mirrored into the left gear's frame).
export function spaces(th, pOut) {
  const out = [];
  for (let k = 0; k < M.Z; k++) {
    const c = rot1(th) + k * M.PITCH;
    out.push({ gear: 1, c, ...M.space(c + M.PITCH / 2, pOut) });
    const c2 = rot2(th) + k * M.PITCH;
    out.push({ gear: 2, c: c2, ...M.space(Math.PI - (c2 + M.PITCH / 2), pOut) });
  }
  return out;
}

// The oil is drawn in a few density bands, so a frame rewrites a handful of paths.
export const BANDS = 6;
export const bandOpacity = (i) => (i === 0 ? 0.3 : K.r2(0.5 + (0.5 * (i - 1)) / (BANDS - 2)));
export const bandOf = (s) => (s.state === "fill" ? 0 : 1 + Math.round(Math.min(1, s.p / M.P_RATED) * (BANDS - 2)));
export function oilBands(V, th, pOut) {
  const band = Array.from({ length: BANDS }, () => "");
  for (const s of spaces(th, pOut)) band[bandOf(s)] += K.d(V, spacePoly(s.gear === 1 ? C1 : C2, s.c));
  return band;
}

// ---------------------------------------------------------------- A-A: across the shafts

const H = M.HOUSING;
// The tapped port and its drilling, as its left wall (u < 0), from the face to the bore.
function portWall(p, sign) {
  const face = sign * H.v;
  const ch = p.major + 0.5;
  const tip = (p.minor - p.drill) / Math.tan((59 * Math.PI) / 180);
  const vb = sign * Math.sqrt(M.BORE_R ** 2 - (M.RW - p.drill) ** 2);
  return [
    [-ch, face],
    [-p.minor, face - sign * (ch - p.minor)],
    [-p.minor, face - sign * p.depth],
    [-p.drill, face - sign * (p.depth + tip)],
    [-p.drill, vb],
  ];
}

export function housingLeft() {
  const top = portWall(M.OUTLET, 1);
  const bot = portWall(M.INLET, -1);
  const aTop = Math.atan2(top[4][1], M.RW + top[4][0]);
  const aBot = Math.atan2(bot[4][1], M.RW + bot[4][0]) + 2 * Math.PI;
  const bore = K.arc(C1[0], C1[1], M.BORE_R, (aTop * 180) / Math.PI, (aBot * 180) / Math.PI, 48);
  return [
    ...top,
    ...bore.slice(1, -1),
    ...bot.reverse(),
    ...K.arc(-H.u + H.r, -H.v + H.r, H.r, 270, 180, 3),
    ...K.arc(-H.u + H.r, H.v - H.r, H.r, 180, 90, 3),
  ];
}

const boltHoles = (side) => [-1, 1].map((sv) => K.circle(side * M.BOLT.u, sv * M.BOLT.v, M.BOLT.hole, 36));

export function housingA(V) {
  const left = housingLeft();
  const right = K.flipU(left);
  const threads = [];
  for (const [p, sign] of [[M.OUTLET, 1], [M.INLET, -1]]) {
    const v0 = sign * (H.v - (p.major + 0.5 - p.minor) - 0.3);
    const v1 = sign * (H.v - p.depth + 1.5);
    threads.push([[-p.major, v0], [-p.major, v1]], [[p.major, v0], [p.major, v1]]);
  }
  return part(
    1,
    cutEO(V, [left, ...boltHoles(-1)], { mat: "alu", angle: 45 }) +
      cutEO(V, [right, ...boltHoles(1)], { mat: "alu", angle: 45 }) +
      K.lines(V, threads, "thin")
  );
}

export function boltsA(V) {
  let out = "";
  for (const su of [-1, 1]) for (const sv of [-1, 1]) out += K.cut(V, K.circle(su * M.BOLT.u, sv * M.BOLT.v, M.BOLT.d / 2, 32), { mat: "steel", angle: 135 });
  return part(12, out);
}

// The front bushings' face, seen behind the gears: the joint between the two D-shaped bushings
// and the trapping-relief grooves either side of the mesh.
export const RELIEF = { half: 3.2, out: [2.0, 8.6], inl: [-8.6, -3.0] };
export const WAIST = Math.sqrt(M.BORE_R ** 2 - M.RW ** 2);
export function bushingFace(V) {
  const g = RELIEF;
  return part(
    6,
    K.line(V, [[0, -WAIST], [0, WAIST]]) +
      K.line(V, K.rect(-g.half, g.out[0], g.half, g.out[1]), "vis", true) +
      K.line(V, K.rect(-g.half, g.inl[0], g.half, g.inl[1]), "vis", true)
  );
}

export function gearA(V, n, th) {
  const C = n === 1 ? C1 : C2;
  const rot = n === 1 ? rot1(th) : rot2(th);
  return K.cut(V, gearPoly(C, rot), { mat: "steel", angle: n === 1 ? 135 : 60 });
}

export function gearMarks(V) {
  return (
    K.centerMark(V, C1, 3) +
    K.centerMark(V, C2, 3) +
    K.line(V, K.circle(C1[0], C1[1], M.RW, 96), "ctr", true) +
    K.line(V, K.circle(C2[0], C2[1], M.RW, 96), "ctr", true)
  );
}

// The line of action and the contact points on it (the drive gear's working flanks).
const DIR = [Math.sin(M.ALPHA_W), -Math.cos(M.ALPHA_W)];
export const T1 = [-(M.A / 2) * Math.sin(M.ALPHA_W) ** 2, (M.A / 2) * Math.sin(M.ALPHA_W) * Math.cos(M.ALPHA_W)];
export const T2 = [-T1[0], -T1[1]];
const S_E = Math.sqrt(M.RA ** 2 - M.RB ** 2);
const S_A = M.A * Math.sin(M.ALPHA_W) - S_E;
export function contacts(th) {
  const out = [];
  let t = M.ALPHA_W + THB + th;
  t = ((t % M.PITCH) + M.PITCH) % M.PITCH;
  for (let s = M.RB * t; s <= S_E + 1e-6; s += M.PB) if (s >= S_A - 1e-6) out.push([T1[0] + s * DIR[0], T1[1] + s * DIR[1]]);
  return out;
}
export const contactPath = () => [[T1[0] + S_A * DIR[0], T1[1] + S_A * DIR[1]], [T1[0] + S_E * DIR[0], T1[1] + S_E * DIR[1]]];

// ---------------------------------------------------------------- B-B: along the shafts

export const Z = {
  g0: 0,
  g1: M.B,
  front: -15, // flange joint, the front bushings' back face
  rear: M.B + 15, // cover joint
  coverOut: M.B + 29,
  flangeFace: -33,
  spigot: -35,
  sealIn: -25.2, // the seal's seat
  shaftEnd: -62,
  step: -37, // Ø15 shaft end to Ø16
  head: M.B + 30.6, // under the screw head, on the washer
  boltEnd: -27.8,
};
export const CU = C1[0];
const RJ = 8; // journals Ø16
export const CLIP = { z0: -34.6, z1: -33.4, groove: 14.7 };
export const BAL = [[-35.5, -32.5], [-5.5, -2.5], [2.5, 5.5], [32.5, 35.5]];
export const OR = { u0: 41.0, u1: 43.4, depth: 1.5 };
const SPIGOT = 25;
const BOLT_U = M.BOLT.u;
const TAP = { r: 3.32, depth: -29.5 };

const groove = (u0, u1, z, d) => [[u0, z], [u0, z - d], [u1, z - d], [u1, z]];
const tapped = (u) => [
  [u - 4, Z.front], [u - 4, Z.boltEnd], [u - TAP.r, Z.boltEnd], [u - TAP.r, TAP.depth],
  [u, TAP.depth - 2], [u + TAP.r, TAP.depth], [u + TAP.r, Z.boltEnd], [u + 4, Z.boltEnd], [u + 4, Z.front],
];

export function flangeB(V) {
  const L = [
    [-61, Z.front],
    ...tapped(-BOLT_U),
    ...groove(-OR.u1, -OR.u0, Z.front, OR.depth),
    ...groove(BAL[0][0], BAL[0][1], Z.front, 1.6),
    [CU - 10, Z.front],
    [CU - 10, Z.sealIn],
    [CU - 14, Z.sealIn],
    [CU - 14, CLIP.z1],
    [CU - CLIP.groove, CLIP.z1],
    [CU - CLIP.groove, CLIP.z0],
    [CU - 14, CLIP.z0],
    [CU - 14, Z.spigot + 0.5],
    [CU - 14.5, Z.spigot],
    [CU - SPIGOT + 0.6, Z.spigot],
    [CU - SPIGOT, Z.spigot + 0.6],
    [CU - SPIGOT, Z.flangeFace],
    [-60.2, Z.flangeFace],
    [-61, Z.flangeFace + 0.8],
  ];
  const R = [
    [CU + 10, Z.front],
    ...groove(BAL[1][0], BAL[1][1], Z.front, 1.6),
    ...groove(BAL[2][0], BAL[2][1], Z.front, 1.6),
    ...groove(BAL[3][0], BAL[3][1], Z.front, 1.6),
    ...groove(OR.u0, OR.u1, Z.front, OR.depth),
    ...tapped(BOLT_U),
    [61, Z.front],
    [61, Z.flangeFace + 0.8],
    [60.2, Z.flangeFace],
    [CU + SPIGOT, Z.flangeFace],
    [CU + SPIGOT, Z.spigot + 0.6],
    [CU + SPIGOT - 0.6, Z.spigot],
    [CU + 14.5, Z.spigot],
    [CU + 14, Z.spigot + 0.5],
    [CU + 14, CLIP.z0],
    [CU + CLIP.groove, CLIP.z0],
    [CU + CLIP.groove, CLIP.z1],
    [CU + 14, CLIP.z1],
    [CU + 14, Z.sealIn],
    [CU + 10, Z.sealIn],
  ];
  const taps = [];
  for (const s of [-1, 1]) {
    const u = s * BOLT_U;
    taps.push(uz([[u - 4, Z.boltEnd], [u - 4, TAP.depth + 0.4]]), uz([[u + 4, Z.boltEnd], [u + 4, TAP.depth + 0.4]]));
  }
  return part(2, K.cut(V, uz(L), { mat: "alu", angle: 135 }) + K.cut(V, uz(R), { mat: "alu", angle: 135 }) + K.lines(V, taps, "thin"));
}

export function bodyB(V) {
  const pieces = [];
  for (const s of [-1, 1]) {
    pieces.push(K.rect(s * (M.RW + M.BORE_R), Z.front, s * (BOLT_U - M.BOLT.hole), Z.rear));
    pieces.push(K.rect(s * (BOLT_U + M.BOLT.hole), Z.front, s * 61, Z.rear));
  }
  return part(1, pieces.map((p) => K.cut(V, uz(p), { mat: "alu", angle: 45 })).join(""));
}

export function coverB(V) {
  const zo = Z.coverOut;
  const h = BOLT_U - M.BOLT.hole;
  const mid = [
    [-h, Z.rear],
    ...groove(-OR.u1, -OR.u0, Z.rear, -OR.depth),
    ...groove(OR.u0, OR.u1, Z.rear, -OR.depth),
    [h, Z.rear],
    [h, zo],
    [-h, zo],
  ];
  const outer = [[-61, Z.rear], [-(BOLT_U + M.BOLT.hole), Z.rear], [-(BOLT_U + M.BOLT.hole), zo], [-60.2, zo], [-61, zo - 0.8]];
  const o = { mat: "iron", angle: 135 };
  return part(3, K.cut(V, uz(mid), o) + K.cut(V, uz(outer), o) + K.cut(V, uz(K.flipU(outer)), o));
}

// Front (6) and rear (7) bushings: D-shaped pairs meeting on u = 0.
export function bushingsB(V, id, z0, z1) {
  let out = "";
  for (const s of [-1, 1]) {
    const c = s * M.RW;
    const outerU = s * (M.RW + M.BORE_R);
    const a = K.rect(Math.min(outerU, c + s * 9), z0, Math.max(outerU, c + s * 9), z1); // outboard of the bore
    const b = K.rect(Math.min(0, c - s * 9), z0, Math.max(0, c - s * 9), z1); // inboard, to the joint on u = 0
    const opts = { mat: "bronze", angle: s < 0 ? 30 : 60 };
    out += K.cut(V, uz(a), opts) + K.cut(V, uz(b), opts);
  }
  return part(id, out);
}

// Plain bearings (8), steel-backed, 1 mm wall: blacked in.
export function bearingsB(V) {
  let out = "";
  for (const c of [C1[0], C2[0]])
    for (const [z0, z1] of [[Z.front + 0.5, -0.5], [Z.g1 + 0.5, Z.rear - 0.5]])
      for (const s of [-1, 1]) {
        const a = c + s * RJ;
        const b = c + s * (RJ + 1);
        out += K.cut(V, uz(K.rect(Math.min(a, b), z0, Math.max(a, b), z1)), { mat: "solid" });
      }
  return part(8, out);
}

// Where the plane B-B meets a gear: its outline radius toward +u and −u, and the silhouette of
// the teeth just beyond the plane (looking toward −v).
export function gearReach(n, th) {
  const rot = n === 1 ? rot1(th) : rot2(th);
  const r = (a) => M.outlineRadius(a - rot);
  let sr = 0;
  let sl = 0;
  for (let i = 0; i <= 90; i++) {
    const a = Math.PI + (Math.PI * i) / 90;
    const x = r(a) * Math.cos(a);
    sr = Math.max(sr, x);
    sl = Math.max(sl, -x);
  }
  return { right: r(0), left: r(Math.PI), sr, sl };
}

// One side (s = ±1) of a gear-shaft, from the front end to the rear end, as (u, z).
function shaftSide(c, s, reach, drive) {
  const pts = [];
  if (drive) {
    pts.push([c + s * 7, Z.shaftEnd], [c + s * 7.5, Z.shaftEnd + 0.5]);
    pts.push([c + s * 7.5, Z.step], [c + s * RJ, Z.step + 0.5]);
  } else pts.push([c + s * 7.5, Z.front + 0.5], [c + s * RJ, Z.front + 1]);
  pts.push([c + s * RJ, Z.g0 - 0.6], [c + s * (RJ + 0.6), Z.g0]);
  pts.push([c + s * reach, Z.g0], [c + s * reach, Z.g1]);
  pts.push([c + s * (RJ + 0.6), Z.g1], [c + s * RJ, Z.g1 + 0.6]);
  pts.push([c + s * RJ, Z.rear - 1], [c + s * 7.5, Z.rear - 0.5]);
  return pts;
}

export function gearShaftB(V, n, th) {
  const c = n === 1 ? C1[0] : C2[0];
  const g = gearReach(n, th);
  const outline = [...shaftSide(c, 1, g.right, n === 1), ...shaftSide(c, -1, g.left, n === 1).reverse()];
  let edges = "";
  if (g.sl - g.left > 0.05) edges += K.line(V, uz([[c - g.sl, Z.g0], [c - g.sl, Z.g1]]));
  if (g.sr - g.right > 0.05) edges += K.line(V, uz([[c + g.sr, Z.g0], [c + g.sr, Z.g1]]));
  return K.body(V, uz(outline)) + edges;
}

export function pitchLinesB(V) {
  const L = [];
  for (const c of [C1[0], C2[0]]) for (const s of [-1, 1]) L.push(uz([[c + s * M.RW, Z.g0 - 1.6], [c + s * M.RW, Z.g1 + 1.6]]));
  return K.lines(V, L, "ctr");
}


// Oil cut by the plane B-B: in the tooth spaces at the outer sides, and between the gears.
export function oilB(th) {
  const g1 = gearReach(1, th);
  const g2 = gearReach(2, th);
  const out = [];
  const add = (u0, u1, a) => {
    if (u1 - u0 > 0.05) out.push({ rect: K.rect(u0, Z.g0, u1, Z.g1), a });
  };
  add(C1[0] - M.BORE_R, C1[0] - g1.left, Math.PI);
  add(C1[0] + g1.right, C2[0] - g2.left, 0);
  add(C2[0] + g2.right, C2[0] + M.BORE_R, 0);
  return out;
}

// Radial lip seal DIN 3760 A 16×28×7: a rubber body with the lip toward the oil, a steel case
// moulded in and a garter spring behind the lip. Its section shows on both sides of the shaft.
const SEAL_RUBBER = [
  [14, -32.2], [14, -25.6], [13.6, -25.2], [12.9, -25.2], [12.9, -29.6], [11.0, -29.6],
  [10.2, -28.6], [10.0, -27.9], [8.0, -27.2], [8.0, -26.7], [10.0, -25.3], [10.8, -25.3],
  [10.8, -25.9], [10.1, -26.2], [10.1, -27.4], [11.6, -28.1], [11.9, -28.1], [11.9, -30.1], [10.4, -30.1], [10.4, -32.2],
];
const SEAL_CASE = [[13.2, -31.8], [13.2, -25.9], [13.6, -25.9], [13.6, -32.0], [10.9, -32.0], [10.9, -31.6], [13.2, -31.6]];
export const SPRING = [11.0, -27.0];
export function sealB(V) {
  let out = "";
  for (const s of [-1, 1]) {
    const m = (pts) => uz(pts.map(([r, z]) => [CU + s * r, z]));
    out += K.cut(V, m(SEAL_RUBBER), { mat: "rubber", angle: 45 });
    out += K.cut(V, m(SEAL_CASE), { mat: "solid" });
    const sx = CU + s * SPRING[0];
    out += K.cut(V, uz(K.circle(sx, SPRING[1], 0.62, 16)), { mat: "solid" }) + `<path class="paper" d="${K.d(V, uz(K.circle(sx, SPRING[1], 0.3, 12)))}"/>`;
  }
  return part(9, out);
}

export function circlipB(V) {
  let out = "";
  for (const s of [-1, 1]) {
    const a = CU + s * 12.1;
    const b = CU + s * (CLIP.groove - 0.1);
    out += K.cut(V, uz(K.rect(Math.min(a, b), CLIP.z0 + 0.1, Math.max(a, b), CLIP.z1 - 0.1)), { mat: "solid" });
  }
  return part(10, out);
}

export function balanceSealB(V) {
  return part(15, BAL.map(([u0, u1]) => K.cut(V, uz(K.rrect(u0 + 0.2, Z.front - 1.5, u1 - 0.2, Z.front, 0.4)), { mat: "rubber", angle: 45 })).join(""));
}

export function oringsB(V) {
  let out = "";
  for (const s of [-1, 1]) {
    const u0 = s < 0 ? -OR.u1 : OR.u0;
    const u1 = s < 0 ? -OR.u0 : OR.u1;
    out += K.cut(V, uz(K.rrect(u0 + 0.15, Z.front - OR.depth + 0.05, u1 - 0.15, Z.front, 0.6)), { mat: "rubber", angle: 135 });
    out += K.cut(V, uz(K.rrect(u0 + 0.15, Z.rear, u1 - 0.15, Z.rear + OR.depth - 0.05, 0.6)), { mat: "rubber", angle: 135 });
  }
  return part(14, out);
}

// Socket head cap screws M8×70 ISO 4762 (12) on washers ISO 7089 (13), cut lengthwise: not hatched.
export function boltsB(V) {
  let screw = "";
  let washer = "";
  for (const s of [-1, 1]) {
    const u = s * BOLT_U;
    const zh = Z.head;
    const head = [[u - 6.5, zh], [u + 6.5, zh], [u + 6.5, zh + 7.4], [u + 5.9, zh + 8], [u - 5.9, zh + 8], [u - 6.5, zh + 7.4]];
    const shank = [[u - 4, zh], [u + 4, zh], [u + 4, Z.boltEnd + 0.6], [u + 3.4, Z.boltEnd], [u - 3.4, Z.boltEnd], [u - 4, Z.boltEnd + 0.6]];
    const thr = Z.boltEnd + 28;
    screw +=
      K.body(V, uz(shank)) +
      K.body(V, uz(head)) +
      K.lines(V, [uz([[u - TAP.r, Z.boltEnd + 0.3], [u - TAP.r, thr]]), uz([[u + TAP.r, Z.boltEnd + 0.3], [u + TAP.r, thr]]), uz([[u - 4, thr], [u + 4, thr]])], "thin") +
      K.line(V, uz([[u - 3.46, zh + 8], [u - 3.46, zh + 4], [u, zh + 2.6], [u + 3.46, zh + 4], [u + 3.46, zh + 8]]), "hid");
    for (const w of [[u - 8, u - 4.2], [u + 4.2, u + 8]]) washer += K.body(V, uz(K.rect(w[0], Z.coverOut, w[1], zh)));
  }
  return part(12, screw) + part(13, washer);
}

export const P_UZ = (u, z) => [u, -z];

// The key turns with the drive shaft (angle psi = π − th in A-A's frame). Where the plane B-B cuts
// it, it shows in section; on the far side of the plane only the part standing above the shaft shows.
export function keyB(V, th) {
  const psi = Math.PI - th;
  const c = Math.cos(psi);
  const s = Math.sin(psi);
  const side = Math.sign(c) || 1;
  let r0;
  let r1;
  if (Math.abs(s) < 0.3) [r0, r1] = [4.5, 9.5];
  else if (s < 0) {
    const e = 9.5 * Math.abs(c) + 2.5 * Math.abs(s);
    if (e <= 7.6) return "";
    [r0, r1] = [7.5, e];
  } else return "";
  const a = CU + side * r0;
  const b = CU + side * r1;
  return K.body(V, uz(K.rect(Math.min(a, b), -58, Math.max(a, b), -42)));
}

// VIEW F, on the shaft end from the front: x' = −u, so a turn th shows anticlockwise.
// Static: the flange's seal bore and chamfer, the seal's face, the circlip and its lugs.
export function shaftEndF(V) {
  const flange = K.line(V, K.circle(0, 0, 14.5, 96), "vis", true) + K.line(V, K.circle(0, 0, 14, 96), "vis", true);
  const seal = K.line(V, K.circle(0, 0, 10.4, 72), "vis", true) + K.line(V, K.circle(0, 0, 8.6, 72), "thin", true);
  // circlip DIN 472: an open ring with two lugs at its ends (gap at the top), each with a hole
  const g = 14; // half-gap, degrees
  const outer = K.arc(0, 0, 14, 90 + g, 450 - g, 64);
  const inner = K.arc(0, 0, 12.1, 450 - g - 9, 90 + g + 9, 60);
  const ring = [...outer, ...K.arc(0, 0, 10.3, 450 - g, 450 - g - 9, 3), ...inner, ...K.arc(0, 0, 10.3, 90 + g + 9, 90 + g, 3)];
  const holes = [90 + g + 6, 90 - g - 6].map((a) => {
    const t = (a * Math.PI) / 180;
    return K.circle(11.9 * Math.cos(t), 11.9 * Math.sin(t), 0.85, 16);
  });
  const clip = `<path class="paper eo" d="${[ring, ...holes].map((p) => K.d(V, p)).join("")}"/><path class="vis" d="${[ring, ...holes].map((p) => K.d(V, p)).join("")}"/>`;
  return part(2, flange) + part(9, `<path class="paper" d="${K.d(V, K.circle(0, 0, 12.1, 72))}"/>` + seal) + part(10, clip);
}

export function shaftF(V) {
  const key = K.body(V, K.rect(6.6, -2.5, 9.5, 2.5));
  const end = K.body(V, K.circle(0, 0, 7.5, 64)) + K.line(V, K.circle(0, 0, 7, 64), "thin", true);
  return part(11, key) + part(4, end);
}

export const keyPointF = (th) => [8.6 * Math.cos(th) - 0.8 * Math.sin(th), 8.6 * Math.sin(th) + 0.8 * Math.cos(th)];
export const KEY_BALLOON = [760, 330];
