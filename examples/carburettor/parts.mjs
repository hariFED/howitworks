// The carburettor's parts, in world mm: u along the bore (air flows left to right, the air horn on
// the left, the engine flange on the right), v up, the bore's axis at v = 0, cut through that axis.
// Each function draws one part into a view and returns SVG, so the main view and every detail draw
// the same geometry at their own scale. Parts that move are re-drawn from the model's state.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;
const rad = (deg) => (deg * Math.PI) / 180;

// ---------------------------------------------------------------- the bore
// Bellmouth lip Ø32 flaring to the Ø26 bore, then a cosine venturi to the Ø20 throat and back.
export function boreR(u) {
  if (u <= -50) return 13 + 3 * ((-50 - u) / 8) ** 2;
  if (u <= -30) return 13;
  if (u <= -6) return 10 + 1.5 * (1 + Math.cos((Math.PI * (u + 30)) / 24));
  if (u <= 2) return 10;
  if (u <= 18) return 10 + 1.5 * (1 - Math.cos((Math.PI * (u - 2)) / 16));
  return 13;
}
const BREAKS = [-58, -50, -30, -6, 2, 18, 46];
function boreU(u0, u1) {
  const us = new Set([u0, u1]);
  for (const b of BREAKS) if (b > u0 && b < u1) us.add(b);
  for (let u = Math.ceil(u0); u < u1; u++) if ((u > -58 && u < -50) || (u > -30 && u < -6) || (u > 2 && u < 18)) us.add(u);
  return [...us].sort((a, b) => a - b);
}
const top = (u0, u1) => boreU(u0, u1).map((u) => [u, boreR(u)]);
const bot = (u0, u1) => boreU(u0, u1).map((u) => [u, -boreR(u)]);

// Fixed passages (world mm)
export const MA = { v: -18.25, r: 0.8 }; // main air drilling, from the bellmouth face to the well
export const PD = { v: -18, r: 0.6 }; // pilot drilling, from the pilot jet to the flange face
export const MAJ_U = -49; // main air jet
export const PAJ_U = 20; // pilot air jet
export const NZ = M.THROAT_U; // nozzle / emulsion tube / main jet axis
export const PJ_U = 12; // pilot jet axis
export const SCREW_U = M.IDLE_U; // mixture screw axis
export const GALLERY = { u: M.NEEDLE_U, v: -21, r: 1.25 }; // fuel inlet gallery, normal to the cut
export const BOWL_TOP = -26.8; // under a 0.8 gasket
export const BOWL_IN = { u0: -42.5, u1: 16.5, v0: -55.5 };
export const SCREWS = [-48, 23]; // bowl screws

// ---------------------------------------------------------------- body (item 1)
export function body(V) {
  const upper = [...top(-58, 46), [46, 21.75], [40, 21.75], [40, 20.5], [-52, 20.5], [-52.5, 21.5], [-54.5, 21.5], [-55, 20.5], [-57.5, 20.5], [-58, 20]];
  const flangeTop = [[40, 28.25], [46, 28.25], [46, 32], [40.5, 32], [40, 31.5]];
  const flangeBot = [[40, -28.25], [46, -28.25], [46, -32], [40.5, -32], [40, -31.5]];
  const mt = MA.v + MA.r;
  const mb = MA.v - MA.r;
  const pt = PD.v + PD.r;
  const pb = PD.v - PD.r;
  const g = GALLERY;
  const lTopA = [...bot(-58, MAJ_U - 1.5), [MAJ_U - 1.5, mt], [-56.5, mt], [-56.5, MA.v + 1], [-58, MA.v + 1]];
  const lTopB = [...bot(MAJ_U + 1.5, NZ - 2.5), [NZ - 2.5, -16], [NZ - 3.5, -16], [NZ - 3.5, mt], [MAJ_U + 1.5, mt]];
  const lBottom = [
    [-58, MA.v - 1], [-56.5, MA.v - 1], [-56.5, mb], [NZ - 3.5, mb], [NZ - 3.5, -33], [NZ - 3, -33], [NZ - 3, -37],
    [NZ - 5, -37], [NZ - 5.5, -36.5], [NZ - 5.5, -26],
    [g.u + 3, -26], [g.u + 3, -22], [g.u + 0.75, -22], ...K.arc(g.u, g.v, g.r, -53.13, 233.13, 14), [g.u - 0.75, -22], [g.u - 3, -22], [g.u - 3, -26],
    [SCREWS[0] + 2, -26], [SCREWS[0] + 2, -20.6], [SCREWS[0], -19.4], [SCREWS[0] - 2, -20.6], [SCREWS[0] - 2, -26],
    [-52, -26], [-52, -20.5], [-57.5, -20.5], [-58, -20],
  ];
  const rUpper1 = [
    ...bot(NZ + 2.5, PAJ_U - 1.5), [PAJ_U - 1.5, pt], [PJ_U - 0.6, pt], [PJ_U - 0.6, -22], [PJ_U - 2.5, -22], [PJ_U - 2.5, -26],
    [NZ + 5.5, -26], [NZ + 5.5, -36.5], [NZ + 5, -37], [NZ + 3, -37], [NZ + 3, -33], [NZ + 3.5, -33], [NZ + 3.5, -16], [NZ + 2.5, -16],
  ];
  const pr = M.PROG_D / 2;
  const [p2u, p2d] = M.PROGS[1];
  const rUpper2 = [[PAJ_U + 1.5, -13], [p2u - p2d / 2, -13], [p2u - p2d / 2, pt], [PAJ_U + 1.5, pt]];
  const rUpper2b = [[p2u + p2d / 2, -13], [M.PROG_U - pr, -13], [M.PROG_U - pr, pt], [p2u + p2d / 2, pt]];
  const ip = M.JETS.idlePort / 2;
  const rUpper3 = [[M.PROG_U + pr, -13], [SCREW_U - ip, -13], [SCREW_U - ip, -16.5], [SCREW_U - 1.5, -16.5], [SCREW_U - 1.5, pt], [M.PROG_U + pr, pt]];
  const rUpper4 = [[SCREW_U + ip, -13], [46, -13], [46, PD.v + 1], [44.5, PD.v + 1], [44.5, pt], [SCREW_U + 1.5, pt], [SCREW_U + 1.5, -16.5], [SCREW_U + ip, -16.5]];
  const s2 = SCREWS[1];
  const rLower1 = [
    [PJ_U + 0.6, pb], [SCREW_U - 1.5, pb], [SCREW_U - 1.5, -19.5], [SCREW_U - 2.5, -19.5], [SCREW_U - 2.5, -30], [28, -30], [28, -26],
    [s2 + 2, -26], [s2 + 2, -20.6], [s2, -19.4], [s2 - 2, -20.6], [s2 - 2, -26], [PJ_U + 2.5, -26], [PJ_U + 2.5, -22], [PJ_U + 0.6, -22],
  ];
  const rLower2 = [
    [SCREW_U + 1.5, pb], [44.5, pb], [44.5, PD.v - 1], [46, PD.v - 1], [46, -21.75], [40, -21.75], [40, -21], [36.5, -21],
    [36.5, -29.5], [36, -30], [SCREW_U + 2.5, -30], [SCREW_U + 2.5, -19.5], [SCREW_U + 1.5, -19.5],
  ];
  const pieces = [upper, flangeTop, flangeBot, lTopA, lTopB, lBottom, rUpper1, rUpper2, rUpper2b, rUpper3, rUpper4, rLower1, rLower2];
  // The hinge lug for the float, beyond the cutting plane: seen, not cut.
  const lug = [[M.PIVOT[0] - 3, -26], [M.PIVOT[0] - 3, M.PIVOT[1]], ...K.arc(M.PIVOT[0], M.PIVOT[1], 3, 180, 360, 8), [M.PIVOT[0] + 3, -26]];
  return part(1, K.body(V, lug) + pieces.map((p) => K.cut(V, p, { mat: "alu", angle: 45 })).join(""));
}

// Thread roots (thin) for the tapped holes the parts sit in: drawn once, over everything.
export function threadRoots(V) {
  const L = [];
  for (const u of SCREWS) L.push([[u - 1.65, -26], [u - 1.65, -21]], [[u + 1.65, -26], [u + 1.65, -21]]);
  return K.lines(V, L, "thin");
}

// ---------------------------------------------------------------- float bowl (2), gasket (3), screws (4)
export function bowl(V) {
  const t = BOWL_TOP;
  const e = t - 4; // the ears' underside
  const leftStub = [[-53, t], [-50.25, t], [-50.25, e], [-52.5, e], [-53, e + 0.5]];
  const leftUpper = [[-45.75, t], [-42.5, t], [-42.5, -38], [-45, -38], [-45, e], [-45.75, e]];
  const main = [
    [-42.5, -42], ...K.arc(-40.5, -53.5, 2, 180, 270, 4), [-7, -55.5], [-7, -61], [-8.5, -61], [-9, -60.5], [-9, -58],
    ...K.arc(-43, -56, 2, 270, 180, 4), [-45, -42],
  ];
  const right = [
    [3, -55.5], ...K.arc(14.5, -53.5, 2, 270, 360, 4), [16.5, t], [20.75, t], [20.75, e], [19, e],
    ...K.arc(17, -56, 2, 0, -90, 4), [5, -58], [5, -60.5], [4.5, -61], [3, -61],
  ];
  const rightStub = [[25.25, t], [27, t], [27, e + 0.5], [26.5, e], [25.25, e]];
  return part(2, [leftStub, leftUpper, main, right, rightStub].map((p) => K.cut(V, p, { mat: "alu", angle: 135 })).join(""));
}

export function gasket(V) {
  const t = -26;
  const b = BOWL_TOP;
  const segs = [[-53, -50.25], [-45.75, -42.5], [16.5, 20.75], [25.25, 27]];
  return part(3, segs.map(([a, c]) => K.cut(V, K.rect(a, b, c, t), { mat: "solid" })).join(""));
}

// Pan-head M4×10 ISO 7045: the head under the ear, the shank up into the body. Not sectioned.
export function bowlScrews(V) {
  let out = "";
  for (const u of SCREWS) {
    const e = BOWL_TOP - 4;
    const shank = [[u - 2, e], [u + 2, e], [u + 2, -20.8], [u + 1.6, -20.4], [u - 1.6, -20.4], [u - 2, -20.8]];
    const head = [[u - 4, e], [u + 4, e], [u + 4, e - 1.4], ...K.arc(u + 2.6, e - 1.4, 1.4, 0, -90, 3).slice(1), [u - 2.6, e - 2.8], ...K.arc(u - 2.6, e - 1.4, 1.4, 270, 180, 3).slice(1)];
    out += K.body(V, shank) + K.body(V, head) + K.lines(V, [[[u - 1.65, -26], [u - 1.65, -21]], [[u + 1.65, -26], [u + 1.65, -21]]], "thin");
    out += K.line(V, [[u - 1, e - 2.8], [u - 1, e - 1.6], [u + 1, e - 1.6], [u + 1, e - 2.8]], "hid");
  }
  return part(4, out);
}

// ---------------------------------------------------------------- drain plug (5) and its washer (6)
export function drainPlug(V) {
  const c = NZ;
  const shank = [[c - 4.9, -56], [c + 4.9, -56], [c + 5, -56.1], [c + 5, -61], [c - 5, -61], [c - 5, -56.1]];
  const head = [[c - 6.5, -62], [c + 6.5, -62], [c + 6.5, -65.4], [c + 6, -66], [c - 6, -66], [c - 6.5, -65.4]];
  const roots = [[[c - 4.3, -56.3], [c - 4.3, -61]], [[c + 4.3, -56.3], [c + 4.3, -61]], [[c - 3.25, -62], [c - 3.25, -66]], [[c + 3.25, -62], [c + 3.25, -66]]];
  return part(5, K.body(V, shank) + K.body(V, head) + K.lines(V, roots, "thin") + K.line(V, [[c - 0.8, -66], [c - 0.8, -64.5], [c + 0.8, -64.5], [c + 0.8, -66]], "hid"));
}
export function drainWasher(V) {
  const c = NZ;
  return part(6, K.body(V, K.rect(c - 7, -62, c - 5, -61)) + K.body(V, K.rect(c + 5, -62, c + 7, -61)));
}

// ---------------------------------------------------------------- main circuit: jet (7), emulsion tube (8), nozzle (9), air jet (10)
export function mainJet(V) {
  const d = M.JETS.main / 2;
  const loop = [[1.3, -33], [3, -33], [3, -37], [3.5, -37], [3.5, -41], [1.5, -41], [1.5, -37.5], [d, -37.5], [d, -35.5], [1.3, -35.5]];
  const rev = K.revolve(loop, { at: NZ });
  return part(7, K.section(V, rev, { mat: "brass", angle: 135 }) + K.lines(V, [[[NZ - 2.6, -33.2], [NZ - 2.6, -37]], [[NZ + 2.6, -33.2], [NZ + 2.6, -37]]], "thin"));
}

// Bleed holes Ø0.8 through both walls at these heights.
export const BLEEDS = [M.BLEED_V, -28.5, -31];
export function emulsionTube(V) {
  const ri = 1.3;
  const ro = 2.5;
  const cuts = [];
  for (const side of [1, -1]) {
    const edges = [-17, ...BLEEDS.flatMap((b) => [b + 0.4, b - 0.4]), -33];
    for (let i = 0; i < edges.length; i += 2) {
      const [a, b] = [edges[i], edges[i + 1]];
      let poly = [[ri, a], [ro, a], [ro, b], [ri, b]];
      if (i === 0) poly = [[ri, -16], [3.5, -16], [3.5, -17], [ro, -17], [ro, b], [ri, b]];
      cuts.push(poly.map(([r, s]) => [NZ + side * r, s]));
    }
  }
  return part(8, cuts.map((p) => K.cut(V, p, { mat: "brass", angle: 60 })).join(""));
}

export function nozzle(V) {
  const loop = [[1.3, M.NOZZLE_TIP], [2.1, M.NOZZLE_TIP], [2.5, M.NOZZLE_TIP - 0.4], [2.5, -16], [1.3, -16]];
  return part(9, K.section(V, K.revolve(loop, { at: NZ }), { mat: "brass", angle: 135 }));
}

const pressJet = (V, u, v0, v1, d, angle = 135) => {
  const r = d / 2;
  const loop = [[r, v0], [1.5, v0], [1.5, v1], [r, v1]];
  return K.section(V, { ...K.revolve(loop, { at: u }), edges: [] }, { mat: "brass", angle });
};
export const mainAirJet = (V) => part(10, pressJet(V, MAJ_U, -boreR(MAJ_U), MA.v + MA.r, M.JETS.mainAir));

// ---------------------------------------------------------------- pilot circuit: jet (11), air jet (12), screw (13), spring (14)
export function pilotJet(V) {
  const d = M.JETS.pilot / 2;
  const loop = [[0.6, -22], [2.5, -22], [2.5, -26], [3, -26], [3, -29], [2, -29], [2, -36], [0.6, -36], [0.6, -34], [d, -34], [d, -33], [0.6, -33]];
  const rev = K.revolve(loop, { at: PJ_U });
  return part(11, K.section(V, rev, { mat: "brass", angle: 135 }) + K.lines(V, [[[PJ_U - 2.1, -22.2], [PJ_U - 2.1, -26]], [[PJ_U + 2.1, -22.2], [PJ_U + 2.1, -26]]], "thin"));
}
export const pilotAirJet = (V) => part(12, pressJet(V, PAJ_U, -13, PD.v + PD.r, M.JETS.pilotAir, 135));

// The mixture screw, apex up: 10° taper, neck, M5×0.5 thread, slotted head. Drawn from its apex.
const TAPER_LEN = 1.3 / Math.tan(rad(M.SCREW_TAPER));
export const screwApex = (turns) => -16.5 + M.JETS.idlePort / 2 / Math.tan(rad(M.SCREW_TAPER)) - M.screwLift(turns);
export function mixtureScrew(V, turns) {
  const a = screwApex(turns);
  const c = SCREW_U;
  const t0 = a - TAPER_LEN;
  const prof = [[0, a], [1.3, t0], [1.3, t0 - 0.8], [2.5, t0 - 1.2], [2.5, a - 20], [3, a - 20], [3, a - 22.6], [0, a - 22.6]];
  const right = prof.map(([r, s]) => [c + r, s]);
  const left = prof.slice(1, -1).reverse().map(([r, s]) => [c - r, s]);
  const out = K.body(V, [...right, ...left]) + K.lines(V, [[[c - 2.1, t0 - 1.4], [c - 2.1, a - 20]], [[c + 2.1, t0 - 1.4], [c + 2.1, a - 20]]], "thin");
  return part(13, out + K.line(V, [[c - 0.6, a - 22.6], [c - 0.6, a - 21], [c + 0.6, a - 21], [c + 0.6, a - 22.6]], "hid"));
}
export function screwSpring(V, turns) {
  const a = screwApex(turns);
  return part(14, K.springSection(V, { from: a - 20, to: -30, radius: 3, wire: 0.5, turns: 3, axis: "v", at: SCREW_U }));
}

// ---------------------------------------------------------------- float (15), arm (16), pin (17), needle (18), seat (19)
// The float rides on the fuel: a level below the set level tips it down about the hinge pin.
export const floatAngle = (level) => (Math.asin(Math.max(-1, Math.min(1, (level - M.LEVEL_SET) / (M.FLOAT_C - M.PIVOT[0])))) * 180) / Math.PI;
const rot = (pts, [cu, cv], deg) => {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return pts.map(([u, v]) => [cu + (u - cu) * c - (v - cv) * s, cv + (u - cu) * s + (v - cv) * c]);
};
const ringPath = (V, outer, inner) => `${K.d(V, outer)}${K.d(V, inner)}`;
export function float(V, level) {
  const a = floatAngle(level);
  const outer = rot(K.rrect(-30, -38, -9.5, -28, 2.4, 3), M.PIVOT, a);
  const inner = rot(K.rrect(-29.2, -37.2, -10.3, -28.8, 1.6, 3), M.PIVOT, a);
  return part(15, `<path class="paper" d="${K.d(V, inner)}"/><path class="solid" fill-rule="evenodd" d="${ringPath(V, outer, inner)}"/>`);
}
export function floatArm(V, level) {
  const a = floatAngle(level);
  const [pu, pv] = M.PIVOT;
  const strip = rot([[pu + 1.4, pv + 0.1], [-29.2, pv + 0.1], [-29.2, pv + 0.9], [pu + 1.2, pv + 0.9]], M.PIVOT, a);
  const eye = `<path class="solid" fill-rule="evenodd" d="${ringPath(V, K.circle(pu, pv, 1.8, 20), K.circle(pu, pv, 1.05, 20))}"/>`;
  return part(16, K.cut(V, strip, { mat: "solid" }) + eye);
}
export const pivotPin = (V) => part(17, K.cut(V, K.circle(M.PIVOT[0], M.PIVOT[1], 1, 16), { mat: "steel", angle: 45 }));

// The tab is the arm's upper face under the needle; the needle rests on it.
export const tabV = (level) => {
  const a = floatAngle(level);
  return M.PIVOT[1] + 0.9 + (M.NEEDLE_U - M.PIVOT[0]) * Math.sin(rad(a));
};
export function needle(V, lift) {
  const c = M.NEEDLE_U;
  const apex = -23 + 0.75 - lift;
  const base = -28.5 + (tabV(M.LEVEL_SET) - -28.5) - lift;
  const prof = [[0, apex], [1.5, apex - 1.5], [1.5, base + 0.3], [1.2, base]];
  const right = prof.map(([r, s]) => [c + r, s]);
  const left = prof.slice(1).reverse().map(([r, s]) => [c - r, s]);
  return part(18, K.body(V, [...right, ...left]) + K.line(V, [[c - 1.5, apex - 2.6], [c + 1.5, apex - 2.6]], "thin"));
}
export function seat(V) {
  const loop = [[0.75, -22], [3, -22], [3, -26], [3.5, -26], [3.5, -27.2], [1.8, -27.2], [1.8, -23], [0.75, -23]];
  return part(19, K.section(V, { ...K.revolve(loop, { at: M.NEEDLE_U }), edges: [] }, { mat: "brass", angle: 135 }) + K.lines(V, [[[M.NEEDLE_U - 2.6, -22.2], [M.NEEDLE_U - 2.6, -26]], [[M.NEEDLE_U + 2.6, -22.2], [M.NEEDLE_U + 2.6, -26]]], "thin"));
}

// ---------------------------------------------------------------- choke (20, 21) and throttle (22, 23)
// A plate seen edge-on in the cut, turned phi degrees from the bore's cross-plane about its spindle.
function platePoly(cu, half, thick, phi, holes = []) {
  // segments along the plate, from -half to +half, minus the holes
  let segs = [[-half, half]];
  for (const [c, r] of holes) segs = segs.flatMap(([a, b]) => (c - r <= a || c + r >= b ? [[a, b]] : [[a, c - r], [c + r, b]]));
  const s = Math.sin(rad(phi));
  const co = Math.cos(rad(phi));
  // along the plate: (s, -co) is the plate's direction for "+"... v measured up
  return segs.map(([a, b]) => [[a, -thick / 2], [b, -thick / 2], [b, thick / 2], [a, thick / 2]].map(([l, t]) => [cu + l * s + t * co, l * co - t * s]));
}
export function chokePlate(V, c) {
  const phi = M.chokePhi(c);
  const polys = platePoly(M.CHOKE_U, 13 / Math.cos(rad(M.CHOKE_SHUT - 0.01)) - 0.1, 0.8, phi, [[6.5, M.CHOKE_HOLE / 2], [-6.5, M.CHOKE_HOLE / 2]]);
  return part(20, polys.map((p) => K.cut(V, p, { mat: "solid" })).join(""));
}
export const chokeSpindle = (V) => part(21, K.cut(V, K.circle(M.CHOKE_U, 0, 2, 24), { mat: "steel", angle: 135 }));
export function throttlePlate(V, theta) {
  const phi = M.phiOf(theta);
  const polys = platePoly(M.SPINDLE_U, M.PLATE_R, 1.2, phi);
  return part(22, polys.map((p) => K.cut(V, p, { mat: "brass", angle: 30 })).join(""));
}
export const throttleSpindle = (V) => part(23, K.cut(V, K.circle(M.SPINDLE_U, 0, 2.5, 28), { mat: "steel", angle: 135 }));

// A point on a plate, `along` mm from its spindle (for balloons that ride with it).
export function platePoint(cu, phi, along) {
  return [cu + along * Math.sin(rad(phi)), along * Math.cos(rad(phi))];
}

// ---------------------------------------------------------------- ball plugs (24), vent nipple (25)
export function ballPlugs(V) {
  return part(24, K.body(V, K.circle(-57.2, MA.v, 1, 16)) + K.body(V, K.circle(45.2, PD.v, 1, 16)));
}
export function ventNipple(V) {
  const top = [[-52, -38], [-43, -38], [-43, -38.5], [-52, -38.5]];
  const botm = [[-52, -41.5], [-43, -41.5], [-43, -42], [-52, -42]];
  return part(25, K.cut(V, top, { mat: "solid" }) + K.cut(V, botm, { mat: "solid" }) + K.line(V, [[-52, -38.5], [-52, -41.5]], "thin"));
}

// ---------------------------------------------------------------- the fuel (the accent)
export const bowlFuel = (level) => [K.rect(BOWL_IN.u0, BOWL_IN.v0, BOWL_IN.u1, level), K.rect(NZ - 5, -56, NZ + 5, BOWL_IN.v0 + 0.01)];
// Fuel standing in (or rising through) the main jet and the emulsion tube, up to `topV`.
export const mainColumn = (topV) => [K.rect(NZ - 1.5, -41, NZ + 1.5, -35.5), K.rect(NZ - 1.3, -35.6, NZ + 1.3, topV)];
// Emulsion above the bleed holes: the tube, the nozzle, the annulus and the air drilling's end.
export const mainEmulsion = () => [K.rect(NZ - 1.3, M.BLEED_V, NZ + 1.3, M.NOZZLE_TIP), K.rect(NZ - 3.5, -33, NZ + 3.5, -16.99)];
// The spray: a fan of fuel blown off the nozzle's lip, downstream along the throat.
export function spray(amount) {
  const a = Math.min(1, amount);
  const len = 3 + 12 * a;
  const tip = M.NOZZLE_TIP;
  return [[NZ - 1.3, tip], [NZ + 1.3, tip], [NZ + 1.6 + len, tip + 0.3], [NZ + 1.2 + len, tip + 1.4 + 3 * a], [NZ + 0.4, tip + 1.3]];
}
// Pilot: the jet's bore, the riser, the drilling, the cavity and the two ports.
export const pilotFuel = () => [K.rect(PJ_U - 0.6, -36, PJ_U + 0.6, PD.v + 0.2)];
export const pilotEmulsion = (prog) => [
  K.rect(PJ_U - 0.6, PD.v - PD.r, 44.5, PD.v + PD.r),
  K.rect(SCREW_U - 1.5, -19.5, SCREW_U + 1.5, -16.5),
  K.rect(SCREW_U - M.JETS.idlePort / 2, -16.6, SCREW_U + M.JETS.idlePort / 2, -13),
  ...M.PROGS.map(([u, d]) => K.rect(u - d / 2, PD.v, u + d / 2, prog > 0 ? -13 : PD.v)),
];
export function idlePlume(amount, u = SCREW_U) {
  const a = Math.min(1, amount);
  const len = 1.2 + 3.5 * a;
  return [[u - 0.4, -13], [u + 0.4, -13], [u + 0.8 + len, -12.7], [u + 0.6 + len, -11.9 - 0.8 * a], [u, -12.2]];
}
// Fuel supply: the gallery, the seat and the clearance round the needle; a stream when it is open.
export const supplyFuel = (lift) => [
  K.circle(GALLERY.u, GALLERY.v, GALLERY.r, 16),
  K.rect(M.NEEDLE_U - 1.8, -27.2, M.NEEDLE_U + 1.8, -22),
];
export function inflowStream(level, lift) {
  if (lift < 0.02) return [];
  const w = 0.15 + 0.5 * Math.min(1, lift / 0.4);
  return [K.rect(M.NEEDLE_U - 1.8 - w, level, M.NEEDLE_U - 1.8, -27.2)];
}
export const pathOf = (V, shapes) => shapes.map((s) => K.d(V, s)).join("");

// ---------------------------------------------------------------- VIEW C: from the air horn, 1:1
// Here u is across the carburettor (w, to the right) and v is up.
export function endView(V, { theta, choke }) {
  let out = "";
  // the flange, furthest back
  out += part(1, K.body(V, K.rrect(-20, -32, 20, 32, 4)) + K.line(V, K.circle(0, 25, 3.25, 24), "vis", true) + K.line(V, K.circle(0, -25, 3.25, 24), "vis", true));
  // spindle stubs: throttle (lever side right), choke (left)
  out += part(23, K.body(V, K.rect(-23, -2.5, 26, 2.5))) + part(21, K.body(V, K.rect(-25, -2, -18, 2)));
  // body under the spigot, and the bowl with its front ear, screw, drain plug
  out += part(1, K.body(V, [[-20, -26], [20, -26], [20, -16], [-20, -16]]) + K.body(V, K.rect(17, -23, 21, -19)));
  out += part(26, K.body(V, [[21, -24], [28, -24], [28.5, -23.2], [33, -22.6], [33.5, -21.5], [33.5, -20.5], [33, -19.4], [28.5, -18.8], [28, -18], [21, -18]]) + K.line(V, [[28, -24], [28, -18]], "thin"));
  out += part(3, K.cut(V, K.rect(-22, -26.8, 22, -26), { mat: "solid" }));
  out += part(2, K.body(V, [[-22, -26.8], [22, -26.8], [22, -56], [20, -58], [7, -58], [7, -61], [-7, -61], [-7, -58], [-20, -58], [-22, -56]]) + K.body(V, K.rect(-5, -30.8, 5, -26.8)));
  out += part(4, K.body(V, [[-4, -30.8], [4, -30.8], [4, -32], [2.6, -33.4], [-2.6, -33.4], [-4, -32]]));
  out += part(6, K.body(V, K.rect(-7, -62, 7, -61)));
  out += part(5, K.body(V, K.rect(-6.5, -66, 6.5, -62)) + K.lines(V, [[[-3.25, -62], [-3.25, -66]], [[3.25, -62], [3.25, -66]]], "thin"));
  out += part(25, `<path class="paper" d="${K.d(V, K.circle(0, -40, 2, 24))}"/><path class="solid" fill-rule="evenodd" d="${ringPath(V, K.circle(0, -40, 2, 24), K.circle(0, -40, 1.5, 24))}"/>`);
  // the spigot face: bead, outer chamfer, the lip, and the throat seen down the bore
  out += part(1, K.body(V, K.circle(0, 0, 21.5, 72)) + K.body(V, K.circle(0, 0, 20.5, 72)) + K.line(V, K.circle(0, 0, 20, 72), "thin", true) + `<path class="paper" d="${K.d(V, K.circle(0, 0, 16, 72))}"/>` + K.line(V, K.circle(0, 0, 16, 72), "vis", true) + K.line(V, K.circle(0, 0, 10, 60), "vis", true));
  // through the throat: the throttle plate and its spindle, clipped to the throat
  const tphi = rad(M.phiOf(theta));
  out += `<g clip-path="url(#clip-throat)" id="c-throttle">${throttleFace(V, theta)}</g>`;
  // the nozzle standing in the throat floor
  out += part(9, K.body(V, [[-2.5, -9.69], [-2.5, -8], [2.5, -8], [2.5, -9.69]]));
  out += `<g id="c-choke" clip-path="url(#clip-bore)">${chokeFace(V, choke)}</g>`;
  return out;
}
export function throttleFace(V, theta) {
  const k = Math.cos(rad(M.phiOf(theta)));
  const plate = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * 2 * Math.PI;
    plate.push([M.PLATE_R * Math.cos(a) * Math.cos(rad(M.PHI_SEAL)), M.PLATE_R * Math.sin(a) * k]);
  }
  return part(22, K.body(V, plate)) + part(23, K.body(V, K.rect(-11, -2.5, 11, 2.5)));
}
export function chokeFace(V, c) {
  const k = Math.cos(rad(M.chokePhi(c)));
  const R = 13;
  const ell = (cu, cv, ru, rv, n = 48) => Array.from({ length: n }, (_, i) => [cu + ru * Math.cos((i / n) * 2 * Math.PI), cv + rv * Math.sin((i / n) * 2 * Math.PI)]);
  const thick = 0.4 * Math.sin(rad(M.chokePhi(c)));
  let out = "";
  if (k > 0.05) {
    const outer = ell(0, 0, R, R * k + thick);
    const holes = [6.5, -6.5].map((h) => ell(0, h * k, M.CHOKE_HOLE / 2, (M.CHOKE_HOLE / 2) * k));
    out += `<path class="paper" fill-rule="evenodd" d="${K.d(V, outer)}${holes.map((h) => K.d(V, h)).join("")}"/><path class="vis" d="${K.d(V, outer)}${holes.map((h) => K.d(V, h)).join("")}"/>`;
  } else {
    out += K.body(V, K.rect(-R, -thick - 0.05, R, thick + 0.05));
  }
  return part(20, out) + part(21, K.body(V, K.rect(-14, -2, 14, 2)));
}
