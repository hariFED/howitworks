// The differential's parts, in world mm. Plan section through the axle and pinion axes:
// u to the vehicle's right, v forward (the pinion end of the housing is at the top of the sheet).
// The origin is where the axle axis crosses the pinion axis: the apex of every pitch cone.
// Each function draws one part into a view and returns SVG, so the main view and the details
// draw the same geometry at their own scale.
//
// The half-shafts and tubes are drawn broken: past the break at u = ±219 the outboard end is
// drawn 370 mm closer to the centre than it is (see OUT_SHIFT).

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;

const deg = Math.PI / 180;
const add = ([a, b], [c, d], k = 1) => [a + c * k, b + d * k];

// ---------------------------------------------------------------- bevel gear geometry
// Half-profile points [r, s] of a bevel gear: r from its axis, s along it from the cone apex.
function bevel(gamma, A, F, a, b) {
  const e = [Math.sin(gamma), Math.cos(gamma)];
  const n = [Math.cos(gamma), -Math.sin(gamma)]; // toward the tips
  const pH = [A * e[0], A * e[1]];
  const t = (A - F) / A;
  const pT = [pH[0] * t, pH[1] * t];
  return {
    pH,
    pT,
    tipH: add(pH, n, a),
    rootH: add(pH, n, -b),
    tipT: add(pT, n, a * t),
    rootT: add(pT, n, -b * t),
    n,
  };
}

export const CROWN = bevel(M.GAMMA_CROWN, M.CONE, M.FACE, 1.8, 8.4);
export const PIN = bevel(M.GAMMA_PINION, M.CONE, M.FACE, 7.4, 2.8);
export const SIDE = bevel(M.GAMMA_SIDE, M.DIFF_CONE, M.DIFF_FACE, 2.4, 4.7);
export const SPID = bevel(M.GAMMA_SPIDER, M.DIFF_CONE, M.DIFF_FACE, 4.2, 2.9);
const teeth = (g) => [g.tipT, g.tipH, g.rootH, g.rootT];

// place [r, s] loops: on the axle axis (u = s, v = ±r) or on the pinion/pin axis (u = ±r, v = s)
const onU = (loop, sgn = 1) => loop.map(([r, s]) => [sgn * s, r]);
const onV = (loop, sgn = 1) => loop.map(([r, s]) => [sgn * r, s]);
const fv = (pts) => K.flipV(pts);
const fu = (pts) => K.flipU(pts);
const four = (pts) => [pts, fv(pts), fu(pts), fv(fu(pts))];

// A gear in axial section: the body hatched to the root cone, the teeth unhatched, the pitch line chained.
function gearCut(V, outline, tooth, pitch, opts) {
  return K.cut(V, outline, opts) + K.body(V, tooth) + K.line(V, pitch, "ctr");
}

// ---------------------------------------------------------------- 1 housing, 2 cover, 3 screws

const HOUSING_UR = [
  [36, 229], [47, 229], [52, 218], [55, 205], [55, 160], [62, 140], [78, 129], [100, 119], [118, 101], [127, 80],
  [131, 60], [136, 53], [190, 50], [190, 38], [128, 38], [128, 31], [117, 31], [117, 40], [99, 40], [99, 53],
  [105, 62], [109, 80], [99, 102], [80, 115], [60, 120], [45, 118], [40, 116], [40, 148.75], [33, 148.75], [33, 196], [36, 196],
];
const HOUSING_LR = [
  [128, -38], [190, -38], [190, -50], [136, -53], [131, -62], [126, -80], [122, -96], [132, -100], [132, -110],
  [108, -110], [108, -90], [104, -68], [99, -53], [99, -40], [117, -40], [117, -31], [128, -31],
];

export function housing(V) {
  const pieces = [HOUSING_UR, HOUSING_LR, fu(HOUSING_UR), fu(HOUSING_LR)];
  return part(1, pieces.map((p) => K.cut(V, p, { mat: "iron", angle: 45 })).join(""));
}

export function cover(V) {
  const top = [[-132, -110], [-106, -110], [-96, -115.5], [-70, -127.5], [-35, -133.5], [0, -135], [35, -133.5], [70, -127.5], [96, -115.5], [106, -110], [132, -110]];
  const bot = top.map(([u, v]) => [u, v - 2.5]).reverse();
  return part(2, K.cut(V, [...top, ...bot], { mat: "solid" }));
}

export function coverScrews(V) {
  const one = (u) =>
    K.body(V, [[u - 4, -112.5], [u + 4, -112.5], [u + 4, -93], [u + 3.4, -92.4], [u - 3.4, -92.4], [u - 4, -93]]) +
    K.body(V, [[u - 6.5, -112.5], [u + 6.5, -112.5], [u + 6.5, -117], [u + 5.8, -117.8], [u - 5.8, -117.8], [u - 6.5, -117]]) +
    K.lines(V, [[[u - 3.4, -110], [u - 3.4, -93]], [[u + 3.4, -110], [u + 3.4, -93]]], "thin");
  return part(3, one(120) + one(-120));
}

// ---------------------------------------------------------------- 4 axle tubes, with their end flanges
export const BREAK = [214, 224]; // drawn u of the two break lines
export const OUT_SHIFT = 370; // the outboard ends are drawn this much closer to the centre

export function tubes(V) {
  const inner = K.revolve([[32, 128], [38, 128], [38, BREAK[0]], [32, BREAK[0]]], { axis: "u" });
  const stub = K.revolve([[32, BREAK[1]], [38, BREAK[1]], [38, 230], [32, 230]], { axis: "u" });
  const flange = K.revolve([[32, 230], [44, 230], [44, 238], [68, 238], [70, 240], [70, 245], [68, 247], [46, 247], [46, 252], [36, 252], [36, 235], [32, 235]], { axis: "u" });
  let out = "";
  for (const sgn of [1, -1]) {
    const m = (pts) => (sgn > 0 ? pts : fu(pts));
    for (const c of [...inner.cuts, ...stub.cuts]) out += K.cut(V, m(c), { mat: "steel", angle: 135 });
    for (const c of flange.cuts) out += K.cut(V, m(c), { mat: "steel", angle: 30 });
    // fillet welds where the tube meets the end flange
    for (const sv of [1, -1]) out += K.cut(V, m([[226.5, 38 * sv], [230, 38 * sv], [230, 41.5 * sv]]), { mat: "solid" });
  }
  return part(4, out);
}

// ---------------------------------------------------------------- 5 drive pinion (a shaft: not hatched)
const PINION_LOOP = [
  [0, 79.6], PIN.rootT, PIN.tipT, PIN.tipH, PIN.rootH, [25, 113], [25, 116], [17.5, 116], [17.5, 148.75], [16, 150.5],
  [16, 196], [15, 197], [15, 216.75], [14, 217.75], [14, 262], [12, 263], [12, 281], [11, 282.5], [0, 282.5],
];

export function pinionGear(V) {
  const rev = K.revolve(PINION_LOOP);
  const root = [[PIN.rootT, PIN.rootH], [fu([PIN.rootT])[0], fu([PIN.rootH])[0]]].map((l) => onV(l));
  const pitchR = [add(PIN.pT, [-Math.sin(M.GAMMA_PINION), -Math.cos(M.GAMMA_PINION)], 3), add(PIN.pH, [Math.sin(M.GAMMA_PINION), Math.cos(M.GAMMA_PINION)], 3)];
  const threads = [[[-11.1, 263], [-11.1, 281]], [[11.1, 263], [11.1, 281]], [[-13.2, 218], [-13.2, 262]], [[13.2, 218], [13.2, 262]]];
  return part(
    5,
    rev.cuts.map((c) => K.body(V, c)).join("") +
      K.lines(V, root, "thin") +
      K.lines(V, threads, "thin") +
      K.line(V, onV(pitchR), "ctr") +
      K.line(V, onV(pitchR, -1), "ctr")
  );
}

// ---------------------------------------------------------------- taper roller bearings
// Local x runs from the cone's back face (0) to the cup's back face (T); dir +1 or -1 along the axis.
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
  const roller = [[x1, rc(x1) + 0.15], [x2, rc(x2) + 0.15], [x2, ro(x2) - 0.15], [x1, ro(x1) - 0.15]];
  const axisLine = [[x1 - 1, rc(x1 - 1) + Dw / 2], [x2 + 1, rc(x2 + 1) + Dw / 2]];
  return { cone, cup, roller, axisLine };
}

// Draw a taper bearing, both halves. place(x, r) gives the world point.
function taperDraw(V, spec, place, angles) {
  const sh = taperShapes(spec);
  let out = { cone: "", cup: "", roller: "" };
  for (const side of [1, -1]) {
    const P = (pts) => pts.map(([x, r]) => place(x, side * r));
    out.cone += K.cut(V, P(sh.cone), { mat: "steel", angle: angles[0] });
    out.cup += K.cut(V, P(sh.cup), { mat: "steel", angle: angles[1] });
    out.roller += K.body(V, P(sh.roller)) + K.line(V, P(sh.axisLine), "ctr");
  }
  return out;
}

export const BRG_CARRIER = { d: 50, D: 80, T: 20, B: 20, C: 15.5, alpha: 14 }; // 32010 X
export const BRG_HEAD = { d: 35, D: 80, T: 32.75, B: 31, C: 25, alpha: 12 }; // 32307
export const BRG_TAIL = { d: 30, D: 72, T: 20.75, B: 19, C: 16, alpha: 13 }; // 30306

export function pinionBearings(V) {
  const head = taperDraw(V, BRG_HEAD, (x, r) => [r, 116 + x], [45, 135]);
  const tail = taperDraw(V, BRG_TAIL, (x, r) => [r, 216.75 - x], [45, 135]);
  return part(6, head.cone + head.cup + head.roller) + part(7, tail.cone + tail.cup + tail.roller);
}

export function carrierBearings(V) {
  let out = "";
  for (const sgn of [1, -1]) {
    const b = taperDraw(V, BRG_CARRIER, (x, r) => [sgn * (95 + x), r], [45, 135]);
    out += b.cone + b.cup + b.roller;
  }
  return part(15, out);
}

export function shims(V) {
  const s = K.rect(115.2, 32, 116.9, 40);
  return part(16, [s, fv(s), fu(s), fv(fu(s))].map((p) => K.cut(V, p, { mat: "solid" })).join(""));
}

// ---------------------------------------------------------------- 8 spacer, 9 seal, 10 flange, 11 nut

export function spacer(V) {
  const inner = [[16.5, 147.4], [16.5, 163], [20.4, 172], [16.5, 181], [16.5, 197.6]];
  const outer = [[18.5, 197.6], [18.5, 181.6], [22.4, 172], [18.5, 162.4], [18.5, 147.4]];
  const rev = K.revolve([...inner, ...outer]);
  return part(8, rev.cuts.map((c) => K.cut(V, c, { mat: "solid" })).join(""));
}

export function seal(V) {
  const caseL = [[34.6, 219.2], [36, 219.2], [36, 229], [26.4, 229], [26.4, 227.6], [34.6, 227.6]];
  const lip = [[22.5, 220.4], [24.2, 219.2], [34, 219.2], [34, 227], [26.6, 227], [25, 224.6], [22.5, 223.4]];
  let out = "";
  for (const sgn of [1, -1]) {
    out += K.cut(V, onV(lip, sgn), { mat: "rubber" }) + K.cut(V, onV(caseL, sgn), { mat: "solid" });
    out += K.cut(V, K.circle(sgn * 26.2, 222.6, 1.0, 12), { mat: "solid" });
  }
  return part(9, out);
}

export function companionFlange(V) {
  // the four bolt holes lie at 45° to the cutting plane, so the disc is cut solid
  const a = K.revolve([[14, 216.75], [22.5, 216.75], [22.5, 243], [25, 245], [54, 245], [55, 246], [55, 254], [54, 255], [30, 257.5], [25, 262], [14, 262]]);
  return part(10, a.cuts.map((c) => K.cut(V, c, { mat: "steel", angle: 135 })).join(""));
}

export function pinionNut(V) {
  const rev = K.revolve([[12, 262], [17, 262], [18, 263], [18, 277], [17, 278], [12, 278]]);
  return part(11, rev.cuts.map((c) => K.body(V, c)).join(""));
}

// ---------------------------------------------------------------- 12 crown wheel, 13 bolts, 14 carrier

const CROWN_OUT = [
  CROWN.tipT, CROWN.tipH, CROWN.rootH, add(CROWN.rootH, CROWN.n, -2), [109.4, 47.5], [107.5, 50], [91, 50], [91, 34.5],
  [79, 34.5], [79, 50], [63, 50], [63, 35], [66, 33], add(CROWN.rootT, CROWN.n, -2),
];

export function crown(V) {
  let out = "";
  for (const sv of [1, -1]) {
    const pl = (pts) => (sv > 0 ? onU(pts) : fv(onU(pts)));
    const pitch = [add(CROWN.pT, [-Math.sin(M.GAMMA_CROWN), -Math.cos(M.GAMMA_CROWN)], 3), add(CROWN.pH, [Math.sin(M.GAMMA_CROWN), Math.cos(M.GAMMA_CROWN)], 3)];
    out += gearCut(V, pl(CROWN_OUT), pl(teeth(CROWN)), pl(pitch), { mat: "steel", angle: 45 });
  }
  return part(12, out);
}

// The crown wheel's tips run inside the pinion's teeth at the mesh: hidden there.
export function crownMeshHidden(V) {
  return K.line(V, onU([CROWN.tipT, CROWN.tipH]), "hid");
}

export function crownBolts(V) {
  let out = "";
  for (const sv of [1, -1]) {
    const pl = (pts) => (sv > 0 ? pts : fv(pts));
    out += K.body(V, pl([[35.5, 79.6], [36.2, 79], [60, 79], [60, 91], [36.2, 91], [35.5, 90.4]]));
    out += K.body(V, pl([[60, 76.5], [67, 76.5], [67.7, 77.2], [67.7, 92.8], [67, 93.5], [60, 93.5]]));
    out += K.lines(V, [pl([[36.2, 80], [50, 80]]), pl([[36.2, 90], [50, 90]])], "thin");
  }
  return part(13, out);
}

// The carrier is cut through the cross pin, so its section is not a body of revolution:
// two pieces each side of the pin bosses, mirrored front to back.
const sphere = (u0, u1, r = 41.5) => {
  const a0 = Math.atan2(Math.sqrt(r * r - u0 * u0), u0) / deg;
  const a1 = Math.atan2(Math.sqrt(r * r - u1 * u1), u1) / deg;
  return K.arc(0, 0, r, a0, a1, 10);
};
const CARRIER_UL = [
  [-10, 56], [-17, 56], [-22, 53], [-32, 49.5], [-52, 47.5], [-62, 44.5], [-80, 38.5], [-93, 35], [-95, 35], [-95, 25],
  [-117, 25], [-117, 16], [-46, 16], [-46, 22], [-28.4, 22], ...sphere(-28.4, -10),
];
const CARRIER_UR = [
  ...sphere(10, 28.4), [28.4, 22], [46, 22], [46, 16], [117, 16], [117, 25], [95, 25], [95, 35], [80, 38.5], [66, 41.5],
  [60, 44], [60, 79.5], [50, 79.5], [50, 63], [35, 63], [35, 58.5], [22, 55], [17, 56], [10, 56],
];
const CARRIER_FL = [[50, 90.5], [60, 90.5], [60, 99], [59, 100], [50, 100]];

export function carrier(V) {
  const pieces = [CARRIER_UL, CARRIER_UR, CARRIER_FL];
  return part(14, [...pieces, ...pieces.map(fv)].map((p) => K.cut(V, p, { mat: "iron", angle: 135 })).join(""));
}

// ---------------------------------------------------------------- 17–22 the gear cluster

const SIDE_OUT = [[14, 12.73], SIDE.tipT, SIDE.tipH, SIDE.rootH, [30.2, 26.4], [22, 26.4], [22, 46], [14, 46]];
const SPIDER_OUT = [[10, SPID.tipT[1]], SPID.tipT, SPID.tipH, SPID.rootH, ...K.arc(0, 0, 40, Math.atan2(SPID.rootH[1], SPID.rootH[0]) / deg, Math.atan2(38.73, 10) / deg, 5).slice(1)];

export function sideGears(V) {
  let out = "";
  for (const su of [1, -1]) {
    const pitch = [add(SIDE.pT, [-Math.sin(M.GAMMA_SIDE), -Math.cos(M.GAMMA_SIDE)], 1.5), add(SIDE.pH, [Math.sin(M.GAMMA_SIDE), Math.cos(M.GAMMA_SIDE)], 1.5)];
    for (const sv of [1, -1]) {
      const pl = (pts) => onU(pts, su).map(([u, v]) => [u, sv * v]);
      out += gearCut(V, pl(SIDE_OUT), pl(teeth(SIDE)), pl(pitch), { mat: "steel", angle: su > 0 ? 60 : 30 });
    }
  }
  return part(17, out);
}

export function sideGearHidden(V) {
  return K.lines(V, four(onU([SIDE.tipT, SIDE.tipH])), "hid");
}

export function sideWashers(V) {
  const w = K.rect(26.6, 22.3, 28.2, 29.6);
  return part(18, four(w).map((p) => K.cut(V, p, { mat: "solid" })).join(""));
}

export const spiderOutline = (sv, su) => onV(SPIDER_OUT, su).map(([u, v]) => [u, sv * v]);

export function spiders(V) {
  let out = "";
  for (const sv of [1, -1]) {
    const pitch = [add(SPID.pT, [-Math.sin(M.GAMMA_SPIDER), -Math.cos(M.GAMMA_SPIDER)], 1.5), add(SPID.pH, [Math.sin(M.GAMMA_SPIDER), Math.cos(M.GAMMA_SPIDER)], 1.5)];
    for (const su of [1, -1]) {
      const pl = (pts) => onV(pts, su).map(([u, v]) => [u, sv * v]);
      out += gearCut(V, pl(SPIDER_OUT), pl(teeth(SPID)), pl(pitch), { mat: "steel", angle: su > 0 ? 30 : 60 });
    }
  }
  return part(19, out);
}

export function spiderWashers(V) {
  const outer = sphere(10, 18.2, 41.4);
  const inner = sphere(18.2, 10, 40.1);
  const w = [...outer.map(([u, v]) => [u, v]), ...inner].map(([u, v]) => [Math.abs(u), v]);
  return part(20, four(w).map((p) => K.cut(V, p, { mat: "solid" })).join(""));
}

export function crossPin(V) {
  const pin = [[-10, -55], [-9.2, -56], [9.2, -56], [10, -55], [10, 55], [9.2, 56], [-9.2, 56], [-10, 55]];
  return part(21, K.body(V, pin) + K.line(V, [[-10, 47.5 + 3], [10, 47.5 + 3]], "thin") + K.line(V, [[-10, 47.5 - 3], [10, 47.5 - 3]], "thin"));
}

export function rollPin(V) {
  const p = [[-15.4, 44.5], [15.4, 44.5], [16, 45.1], [16, 49.9], [15.4, 50.5], [-15.4, 50.5], [-16, 49.9], [-16, 45.1]];
  return part(22, K.body(V, p) + K.line(V, [[-15.4, 47.5], [15.4, 47.5]], "thin"));
}

// ---------------------------------------------------------------- 23 half-shafts, 24 wheel bearings
export const FL = { u0: 262, u1: 270, r: 70, pcd: 114.3 / 2, tip: 292 };

export function halfShafts(V) {
  const inner = [[11.6, 0], [11.6, 14.2], [12.4, 15], [BREAK[0], 15], [BREAK[0], -15], [12.4, -15], [11.6, -14.2]];
  const outer = [
    [BREAK[1], 15], [233, 15], [234, 17.5], [252, 17.5], [252, 20], [261, 20], [262, FL.r - 1], [263, FL.r], [270, FL.r], [270, 30], [276, 30], [277, 29],
    [277, -29], [276, -30], [270, -30], [270, -FL.r], [263, -FL.r], [262, -FL.r + 1], [261, -20], [252, -20], [252, -17.5], [234, -17.5], [233, -15], [BREAK[1], -15],
  ];
  const splines = [[[12.4, 14], [48, 14]], [[12.4, -14], [48, -14]]];
  let out = "";
  for (const su of [1, -1]) {
    const m = (pts) => (su > 0 ? pts : fu(pts));
    out += K.body(V, m(inner)) + K.body(V, m(outer)) + K.lines(V, splines.map(m), "thin");
    // the run-out of the spline, a thin 30° line
    out += K.lines(V, [m([[48, 14], [50, 15]]), m([[48, -14], [50, -15]])], "thin");
  }
  return part(23, out);
}

export function wheelBearings(V) {
  let out = "";
  for (const su of [1, -1]) {
    for (const sv of [1, -1]) {
      const m = (pts) => pts.map(([u, v]) => [su * u, sv * v]);
      out += K.cut(V, m([[235.3, 17.5], [251.7, 17.5], [251.7, 21.9], [235.3, 21.9]]), { mat: "steel", angle: 45 });
      out += K.cut(V, m([[235.3, 31.6], [251.7, 31.6], [251.7, 36], [235.3, 36]]), { mat: "steel", angle: 135 });
      out += K.cut(V, m([[236, 22.4], [236.9, 22.4], [236.9, 31.1], [236, 31.1]]), { mat: "solid" });
      out += K.cut(V, m([[250.1, 22.4], [251, 22.4], [251, 31.1], [250.1, 31.1]]), { mat: "solid" });
      out += K.body(V, m(K.circle(243.5, 26.75, 5.55, 28)));
    }
  }
  return part(24, out);
}

// The wheel studs, 5 on 114.3 PCD, pressed into the shaft flange. The section removes everything
// above the cutting plane; the studs below it stick out of the flange's outer face and are seen,
// sliding up and down the flange as the shaft turns. alpha: shaft angle, from the top (+z) toward +v.
export function studs(V, su, alpha) {
  const list = [];
  for (let i = 0; i < 5; i++) {
    const a = alpha + (i * 2 * Math.PI) / 5;
    const z = Math.cos(a);
    if (z > 0.02) continue;
    list.push([z, FL.pcd * Math.sin(a)]);
  }
  list.sort((p, q) => p[0] - q[0]); // the deepest first, the nearest last
  return list
    .map(([, v]) => {
      const pts = [[FL.u1, v - 6], [FL.tip - 1, v - 6], [FL.tip, v - 5], [FL.tip, v + 5], [FL.tip - 1, v + 6], [FL.u1, v + 6]];
      const pl = su > 0 ? pts : fu(pts);
      const th = [[FL.u1 + 2, v - 5.1], [FL.tip - 1, v - 5.1]];
      const th2 = [[FL.u1 + 2, v + 5.1], [FL.tip - 1, v + 5.1]];
      const m = (l) => (su > 0 ? l : fu(l));
      return K.body(V, pl) + K.lines(V, [m(th), m(th2)], "thin");
    })
    .join("");
}

// ---------------------------------------------------------------- VIEW D: the gear cluster from above,
// carrier broken away, riding with the carrier. Outside view: the teeth on the near half of each cone.

const SPIDER_SIL = [
  [-SPID.tipT[0], SPID.tipT[1]], SPID.tipT, SPID.tipH, SPID.rootH,
  ...K.arc(0, 0, 40, Math.atan2(SPID.rootH[1], SPID.rootH[0]) / deg, Math.atan2(38.73, 10) / deg, 5).slice(1),
  [10, 38.73], [-10, 38.73],
  ...fu(K.arc(0, 0, 40, Math.atan2(SPID.rootH[1], SPID.rootH[0]) / deg, Math.atan2(38.73, 10) / deg, 5)).slice(0, -1),
  [-SPID.rootH[0], SPID.rootH[1]], [-SPID.tipH[0], SPID.tipH[1]],
];
export const spiderSil = (sv) => SPIDER_SIL.map(([u, v]) => [u, sv * v]);

// spin: the spider's angle (rad) about its own axis, from +z toward +u
export function spiderTeeth(V, sv, spin) {
  const N = M.Z_SPIDER;
  const tips = [];
  const roots = [];
  const w = 0.2 * (Math.PI / N);
  for (let i = 0; i < N; i++) {
    const a = spin + (i * 2 * Math.PI) / N;
    for (const [list, ang] of [[tips, a - w], [tips, a + w], [roots, a + Math.PI / N]]) {
      if (Math.cos(ang) <= 0.04) continue;
      const s = Math.sin(ang);
      const T = list === tips ? [SPID.tipT, SPID.tipH] : [SPID.rootT, SPID.rootH];
      list.push([[T[0][0] * s, sv * T[0][1]], [T[1][0] * s, sv * T[1][1]]]);
    }
  }
  return K.lines(V, tips, "vis tooth") + K.lines(V, roots, "thin");
}

export function spiderViewBody(V, sv) {
  return K.body(V, spiderSil(sv)) + K.line(V, [[-SPID.tipH[0], sv * SPID.tipH[1]], [SPID.tipH[0], sv * SPID.tipH[1]]], "vis") +
    K.line(V, [[-SPID.rootH[0], sv * SPID.rootH[1]], [SPID.rootH[0], sv * SPID.rootH[1]]], "vis");
}

const SIDE_SIL = [SIDE.tipT, SIDE.tipH, SIDE.rootH, [30.2, 26.4], [22, 26.4], [22, 46]];
export function sideViewBody(V, su) {
  const half = onU(SIDE_SIL, su);
  const sil = [...half, ...fv(half)];
  const edges = [
    [[su * SIDE.tipH[1], SIDE.tipH[0]], [su * SIDE.tipH[1], -SIDE.tipH[0]]],
    [[su * SIDE.rootH[1], SIDE.rootH[0]], [su * SIDE.rootH[1], -SIDE.rootH[0]]],
    [[su * 26.4, 30.2], [su * 26.4, -30.2]],
  ];
  return K.body(V, sil) + K.lines(V, edges, "vis");
}

// rot: the side gear's angle relative to the carrier, from +z toward +v
export function sideTeeth(V, su, rot) {
  const N = M.Z_SIDE;
  const tips = [];
  const roots = [];
  const w = 0.2 * (Math.PI / N);
  for (let i = 0; i < N; i++) {
    const a = rot + (i * 2 * Math.PI) / N;
    for (const [list, ang] of [[tips, a - w], [tips, a + w], [roots, a + Math.PI / N]]) {
      if (Math.cos(ang) <= 0.04) continue;
      const s = Math.sin(ang);
      const T = list === tips ? [SIDE.tipT, SIDE.tipH] : [SIDE.rootT, SIDE.rootH];
      list.push([[su * T[0][1], T[0][0] * s], [su * T[1][1], T[1][0] * s]]);
    }
  }
  return K.lines(V, tips, "vis tooth") + K.lines(V, roots, "thin");
}

// ---------------------------------------------------------------- PLAN: the car, 1:100, in its own frame
// World mm, the rear axle's centre at the origin, the car heading +v.
export const CAR = { track: M.TRACK * 1000, base: M.WHEELBASE * 1000, rear: -960, front: 3640, half: 900, tyreW: 225, tyreL: 640 };

export function carBody(V) {
  const b = K.rrect(-CAR.half, CAR.rear, CAR.half, CAR.front, 380, 6);
  return K.line(V, b, "phan", true);
}

// A path of a point starting at (u0, 0) heading +v, on curvature k (1/mm, + to the left), s along it.
export function pathPoint(u0, k, s) {
  if (Math.abs(k) < 1e-9) return [u0, s];
  return [u0 - (1 - Math.cos(k * s)) / k, Math.sin(k * s) / k];
}

export function tyre(V, cu, cv, steerRad, tread) {
  const ca = Math.cos(steerRad);
  const sa = Math.sin(steerRad);
  const rot = ([u, v]) => [cu + u * ca - v * sa, cv + u * sa + v * ca];
  const w = CAR.tyreW / 2;
  const l = CAR.tyreL / 2;
  const box = K.rrect(-w, -l, w, l, 40, 3).map(rot);
  // tread bars across the tyre, moving back as the wheel turns (tread = rolled distance, mm)
  const pitch = 90;
  const off = ((tread % pitch) + pitch) % pitch;
  const bars = [];
  for (let y = -l + 40 - off + pitch; y < l - 40; y += pitch) if (y > -l + 40) bars.push([rot([-w + 30, -y]), rot([w - 30, -y])]);
  return K.body(V, box) + K.lines(V, bars, "thin");
}
