// The flap system's solids for its 3D view (wing-flaps-3d.html), in the sheet's world mm: x = the
// section's u (−x of the model: the nose to +x), y = its v (up), z toward the viewer = outboard, from
// the track's plane (WS 760), so the cut (z > 0 removed) is the sheet's Section A-A, looking inboard.
// Pure data built with kit/solid3d.mjs from model.mjs and the sheet's profiles (parts.mjs).
//
// What moves and how (live3d.js poses it from the same model as the sheet):
//   the flap, its roller brackets, rollers and drive lug: one rigid pose per frame (the track's two-roller
//   motion: a slide plus a turn about the forward roller), about the forward roller's rest place;
//   the push-pull rod: between the bellcrank's hole R and the flap's lug (a rest rod along +x, aimed);
//   the bellcrank: turns about its vertical bolt; the cables and follow-up cable ride with its holes;
//   the actuator: swings about its mount pin; the nut, actuating tube and rod end slide out along it;
//   the jackscrew spins.
// NTS simplifications (the sheet is the authority): a slice of the starboard wing from WS 180 to
// WS 1100; the upper skin is left off ahead of the rear spar so the drive can be seen; the gearbox is a
// closed housing (its gears and bearings are on the sheet); the flap is a hollow skin with its two
// notch ribs; the cables are drawn to the slice's inboard end; the selector is on the sheet only.

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

export const Z0 = 760; // the cut: WS of the track's plane
export const W_IN = 180; // the slice's inboard end
export const W_OUT = 1100; // and its outboard end
export const zOf = (w) => w - Z0;
const sec = P.sec;
const SA = M.SPAR.aft;
const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
export const pt3 = ([x, y], w = Z0) => [-x, y, zOf(w)];

// ---------------------------------------------------------------- the flap's pose (and its brackets')
export const FLAP_PIVOT = [-M.SLOT.r1[0], M.SLOT.r1[1], 0];
// the pose of everything carried by the flap, for the forward roller's travel s
export function flapPose(s) {
  const P0 = M.poseOfS(s);
  return { pos: [-(P0.r1[0] - M.SLOT.r1[0]), P0.r1[1] - M.SLOT.r1[1], 0], rot: [0, 0, (P0.flap * Math.PI) / 180] };
}
// the bellcrank's turn: β about its vertical bolt (see the derivation in live3d.js)
export const BC_PIVOT = [-M.BC.x, M.BC.y, zOf(M.BC.w)];
export const hole3 = (b, k, y = M.BC.y) => {
  const [x, w] = M.holeOf(b, k);
  return [-x, y, zOf(w)];
};
// the actuator's own frame: a along local x, q along local z, about the mount pin
export const ACT_PIN = [-M.ACT.mount[0], M.ACT.y, zOf(M.ACT.mount[1])];
export function actAim(b) {
  const A = hole3(b, "A", M.ACT.y);
  const d = [A[0] - ACT_PIN[0], 0, A[2] - ACT_PIN[2]];
  const L = Math.hypot(d[0], d[2]);
  const u = [d[0] / L, 0, d[2] / L];
  return { L, u, ry: Math.atan2(-u[2], u[0]) };
}
// aim a rest solid built along +x from the origin at a direction d (3D): Euler XYZ (0, ry, rz)
export function aim(d) {
  const L = Math.hypot(...d);
  return { L, rot: [0, Math.atan2(-d[2], d[0]), Math.asin(d[1] / L)] };
}

// ---------------------------------------------------------------- outlines in the (x, y) plane
const t = M.SKIN;
const sparShape = (yCut = null) => {
  const w = M.SPAR.web;
  const fl = M.SPAR.flange;
  const upA = M.up(SA) - t;
  const upF = M.up(SA - fl) - t;
  const loA = M.lo(SA) + t;
  const loF = M.lo(SA - fl) + t;
  if (yCut != null) return sec([[SA - fl, upF], [SA, upA], [SA, yCut], [SA - w, yCut], [SA - w, upA - w], [SA - fl, upF - w]]);
  return sec([[SA - fl, upF], [SA, upA], [SA, loA], [SA - fl, loF], [SA - fl, loF + w], [SA - w, loA + w], [SA - w, upA - w], [SA - fl, upF - w]]);
};
const band = (path, th) => {
  const n = path.length;
  const off = path.map((p, i) => {
    const a = path[Math.max(0, i - 1)];
    const b = path[Math.min(n - 1, i + 1)];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [p[0] + ((b[1] - a[1]) / L) * th, p[1] - ((b[0] - a[0]) / L) * th];
  });
  return [...path, ...off.reverse()];
};
// the upper skin and shroud from just ahead of the spar to the lip; the lip doubler
const SKIN_UP = band(range(1112, M.LIP_X, 30).map((x) => [x, M.up(x)]), 0.9);
const LIP_DBL = band(range(M.LIP_X - 24, M.LIP_X, 6).map((x) => [x, M.up(x) - 0.9]), 1.0);
// the lower skin ahead of the spar
const SKIN_LO = band(range(SA, 1040, 20).map((x) => [x, M.lo(x)]), 0.9);
// the cove panel (the sheet's), 0.6 thick
const COVE = band(P.COVE, 0.7);
// the fixed trailing edge inboard of the flap: the aerofoil aft of the spar
export const FAIRING = [...range(SA, M.C - 1, 24).map((x) => [x, M.up(x)]), [M.C, 0.4], [M.C, -1.2], ...range(M.C - 1, SA, 24).map((x) => [x, M.lo(x)])];
// the flap: its outline, a skin's inner line (open at the trailing edge's filler), the aft part
const FP = M.FLAP_PTS;
const innerOf = (pts, d) => {
  // inset by d, the trailing edge's 30 mm left solid
  const n = pts.length;
  const area = pts.reduce((s, [x0, y0], i) => { const [x1, y1] = pts[(i + 1) % n]; return s + x0 * y1 - x1 * y0; }, 0);
  const ccw = area > 0 ? 1 : -1;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n];
    const b = pts[i];
    const c = pts[(i + 1) % n];
    const nrm = (p, q) => { const dx = q[0] - p[0]; const dy = q[1] - p[1]; const L = Math.hypot(dx, dy) || 1; return [(-dy / L) * ccw, (dx / L) * ccw]; };
    const n1 = nrm(a, b);
    const n2 = nrm(b, c);
    const m = [n1[0] + n2[0], n1[1] + n2[1]];
    const L = Math.hypot(...m) || 1;
    out.push([b[0] + (m[0] / L) * d, b[1] + (m[1] / L) * d]);
  }
  return out.filter(([x]) => x < M.FLAP.te - 30);
};
const FLAP_IN = innerOf(FP, 1.0);
const AFT = [...range(M.FLAP.spar, M.FLAP.te - 1, 24).map((x) => [x, M.flapUp(x)]), [M.FLAP.te, M.flapUp(M.FLAP.te) + 0.6], [M.FLAP.te, M.flapUp(M.FLAP.te) - 1.4], ...range(M.FLAP.te - 1, M.FLAP.spar, 24).map((x) => [x, M.lo(x)])];
const AFT_IN = [...range(M.FLAP.spar + 1.6, M.FLAP.te - 30, 20).map((x) => [x, M.flapUp(x) - 1]), ...range(M.FLAP.te - 30, M.FLAP.spar + 1.6, 20).map((x) => [x, M.lo(x) + 1])];
const NOTCH = P.NOTCH.map(zOf); // [−25, 25]

// ---------------------------------------------------------------- parts
export function scene() {
  const parts = [];
  const zIn = zOf(W_IN);
  const zOut = zOf(W_OUT);
  const zFlap = zOf(M.FLAP_WS[0]);
  const rodZ = zOf(M.ROD_W);
  // the rod's slot through the spar web and the cove panel (it swings a little)
  const slotZ = [rodZ - 19, rodZ + 9];
  const slotY = 22;

  // 1 rear spar: a channel, slotted for the rod
  parts.push(S.part(1, "REAR SPAR", [
    S.extrude(sparShape(), { along: "z", from: zIn, to: slotZ[0] }),
    S.extrude(sparShape(slotY), { along: "z", from: slotZ[0], to: slotZ[1] }),
    S.extrude(sparShape(), { along: "z", from: slotZ[1], to: zOut }),
  ], { hatch: "solid", explode: [0, 0, 0], anchor: { cut: [-(SA - 0.8), 50, 0], out: { c: [-(SA - 0.8), 50, zOf(900)], r: 0 } } }));

  // 2 upper skin and shroud, with the fixed trailing edge inboard of the flap
  parts.push(S.part(2, "UPPER SKIN AND SHROUD", [ // the fixed trailing edge inboard of the flap is on the sheet only
    S.extrude(sec(SKIN_UP), { along: "z", from: zFlap, to: zOut }),
    S.extrude(sec(LIP_DBL), { along: "z", from: zFlap, to: zOut }),
  ], { hatch: "solid", explode: [0, 170, 0], anchor: { cut: [-1250, M.up(1250) - 0.4, 0], out: { c: [-1250, M.up(1250), zOf(950)], r: 0 } } }));

  // 3 lower skin and cove panel (the cove gapped for the track, its angle and the rod)
  parts.push(S.part(3, "LOWER SKIN AND COVE PANEL", [
    S.extrude(sec(SKIN_LO), { along: "z", from: zIn, to: zOut }),
    S.extrude(sec(COVE), { along: "z", from: zFlap, to: slotZ[0], explode: [60, 0, 0] }),
    S.extrude(sec(COVE), { along: "z", from: 7, to: zOut, explode: [60, 0, 0] }),
  ], { hatch: "solid", explode: [0, -60, 0], anchor: { cut: [-1180, 30, 20], out: { c: [-1000, M.lo(1000), zOf(950)], r: 0 } } }));

  // 4 the flap: hollow skin inboard and outboard of the notch, the aft part through it, two notch ribs
  const flapSolids = [
    S.extrude(sec(FP), { along: "z", from: zFlap, to: NOTCH[0] - 1, holes: [sec(FLAP_IN)] }),
    S.extrude(sec(FP), { along: "z", from: NOTCH[0] - 1, to: NOTCH[0] }),
    S.extrude(sec(AFT), { along: "z", from: NOTCH[0], to: NOTCH[1], holes: [sec(AFT_IN)] }),
    S.extrude(sec(FP), { along: "z", from: NOTCH[1], to: NOTCH[1] + 1 }),
    S.extrude(sec(FP), { along: "z", from: NOTCH[1] + 1, to: zOut, holes: [sec(FLAP_IN)] }),
  ];
  parts.push(S.part(4, "FLAP", flapSolids, {
    hatch: "solid", pivot: FLAP_PIVOT, explode: [-300, -60, 0],
    anchor: { cut: [-1500, M.lo(1500) + 0.5, 0], out: { c: [-1500, M.flapUp(1500), zOf(1000)], r: 0 } },
  }));

  // 5 the track: the plate with its slot, and the angle that bolts it to the spar's web
  parts.push(S.part(5, "FLAP TRACK", [
    S.extrude(sec(P.TRACK), { along: "z", from: -3.175, to: 3.175, holes: [sec(P.SLOT_HOLE)] }),
    S.extrude(sec(P.TRACK_ANGLE), { along: "z", from: 3.2, to: 6.4, hatch: ["steel", 135], own: true }),
  ], { mat: "steel", angle: 45, explode: [-40, -230, 0], anchor: { cut: [-1352, -118, 0], out: { c: [-1352, -118, 3.2], r: 0 } } }));

  // 6 the roller bracket's two cheeks, either side of the plate (ride with the flap)
  const R1 = M.SLOT.r1;
  const R2 = M.R2_0;
  const bHoles = [sec(S.circle(R1[0], R1[1], 3.3, 20)), sec(S.circle(R2[0], R2[1], 3.3, 20))];
  parts.push(S.part(6, "ROLLER BRACKET", [
    S.extrude(sec(P.BRACKET), { along: "z", from: -11.2, to: -3.7, holes: bHoles, explode: [0, 0, -40] }),
    S.extrude(sec(P.BRACKET), { along: "z", from: 3.7, to: 11.2, holes: bHoles, explode: [0, 0, 40] }),
  ], { mat: "alu", angle: 135, pivot: FLAP_PIVOT, explode: [-300, -180, 0], anchor: { cut: [-(M.FLAP.spar - 6), M.lo(M.FLAP.spar - 6) - 4, 0], out: { c: [-(M.FLAP.spar - 6), M.lo(M.FLAP.spar - 6) - 4, 11.2], r: 0 } } }));

  // 7 the two rollers on their bolts
  const roller = (c) => S.tube({ axis: "z", at: [-c[0], c[1]], r0: 3.3, r1: M.ROLLER_D / 2, from: -3.6, to: 3.6, segments: 40 });
  const bolt = (c) => S.cylinder({ axis: "z", at: [-c[0], c[1]], r: 3.2, from: -12.5, to: 12.5, segments: 16, hatch: "none", own: true });
  parts.push(S.part(7, "TRACK ROLLER", [roller(R1), roller(R2), bolt(R1), bolt(R2)], {
    mat: "steel", angle: 135, pivot: FLAP_PIVOT, explode: [-300, -270, 70], anchor: { cut: [-R2[0], R2[1] - 8, 0], out: { c: [-R2[0], R2[1], 3.6], r: 0 } },
  }));

  // 8 the drive lug on the notch rib, inside the flap's nose
  parts.push(S.part(8, "DRIVE LUG", [S.extrude(sec(P.LUG_PTS), { along: "z", from: NOTCH[0], to: rodZ - 4.2, holes: [sec(S.circle(M.LUG[0], M.LUG[1], 3.3, 16))] })], {
    mat: "alu", angle: 45, pivot: FLAP_PIVOT, explode: [-300, 60, -40], anchor: { cut: [-(M.LUG[0] + 18), M.LUG[1], rodZ - 5], out: { c: [-(M.LUG[0] + 18), M.LUG[1], rodZ - 4.2], r: 0 } },
  }));

  // 9 the push-pull rod: built along +x from its fore end (the bellcrank's hole R), aimed each frame
  parts.push(S.part(9, "PUSH-PULL ROD", [
    S.cylinder({ axis: "x", at: [0, 0], r: 6.35, from: 8, to: M.ROD_L - 8, segments: 24, live: "tube" }),
    S.cylinder({ axis: "y", at: [0, 0], r: 8, from: -4, to: 4, segments: 24 }),
    S.cylinder({ axis: "z", at: [M.ROD_L, 0], r: 8, from: -4, to: 4, segments: 24, live: "aft" }),
  ], { mat: "steel", hatch: "none", explode: [0, 140, 0], anchor: { cut: [M.ROD_L * 0.4, 6, 0], out: { c: [M.ROD_L * 0.4, 6.35, 0], r: 0 } } }));

  // 10 the bellcrank, built at β = 0, turned about its bolt
  const b0 = 0;
  const hs = P.BC_HOLES.map((k) => M.holeOf(b0, k));
  const bcOut = K.circle(0, 0, 1, 4).length && (() => {
    const pts = [];
    for (const [x, w] of hs) for (const [a, c] of S.circle(x, w, 12, 12)) pts.push([a, c]);
    for (const [a, c] of S.circle(M.BC.x, M.BC.w, 19, 16)) pts.push([a, c]);
    return hullXZ(pts);
  })();
  const toXZ = (pts) => pts.map(([x, w]) => [-x, zOf(w)]);
  parts.push(S.part(10, "BELLCRANK", [
    S.extrude(toXZ(bcOut), { along: "y", from: M.BC.y - 3.175, to: M.BC.y + 3.175, holes: [...hs.map(([x, w]) => toXZ(S.circle(x, w, 3.3, 16))), toXZ(S.circle(M.BC.x, M.BC.w, 3.95, 20))] }),
  ], { mat: "alu", angle: 45, pivot: BC_PIVOT, explode: [0, 230, 0], anchor: { cut: [-(M.BC.x - 60), M.BC.y + 3.2, zOf(M.BC.w)], out: { c: [-(M.BC.x - 60), M.BC.y + 3.2, zOf(M.BC.w)], r: 0 } } }));

  // 11 the bellcrank's bolt and its two brackets off the spar's web
  const brk = (y0) => S.extrude(toXZ(K.rect(M.BC.x - 14, M.BC.w - 14, SA - M.SPAR.web, M.BC.w + 14)), { along: "y", from: y0 - 1.6, to: y0 + 1.6, holes: [toXZ(S.circle(M.BC.x, M.BC.w, 3.95, 20))] });
  parts.push(S.part(11, "BELLCRANK BOLT AND BRACKETS", [
    brk(M.BC.y + 17),
    brk(M.BC.y - 19),
    S.cylinder({ axis: "y", at: [-M.BC.x, zOf(M.BC.w)], r: 3.9, from: M.BC.y - 22, to: M.BC.y + 20.6, segments: 20, hatch: "none", own: true, explode: [0, 80, 0] }),
  ], { mat: "alu", angle: 135, explode: [0, 300, 0], anchor: { cut: [-(M.BC.x - 40), M.BC.y + 18.6, zOf(M.BC.w)], out: { c: [-(M.BC.x - 40), M.BC.y + 18.6, zOf(M.BC.w)], r: 0 } } }));

  // 12 the crossed cables, each built along +x from its hole, to the slice's inboard end
  const cableLen = (k) => {
    const a = M.holeOf(0, k);
    const c = M.mirror(M.holeOf(0, k === "C1" ? "C2" : "C1"));
    const tt = (a[1] - W_IN) / (a[1] - c[1]);
    return Math.hypot((c[0] - a[0]) * tt, (c[1] - a[1]) * tt);
  };
  const cable = (k, live) => [
    S.cylinder({ axis: "x", at: [0, 0], r: 1.6, from: 3, to: cableLen(k), segments: 10, live }),
    S.cylinder({ axis: "x", at: [0, 0], r: 4.5, from: 70, to: 150, segments: 16, live: live + "tb" }),
  ];
  parts.push(S.part(12, "INTERCONNECT CABLE", cable("C1", "c1"), { mat: "steel", hatch: "none", explode: [0, 180, 0], anchor: { cut: [110, 0, 4.5], out: { c: [110, 0, 4.5], r: 0 } } }));
  parts.push(S.part("12a", "INTERCONNECT CABLE", cable("C2", "c2"), { mat: "steel", hatch: "none", explode: [0, 180, 0] }));

  // 13 the follow-up cable from hole F inboard
  parts.push(S.part(13, "FOLLOW-UP CABLE", [S.cylinder({ axis: "x", at: [0, 0], r: 1.0, from: 3, to: 400, segments: 10, live: "fu" })], { mat: "steel", hatch: "none", explode: [0, 200, 0], anchor: { cut: [200, 0, 0], out: { c: [200, 0, 0], r: 0 } } }));

  // ---------------------------------------------------------------- the actuator, in its own frame
  // (a → x, q → z, y up), about the mount pin; posed in live3d.js
  const A = M.ACTL;
  const G = P.ACT_BOX;
  const len0 = M.LEN0;
  // 23 the mount bracket (fixed): a back plate and two cheeks round the pin
  parts.push(S.part(23, "ACTUATOR MOUNT BRACKET", [
    S.box([-26, -20, -22], [-12.6, 20, 22]),
    S.extrude(K.rect(-12.6, -12, 9, 12), { along: "y", from: 8.2, to: 12, holes: [S.circle(0, 0, 3.3, 16)], own: true }),
    S.extrude(K.rect(-12.6, -12, 9, 12), { along: "y", from: -12, to: -8.2, holes: [S.circle(0, 0, 3.3, 16)], own: true }),
    S.cylinder({ axis: "y", at: [0, 0], r: 3.2, from: -14, to: 14, segments: 16, hatch: "none", own: true }),
  ], { mat: "steel", angle: 135, explode: [0, 0, -160], anchor: { cut: [-20, 20, 0], out: { c: [-20, 20, 0], r: 0 } } }));
  // 15 the gearbox housing and its lug
  parts.push(S.part(15, "GEARBOX HOUSING", [
    S.extrude(K.rrect(G.a0, G.q0, G.a1, G.q1, 8), { along: "y", from: -38, to: 38 }),
    S.extrude(K.rect(-12, -10, G.a0, 10), { along: "y", from: -8, to: 8, holes: [S.circle(0, 0, 3.3, 16)] }),
  ], { mat: "alu", angle: 45, explode: [0, 0, -60], anchor: { cut: [40, 38, -60], out: { c: [40, 38, -60], r: 0 } } }));
  // 14 the motor
  parts.push(S.part(14, "FLAP MOTOR", [
    S.lathe([[0, 64], [30, 64], [30, 70], [28, 70], [28, 172], [25, 176], [0, 176]], { axis: "x", at: [0, P.QM], segments: 40 }),
  ], { mat: "steel", angle: 135, explode: [0, 90, -60], anchor: { cut: [120, 28, P.QM], out: { c: [120, 28, P.QM], r: 0 } } }));
  // 20 the housing tube, slotted on its aft side for the striker, with its bush
  const cShape = (() => {
    const h = (Math.asin(7.5 / 15) * 180) / Math.PI;
    const o = K.arc(0, 0, 16, h, 360 - h, 40);
    const i = K.arc(0, 0, 14, 360 - h, h, 40);
    return [...o, ...i];
  })();
  parts.push(S.part(20, "HOUSING TUBE", [
    S.extrude(cShape, { along: "x", from: 64, to: 262 }),
    S.tube({ axis: "x", at: [0, 0], r0: 11.3, r1: 13.95, from: 250, to: 262, segments: 32, hatch: ["bronze", 45], own: true }),
  ], { hatch: "solid", explode: [0, 0, 0], anchor: { cut: [160, 16, 0], out: { c: [160, 16, 0], r: 0 } } }));
  // 17 the jackscrew: a 16 mm screw with a flat, so its turning shows
  const screwShape = S.circle(0, 0, 8, 24).map(([a, b]) => [a, Math.min(b, 6.2)]);
  parts.push(S.part(17, "JACKSCREW", [S.extrude(screwShape, { along: "x", from: 66, to: 250, live: "screw" })], { mat: "steel", hatch: "none", explode: [0, 0, 120], anchor: { cut: [80, 6, 0], out: { c: [80, 6.2, 0], r: 0 } } }));
  // 18 the nut and its striker key (slide out along the screw)
  parts.push(S.part(18, "NUT AND STRIKER KEY", [
    S.tube({ axis: "x", at: [0, 0], r0: 8.1, r1: 13.5, from: A.nut0, to: A.nut0 + A.nutL, segments: 32 }),
    S.box([A.nut0 + 8, -5, 13.5], [A.nut0 + 22, 5, 23], { own: true, hatch: "none" }),
  ], { mat: "bronze", angle: 135, explode: [0, 0, 200], anchor: { cut: [A.nut0 + 15, 5, 23], out: { c: [A.nut0 + 15, 5, 23], r: 0 } } }));
  // 19 the actuating tube and its rod end
  parts.push(S.part(19, "ACTUATING TUBE AND ROD END", [
    S.tube({ axis: "x", at: [0, 0], r0: 8.6, r1: 11, from: A.nut0 + A.nutL, to: len0 - 18, segments: 32 }),
    S.cylinder({ axis: "x", at: [0, 0], r: 6, from: len0 - 18, to: len0 - 11.9, segments: 20, own: true }),
    S.tube({ axis: "y", at: [len0, 0], r0: 3.3, r1: 12, from: -4, to: 4, segments: 32, own: true }),
  ], { mat: "steel", hatch: "solid", explode: [0, 0, 300], anchor: { cut: [len0 - 60, 11, 0], out: { c: [len0 - 60, 11, 0], r: 0 } } }));
  // 22 the limit switches on the tube's aft side
  const sw = (s) => S.box([s.a0, -6, 26], [s.a1, 6, 38]);
  parts.push(S.part(22, "LIMIT SWITCHES", [sw(P.SW.up), sw(P.SW.down)], { mat: "plastic", angle: 60, explode: [0, 60, 40], anchor: { cut: [P.SW.down.a0 + 9, 6, 32], out: { c: [P.SW.down.a0 + 9, 6, 32], r: 0 } } }));

  return { parts, fluids: [] };
}
// a convex hull in the (x, w) plane
function hullXZ(points) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up = [];
  for (const q of p.reverse()) {
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}
// the actuator's parts and those that slide with the nut
export const ACT_PARTS = [14, 15, 17, 20, 22];
export const SLIDE_PARTS = [18, 19];
export const FLAP_PARTS = [4, 6, 7, 8];
export const parts = () => scene().parts;
