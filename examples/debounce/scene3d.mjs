// The door closer's solids for its 3D view (debounce-3d.html), in the same world mm as SECTION A-A
// of the sheet: x = u (the cylinder axis, +x toward the valve end and the hinge), y = v (+y away
// from the door face), z = the height (+z up), so the sheet's plan section is the plane z = 0 and
// the cut removes the upper half of the body. Pure data built with kit/solid3d.mjs from model.mjs
// and parts.mjs (and extra.mjs's involute pinion and rack, the sheet's own outlines).
//
// Everything is built in the body's frame with the door shut (θ = 0): there the body frame is the
// world frame, with the hinge at HINGE. live3d.js turns the door, the body and every part riding
// on it about the hinge axis by −θ, moves the piston, turns the pinion and the arm by φ, and swings
// the forearm about its shoe on the (fixed) frame head.
//
// The arm, forearm, shoe, arm screw, elbow rivet, the frame head and the spindle's top square sit
// above the cut plane: live3d.js draws them uncut, so the linkage stays in place over the section
// (a cutaway of the body alone, as the sheet's PLAN E is drawn with the head removed).
//
// The few profile numbers parts.mjs keeps private are retyped here with the same values, next to
// the function they come from.

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";
import * as X from "./extra.mjs";

const rad = Math.PI / 180;
// parts.mjs private numbers (wall(), RACK_*, needleScrew(), SECTION B-B)
const GAL = 1.25;
const STEM_BORE = 1.75;
const THREAD = 2.5;
const PR = M.PORT_D / 2;
export const RACK_VP = M.R_P + M.SHIFT * M.MODULE;
export const RACK_ROOT = RACK_VP + 1.25 * M.MODULE;
const BRG = { r: 11, cup: 0.6, w0: 20.6, w1: 30.6, seal: 33.6 };
const B = P.BODY; // u0 -175, u1 80, v 32, w 34
const D = P.DRILL_V; // 26
const W = P.WIN;
const C = P.CHECK;
const FIT = 0.05; // running and thread clearance: never a shared curved face

// ---------------------------------------------------------------- the door and the frame (world, θ = 0)
export const HINGE = [M.SPINDLE_A, -M.SPINDLE_S, 0];
export const planToWorld = ([px, py]) => [px + HINGE[0], py + HINGE[1]];
export const DOOR_TOP = B.w; // the leaf's top edge, flush with the body
export const DOOR_BOT = -120; // the slice of leaf shown
export const DOOR_A = 430; // and its width from the hinge
const ARM_Z = [37, 45]; // main arm, pressed 8 thick, on the spindle square
const FORE_Z = [45, 51]; // forearm above it
const HEAD_Z = [37.5, 66]; // frame head, over the door's top edge
export const S0 = [0, 0];
export const E0 = planToWorld(M.link(0).E);
export const SHOE_W = planToWorld(M.SHOE);

// an outline without repeated points (X.gear repeats each root arc's end), for the triangulation
const dedupe = (pts) => pts.filter((p, i) => {
  const q = pts[(i + pts.length - 1) % pts.length];
  return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6;
});
// a bar of width w between two points with round ends, as an outline (X.bar)
const bar = (a, b, w) => X.bar(a, b, w, 10);

// ---------------------------------------------------------------- profiles
// parts.mjs plugLoop(): [r, u] half-profiles of the threaded end plugs, with the fits
function plugLoop(inner, dir) {
  const s = (d) => inner + dir * d;
  const len = dir > 0 ? 13 : 15;
  const spig = dir > 0 ? 4 : 6;
  const g0 = dir > 0 ? 1 : 1.6;
  const R0 = M.R_BORE - FIT;
  const R1 = 21 - FIT;
  return [[0, s(0)], [R0, s(0)], [R0, s(g0)], [18.4, s(g0)], [18.4, s(g0 + 2.4)], [R0, s(g0 + 2.4)], [R0, s(spig)], [R1, s(spig)], [R1, s(len)], [5.8, s(len)], [5.8, s(len - 5)], [0, s(len - 5)]];
}
// parts.mjs needleScrew(): the regulating screw as a [r, u] half-profile, backed off `lift`
export function needleLoop(seat, lift) {
  const a = M.NEEDLE_HALF * rad;
  const N = P.NEEDLE;
  const apex = seat - GAL / Math.tan(a) + lift;
  const tip = apex + N.tipR / Math.tan(a);
  const cone = apex + N.coneR / Math.tan(a);
  const e = 80.5 + lift;
  const T = THREAD - FIT;
  const prof = [
    [tip, N.tipR], [cone, N.coneR], [cone + 0.3, N.neckR], [cone + N.neck - 0.3, N.neckR], [cone + N.neck, N.stemR],
    [66.5, N.stemR], [66.5, 1.15], [68.5, 1.15], [68.5, N.stemR], [70.2, N.stemR], [70.6, T],
    [e - 0.3, T], [e, T - 0.3], [e, 0.4], [e - 1.2, 0.4],
  ];
  return [[0, tip], ...prof.map(([u, r]) => [r, u]), [0, e - 1.2]];
}
// a circular segment of the bore (radius r) beyond the line y = y0, as an x-extrude outline (z, y)
function segment(r, y0, side, n = 24) {
  const a0 = Math.asin(Math.abs(y0) / r);
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((Math.PI - 2 * a0) * i) / n;
    out.push([r * Math.cos(a), side * r * Math.sin(a)]);
  }
  return out;
}
// the body in pieces along x: each an extrusion of the section B-B outline with its bores as holes
function bodyPiece(x0, x1, bore, up, down) {
  const holes = [S.circle(0, 0, bore, 96)];
  if (up) holes.push(S.circle(0, D, up, 24));
  if (down) holes.push(S.circle(0, -D, down, 24));
  return S.extrude(S.rrectAt(0, 0, B.w, B.v, 1.5), { along: "x", from: x0, to: x1, holes });
}

// helix: the closing spring, built at x = 0 (door shut); live3d.js scales it about the plug face
export const SPRING = { from: M.PLUG_L, to: M.HEAD_L, radius: M.COIL_D / 2, wire: M.WIRE, turns: M.COILS };
// where the wire crosses the cut plane on −y (an anchor): helix angle π/2 + kπ
const springCut = (k) => {
  const t = (0.25 + k / 2) / SPRING.turns;
  return [SPRING.from + SPRING.wire / 2 + t * (SPRING.to - SPRING.from - SPRING.wire), k % 2 ? SPRING.radius : -SPRING.radius, 0];
};

// ---------------------------------------------------------------- explosion, in the body frame
// (live3d.js turns the in-plane vectors with the door); the pinion and the arm go up their spindle
export const JOG = 100; // the piston and the spring come out of the bore up a parallel line
export const EXPLODE = {
  2: [-62, 0, 0], 3: [62, 0, 0], 14: [-34, 0, 0], 11: [96, 0, 0], 12: [96, 0, 0],
  5: [0, JOG, 0], 6: [36, JOG, 0], 9: [62, JOG, 0], 10: [0, JOG, 26], 7: [-46, JOG, 0],
  8: [0, 0, 120], 16: [0, 0, 190], 19: [0, 0, 250], 20: [0, 0, 80], 22: [0, 0, -90], 23: [0, 0, -130],
};

export function parts() {
  const u0 = B.u0;
  const u1 = B.u1;
  const H = M.HEAD_L;
  const F = M.FACE_R;
  const R = M.R_BORE - FIT; // turned diameters in the Ø40 bore
  const ex = (id) => EXPLODE[id] ?? null;
  const out = [];

  // 1 BODY: six pieces along the axis (thread counterbores, bore, galleries, needle bores, screw
  // threads) and the drillings across them as bores: the two ports and the two slanted feeds
  const port = (u, side) => S.bore(S.lathe(side > 0 ? [[0, 20], [PR, 20], [PR, 24.6], [0, 24.6]] : [[0, -24.6], [PR, -24.6], [PR, -20], [0, -20]], { axis: "y", at: [u, 0] }));
  const slant = (side) => S.bore(S.extrude([[-159, 20], [-156.5, 20], [-146.5, D - GAL], [-149, D - GAL]].map(([x, y]) => [x, side * y]), { along: "z", from: -GAL, to: GAL }));
  out.push(
    S.part(1, "BODY, BORE Ø40", [
      bodyPiece(u0, -166, 21, GAL, GAL),
      bodyPiece(-166, M.SWEEP_SEAT, M.R_BORE, GAL, GAL),
      bodyPiece(M.SWEEP_SEAT, M.LATCH_SEAT, M.R_BORE, GAL, STEM_BORE),
      bodyPiece(M.LATCH_SEAT, 70, M.R_BORE, STEM_BORE, STEM_BORE),
      bodyPiece(70, 71, M.R_BORE, THREAD, THREAD),
      bodyPiece(71, u1, 21, THREAD, THREAD),
      port(M.LATCH_U, 1),
      port(M.SWEEP_U, -1),
      slant(1),
      slant(-1),
    ], { mat: "alu", angle: 45, anchor: { cut: [-100, 29.4, 0], out: { c: [-100, B.v, -17] } } }),
  );

  // 2, 3 END PLUGS and 4 their O-RINGS
  out.push(
    S.part(2, "END PLUG M42×1.5, SPRING SIDE", [S.lathe(plugLoop(M.PLUG_L, -1), { axis: "x" })], {
      mat: "steel", angle: 135, explode: ex(2), anchor: { cut: [-171, 12, 0], out: { c: [-171, 12, 0], r: 21, axis: "x" } },
    }),
    S.part(3, "END PLUG M42×1.5, VALVE SIDE", [S.lathe(plugLoop(M.PLUG_R, 1), { axis: "x" })], {
      mat: "steel", angle: 135, explode: ex(3), anchor: { cut: [76, 12, 0], out: { c: [76, 12, 0], r: 21, axis: "x" } },
    }),
    S.part(4, "O-RING 37×2", [
      S.lathe(K.rrect(18.45, M.PLUG_L - 3.95, R, M.PLUG_L - 1.75, 0.7), { axis: "x", explode: [-44, 0, 0] }),
      S.lathe(K.rrect(18.45, M.PLUG_R + 1.15, R, M.PLUG_R + 3.25, 0.7), { axis: "x", explode: [44, 0, 0] }),
    ], { mat: "rubber", anchor: { cut: [M.PLUG_L - 2.85, -19.2, 0], out: { c: [M.PLUG_L - 2.85, 0, 0], r: R, axis: "x" }, solid: 0 } }),
  );

  // 5 PISTON WITH RACK: the spring-side head with its two oil drillings, the window's two caps and
  // the rack teeth across it (the sheet's rackEdge), and the tail with the check valve's bore
  // the rack's teeth, each a closed trapezoid (the sheet's rackEdge, split at the root line)
  const edge = X.rackEdge(W.l, W.r, RACK_VP, M.MODULE).slice(1, -1);
  const teeth = [];
  for (let i = 0; i + 3 < edge.length; i += 4) teeth.push(edge.slice(i, i + 4));
  const zr = Math.sqrt(R * R - RACK_ROOT * RACK_ROOT) - 0.05;
  out.push(
    S.part(5, "PISTON WITH RACK m2.5", [
      S.lathe([[0, H], [R - 0.8, H], [R, H + 0.8], [R, W.l], [0, W.l]], { axis: "x" }),
      S.bore(S.lathe([[0, H], [2.5, H], [2.5, W.l], [0, W.l]], { axis: "x", at: [7, 0] })),
      S.bore(S.lathe([[0, H], [2.5, H], [2.5, W.l], [0, W.l]], { axis: "x", at: [-7, 0] })),
      S.extrude(segment(R, RACK_ROOT, 1), { along: "x", from: W.l, to: W.r }),
      S.extrude(segment(R, W.back, -1), { along: "x", from: W.l, to: W.r }),
      ...teeth.map((t) => S.extrude(t, { along: "z", from: -zr, to: zr })),
      S.lathe([[C.r0, W.r], [C.r0, C.seat], [C.r1, C.seat], [C.r1, C.cham], [C.r0, C.cham], [C.r0, F], [R - 0.8, F], [R, F - 0.8], [R, 57], [18.5, 57], [18.5, 53], [R, 53], [R, W.r]], { axis: "x" }),
    ], { mat: "steel", angle: 135, explode: ex(5), anchor: { cut: [33, -18.3, 0], out: { c: [33, 0, 0], r: R, axis: "x" } } }),
    S.part(6, "PISTON RING Ø40×1.5", [S.tube({ axis: "x", r0: 18.55, r1: R, from: 53.05, to: 56.95 })], {
      mat: "plastic", angle: 45, explode: ex(6), anchor: { cut: [55, 19.25, 0], out: { c: [55, 0, 0], r: R, axis: "x" } },
    }),
    S.part(9, "CHECK BALL Ø4 G10", [S.sphere([P.ballSeatU, 0, 0], C.ball)], {
      explode: ex(9), anchor: { cut: [P.ballSeatU + 0.6, 1.1, 0], out: { c: [P.ballSeatU, 0, 0], r: 2, axis: "sphere" } },
    }),
    S.part(10, "PIN Ø1.5×10 ISO 8734", [S.cylinder({ axis: "z", at: [C.pin, 0], r: 0.75, from: -4, to: 4 })], {
      explode: ex(10), anchor: { cut: [C.pin, -0.3, 0], out: { c: [C.pin, 0, 4], r: 0 } },
    }),
  );

  // 7 CLOSING SPRING (live3d.js re-makes the wire smooth and scales it with the stroke)
  out.push(
    S.part(7, "CLOSING SPRING Ø6×Ø37, 14 COILS", [S.helix({ axis: "x", at: 0, ...SPRING, pivot: [M.PLUG_L, 0, 0], live: "spring" })], {
      hatch: "solid", explode: ex(7), anchor: { cut: springCut(5), out: { c: springCut(5), r: 3, axis: "sphere" }, solid: 0 },
    }),
  );

  // 8 PINION SPINDLE: the sheet's shifted involute pinion across the cut, journals and squares
  out.push(
    S.part(8, "PINION SPINDLE z10 m2.5", [
      S.extrude(dedupe(X.gear(0, 0, M.Z, M.MODULE, 90, M.SHIFT)), { along: "z", from: -P.SP.face, to: P.SP.face }),
      // the upper journal is drawn uncut from the plane up to the arm (live3d.js), so the spindle
      // visibly carries the pinion's turn up to the arm through the removed half of the body
      S.lathe([[0, 0], [P.SP.journal, 0], [P.SP.journal, P.SP.shoulder], [0, P.SP.shoulder]], { axis: "z", live: "journal", own: true }),
      S.lathe([[0, -P.SP.shoulder], [P.SP.journal, -P.SP.shoulder], [P.SP.journal, -P.SP.face], [0, -P.SP.face]], { axis: "z" }),
      S.extrude(S.rrectAt(0, 0, P.SP.square, P.SP.square, 0.6, 2), { along: "z", from: P.SP.shoulder, to: P.SP.top, live: "square", own: true }),
      S.extrude(S.rrectAt(0, 0, P.SP.square, P.SP.square, 0.6, 2), { along: "z", from: -P.SP.top, to: -P.SP.shoulder, own: true }),
    ], { mat: "steel", angle: 30, explode: ex(8), anchor: { cut: [-3, 3.5, 0], out: { c: [0, 0, 0], r: 15, axis: "z" } } }),
  );

  // 11, 12 REGULATING SCREWS at their settings, 13 their O-RINGS, 14 the SEALING BALLS
  out.push(
    S.part(11, "REGULATING SCREW 1, SWEEP M5×0.5", [S.lathe(needleLoop(M.SWEEP_SEAT, M.lift(M.SWEEP_TURNS)), { axis: "x", at: [-D, 0] })], {
      mat: "brass", explode: ex(11), anchor: { cut: [76, -D - 1, 0], out: { c: [76, -D, 0], r: 2.45, axis: "x" } },
    }),
    S.part(12, "REGULATING SCREW 2, LATCH M5×0.5", [S.lathe(needleLoop(M.LATCH_SEAT, M.lift(M.LATCH_TURNS)), { axis: "x", at: [D, 0] })], {
      mat: "brass", explode: ex(12), anchor: { cut: [76, D + 1, 0], out: { c: [76, D, 0], r: 2.45, axis: "x" } },
    }),
    S.part(13, "O-RING 2.4×0.6", [-1, 1].map((sd) => S.lathe(K.rrect(1.15, 66.7, STEM_BORE - FIT, 68.3, 0.25), { axis: "x", at: [sd * D, 0], explode: [78, 0, 0] })), {
      hatch: "solid", anchor: { cut: [67.5, -D - 1.45, 0], out: { c: [67.5, -D, 0], r: 1.7, axis: "x" }, solid: 0 },
    }),
    S.part(14, "SEALING BALL Ø2.5, PRESSED", [-1, 1].map((sd) => S.sphere([u0 + GAL, sd * D, 0], GAL - 0.03)), {
      explode: ex(14), anchor: { cut: [u0 + GAL, D + 0.4, 0], out: { c: [u0 + GAL, D, 0], r: GAL, axis: "sphere" }, solid: 1 },
    }),
  );

  // 22 NEEDLE BEARING and 23 SHAFT SEAL round the lower journal (the upper pair is in the removed half)
  out.push(
    S.part(22, "NEEDLE BEARING HK 1610", [S.tube({ axis: "z", r0: P.SP.journal + FIT, r1: BRG.r, from: -BRG.w1, to: -BRG.w0 })], {
      hatch: "solid", explode: ex(22), anchor: { cut: [-9.5, 0, -25], out: { c: [-9.5, 0, -25], r: 0 } },
    }),
    S.part(23, "SHAFT SEAL 16×22×3", [S.tube({ axis: "z", r0: P.SP.journal + FIT, r1: BRG.r, from: -BRG.seal, to: -BRG.w1 - 0.3 })], {
      mat: "rubber", explode: ex(23), anchor: { cut: [-9.5, 0, -32], out: { c: [-9.5, 0, -32], r: 0 } },
    }),
  );

  // 21 DOOR LEAF: a slice of it, from the hinge, cut by the same plane
  const leaf = [[8, 0], [DOOR_A, 0], [DOOR_A, -M.DOOR_T], [8, -M.DOOR_T], [0, -M.DOOR_T + 8]].map(([a, s]) => planToWorld([-a, s]));
  out.push(
    S.part(21, "DOOR LEAF 950×44 (REF.)", [S.extrude(leaf, { along: "z", from: DOOR_BOT, to: DOOR_TOP })], {
      mat: "wood", angle: 135, anchor: { cut: [70, -62, 0], out: { c: [70, -62, 0], r: 0 } },
    }),
  );

  // ---- the linkage (drawn uncut by live3d.js), built with the door shut
  const zm = (z) => (z[0] + z[1]) / 2;
  const mid = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const sq = S.rrectAt(0, 0, P.SP.square + FIT, P.SP.square + FIT, 0.6, 2);
  out.push(
    S.part(16, "MAIN ARM 250", [S.extrude(bar(S0, E0, 18), { along: "z", from: ARM_Z[0], to: ARM_Z[1], holes: [sq, S.circle(E0[0], E0[1], 4 + FIT, 32)] })], {
      hatch: "none", explode: ex(16), anchor: { cut: [...mid(S0, E0, 0.55), ARM_Z[1]], out: { c: [...mid(S0, E0, 0.55), ARM_Z[1]], r: 0 } },
    }),
    S.part(17, "FOREARM 220", [S.extrude(bar(E0, SHOE_W, 14), { along: "z", from: FORE_Z[0], to: FORE_Z[1], holes: [S.circle(E0[0], E0[1], 4 + FIT, 32), S.circle(SHOE_W[0], SHOE_W[1], 4 + FIT, 32)] })], {
      hatch: "none", pivot: [SHOE_W[0], SHOE_W[1], 0], anchor: { cut: [...mid(E0, SHOE_W, 0.5), FORE_Z[1]], out: { c: [...mid(E0, SHOE_W, 0.5), FORE_Z[1]], r: 0 } },
    }),
    S.part(18, "ARM SHOE", [
      S.extrude(S.rrectAt(SHOE_W[0], (HINGE[1] + HINGE[1] + 19) / 2, 22, 9.5, 2), { along: "z", from: 40, to: FORE_Z[0] }),
      S.cylinder({ axis: "z", at: SHOE_W, r: 4, from: FORE_Z[0], to: FORE_Z[1] + 1.5, own: true }),
    ], { hatch: "none", anchor: { cut: [SHOE_W[0] + 14, HINGE[1] + 4, FORE_Z[0]], out: { c: [SHOE_W[0] + 14, HINGE[1] + 4, FORE_Z[0]], r: 0 } } }),
    S.part(19, "ARM SCREW M6×16 ISO 4762", [
      S.cylinder({ axis: "z", at: S0, r: 5, from: P.SP.top, to: P.SP.top + 6 }),
      S.disc([0, 0, P.SP.top + 6.03], 2.5, { normal: "z", role: "mouth" }),
    ], { hatch: "none", explode: ex(19), anchor: { cut: [3.5, -3.5, P.SP.top + 6], out: { c: [3.5, -3.5, P.SP.top + 6], r: 0 } } }),
    S.part(20, "ELBOW RIVET Ø8", [
      S.cylinder({ axis: "z", at: E0, r: 4, from: ARM_Z[0] - 1.5, to: FORE_Z[1] + 1.5 }),
    ], { hatch: "none", explode: ex(20), anchor: { cut: [E0[0] - 2.5, E0[1] + 2.5, FORE_Z[1] + 1.5], out: { c: [E0[0], E0[1], FORE_Z[1] + 1.5], r: 0 } } }),
    // the frame: head over the door and the hinge knuckle (reference, not on the parts list)
    S.part("F", "FRAME (REF.)", [
      S.box([-110, HINGE[1] - 46, HEAD_Z[0]], [HINGE[0] + 30, HINGE[1], HEAD_Z[1]], { own: true }),
      S.cylinder({ axis: "z", at: [HINGE[0], HINGE[1]], r: 7, from: DOOR_BOT + 20, to: DOOR_TOP, own: true }),
    ], { hatch: "none" }),
  );
  void zm;
  return out;
}

// ---------------------------------------------------------------- the oil (part 15)
// Volumes that fit the passages, each built in its own frame: live3d.js places them in the body
// frame (with the piston, or scaled with a chamber's length) and turns them with the door. The
// pressure chamber and the spring chamber are built with their fixed end at s = 0.
const RO = M.R_BORE - 0.04;
const LOW_LEN = M.HEAD_L - M.PLUG_L; // spring chamber at x = 0
const HIGH_LEN = M.PLUG_R - M.FACE_R; // pressure chamber at x = 0
export const FLUIDS = [
  // name, group (hi | lo), frame ("body" | "piston" | "low" | "high"), at [x, y] of its local origin
  { name: "lo-spring", group: "lo", frame: "low", at: [M.PLUG_L, 0], s: S.lathe([[0, 0], [RO, 0], [RO, LOW_LEN], [0, LOW_LEN]], { axis: "x" }) },
  { name: "hi-chamber", group: "hi", frame: "high", at: [M.PLUG_R, 0], s: S.lathe([[0, -HIGH_LEN], [RO, -HIGH_LEN], [RO, 0], [0, 0]], { axis: "x" }) },
  { name: "lo-window", group: "lo", frame: "piston", at: [0, 0], s: S.extrude([...segmentBand(RO, W.back, RACK_ROOT)], { along: "x", from: W.l, to: W.r }) },
  { name: "lo-head+", group: "lo", frame: "piston", at: [0, 0], s: S.lathe([[0, M.HEAD_L], [2.46, M.HEAD_L], [2.46, W.l], [0, W.l]], { axis: "x", at: [7, 0] }) },
  { name: "lo-head-", group: "lo", frame: "piston", at: [0, 0], s: S.lathe([[0, M.HEAD_L], [2.46, M.HEAD_L], [2.46, W.l], [0, W.l]], { axis: "x", at: [-7, 0] }) },
  { name: "lo-pass", group: "lo", frame: "piston", at: [0, 0], s: S.lathe([[0, W.r], [C.r0 - 0.03, W.r], [C.r0 - 0.03, C.seat], [0, C.seat]], { axis: "x" }) },
  { name: "hi-check", group: "hi", frame: "piston", at: [0, 0], s: S.lathe([[0, C.seat], [C.r1 - 0.03, C.seat], [C.r1 - 0.03, C.cham], [C.r0 - 0.03, C.cham], [C.r0 - 0.03, M.FACE_R], [0, M.FACE_R]], { axis: "x" }) },
  ...[1, -1].flatMap((sd) => {
    const seat = sd > 0 ? M.LATCH_SEAT : M.SWEEP_SEAT;
    const port = sd > 0 ? M.LATCH_U : M.SWEEP_U;
    const tag = sd > 0 ? "latch" : "sweep";
    return [
      { name: `lo-gal-${tag}`, group: "lo", frame: "body", at: [0, 0], s: S.lathe([[0, B.u0 + 2 * GAL], [GAL - 0.03, B.u0 + 2 * GAL], [GAL - 0.03, seat], [0, seat]], { axis: "x", at: [sd * D, 0] }) },
      { name: `lo-feed-${tag}`, group: "lo", frame: "body", at: [0, 0], s: S.extrude([[-159, 20], [-156.5, 20], [-146.5, D - GAL], [-149, D - GAL]].map(([x, y]) => [x, sd * y]), { along: "z", from: -GAL + 0.03, to: GAL - 0.03 }) },
      { name: `hi-port-${tag}`, group: "hi", frame: "body", at: [0, 0], s: S.lathe(sd > 0 ? [[0, 19.9], [PR - 0.03, 19.9], [PR - 0.03, 24.6], [0, 24.6]] : [[0, -24.6], [PR - 0.03, -24.6], [PR - 0.03, -19.9], [0, -19.9]], { axis: "y", at: [port, 0] }) },
      { name: `hi-needle-${tag}`, group: "hi", frame: "body", at: [0, 0], s: S.lathe([[0, seat], [STEM_BORE - 0.03, seat], [STEM_BORE - 0.03, 66.6], [0, 66.6]], { axis: "x", at: [sd * D, 0] }) },
    ];
  }),
];
// the window's oil: the bore's section between the lower cap and the rack's root line, as an
// x-extrude outline (z, y), on the far side of the plane (z ≤ 0.3)
function segmentBand(r, y0, y1, n = 20) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const y = y0 + ((y1 - y0) * i) / n;
    out.push([-Math.sqrt(r * r - y * y), y]);
  }
  out.push([0.3, y1], [0.3, y0]);
  return out;
}
export const LENGTHS = { low: LOW_LEN, high: HIGH_LEN };
export const fluids = () => FLUIDS.map((f) => S.fluid(f.name, f.s));

// centre lines: the cylinder's axis and the galleries' (on the body), the spindle's
export const centres = () => [
  { line: [[B.u0 - 22, 0, 0], [B.u1 + 8, 0, 0]], part: 1 },
  { line: [[B.u0 - 6, D, 0], [B.u1 + 8, D, 0]], part: 1 },
  { line: [[B.u0 - 6, -D, 0], [B.u1 + 8, -D, 0]], part: 1 },
  { line: [[0, 0, -60], [0, 0, 0]], part: 1 },
];

export const scene = () => ({ parts: parts(), fluids: fluids(), centres: centres() });
