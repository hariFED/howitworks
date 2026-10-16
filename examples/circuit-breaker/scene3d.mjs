// The circuit breaker's solids for its 3D view (circuit-breaker-3d.html), in the same world mm as
// parts.mjs: u is x (back of the case on the DIN rail → front), v is y (up from the load end), and
// the sheet's cutting plane, the case's centre plane, is z = 0. Pure data built with kit/solid3d.mjs.
//
// What is cut and what is whole:
//   cut   - the two housing halves (the joint is the centre plane, so the case is the cut part), the
//           terminal cages and the solenoid (yoke, former, coil): their cut faces are hatched as on
//           the sheet, and they open to show the screws, the plunger and the striker inside;
//   whole - the mechanism (WHOLE below): live3d.js gives those materials their own cut switch, held
//           off, so the arm, the latch, the handle, the bimetal and the plates read as 3D parts.
// Widths across the module (z) are the parts list's: strips 6 wide, tips 4, bimetal 6, handle 9.
// Moving parts are built at their rest pose (closed at ON: handle angle 0 for the handle itself,
// cradle and arm at 0, lever 0, plunger 0, bimetal cold) and live3d.js poses them from the model.
// The sheet draws some outlines inside its part functions; those polygons are retyped here from
// parts.mjs (same numbers), everything exported there is imported.

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as X from "./extra.mjs";
import * as P from "./parts.mjs";

const VC = P.VC;
const MP = P.MP;
const H = P.H;
const T = P.T;

export const HALF = P.MOD / 2; // the case's outer faces, z = ±8.75
export const WALL = HALF - 1.5; // the side walls' inner faces
export const JOINT = 0.5; // the back half's rim stands this far proud of the plane, so the plane cuts it
export const LIFT = 104; // the mechanism lifts out of the case by this much
export const DZB = 16; // the back half goes back
export const DZF = 62; // the front half comes forward
const up = [0, LIFT, 0];

// ---------------------------------------------------------------- outlines (parts.mjs numbers)

// the housing's walls cut on the centre plane, as housing() draws them
const CASE_WALLS = [
  [[0, 27.5], [0, 62.6], [-1.1, 62.6], [-1.1, 60.8], [-1.8, 60.8], [-1.8, 65.5], [0, 65.5], [0, 89], [1, 90], [39.6, 90], [39.6, 88], [2, 88], [2, 29.5], [5, 29.5], [5, 2], [39.6, 2], [39.6, 0], [4, 0], [3, 1], [3, 27.5]],
  [[46.8, 90], [59, 90], [60, 89], [60, 83], [58, 83], [58, 88], [46.8, 88]],
  [[58, 77], [60, 77], [60, 67.5], [69, 67.5], [70, 66.5], [70, 54.5], [68, 54.5], [68, 65.5], [58, 65.5]],
  [[68, 35.5], [70, 35.5], [70, 23.5], [69, 22.5], [60, 22.5], [60, 13], [58, 13], [58, 24.5], [68, 24.5]],
  [[58, 7], [60, 7], [60, 1], [59, 0], [46.8, 0], [46.8, 2], [58, 2]],
];
// the side wall: the case's outline in View E's depth, over the clip's channel at the back
const CASE_OUTLINE = [
  [1, 0], [59, 0], [60, 1], [60, 22.5], [69, 22.5], [70, 23.5], [70, 66.5], [69, 67.5], [60, 67.5], [60, 89], [59, 90], [1, 90], [0, 89],
  [0, 65.5], [-1.8, 65.5], [-1.8, 60.8], [-1.1, 60.8], [-1.1, 62.6], [0, 62.6], [0, 1],
];
const CLIP = [[0.3, -3], [2.7, -3], [2.7, 25.5], [0.3, 27.4], [-1.1, 27.4], [-1.1, 29.2], [-1.8, 29.2], [-1.8, 25.5], [0.3, 25.5]];
const LINE_STRIP = [
  [46.2, 86.5], [46.2, 73.6], ...K.arc(44.6, 73.6, 1.6, 0, -90, 3).slice(1), [3.2, 72], [3.2, 67.4], [4.8, 67.4], [4.8, 70.4],
  [44.6, 70.4], ...K.arc(44.6, 73.6, 3.2, -90, 0, 4).slice(1), [47.8, 86.5],
];
const RUNNER = [[3.2, 45], [12.6, 45], [13.8, 46.2], [13.8, 58], [12.6, 58], [12.6, 46.6], [3.2, 46.6]];
const LEAD_STRIP = [[19.7, 28], [21.3, 28], [21.3, 6], [36, 6], [36, 4.4], [20.7, 4.4], [19.7, 5.4]];
const LOAD_STRIP = [
  [46.2, 3.5], [46.2, 15.4], ...K.arc(44.6, 15.4, 1.6, 0, 90, 3).slice(1), [35.5, 17], [35.5, 18.6], [44.6, 18.6],
  ...K.arc(44.6, 15.4, 3.2, 90, 0, 4).slice(1), [47.8, 3.5],
];
const LEVER = [
  [26.5, 53], [29.5, 53], [29.5, 32], ...K.arc(T[0], T[1], 2.5, 53.13, 0, 6), [30.6, 30], [30.6, 22.8], [26.5, 22.8], [26.5, 28],
  ...K.arc(T[0], T[1], 2.5, 233.13, 126.87, 8), [26.5, 32],
];
const HOOK = [31.6, 56.7];
const TAIL = [30.3, 52];
const BLADE = [[5.6, -3.2], [14.5, -3.2], [14.5, -3.9], [16, -3.9], [16, -3.4], [17.5, -3.4], [17.5, -3.9], [19, -3.9], [19, -3.4], [20.5, -3.4], [20.5, -3.9], [26.4, -3.9], [27.6, -2.8], [27.6, 2.8], [26.4, 3.9], [20.5, 3.9], [20.5, 3.4], [19, 3.4], [19, 3.9], [17.5, 3.9], [17.5, 3.4], [16, 3.4], [16, 3.9], [14.5, 3.9], [14.5, 3.2], [5.6, 3.2]];
function hubArc() {
  const out = [];
  for (let t = 29.5; t <= 330.5; t += 4) {
    const r = 6.5 + 1.9 * Math.exp(-(((t - 200) / 13) ** 2));
    out.push([r * Math.cos((t * Math.PI) / 180), r * Math.sin((t * Math.PI) / 180)]);
  }
  return out;
}
const HANDLE = [...BLADE, ...hubArc()].map(([x, y]) => [H[0] + x, H[1] + y]); // at handle angle 0

// The union of convex outlines that all contain c (a lever made of hulls round one pivot): it is
// star-shaped from c, so its edge is, ray by ray, the farthest of the outlines' edges.
function rayExit(poly, [cx, cy], dx, dy) {
  let best = 0;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    const ex = bx - ax;
    const ey = by - ay;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const wx = ax - cx;
    const wy = ay - cy;
    const t = (wx * ey - wy * ex) / den;
    const s = (wx * dy - wy * dx) / den;
    if (s >= -1e-9 && s <= 1 + 1e-9 && t > best) best = t;
  }
  return best;
}
export function starUnion(c, polys, n = 144) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI;
    const t = Math.max(...polys.map((p) => rayExit(p, c, Math.cos(a), Math.sin(a))));
    return [c[0] + t * Math.cos(a), c[1] + t * Math.sin(a)];
  });
}

const zx = (shape, from, to, o = {}) => S.extrude(shape, { along: "z", from, to, ...o });
const zcyl = (at, r, from, to, o = {}) => S.cylinder({ axis: "z", at, r, from, to, ...o });

// one layer of the bimetal at tip deflection f, as the sheet's biLayer (P.biShift is its bend)
export function biLayer(u0, u1, f) {
  const left = [];
  const right = [];
  for (let v = 6; v <= P.BI_TIP + 1e-6; v += 1) {
    const s = P.biShift(v, f);
    left.push([u0 + s, v]);
    right.push([u1 + s, v]);
  }
  return [...left, ...right.reverse()];
}
const BI = M.BI_S / 2;
export const BI_LAYERS = [[P.BI_BACK, P.BI_BACK + BI - 0.04], [P.BI_BACK + BI + 0.04, P.BI_BACK + 2 * BI]];

// the braids, as the sheet's braids(): arm → runner, bimetal tip → load strip
export function braid1Line(a) {
  const p = X.rotPt(P.BRAID1_ARM, MP, a);
  return X.quad(p, [17, 54 + 0.3 * (p[1] - 62)], [13.2, 47.4], 14);
}
export function braid2Line(f) {
  const tip = P.biTip(f);
  return X.quad([tip[0] - 0.2, tip[1]], [36.5, 25], [36.4, 18.4], 12);
}
export const BRAID_W = 2; // half width across the module (4 mm² braid)

// tension springs: built along +x from the origin at their rest length, posed by live3d.js
export const ARM_L0 = Math.hypot(P.SPRING_POST_ARM[0] - P.LUG_HOLE[0], P.SPRING_POST_ARM[1] - P.LUG_HOLE[1]);
export const HANDLE_L0 = Math.hypot(P.SPRING_POST_HANDLE[0] - P.handleLug(M.HANDLE_ON)[0], P.SPRING_POST_HANDLE[1] - P.handleLug(M.HANDLE_ON)[1]);
export const LINK_Z = 5.3; // the coupling link runs in front of the handle

// a placeholder for a solid live3d.js rebuilds every frame (the current's dashes, the arc)
const live = (name, c) => S.box([c[0] - 0.1, c[1] - 0.1, c[2] - 0.1], [c[0] + 0.1, c[1] + 0.1, c[2] + 0.1], { role: "ink", live: name });

// ---------------------------------------------------------------- parts

export function parts() {
  const back = { explode: [0, 0, -DZB] };
  const front = { explode: [0, 0, DZF], front: true };
  const half = (o, z0, z1, zs0, zs1, b0, b1) => [
    zx(CASE_OUTLINE, zs0, zs1, o),
    ...CASE_WALLS.map((w) => zx(w, z0, z1, o)),
    ...[T, P.SPRING_POST_ARM, P.SPRING_POST_HANDLE].map((c) => zcyl(c, 1, z0, z1, o)),
    S.tube({ axis: "z", at: H, r0: 1.55, r1: 8.6, from: b0, to: b1, ...o }),
  ];
  const plate = (v0) =>
    S.extrude([[3.2, -6], [11, -6], [11, -3.2], [8.2, -0.4], [8, 0], [8.2, 0.4], [11, 3.2], [11, 6], [3.2, 6]], { along: "y", from: v0, to: v0 + 0.8 });
  const cage = (vs) => [
    S.box([39, vs - 6, -6], [40.2, vs + 6, 6]),
    S.box([40.2, vs - 6, -6], [52.8, vs + 6, -4.8]),
    S.box([40.2, vs - 6, 4.8], [52.8, vs + 6, 6]),
    S.extrude(K.rect(-6, vs - 6, 6, vs + 6), { along: "x", from: 52.8, to: 54, holes: [S.circle(0, vs, 2.55, 48)] }),
  ];
  const screw = (vs) => [
    S.lathe([[0, 47.8], [2.1, 47.8], [2.5, 48.2], [2.5, 54], [4.2, 54], [4.75, 55], [4.75, 57], [4.2, 57.5], [0, 57.5]], { axis: "x", at: [vs, 0] }),
    S.disc([57.52, vs, 0], 1.6, { normal: "x", role: "mouth" }),
  ];
  const PL = P.plungerSpringDot(0, 0);
  const cradle = starUnion(MP, [X.hullCircles([[...MP, 3.6], [...M.B0, 1.9]]), X.hullCircles([[...MP, 3.6], [...P.P0, 1.7]])]);
  const cradleHoles = [S.circle(...MP, 1.05, 32), S.circle(...M.B0, 0.66, 20), S.circle(...P.P0, 0.66, 20)];
  const pawl = starUnion(P.P0, [X.hullCircles([[...P.P0, 1.3], [...HOOK, 0.9]]), X.hullCircles([[...P.P0, 1.3], [...TAIL, 0.8]])]);
  const crank = M.crankPin(0);
  return [
    S.part(1, "HOUSING HALF", [
      ...half(back, -WALL, JOINT, -HALF, -WALL, -WALL, -4.6),
      ...half(front, JOINT, WALL, WALL, HALF, 6, WALL),
    ], { mat: "plastic", angle: 45, anchor: { cut: [1, 76, 0], out: { c: [20, 90, -4] }, solid: 1 } }),
    S.part(2, "DIN RAIL CLIP", [zx(CLIP, -4, 4, { holes: [K.rrect(0.9, 4, 2.1, 20, 0.6)] })], {
      mat: "plastic", angle: 135, explode: [4, -52, -DZB], anchor: { cut: [1.5, 23, 4] },
    }),
    S.part(3, "TERMINAL CAGE 12×14", [...cage(80), ...cage(10)], { mat: "steel", angle: 135, explode: up, anchor: { cut: [39.6, 84, 0] } }),
    S.part(4, "SCREW M5×12", [...screw(80), ...screw(10)], { explode: up, anchor: { cut: [56, 83.3, 3.3] } }),
    S.part(5, "LINE STRIP 6×1.6, UPPER RUNNER", [zx(LINE_STRIP, -3, 3), live("flow", [30, 71.2, 0])], { mat: "bronze", angle: 45, explode: up, anchor: { cut: [30, 71.2, 3] } }),
    S.part(6, "FIXED CONTACT TIP", [zx(P.FIXED_TIP, -2, 2), live("flow", [16.5, 69.8, 0])], { mat: "brass", angle: 135, explode: up, anchor: { cut: [17.8, 69.8, 2] } }),
    S.part(7, "LOWER ARC RUNNER", [zx(RUNNER, -3, 3), live("flow", [13.2, 50, 0])], { mat: "bronze", angle: 135, explode: up, anchor: { cut: [13.2, 54, 3] } }),
    S.part(8, "SPLITTER PLATE 0.8, V-NOTCH", P.PLATE_V.map(plate), { mat: "steel", angle: 45, explode: up, anchor: { cut: [5, P.PLATE_V[6] + 0.4, 6] } }),
    S.part(9, "COIL LEAD STRIP", [zx(LEAD_STRIP, -3, 3), live("flow", [20.5, 15, 0])], { mat: "bronze", angle: 45, explode: up, anchor: { cut: [20.5, 15, 3] } }),
    // the arm: hub, bar, contact block, spring lug and the latch lug, a tab bent back to the pawl
    S.part(10, "MOVING CONTACT ARM", [
      S.tube({ axis: "z", at: MP, r0: 1.05, r1: 3.3, from: -2.4, to: 2.4 }),
      zx(X.hullCircles([[19.2, 66.6, 1.4], [...MP, 3.2]]), -1.5, 1.5),
      S.box([13.8, 65.4, -2.5], [20.2, 68, 2.5]),
      zx(X.hullCircles([[...MP, 3.2], [...P.LUG_HOLE, 1.5]]), -0.8, 0.8, { holes: [S.circle(...P.LUG_HOLE, 0.6, 16)] }),
      zx(K.rrect(30.6, 57.6, 33, 61, 0.4), -4.4, 0.5),
      live("flow", [22, 64, 0]),
    ], { mat: "bronze", angle: 135, pivot: [...MP, 0], explode: up, anchor: { cut: [22, 64.5, 1.5] } }),
    S.part(11, "MOVING CONTACT TIP", [zx(P.MOVING_TIP, -2, 2)], { mat: "brass", angle: 45, pivot: [...MP, 0], explode: up, anchor: { cut: [17.6, 68.6, 2] } }),
    S.part(12, "MAIN PIVOT PIN Ø2×12", [zcyl(MP, 1, -6, 6)], { explode: up, anchor: { cut: [MP[0], MP[1] + 0.4, 6] } }),
    S.part(13, "CRADLE, 2 PLATES", [
      zx(cradle, -5.4, -4.4, { holes: cradleHoles }),
      zx(cradle, -3.4, -2.4, { holes: cradleHoles }),
      zcyl(P.P0, 0.6, -5.6, -2.2),
    ], { mat: "steel", angle: 135, pivot: [...MP, 0], explode: up, anchor: { cut: [40.5, 52.6, -2.4] } }),
    S.part(14, "LATCH PAWL", [zx(pawl, -4.4, -3.4, { holes: [S.circle(...P.P0, 0.66, 20)] })], {
      mat: "steel", angle: 45, pivot: [...P.P0, 0], explode: up, anchor: { cut: [32.2, 55.2, -3.4] },
    }),
    S.part(15, "TRIP LEVER", [zx(LEVER, -2, 2, { holes: [S.circle(...T, 1.05, 32)] })], { mat: "plastic", angle: 135, pivot: [...T, 0], explode: up, anchor: { cut: [28, 44, 2] } }),
    // the coupling link in its own frame: from the crank pin (origin) along +x to the cradle pin
    S.part(16, "COUPLING LINK Ø1.2", [
      S.cylinder({ axis: "x", at: [0, LINK_Z], r: 0.6, from: 0, to: M.LINK }),
      zcyl([0, 0], 0.6, -4.5, LINK_Z + 0.6),
      zcyl([M.LINK, 0], 0.6, -5.6, LINK_Z + 0.6),
    ], { hatch: "none", explode: up, anchor: { cut: [M.LINK * 0.55, 0, LINK_Z + 0.6] } }),
    S.part(17, "TOGGLE HANDLE", [zx(HANDLE, -4.5, 4.5, { holes: [S.circle(...H, 1.55, 40), S.circle(...crank, 0.75, 20)] })], {
      mat: "plastic", angle: 60, pivot: [...H, 0], explode: up, anchor: { cut: [H[0] + 22, H[1] - 3.6, 4.5] },
    }),
    S.part(18, "HANDLE PIN Ø3×14", [zcyl(H, 1.5, -7, 7)], { explode: up, anchor: { cut: [H[0] + 0.6, H[1] + 0.6, 7] } }),
    S.part(19, "HANDLE SPRING", [S.helix({ axis: "x", at: [0, 0], from: 0, to: HANDLE_L0, radius: P.HANDLE_SPRING.radius, wire: P.HANDLE_SPRING.wire, turns: P.HANDLE_SPRING.turns + 3, pivot: [0, 0, 0], live: "coil" })], {
      hatch: "solid", explode: up, anchor: { cut: [HANDLE_L0 * 0.55, P.HANDLE_SPRING.radius, 0.3], solid: 0 },
    }),
    S.part(20, "ARM SPRING", [S.helix({ axis: "x", at: [0, 0], from: 0, to: ARM_L0, radius: P.ARM_SPRING.radius, wire: P.ARM_SPRING.wire, turns: P.ARM_SPRING.turns, pivot: [0, 0, 0], live: "coil" })], {
      hatch: "solid", explode: up, anchor: { cut: [ARM_L0 * 0.5, P.ARM_SPRING.radius, 0.3], solid: 0 },
    }),
    // ---- the solenoid, cut on its axis: coil on its former inside the yoke, the plunger and striker whole
    S.part(21, "SOLENOID COIL, 7 TURNS Ø1.8", [
      S.helix({ axis: "x", at: [VC, 0], from: 7.02, to: 21.48, radius: 4.7, wire: 1.8, turns: 7 }),
      S.cylinder({ axis: "y", at: [7.9, 0], r: 0.85, from: VC + 4.7, to: 45 }),
      S.cylinder({ axis: "y", at: [20.4, 0], r: 0.85, from: 28, to: VC - 4.7 }),
    ], { hatch: "solid", explode: up, anchor: { cut: [12.9, VC + 4.7, 0] } }),
    S.part(22, "COIL FORMER", [S.lathe([[3.2, 6.2], [6, 6.2], [6, 7], [3.8, 7], [3.8, 21.5], [6, 21.5], [6, 22.3], [3.2, 22.3]], { axis: "x", at: [VC, 0] })], {
      mat: "plastic", angle: 135, explode: up, anchor: { cut: [6.6, VC + 5, 0] },
    }),
    S.part(23, "MAGNET YOKE WITH CORE", [
      S.box([4.5, VC - 8, -4.5], [6, VC + 8, 4.5]),
      S.box([6, VC - 8, -4.5], [22.5, VC - 6.5, 4.5]),
      S.box([6, VC + 6.5, -4.5], [22.5, VC + 8, -1.2]),
      S.box([6, VC + 6.5, 1.2], [22.5, VC + 8, 4.5]),
      S.extrude(K.rect(-4.5, VC - 8, 4.5, VC + 8), { along: "x", from: 22.5, to: 24, holes: [S.circle(0, VC, 1.02, 32)] }),
      S.lathe([[1.8, 18], [3, 18], [3, 22.5], [1.02, 22.5], [1.02, 20], [1.8, 20]], { axis: "x", at: [VC, 0] }),
    ], { mat: "steel", angle: 45, explode: up, anchor: { cut: [5.2, VC, 0] } }),
    S.part(24, "PLUNGER Ø6×6.5", [S.lathe([[0, 8.5], [2.6, 8.5], [3, 8.9], [3, 14.6], [2.6, 15], [0, 15]], { axis: "x", at: [VC, 0] })], {
      explode: up, anchor: { cut: [11, VC + 2.1, 2.1] },
    }),
    S.part(25, "STRIKER PIN Ø1.6", [S.lathe([[0, 14], [0.8, 14], [0.8, P.strikerTip(0) - 0.3], [0.5, P.strikerTip(0)], [0, P.strikerTip(0)]], { axis: "x", at: [VC, 0] })], {
      explode: up, anchor: { cut: [P.strikerTip(0) - 1.6, VC + 0.55, 0.55] },
    }),
    S.part(26, "PLUNGER SPRING", [S.helix({ axis: "x", at: [VC, 0], from: 15, to: 20, radius: 1.3, wire: 0.35, turns: 4, pivot: [20, VC, 0], live: "coil" })], {
      hatch: "solid", explode: up, anchor: { cut: [PL[0], VC + 1.0, 0.8] },
    }),
    S.part(27, "FLEXIBLE BRAID 4 mm²", [
      zx(X.band(braid1Line(0), 1.6), -BRAID_W, BRAID_W, { live: "b1" }),
      zx(X.band(braid2Line(0), 1.6), -BRAID_W, BRAID_W, { live: "b2" }),
      live("flow", [36, 22, 0]),
    ], { mat: "rubber", angle: 45, explode: up, anchor: { cut: [...braid2Line(0)[6], BRAID_W] } }),
    S.part(28, "BIMETAL 26×6×0.6", [
      zx(biLayer(...BI_LAYERS[0], 0), -3, 3, { live: "la" }),
      zx(biLayer(...BI_LAYERS[1], 0), -3, 3, { live: "lb" }),
      zx([[P.BI_BACK, 6], [35, 6], [35, 6.6], [P.BI_BACK + 2 * BI, 6.6], [P.BI_BACK + 2 * BI, 7], [P.BI_BACK, 7]], -3, 3),
      S.lathe([[0, 3.9], [0.75, 3.9], [0.75, 4.4], [0.4, 4.4], [0.4, 6.6], [0.8, 6.6], [0.8, 7.2], [0, 7.2]], { axis: "y", at: [33.8, 0], hatch: "none" }),
      live("flow", [31.6, 15, 0]),
    ], { hatch: "solid", explode: up, anchor: { cut: [P.BI_BACK + 2 * BI, 16, 1.5] } }),
    S.part(29, "LOAD STRIP 6×1.6", [zx(LOAD_STRIP, -3, 3), live("flow", [42, 17.8, 0])], { mat: "bronze", angle: 45, explode: up, anchor: { cut: [41, 17.8, 3] } }),
    S.part(30, "SET SCREW M2×4", [
      S.lathe([[0, 27], [1, 27], [1, 30.8], [0.8, 31], [0, 31]], { axis: "x", at: [P.LEVER_SCREW_V, 0] }),
    ], { pivot: [...T, 0], explode: up, anchor: { cut: [30.3, P.LEVER_SCREW_V + 0.7, 0.7] } }),
    // the arc: no balloon, rebuilt by live3d.js while it burns
    S.part(31, "ARC", [live("arc", [12, 60, 0])], { hatch: "none", explode: up }),
  ];
}

// the mechanism: drawn whole, never cut (live3d.js); the arc too
export const WHOLE = [2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 24, 25, 26, 27, 28, 29, 30, 31];
// the conductors that carry the current, in series: the accent glows on them
export const CONDUCTORS = [5, 6, 10, 11, 27, 7, 21, 9, 28, 29];

// The current's centre line on each conductor, on its front face (z), in the part's rest frame.
// The same points as the sheet's currentPath(); the braids and bimetal move, so they take the pose.
const arc3 = (cx, cy, r, a0, a1, n) => K.arc(cx, cy, r, a0, a1, n).slice(1);
export function flowLines(S) {
  const tip = P.biTip(S.f);
  const bim = [];
  for (let v = 6.4; v <= P.BI_TIP - 0.6 + 1e-6; v += 1) bim.push([P.BI_BACK + BI + P.biShift(v, S.f), v]);
  return {
    5: [{ z: 3.05, pts: [[47, 86], [47, 73.6], ...arc3(44.6, 73.6, 2.4, 0, -90, 3), [16.5, 71.2]] }],
    6: [{ z: 2.05, pts: [[16.5, 70.4], [16.5, 69.2]] }],
    10: [{ z: 1.55, pts: [[20.3, 64.95], [24.5, 62.2]] }],
    27: [{ z: BRAID_W + 0.05, pts: braid1Line(S.a), group: "arm" }, { z: BRAID_W + 0.05, pts: [[tip[0] - 0.2, tip[1]], ...braid2Line(S.f).slice(1)], group: "low" }],
    7: [{ z: 3.05, pts: [[13.2, 47.4], [13.2, 45.8], [8.6, 45.8]] }],
    9: [{ z: 3.05, pts: [[20.5, 27.8], [20.5, 5.2], [31.2, 5.2]] }],
    28: [{ z: 3.05, pts: bim, w: 0.45 }],
    29: [{ z: 3.05, pts: [[36.4, 17.8], [44.6, 17.8], ...arc3(44.6, 15.4, 2.4, 90, 0, 3), [47, 4]] }],
  };
}

// centre lines: the solenoid's axis and the terminal screws', riding with their parts
export const centres = () => [
  { line: [[2, VC, 0], [27.5, VC, 0]], part: 23 },
  { line: [[36.5, 80, 0], [59.5, 80, 0]], part: 4 },
  { line: [[36.5, 10, 0], [59.5, 10, 0]], part: 4 },
];

export const scene = () => ({ parts: parts(), fluids: [], centres: centres() });
