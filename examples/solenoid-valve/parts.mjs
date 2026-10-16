// The solenoid valve's parts, in world mm (u right, v up; the valve's axis at u = 0, the body's
// underside at v = 0). Each function draws one part into a view, so the main section and Detail P
// draw the same geometry at their own scale. Parts that move are drawn at rest (valve shut) and
// moved with a transform: the plunger and its seal by x, the pilot sleeve, washer and bleed bush by z.
// The diaphragm and the spring change shape, so they are drawn for a given lift.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;

const PV = M.PORT_V;
const RT = 9.32; // G1/2 minor radius (thread crests in the bore)
const RM = 10.48; // G1/2 major radius (thread roots, thin)
const ST = M.SEAT_TOP;

// ---------------------------------------------------------------- 1 body, cut through both ports
export function body(V) {
  const topLeft = [
    [-36, PV + 10.8], [-34.52, PV + RT], [-23, PV + RT], [-23, 21], [-15, 21], [-15, 34], [-17.5, 34], [-17.5, 36],
    [-24.5, 36], [-25, 35.5], [-25, 28], [-35.5, 28], [-36, 27.5],
  ];
  const bottom = [
    [-36, PV - 10.8], [-34.52, PV - RT], [-23, PV - RT], [-23, 7], [-8.5, 7], [-8.5, ST - 0.5], [-8, ST], [-6.5, ST], [-6.5, 7],
    [23, 7], [23, PV - RT], [34.52, PV - RT], [36, PV - 10.8], [36, 0.5], [35.5, 0], [-35.5, 0], [-36, 0.5],
  ];
  const right = [
    [6.5, 21], [23, 21], [23, PV + RT], [34.52, PV + RT], [36, PV + 10.8], [36, 27.5], [35.5, 28], [25, 28], [25, 35.5],
    [24.5, 36], [17.5, 36], [17.5, 34], [15, 34], [15, 24], [8.5, 24], [8.5, ST - 0.5], [8, ST], [6.5, ST],
  ];
  const roots = [-1, 1].flatMap((side) => [
    [[side * 34.9, PV + RM], [side * 23, PV + RM]],
    [[side * 34.9, PV - RM], [side * 23, PV - RM]],
  ]);
  return part(
    1,
    [topLeft, bottom, right].map((p) => K.cut(V, p, { mat: "brass", angle: 45 })).join("") +
      K.lines(V, roots, "thin") +
      // the 118° drill point at the bottom of the seat bore, seen through the cut
      K.line(V, [[-6.5, 7], [0, 5.05], [6.5, 7]], "thin")
  );
}

// ---------------------------------------------------------------- 2 diaphragm, for lift z
const CONV = { r0: 12, r1: 15, sag: 1.4 };
const midAt = (t, z) => (ST + M.WEB / 2 + z) * (1 - t) + 35.0 * t - CONV.sag * Math.sin(Math.PI * t);
function convolution(z, side) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push([CONV.r0 + (CONV.r1 - CONV.r0) * t, midAt(t, z) + (side * M.WEB) / 2]);
  }
  return pts;
}
const bead = [[15, 34], [17.1, 34], [17.5, 34.4], [17.5, 35.6], [17.1, 36], [15, 36]];
// The half-profile from r0 outwards: underside out to the bead, round the bead, top side back.
function diaphragmLoop(z, r0) {
  return [
    [r0, ST + z],
    [CONV.r0, ST + z],
    ...convolution(z, -1).slice(1),
    ...bead,
    ...convolution(z, 1).reverse().slice(0, -1),
    [CONV.r0, ST + M.WEB + z],
    [r0, ST + M.WEB + z],
  ];
}
const BLEED_HOLE = 0.9; // the bush's outside radius
export const underside = (z) => [[2.5, ST + z], [CONV.r0, ST + z], ...convolution(z, -1).slice(1)];
export function diaphragm(V, z) {
  const full = diaphragmLoop(z, 2.5);
  const left = full.map(([r, v]) => [-r, v]);
  const web = [[2.5, ST + z], [M.BLEED_U - BLEED_HOLE, ST + z], [M.BLEED_U - BLEED_HOLE, ST + M.WEB + z], [2.5, ST + M.WEB + z]];
  const outer = diaphragmLoop(z, M.BLEED_U + BLEED_HOLE);
  return part(2, [left, web, outer].map((p) => K.cut(V, p, { mat: "rubber" })).join(""));
}

// ---------------------------------------------------------------- 3 pilot sleeve, 4 washer, 5 bleed bush (drawn shut, moved by z)
export const sleeveLoop = [
  [M.PILOT_D / 2, 32.2], [3.0, 32.2], [3.2, 32.4], [3.2, 33], [2.5, 33], [2.5, 35.5], [4.3, 35.5], [4.5, 35.7], [4.5, 37],
  [1.5, 37], [1.5, 37.4], [1.3, M.SEAL_LOW], [M.PILOT_D / 2, M.SEAL_LOW],
];
export function sleeve(V) {
  return part(3, K.section(V, K.revolve(sleeveLoop), { mat: "brass", angle: 135 }));
}
export function washer(V) {
  const rev = K.revolve([[2.5, 33], [6.0, 33], [6.0, 34], [2.5, 34]]);
  return part(4, K.section(V, { ...rev, edges: [] }, { mat: "brass", angle: 30 }));
}
export function bleedBush(V) {
  const loop = [[0.4, 33.7], [1.3, 33.7], [1.3, 34], [0.9, 34], [0.9, 35.5], [1.3, 35.5], [1.3, 35.8], [0.4, 35.8]];
  return part(5, K.section(V, { ...K.revolve(loop, { at: M.BLEED_U }), edges: [] }, { mat: "solid" }));
}

// ---------------------------------------------------------------- 6 cover, 8 O-ring, 9 tube base, 10 armature tube
export function cover(V) {
  const right = [
    [6.0, 39.5], [15, 39.5], [15, 36], [24.5, 36], [25, 36.5], [25, 47.5], [24.5, 48], [11.2, 48], [11.2, 46.2], [9, 46.2], [9, 42], [6.0, 42],
  ];
  return part(6, K.cut(V, right, { mat: "brass", angle: 135 }) + K.cut(V, K.flipU(right), { mat: "brass", angle: 135 }));
}

export function oring(V) {
  const s = K.rrect(9.15, 46.3, 11.05, 47.95, 0.8);
  return part(8, K.cut(V, s, { mat: "rubber" }) + K.cut(V, K.flipU(s), { mat: "rubber" }));
}

export function tubeBase(V) {
  const rev = K.revolve([[6.0, 42], [8.5, 42], [9, 42.5], [9, 48], [11, 48], [11, 50.6], [10.6, 51], [6.5, 51], [6.5, 49], [6.0, 49]]);
  const roots = [[[-8.45, 42.6], [-8.45, 46]], [[8.45, 42.6], [8.45, 46]]];
  return part(9, K.section(V, { ...rev, edges: [] }, { mat: "brass", angle: 30 }) + K.lines(V, roots, "thin"));
}

export function tube(V) {
  return part(10, K.section(V, { ...K.revolve([[M.TUBE_RI, 49], [M.TUBE_RO, 49], [M.TUBE_RO, 94], [M.TUBE_RI, 94]]), edges: [] }, { mat: "solid" }));
}

// ---------------------------------------------------------------- 11 pole piece with its M6 stud (not cut: a solid pin)
export function pole(V) {
  const f = M.POLE_FACE;
  const outline = [
    [-5.6, f], [5.6, f], [6, f + 0.4], [6, 94], [6.5, 94], [6.5, 96], [3, 96], [3, 105.5], [2.5, 106],
    [-2.5, 106], [-3, 105.5], [-3, 96], [-6.5, 96], [-6.5, 94], [-6, 94], [-6, f + 0.4],
  ];
  return part(11, K.body(V, outline) + K.lines(V, [[[-2.46, 96.6], [-2.46, 105.6]], [[2.46, 96.6], [2.46, 105.6]]], "thin"));
}

// ---------------------------------------------------------------- 12 plunger, 13 pilot seal (drawn shut, moved by x)
const PT = M.PLUNGER_TOP;
export const POCKET = PT - 11.2; // bottom of the spring bore
export function plunger(V) {
  const loop = [
    [0, 39.6], [2.0, 39.6], [2.0, 37.8], [2.8, 37.8], [2.8, 41], [M.PLUNGER_R, 43.5], [M.PLUNGER_R, PT - 0.5], [M.PLUNGER_R - 0.5, PT],
    [2.0, PT], [2.0, POCKET], [0, POCKET - 1.2],
  ];
  const rev = K.revolve(loop);
  const mouth = [[[-2.0, PT], [2.0, PT]], [[-2.0, POCKET], [2.0, POCKET]]];
  return part(12, K.section(V, { ...rev, edges: [] }, { mat: "iron", angle: 45 }) + K.lines(V, mouth, "thin"));
}
export function seal(V) {
  return part(13, K.cut(V, K.rect(-2.0, M.SEAL_LOW, 2.0, 39.6), { mat: "rubber" }));
}

// ---------------------------------------------------------------- 14 plunger spring, for plunger lift x
export function spring(V, x) {
  return part(14, K.springSection(V, { from: POCKET + x, to: M.POLE_FACE, radius: 1.75, wire: 0.4, turns: M.SPRING_TURNS, axis: "v", at: 0 }));
}

// ---------------------------------------------------------------- the coil: 15 bobbin, 16 winding, 17 frame, 18 yoke plate, 19 housing
export function housing(V) {
  const right = [[6.6, 51], [20.5, 51], [21, 51.5], [21, 97.5], [20.5, 98], [3.2, 98], [3.2, 96], [6.6, 96]];
  return part(19, K.cut(V, right, { mat: "plastic", angle: 45 }) + K.cut(V, K.flipU(right), { mat: "plastic", angle: 45 }));
}
export function frame(V) {
  const right = [[6.6, 94], [17, 94], [17, 53], [19, 53], [19, 96], [6.6, 96]];
  return part(17, K.cut(V, right, { mat: "steel", angle: 135 }) + K.cut(V, K.flipU(right), { mat: "steel", angle: 135 }));
}
export function yoke(V) {
  const right = K.rect(6.6, 53, 17, 56);
  return part(18, K.cut(V, right, { mat: "steel", angle: 30 }) + K.cut(V, K.flipU(right), { mat: "steel", angle: 30 }));
}
export function bobbin(V) {
  const right = [[6.6, 56], [16.4, 56], [16.4, 57], [7.6, 57], [7.6, 93], [16.4, 93], [16.4, 94], [6.6, 94]];
  return part(15, K.cut(V, right, { mat: "plastic", angle: 60 }) + K.cut(V, K.flipU(right), { mat: "plastic", angle: 60 }));
}
export function winding(V) {
  const w = M.WIND;
  const right = K.rect(w.ri, w.v0, w.ro, w.v1);
  return part(16, K.cut(V, right, { mat: "bronze", angle: 135 }) + K.cut(V, K.flipU(right), { mat: "bronze", angle: 135 }));
}

// ---------------------------------------------------------------- 20 washer, 21 nut (bolt joint: not cut)
export function coilWasher(V) {
  return part(20, K.body(V, K.rect(3.2, 98, 6, 99.6)) + K.body(V, K.rect(-6, 98, -3.2, 99.6)));
}
export function nut(V) {
  const h0 = 99.6;
  const outline = [[-5, h0], [5, h0], [5, h0 + 4.6], [4.4, h0 + 5.2], [-4.4, h0 + 5.2], [-5, h0 + 4.6]];
  return part(21, K.body(V, outline) + K.lines(V, [[[-2.6, h0 + 0.3], [-2.6, h0 + 4.9]], [[2.6, h0 + 0.3], [2.6, h0 + 4.9]]]));
}

// ---------------------------------------------------------------- water (the accent)
// Above the diaphragm: the control chamber, the cover bore and the armature tube, at pC.
export const chamberWater = [K.rect(-15, 33, 15, 39.5), K.rect(-6, 39.5, 6, 49), K.rect(-6, 49, 6, M.POLE_FACE)];
// Inlet side: port, passage, the annulus round the seat, and the curtain over the seat lip.
export function inletWater(z) {
  const under = underside(z).filter(([r]) => r >= 6.5);
  const curtain = [[6.5, ST], [8.5, ST], [8.5, 33], [15, 33], ...under.slice().reverse(), [6.5, ST + z]];
  return [
    K.rect(-36, PV - RT, -23, PV + RT),
    K.rect(-23.01, 7, -8.5, 21),
    K.rect(-15, 20.99, -8.5, 34),
    K.rect(8.5, 24, 15, 34),
    curtain,
    K.flipU(curtain),
  ];
}
// Outlet side: the seat bore, the outlet passage and port, and the pilot bore.
export function outletWater(z) {
  return [
    K.rect(-6.5, 7, 6.5, ST + z),
    K.rect(6.49, 7, 23, 21),
    K.rect(22.99, PV - RT, 36, PV + RT),
    K.rect(-M.PILOT_D / 2, 32, M.PILOT_D / 2, M.SEAL_LOW + z),
  ];
}
export const waterPath = (V, shapes) => shapes.map((s) => K.d(V, s)).join("");

// ---------------------------------------------------------------- the open position, in phantom (Detail P)
export function phantomOpen(V, z, x) {
  const sl = K.revolve(sleeveLoop).cuts.map((c) => K.line(V, K.move(c, 0, z), "phan", true)).join("");
  const web = K.line(V, K.rect(-12, ST + z, 12, ST + M.WEB + z), "phan", true);
  const nose = [[-2.0, M.SEAL_LOW + x], [2.0, M.SEAL_LOW + x], [2.0, 37.8 + x], [2.8, 37.8 + x], [2.8, 41 + x], [M.PLUNGER_R, 43.5 + x], [M.PLUNGER_R, 46 + x]];
  const noseL = nose.map(([u, v]) => [-u, v]).reverse();
  return web + sl + K.line(V, [...noseL.slice(0, -1), ...nose.slice(1)], "phan");
}

// ---------------------------------------------------------------- VIEW C, from above
export function plan(V) {
  const hexEdges = [-1, 1].flatMap((s) => [[[s * 36, 8.08], [s * 25, 8.08]], [[s * 36, -8.08], [s * 25, -8.08]]]);
  const bosses = [-1, 1].map((s) => K.body(V, s < 0 ? K.rect(-36, -16.17, -25, 16.17) : K.rect(25, -16.17, 36, 16.17))).join("");
  const screwAt = [[-19, -19], [19, -19], [19, 19], [-19, 19]];
  const hex = (cu, cv, r, a0 = 0) => Array.from({ length: 6 }, (_, i) => {
    const a = ((a0 + 60 * i) * Math.PI) / 180;
    return [cu + r * Math.cos(a), cv + r * Math.sin(a)];
  });
  const screws = screwAt.map(([u, w]) => K.body(V, K.circle(u, w, 4.25, 40)) + K.line(V, hex(u, w, 2.31), "vis", true)).join("");
  return (
    part(1, bosses + K.lines(V, hexEdges, "vis")) +
    part(6, K.body(V, K.rrect(-25, -25, 25, 25, 1.5))) +
    part(7, screws) +
    part(19, K.body(V, K.rrect(-21, -17, 21, 17, 2))) +
    part(20, K.body(V, K.circle(0, 0, 6, 48))) +
    part(21, K.body(V, hex(0, 0, 5.77, 30)) + K.line(V, K.circle(0, 0, 4.7, 40), "thin", true)) +
    part(11, K.body(V, K.circle(0, 0, 3, 32)) + K.line(V, K.circle(0, 0, 2.5, 28), "thin", true))
  );
}

// ---------------------------------------------------------------- Detail P's balloons on moving parts
// The circles stay where they are; the leaders follow the parts (x: plunger lift, z: diaphragm lift).
export const PILOT_BALLOONS = [
  { n: 13, at: (x, z) => [-1.0, 38.6 + x], c: [472, 404] },
  { n: 3, at: (x, z) => [3.9, 36.3 + z], c: [728, 418] },
  { n: 2, at: (x, z) => [7.6, 34.75 + z], c: [764, 500] },
  { n: 5, at: (x, z) => [11.15, 34.75 + z], c: [764, 562] },
  { n: 4, at: (x, z) => [-4.5, 33.5 + z], c: [472, 688] },
];
export const pilotBalloon = (V, b, x, z) => K.balloon(V, b.at(x, z), b.c, b.n, { target: b.n });
