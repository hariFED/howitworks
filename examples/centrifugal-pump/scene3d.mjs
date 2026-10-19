// The centrifugal pump's solids for its 3D view (centrifugal-pump-3d.html), from the 2D sheet's own
// numbers: model.mjs (impeller, volute and nozzle sizes) and parts.mjs (the A-A half-profiles, the
// B-B volute spiral rv(), the vane outlines VANE_PTS). Pure data built with kit/solid3d.mjs.
//
// Frame: x = Section A-A's u (along the shaft, toward the drive end), y = its v (up), z = Section
// B-B's x. B-B looks from the suction side (−x) toward the drive end, so its x runs along +z. The
// cutting plane z = 0 is A-A's plane, and the kept half z < 0 is the half A-A shows (its arrows on B-B
// point to −x): the volute from the top round the left to the bottom, 90° to 270° in B-B.
//
// The casing is cast in touching pieces (castings without CSG): the turned suction side as a lathe;
// the volute as prisms along the shaft of B-B outlines (the front wall, the shell round the spiral
// passage, a rear wall that closes the channel, the rear flange the cover spigots into); the foot, a
// web and the round discharge flange. Where two pieces continue one face along the shaft they
// overlap by 0.1 mm, so no crack opens along the joint (never radially: a ray running inside one
// piece would meet the other's bore wall, at a grazing angle, in front of the cut face). The impeller is its two shrouds (the sheet's meridional
// loops) and six vanes extruded from the sheet's B-B outlines, whose two faces live3d.js bends onto
// the shroud and hub surfaces (vaneU below). Keyways are cut where keys sit: the shaft's seats and
// the hubs' slots are short prisms between lathes.

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const rad = Math.PI / 180;
const T0 = M.TONGUE_DEG;
const polar = (r, deg) => [r * Math.cos(deg * rad), r * Math.sin(deg * rad)];
const X = (o = {}) => ({ axis: "x", at: [0, 0], ...o });
const rs = (uv) => uv.map(([u, v]) => [v, u]); // the sheet's [u, v] → a lathe's [r, s] round the shaft
const at = (r, deg) => [r * Math.sin(deg * rad), r * Math.cos(deg * rad)]; // B-B polar → lathe `at` [y, z]

// ---------------------------------------------------------------- B-B outlines (a = z = B-B x, b = y)
// the volute's inner wall, from the tongue (rv = R_TONGUE) round to the throat (R_THROAT), and offset
function spiral(a0, a1, step, dr = 0) {
  const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / step));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return polar(P.rv(a) + dr, a);
  });
}
const arcPts = (r, a0, a1, step) => {
  const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / step));
  return Array.from({ length: n + 1 }, (_, i) => polar(r, a0 + ((a1 - a0) * i) / n));
};
export const NOZ = 142; // the discharge flange's underside: the volute prisms stop here, the round flange starts
const nozzleL = [[-16, NOZ], [-16, 120], [-10, 108], [0, 102], [12, 99], [30, 92]]; // parts.mjs nozzleLeftIn, cut at NOZ
const nozzleR = [[52, 116], [34, 128], [16, 140], [16, NOZ]]; // nozzleRightIn
const spiralIn = spiral(T0, T0 + 360, 4);
// the water's way: the spiral passage and the nozzle up to the flange (the sheet's voluteWater)
export const PASSAGE = [...nozzleL, ...spiralIn, ...nozzleR];
// the casting's outside, a 10 mm wall round the spiral as B-B draws it, with its pedestal to the foot
const outerSpiral = [...spiral(T0 + 360, 290, 4, 10).slice(1), [44, -122], [-44, -122], ...spiral(250, 112, 4, 10)];
const top = [[26, NOZ], [42, 135], [60, 122], polar(M.R_THROAT + 10, T0)];
export const OUTER = [[-26, NOZ], ...top, ...outerSpiral, [-26, 120]];
// the shell: the outside less the passage, one outline that enters and leaves through the nozzle
const SHELL = [[16, NOZ], ...top, ...outerSpiral, [-26, 120], [-26, NOZ], [-16, NOZ], ...nozzleL.slice(1), ...spiralIn, ...nozzleR.slice(0, -1)];
// the rear flange, Ø256 like the cover and the bracket, over the same pedestal and nozzle
const a128 = Math.atan2(Math.sqrt(128 ** 2 - 26 ** 2), 26) / rad;
const aPed = -Math.acos(44 / 128) / rad;
export const REAR = [[-26, NOZ], ...top, ...arcPts(128, T0 - 3, aPed, 3), [44, -122], [-44, -122], ...arcPts(128, 180 - aPed, 180 - a128, 3)];

// every lathe (solids and water) is turned with half the kit's segments (LATHE_N = 72 above r 20, 48
// above r 6, else 24: the kit's `segments`), to keep the triangle budget; some 50 turned solids would
// otherwise draw about twice it. A prism's circle that meets a lathe face to face uses the same count.
export const LATHE_N = 72;
const halfSeg = (s) => (s.kind !== "lathe" || s.segments != null ? s : { ...s, segments: ((r) => (r > 20 ? LATHE_N : r > 6 ? 48 : 24))(Math.max(...s.loop.map(([r]) => r))) });

// the casing bolts on Ø228, none at the top where the nozzle is (A-A cuts the one at 270°)
export const BOLT_R = -P.BOLT_V;
export const BOLT_DEG = [150, 190, 230, 270, 310, 350, 30, 70];
const boltHoles = (r = 6.05) => BOLT_DEG.map((d) => S.circle(...polar(BOLT_R, d), r, 32));
// the bearing cover's cap screws on Ø80, two of them in the plane as A-A shows them
export const SCREW_DEG = [0, 90, 180, 270];
const screwHoles = () => SCREW_DEG.map((d) => S.circle(...polar(40, d), 3.05, 24));

// a round hole with a keyway slot |a| < half up to b = top (a hub's bore)
function keyhole(r, half, top, n = 48) {
  const a0 = Math.atan2(Math.sqrt(r * r - half * half), half) / rad;
  return [...K.arc(0, 0, r, 180 - a0, 360 + a0, n), [half, top], [-half, top]];
}
// a round shaft with a key seat |a| < half from b = floor up (a shaft's keyseat)
function keyseat(r, half, floor, n = 64) {
  const a0 = Math.atan2(Math.sqrt(r * r - half * half), half) / rad;
  return [[half, floor], [-half, floor], ...K.arc(0, 0, r, 180 - a0, 360 + a0, n)];
}

// A smooth curve through a cast profile's points (Catmull-Rom, `k` steps a span): a turned or cast
// surface has no kinks, and the outline pass draws every kink it sees edge-on.
function smooth(pts, k = 4) {
  const out = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let j = 1; j <= k; j++) {
      const t = j / k;
      const c = (a, b, c2, d) => 0.5 * (2 * b + (c2 - a) * t + (2 * a - 5 * b + 4 * c2 - d) * t * t + (3 * b - a - 3 * c2 + d) * t * t * t);
      out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}

// ---------------------------------------------------------------- the vanes between the shrouds
// A vane is extruded along x from VANE_U[0] to VANE_U[1]; live3d.js moves its two end faces onto the
// front shroud's inner surface and the hub's (the meridional curves below, from parts.mjs), so the
// vane fills the passage from the eye to the outlet: u = vaneU(t, r), t = 0 at the shroud, 1 at the hub.
export const VANE_U = [-1, 1];
const SHROUD_IN = rs(P.frontShroud).slice(1, 9); // [r, u] from (28, −30) to (84.5, −3)
const HUB_IN = rs(P.hubLoop).slice(1, 8); // [r, u] from (17, −14) to (84.5, 3)
const lerpR = (list, r) => {
  if (r <= list[0][0]) return list[0][1];
  for (let i = 1; i < list.length; i++) {
    const [r0, u0] = list[i - 1];
    const [r1, u1] = list[i];
    if (r <= r1) return u0 + ((u1 - u0) * (r - r0)) / (r1 - r0);
  }
  return list[list.length - 1][1];
};
export const vaneU = (t, r) => (t < 0.5 ? lerpR(SHROUD_IN, r) : lerpR(HUB_IN, r));

// ---------------------------------------------------------------- the explosion, along the shaft
// The bracket and the shaft's bearings stay; the wet end comes off toward the suction side in the
// order it was built (cover, gasket, seal seat, seal, key, impeller, nut, wear ring, casing), the
// drive end toward the coupling.
export const EX = {
  1: -400, 3: -315, 4: -295, 2: -255, 5: -210, 9: -175, 10: -130, 11: -130, 7: -95, 8: -60,
  12: 80, 17: 45, 18: 70, 19: 95, 20: 120, 22: 165, 21: 180,
};
const ex = (id) => (EX[id] ? [EX[id], 0, 0] : null);

export function parts() {
  const out = [];
  const iron = { mat: "iron", angle: 45 };

  // 1 VOLUTE CASING
  const suction = [
    [25, -112], [49.5, -112], [49.5, -110], [82.5, -110], [82.5, -92], [34, -92],
    ...smooth([[34, -60], [42, -50], [50, -38], [60, -30], [72, -25], [86, -22.3], [88, -22]], 2), [88, -10.5],
    ...smooth([[88, -10.5], [80, -11.5], [68, -13.5], [56, -16.5], [48, -20], [43, -24], [40, -28], [38, -30]], 2).slice(1), [38, -46], [25, -46],
  ];
  out.push(
    S.part(1, "VOLUTE CASING 50-32-160", [
      S.lathe(suction, X()),
      S.extrude(OUTER, { along: "x", from: -22, to: -14, holes: [S.circle(0, 0, 88, LATHE_N)] }),
      S.extrude(SHELL, { along: "x", from: -14.1, to: 14 }),
      S.extrude(PASSAGE, { along: "x", from: 11, to: 14, holes: [S.circle(0, 0, 88, 144)] }),
      S.extrude(REAR, { along: "x", from: 13.9, to: 26, holes: [S.circle(0, 0, 98.05, 144), ...boltHoles()] }),
      S.lathe([[16, NOZ], [70, NOZ], [70, 160], [39, 160], [39, 162], [16, 162]], { axis: "y", at: [0, 0] }),
      S.box([-56, -132, -75], [26, -122, 75]),
      S.extrude([[-22, -122], [-22, -98], [-23, -108], [-26, -116], [-31, -121], [-34, -122]], { along: "z", from: -8, to: 8 }),
    ], { ...iron, explode: ex(1), anchor: { cut: [-101, 66, 0], out: { c: [-101, 0, 0], r: 82.5, axis: "x" } } }),
  );

  // 2 IMPELLER: front shroud, hub (its bore opened to the key slot below r 13), the slotted bore ring, six vanes
  const hub = rs(P.hubLoop).map(([r, u]) => [r === 10 ? 13 : r, u]);
  out.push(
    S.part(2, "IMPELLER Ø169, 6 VANES, CLOSED", [
      S.lathe(rs(P.frontShroud), X()),
      S.lathe(hub, X()),
      S.extrude(S.circle(0, 0, 13, LATHE_N), { along: "x", from: -14, to: 14, holes: [keyhole(10.05, 3.05, 12.55)], live: "bore" }),
      ...P.VANE_PTS.map((pts, k) => S.extrude(pts, { along: "x", from: VANE_U[0], to: VANE_U[1], live: "v" + k })),
    ], { mat: "bronze", angle: 135, explode: ex(2), anchor: { cut: [5.6, -62, 0], out: { c: [0, 0, 0], r: 84.5, axis: "x" } } }),
  );

  // 3 WEAR RING
  out.push(
    S.part(3, "CASING WEAR RING Ø64", [S.tube({ ...X(), r0: 32.3, r1: 38, from: -46, to: -30 })], {
      mat: "steel", angle: 30, explode: ex(3), anchor: { cut: [-38, -35.2, 0], out: { c: [-38, 0, 0], r: 38, axis: "x" } },
    }),
  );
  // 4 IMPELLER CAP NUT (threads on the shaft's M16 end, closed over it)
  out.push(
    S.part(4, "IMPELLER CAP NUT M16", [S.lathe([[0, -32], [3, -31.6], [7, -30.5], [10.5, -28], [12, -26], [12, -14], [8, -14], [8, -25], [7, -26], [0, -26]], X())], {
      explode: ex(4), anchor: { cut: [-29.5, 5, 0], out: { c: [-29.5, 0, 0], r: 11, axis: "x" } },
    }),
  );
  // 5 IMPELLER KEY
  out.push(
    S.part(5, "KEY 6×6×24", [S.box([-12, 6.5, -3], [12, 12.5, 3])], {
      explode: ex(5), anchor: { cut: [4, 9.5, 0], out: { c: [4, 12.5, 0] } },
    }),
  );

  // 6 PUMP SHAFT: the sheet's stepped profile, with the two key seats as prisms
  out.push(
    S.part(6, "PUMP SHAFT Ø25", [
      S.lathe([[0, -26], [7, -26], [8, -25], [8, -14], [0, -14]], X()),
      S.extrude(keyseat(10, 3, 6.5), { along: "x", from: -14, to: 14, live: "seat5" }),
      S.lathe([[0, 14], [12, 14], [12, 88], [12.5, 88], [12.5, 107], [15, 107], [15, 216], [12.5, 216], [12.5, 236], [12, 236], [12, 276.1], [0, 276.1]], X()),
      S.extrude(keyseat(12, 4, 8), { along: "x", from: 276, to: 302, live: "seat22" }),
      S.lathe([[0, 301.9], [12, 301.9], [12, 315], [11, 316], [0, 316]], X()),
    ], { anchor: { cut: [160, -7, 0], out: { c: [160, 0, 0], r: 15, axis: "x" } } }),
  );

  // 7 CASING GASKET, 8 CASING COVER (the turned spigot and the bolted flange)
  out.push(
    S.part(7, "CASING GASKET 1 mm", [S.extrude(S.circle(0, 0, 128, 144), { along: "x", from: 26, to: 27, holes: [S.circle(0, 0, 98.05, 144), ...boltHoles()] })], {
      hatch: "solid", explode: ex(7), anchor: { cut: [26.5, 104, 0], out: { c: [26.5, 0, 0], r: 128, axis: "x" } },
    }),
    S.part(8, "CASING COVER", [
      S.lathe([[22, 14], [98, 14], [98, 35], [40, 35], [32, 40], [32, 60], [19.5, 60], [19.5, 52], [22, 52]], X()),
      S.extrude(S.circle(0, 0, 128, 144), { along: "x", from: 27, to: 35, holes: [S.circle(0, 0, 98, LATHE_N), ...boltHoles()] }),
    ], { mat: "iron", angle: 135, explode: ex(8), anchor: { cut: [24, 62, 0], out: { c: [31, 0, 0], r: 128, axis: "x" } } }),
  );

  // 9 SEAL ROTARY UNIT: retainer, spring, shell, bellows, carbon face (each its own material)
  const sp = P.sealSpring;
  out.push(
    S.part(9, "SEAL ROTARY UNIT Ø24", [
      S.lathe(rs(K.rect(14.5, 12, 17, 19)), X({ hatch: ["steel", 45], own: true })),
      S.helix({ axis: "x", at: [0, 0], from: sp.from, to: sp.to, radius: sp.radius, wire: sp.wire, turns: sp.turns, hatch: "solid", own: true, live: "spring" }),
      S.lathe(rs([[32.6, 14.5], [33.4, 14.5], [33.4, 18.4], [44, 18.4], [44, 19.2], [32.6, 19.2]]), X({ hatch: "solid", own: true })),
      S.lathe(rs([[33.4, 12], [42, 12], [42, 18.4], [39.6, 18.4], [37.7, 15.4], [35.8, 18.4], [33.4, 18.4]]), X({ hatch: ["rubber", 45], own: true })),
      S.lathe(rs([[42, 13.4], [42, 18.4], [48, 18.4], [48, 17.2], [50, 17.2], [50, 14.6], [48, 14.6], [48, 13.4]]), X({ hatch: ["plastic", 135], own: true })),
    ], { mat: "rubber", explode: ex(9), anchor: { cut: [45, 16, 0], out: { c: [45, 0, 0], r: 18.4, axis: "x" } } }),
  );
  // 10 SEAL SEAT, 11 ITS O-RING
  out.push(
    S.part(10, "SEAL SEAT Ø24", [S.lathe(rs([[50, 13], [50, 21.5], [52, 21.5], [52, 19.3], [54.6, 19.3], [54.6, 16.6], [57.4, 16.6], [57.4, 19.3], [60, 19.3], [60, 13]]), X())], {
      mat: "steel", angle: 60, explode: ex(10), anchor: { cut: [58.7, -15.5, 0], out: { c: [58.7, 0, 0], r: 19.3, axis: "x" } },
    }),
    S.part(11, "O-RING 34.6×2.62", [S.torus([56, 0, 0], 18.15, 1.3, { axis: "x" })], {
      mat: "rubber", explode: ex(11), anchor: { cut: [56, -18.15, 0], out: { c: [56, 0, 0], r: 19.45, axis: "x" } },
    }),
  );

  // 12 HEX BOLTS through the bracket and the cover into the casing (round heads: the sheet's profile turned)
  const bolt = [[0, 14.4], [6, 14.4], [6, 47], [10.4, 47], [10.4, 54], [9.4, 55], [0, 55]];
  out.push(
    S.part(12, "HEX BOLT M12×40", BOLT_DEG.map((d) => S.lathe(bolt, { axis: "x", at: at(BOLT_R, d) })), {
      explode: ex(12), anchor: { cut: [38, -BOLT_R + 2, 0], out: { c: [51, ...at(BOLT_R, 230)], r: 10.4, axis: "x" } },
    }),
  );

  // 13 BEARING BRACKET: the bolted flange, the turned body, the end ring the cap screws go into, the foot
  out.push(
    S.part(13, "BEARING BRACKET", [
      S.extrude(S.circle(0, 0, 128, 144), { along: "x", from: 35, to: 47, holes: [S.circle(0, 0, 92, 144), ...boltHoles()] }),
      S.lathe([[100, 47], [50, 88], [46, 100], [46, 242.1], [31, 242.1], [31, 216], [28, 216], [28, 107], [31, 107], [31, 90], [16, 90], [16, 78], [34, 78], [90, 47]], X()),
      S.extrude(S.circle(0, 0, 46, LATHE_N), { along: "x", from: 242, to: 255, holes: [S.circle(0, 0, 31.05, 144), ...screwHoles()] }),
      S.extrude([[150, -45.72], [236, -45.72], [248, -122], [138, -122]], { along: "z", from: -5, to: 5, hatch: "none", own: true }),
      S.box([128, -132, -60], [256, -122, 60]),
    ], { ...iron, anchor: { cut: [150, 37, 0], out: { c: [150, 0, 0], r: 46, axis: "x" } } }),
  );
  // 14 V-RING THROWER
  out.push(
    S.part(14, "V-RING 25 A (THROWER)", [S.lathe(rs([[64, 12], [70, 12], [70, 14.5], [77.6, 20.4], [76.6, 21.8], [68.4, 16.5], [64, 16.5]]), X())], {
      mat: "rubber", angle: 135, anchor: { cut: [67, -14.2, 0], out: { c: [67, 0, 0], r: 16.5, axis: "x" } },
    }),
  );

  // 15 BALL BEARINGS 6305-2Z: the sheet's rings, and the balls in the kept half (the shields hide the rest)
  const rings = [];
  const balls = [];
  for (const a of P.BEARINGS) {
    const c = a + 8.5;
    const pc = 21.75;
    const gr = 5.8;
    const dx = Math.sqrt(gr * gr - 3.55 * 3.55);
    const ang = Math.atan2(3.55, dx) / rad;
    const inner = [[a, 12.5], [a + 17, 12.5], [a + 17, 18.2], [c + dx, 18.2], ...K.arc(c, pc, gr, -ang, -180 + ang, 4), [c - dx, 18.2], [a, 18.2]];
    const outer = [[a, 25.3], [c - dx, 25.3], ...K.arc(c, pc, gr, 180 - ang, ang, 4), [c + dx, 25.3], [a + 17, 25.3], [a + 17, 31], [a, 31]];
    rings.push(S.lathe(rs(inner), X({ hatch: ["steel", 45], own: true })), S.lathe(rs(outer), X({ hatch: ["steel", 135], own: true })));
    // a ball turned about its own x-parallel axis: the same sphere in a quarter of the triangles
    const ball = K.arc(0, c, 5.6, -90, 90, 8).map(([r, s]) => [r < 1e-9 ? 0 : r, s]);
    for (const d of [90, 135, 180, 225, 270]) balls.push(S.lathe(ball, { axis: "x", at: at(pc, d), hatch: "none", own: true }));
  }
  out.push(S.part(15, "BALL BEARING 6305-2Z", [...rings, ...balls], { mat: "steel", anchor: { cut: [98.5, -28.2, 0], out: { c: [98.5, 0, 0], r: 31, axis: "x" } } }));

  // 16 RETAINING RING
  out.push(
    S.part(16, "RETAINING RING 25×1.2", [S.tube({ ...X(), r0: 12.55, r1: 15.6, from: 233.3, to: 234.6 })], {
      hatch: "solid", anchor: { cut: [234, 14.5, 0], out: { c: [234, 0, 0], r: 15.6, axis: "x" } },
    }),
  );
  // 17 BEARING COVER: the turned spigot and its flange with the screw holes
  out.push(
    S.part(17, "BEARING COVER", [
      S.lathe([[24, 233], [31, 233], [31, 263], [20, 263], [20, 255.6], [24, 255.6]], X()),
      S.extrude(S.circle(0, 0, 52, 144), { along: "x", from: 255, to: 263, holes: [S.circle(0, 0, 31, LATHE_N), ...screwHoles()] }),
    ], { mat: "steel", angle: 60, explode: ex(17), anchor: { cut: [259, 48, 0], out: { c: [259, 0, 0], r: 52, axis: "x" } } }),
  );
  // 18 SHAFT SEAL (its garter spring left out: a 1.5 mm wire costs a torus' triangles)
  out.push(
    S.part(18, "SHAFT SEAL 24×40×7", [
      S.lathe(rs([[255.6, 20], [262.4, 20], [262.4, 14.2], [259.6, 12], [258, 13.2], [258, 16.6], [255.6, 16.6]]), X()),
    ], { mat: "rubber", explode: ex(18), anchor: { cut: [257, -18.3, 0], out: { c: [262.4, 0, 0], r: 18, axis: "x" } } }),
  );
  // 19 CAP SCREWS
  const screw = [[0, 243.4], [2.4, 243.4], [3, 244], [3, 263], [5, 263], [5, 269], [0, 269]];
  out.push(
    S.part(19, "CAP SCREW M6×25", SCREW_DEG.map((d) => S.lathe(screw, { axis: "x", at: at(40, d) })), {
      explode: ex(19), anchor: { cut: [266, 40, 0], out: { c: [266, ...at(40, 180)], r: 5, axis: "x" } },
    }),
  );

  // 20 COUPLING HUB (its bore below r 15.8 is the slotted ring), 21 SPIDER, 22 KEY
  out.push(
    S.part(20, "COUPLING HUB Ø55", [
      S.lathe([[15.8, 272], [25.5, 272], [27.5, 274], [27.5, 306], [15.8, 306]], X()),
      S.extrude(S.circle(0, 0, 15.8, LATHE_N), { along: "x", from: 272, to: 306, holes: [keyhole(12.05, 4.05, 15.05)], live: "bore" }),
    ], { mat: "alu", angle: 45, explode: ex(20), anchor: { cut: [290, -22, 0], out: { c: [290, 0, 0], r: 27.5, axis: "x" } } }),
    S.part(21, "COUPLING SPIDER 92 ShA", [S.tube({ ...X(), r0: 15, r1: 27.5, from: 306, to: 322 })], {
      mat: "rubber", angle: 135, explode: ex(21), anchor: { cut: [314, 21, 0], out: { c: [314, 0, 0], r: 27.5, axis: "x" } },
    }),
    S.part(22, "KEY 8×7×28", [S.box([276, 8, -4], [302, 15, 4])], {
      explode: ex(22), anchor: { cut: [289, 11.5, 0], out: { c: [289, 15, 0] } },
    }),
  );
  return out.map((p) => ({ ...p, solids: p.solids.map(halfSeg) }));
}

// ---------------------------------------------------------------- the water, by pressure zone (as the sheet)
// s suction · i inner impeller · o outer impeller with the side gaps and seal chamber · d volute and
// discharge. Volumes, so the stipple fills what the cut opens; each shows only where the ray meets the
// plane inside its own outline, and never on a cut face.
export const ZONES = { s: ["s"], i: ["i"], o: ["o"], d: ["d-up", "d-low", "d-flange"] };
export function fluids() {
  const s = [[0, -112], [24.97, -112], [24.97, -46.03], [32.27, -46.03], [32.27, -44.03], [27.97, -44.03], [27.97, -30], [29, -24], [31, -20], [0, -20]];
  const i = [[0, -20], [31, -20], [32, -18], [38, -13], [46, -9.5], [56, -7.08], [56, 3], [40, 3], [30, 2], [24, -1], [21, -6], [19, -11], [17, -14], [0, -14]];
  const o = [
    [32.3, -30], [38, -30], [40, -28], [43, -24], [48, -20], [56, -16.5], [68, -13.5], [80, -11.5], [88, -10.5], [88, 13.97],
    [22, 13.97], [22, 50], [12, 50], [12, 13.97], [20, 13.97], [20, 12], [26, 10], [40, 8.5], [84.5, 7.5], [84.5, 3], [56, 3], [56, -7.08],
    [58, -6.6], [72, -4.4], [84.5, -3], [84.5, -7.5], [72, -9], [58, -11.5], [47, -15], [40, -19], [35, -24], [32, -30],
  ];
  // the channel from r 88 out to the spiral, in two halves so each is one simple outline under 64 points
  const up = [...arcPts(88, 0, 180, 12), ...spiral(180, T0, 8), ...nozzleL.slice().reverse(), ...nozzleR.slice().reverse(), ...spiral(T0 + 360, 360, 8)];
  const low = [...arcPts(88, 180, 360, 12), ...spiral(360, 180, 8)];
  return [
    S.fluid("s", S.lathe(s, X())),
    S.fluid("i", S.lathe(i, X())),
    S.fluid("o", S.lathe(o, X())),
    S.fluid("d-up", S.extrude(up, { along: "x", from: -13.97, to: 10.97 })),
    S.fluid("d-low", S.extrude(low, { along: "x", from: -13.97, to: 10.97 })),
    S.fluid("d-flange", S.lathe([[0, NOZ], [15.97, NOZ], [15.97, 162], [0, 162]], { axis: "y", at: [0, 0] })),
  ].map(halfSeg);
}

// the shaft's axis and the discharge nozzle's
export const centres = () => [
  [[-128, 0, 0], [336, 0, 0]],
  { line: [[0, 84, 0], [0, 174, 0]], part: 1 },
];

export const scene = () => ({ parts: parts(), fluids: fluids(), centres: centres() });
