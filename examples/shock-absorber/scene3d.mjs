// The monotube damper's solids for its 3D view (shock-absorber-3d.html), in the same world mm as
// parts.mjs: u is x, v is y, the axis is x = 0, the lower eye centre is y = 0, and the sheet's cutting
// plane is z = 0. Pure data built with kit/solid3d.mjs from the 2D sheet's numbers (model.mjs) and
// its profiles (parts.mjs: bend, flowPath, PORT_* through the shared constants).
//
// The rod assembly is built fully extended (c = 0), as on the sheet; live3d.js moves it down by c and
// the floating piston by c·FP_RATIO. The shims are rebuilt from their bent profile as they lift.
//
// Two things the kit draws differently from the sheet:
//   - the oil is two thin "sheets" of fluid on the cutting plane (extruded along the axis, 0.6 mm
//     thick round z = 0), so the stipple shows in every gap of the section, in the ports and under
//     the lifted shims, and nothing behind the plane hides it. Each stretches with the stroke.
//   - the nitrogen is left clear: the one accent stays on the oil, and the gas chamber under the
//     floating piston reads as the one space in the tube that is not stippled (the sheet dots it in
//     the muted ink, which the kit's fluids, all in the accent, cannot do).

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const N0 = M.NUT0; // nut underside at c = 0
const ZC0 = N0 + M.S_PM; // piston mid-plane at c = 0
const G0 = M.GUIDE_BOT;
const FIT = 7.05; // bore of everything that slides on the Ø14 rod: a running clearance, never a shared face
export const ROD_TOP = M.PLATE_TOP0; // the rod ends under the upper eye ring (the sheet hides 2 mm in the ring)
// Exploded, the rod and all it carries move up a parallel axis this far to the side (a jogged
// explosion line); the guide and its seals and the floating piston leave the tube along its own axis.
export const JOG = 130;

// moving with the rod (pos [0, -c, 0]) and with the floating piston (pos [0, -c·FP_RATIO, 0])
export const MOVING = [9, 10, 11, 12, 13, 14, 15, 16, 17, 24, 25, "3u", "4u", "5u"];
export const FLOATING = [7, 8];

// ---------------------------------------------------------------- profiles from the sheet
const tubeLoop = () => {
  const g0 = M.GUIDE_TOP;
  const g1 = M.GUIDE_TOP + 1.75;
  return [[23, M.TUBE_BOT], [23.6, M.TUBE_BOT], [25, M.TUBE_BOT + 1.4], [25, M.TUBE_TOP], [23.6, M.TUBE_TOP], [23, M.TUBE_TOP - 0.6], [23, g1], [23.9, g1], [23.9, g0], [23, g0]];
};
const fpLoop = (b) =>
  [[0, M.FP_POCKET.h], [M.FP_POCKET.r, M.FP_POCKET.h], [M.FP_POCKET.r, 0], [22.6, 0], [22.9, 0.3], [22.9, 7], [20.3, 7], [20.3, 13], [22.9, 13], [22.9, 19.7], [22.6, 20], [0, 20]].map(([r, s]) => [r, b + s]);
const guideLoop = () =>
  [[9, 0], [22.6, 0], [23, 0.4], [23, 4], [20.5, 4], [20.5, 8], [23, 8], [23, 30], [12, 30], [12, 26], [13, 26], [13, 18], [7.4, 18], [7.4, 14], [9, 14]].map(([r, s]) => [r, G0 + s]);
// The piston as a body of revolution: both faces carry the clamp land, the recess the ports open
// into, the seat land and the outer face (the sheet's `inner` and `outer` without the port between).
const PISTON = [[5.1, -6], [8, -6], [8, -5], [14.5, -5], [14.5, -6], [16, -6], [16, -5.5], [22.2, -5.5], [22.7, -5], [22.7, -4], [22, -4], [22, 4], [22.7, 4], [22.7, 5], [22.2, 5.5], [16, 5.5], [16, 6], [14.5, 6], [14.5, 5], [8, 5], [8, 6], [5.1, 6]];
// One compression port in the section plane on +x (in at the bottom outside the rebound stack, out
// under the compression stack) and one rebound port on −x, the same shape turned over: with six
// ports alternating at 60°, a plane through 0° and 180° meets one of each, as SECTION A-A shows.
const PORT = [[17.32, -5.5], [21.18, -5.5], [12.68, 5], [8.82, 5]];
const portAt = (dir, zc) => PORT.map(([r, z]) => (dir > 0 ? [r, zc + z] : [-r, zc - z]));

// One shim of a stack, bent about the clamp washer's rim by `lift` at r = 17 (P.bend, the sheet's).
// dir +1: the compression stack on the piston's top, bending up; −1: the rebound stack below.
export function shimLoop(dir, j, lift, nut = N0) {
  const list = dir > 0 ? M.COMP_SHIMS : M.REB_SHIMS;
  const face = dir > 0 ? nut + M.S_PT : nut + M.S_PB;
  const k = dir > 0 ? j : list.length - 1 - j; // 0 sits on the piston
  const R1 = list[j] / 2;
  const rs = [5.1, 8];
  for (let r = 10.5; r < R1 - 0.5; r += 2.5) rs.push(r); // the bend is a parabola: four facets carry it
  rs.push(R1);
  const a = k * M.SHIM_T + 0.02;
  const b = (k + 1) * M.SHIM_T - 0.02;
  const near = rs.map((r) => [r, face + dir * (a + P.bend(r, lift))]);
  const far = rs.map((r) => [r, face + dir * (b + P.bend(r, lift))]).reverse();
  return [...near, ...far];
}
const shimSpan = (dir, j, nut = N0) => {
  const list = dir > 0 ? M.COMP_SHIMS : M.REB_SHIMS;
  const k = dir > 0 ? j : list.length - 1 - j;
  const face = dir > 0 ? nut + M.S_PT : nut + M.S_PB;
  const y = [face + dir * k * M.SHIM_T, face + dir * (k + 1) * M.SHIM_T];
  return [Math.min(...y), Math.max(...y)];
};

// ---------------------------------------------------------------- the explosion, in assembly order
// Built positions [bottom, top] at c = 0 and the gap to the next piece; each piece is placed against
// the last. Column B (the rod, x = JOG): the piston stack comes off the rod's post downwards.
// Column A (the tube's axis): the floating piston, then the guide and its seals, up out of the tube.
function stack(items, from, dirn) {
  const out = {};
  let y = from;
  for (const [key, b0, t0, gap] of items) {
    y += dirn * gap;
    const off = dirn < 0 ? y - t0 : y - b0;
    out[key] = off;
    y = dirn < 0 ? b0 + off : t0 + off;
  }
  return out;
}
const SPT = N0 + M.S_PT;
const below = stack(
  [
    ["washerUp", SPT + M.COMP_SHIMS.length * M.SHIM_T, N0 + M.S_SHOULDER, 12],
    ...[3, 2, 1, 0].map((j) => ["c" + j, ...shimSpan(1, j), 4]),
    ["band", ZC0 - 4, ZC0 + 4, 7],
    ["piston", ZC0 - 6, ZC0 + 6, 7],
    ...[4, 3, 2, 1, 0].map((j) => ["r" + j, ...shimSpan(-1, j), j === 4 ? 7 : 4]),
    ["washerLow", N0 + M.NUT_H, N0 + M.S_REB, 7],
    ["nut", N0, N0 + M.NUT_H, 7],
  ],
  N0 - 1,
  -1
);
// the whole of column B rises or falls together so the nut ends above the lower eye and its fill plug
const D = 66 - (N0 + below.nut);
export const EXPLODE_ROD = D;
const B = (k) => below[k] + D; // a piece's offset in column B
const above = stack(
  [
    ["fp", M.FP_BOT0, M.FP_BOT0 + M.FP_H, 18],
    ["oring", M.FP_BOT0 + 8.6, M.FP_BOT0 + 11.4, 10],
    ["bush", G0, G0 + 14, 12],
    ["oring2", G0 + 4.3, G0 + 7.7, 10],
    ["guide", G0, G0 + 30, 10],
    ["seal", G0 + 18, G0 + 26, 10],
    ["wiper", G0 + 26, G0 + 32.5, 8],
    ["clip", M.GUIDE_TOP, M.GUIDE_TOP + 1.75, 8],
  ],
  M.TUBE_TOP,
  1
);
const jogTo = (dy, dz = 0) => ({ to: [JOG, dy, dz] });

// ---------------------------------------------------------------- eyes
// The eye's axis is square to the sheet (z): the cut shows the ring, bush and sleeve as rings round
// the bolt hole. side +1: the base cap is above the ring (lower eye); −1: the dust shield below it.
function eyeRing(vc, side) {
  const face = vc + side * M.EYE_R;
  const weld = (sgn) => {
    const pts = [[sgn * 11, face]];
    for (let i = 0; i <= 8; i++) {
      const u = sgn * (11 - 4.5 * (i / 8));
      pts.push([u, vc + side * Math.sqrt(M.EYE_R ** 2 - u * u)]);
    }
    pts.push([sgn * 6.5, face]);
    return S.extrude(pts, { along: "z", from: -18, to: 18, hatch: "solid", own: true });
  };
  return [S.tube({ axis: "z", at: [0, vc], r0: 16, r1: M.EYE_R, from: -18, to: 18 }), weld(-1), weld(1)];
}
const eyeBush = (vc) => S.tube({ axis: "z", at: [0, vc], r0: 8, r1: 15.98, from: -19, to: 19 });
const eyeSleeve = (vc) => S.tube({ axis: "z", at: [0, vc], r0: 6, r1: 7.98, from: -20.5, to: 20.5 });

// ---------------------------------------------------------------- parts
export function parts() {
  const E = M.EYE_TOP0;
  const b = M.FP_BOT0;
  const sh = N0 + M.S_SHOULDER;
  const stop = N0 + M.S_STOP;
  const seal = [[FIT, G0 + 18.7], [7.7, G0 + 18], [13, G0 + 18], [13, G0 + 26], [9.2, G0 + 26], [FIT, G0 + 24.2], [7.9, G0 + 21.6]];
  const wiper = [[9, G0 + 26], [12, G0 + 26], [12, G0 + 30], [11.2, G0 + 32.5], [8.6, G0 + 32.5], [FIT, G0 + 31.4], [FIT, G0 + 30.4], [9, G0 + 28.6]];
  // the bump stop's convolutions, as the sheet draws them
  const bump = (() => {
    const bot = M.BUMPER_BOT0;
    const top = M.PLATE_TOP0 - 1;
    const pts = [[7.5, bot], [11.5, bot], [14, bot + 2.5]];
    let z = bot + 2.5;
    let out = true;
    while (z + 3.5 < top - 4) {
      const r = out ? 16 : 13.6;
      pts.push([r, z + 1.2], [r, z + 3.5 - 1.2]);
      z += 3.5;
      out = !out;
    }
    pts.push([16, top - 2.5], [16, top], [7.5, top]);
    return pts;
  })();
  const t = M.PLATE_TOP0;
  return [
    // ---- the body: welded tube, base cap, lower eye (fixed)
    S.part(1, "PRESSURE TUBE Ø50×2", [S.lathe(tubeLoop())], {
      mat: "steel", angle: 45, anchor: { cut: [-24, 150, 0], out: { c: [0, 150, 0], r: 25, axis: "y" } },
    }),
    S.part(2, "BASE CAP", [
      S.lathe([[0, M.CAP_BOT], [24, M.CAP_BOT], [25, M.CAP_BOT + 1], [25, M.TUBE_BOT - 1.4], [23.6, M.TUBE_BOT], [23, M.TUBE_BOT], [23, M.FLOOR - 0.8], [22.2, M.FLOOR], [0, M.FLOOR]]),
      // the weld bead in the V between cap and tube
      S.lathe([[23.6, M.TUBE_BOT], [25.3, M.TUBE_BOT - 1.4], [25.3, M.TUBE_BOT + 1.4]], { hatch: "solid", own: true }),
      // the gas fill drillings: axial into the chamber, radial out to the plug
      S.bore(S.lathe([[0, 23], [2, 23], [2, M.FLOOR], [0, M.FLOOR]])),
      S.bore(S.lathe([[0, 1.9], [2, 1.9], [2, 25], [0, 25]], { axis: "x", at: [25, 0] })),
      S.disc([0, M.FLOOR + 0.03, 0], 2, { role: "mouth" }),
    ], { mat: "steel", angle: 135, anchor: { cut: [-14, 33, 0], out: { c: [0, 33, 0], r: 25, axis: "y" } } }),
    S.part(3, "EYE RING Ø40×4", eyeRing(0, 1), { mat: "steel", angle: 45, anchor: { cut: [-18, 0, 0], out: { c: [0, 0, 0], r: 20, axis: "z" } } }),
    S.part(4, "EYE BUSH Ø32/Ø16×40", [eyeBush(0)], { mat: "rubber", explode: [0, 0, 44], anchor: { cut: [12, 0, 0], out: { c: [0, 12, 19], r: 0 } } }),
    S.part(5, "INNER SLEEVE Ø16×2×40", [eyeSleeve(0)], { mat: "steel", angle: 135, explode: [0, 0, 84], anchor: { cut: [-5, -5, 0], out: { c: [0, -7, 20.5], r: 0 } } }),
    S.part(6, "GAS FILL PLUG Ø4", [S.lathe([[0, 19], [1.98, 19], [1.98, 25.4], [0, 25.4]], { axis: "x", at: [25, 0] })], {
      mat: "rubber", explode: [22, 0, 0], anchor: { cut: [23.5, 25.8, 0], out: { c: [25.4, 25, 0], r: 0 } },
    }),
    // ---- the gas side: floating piston (moves c·FP_RATIO) and its O-ring
    S.part(7, "FLOATING PISTON Ø46", [S.lathe(fpLoop(b))], { mat: "alu", angle: 135, explode: { to: [0, above.fp, 0] }, anchor: { cut: [-12, b + 14, 0], out: { c: [0, b + 14, 0], r: 22.9, axis: "y" } } }),
    S.part(8, "O-RING 40×3 ISO 3601-1", [S.lathe(K.rrect(20.3, b + 8.6, 22.95, b + 11.4, 1.2))], {
      mat: "rubber", explode: { to: [0, above.oring, 0] }, anchor: { cut: [21.6, b + 10, 0], out: { c: [0, b + 10, 0], r: 22.95, axis: "y" } },
    }),
    // ---- the piston and its valving (moves with the rod)
    S.part(9, "PISTON Ø46×12, 3+3 PORTS", [
      S.lathe(PISTON.map(([r, z]) => [r, ZC0 + z])),
      S.bore(S.extrude(portAt(1, ZC0), { along: "z", from: -1.5, to: 1.5 })),
      S.bore(S.extrude(portAt(-1, ZC0), { along: "z", from: -1.5, to: 1.5 })),
    ], { mat: "steel", angle: 135, explode: jogTo(B("piston")), anchor: { cut: [-20.6, ZC0 - 2.5, 0], out: { c: [0, ZC0 - 2.5, 0], r: 22.7, axis: "y" } } }),
    S.part(10, "PISTON BAND 46×8×1", [S.tube({ r0: 22, r1: 22.97, from: ZC0 - 4, to: ZC0 + 4 })], {
      mat: "plastic", angle: 60, explode: jogTo(B("band")), anchor: { cut: [22.5, ZC0 + 2, 0], out: { c: [0, ZC0 + 2, 0], r: 22.97, axis: "y" } },
    }),
    // each leaf outlined on its own and left white, so the stack reads leaf by leaf in a close-up
    S.part(11, "COMPRESSION SHIM Ø34–Ø20×0.3", M.COMP_SHIMS.map((_, j) => S.lathe(shimLoop(1, j, 0), { live: "s" + j, own: true, explode: [0, B("c" + j) - D, 0] })), {
      hatch: "none", explode: jogTo(D), anchor: { cut: [11, SPT + 0.75, 0], out: { c: [0, SPT + 0.6, 0], r: 17, axis: "y" }, solid: 2 },
    }),
    S.part(12, "REBOUND SHIM Ø34–Ø20×0.3", M.REB_SHIMS.map((_, j) => S.lathe(shimLoop(-1, j, 0), { live: "s" + j, own: true, explode: [0, B("r" + j) - D, 0] })), {
      hatch: "none", explode: jogTo(D), anchor: { cut: [10, N0 + M.S_PB - 0.75, 0], out: { c: [0, N0 + M.S_PB - 0.75, 0], r: 17, axis: "y" }, solid: 2 },
    }),
    S.part(13, "CLAMP WASHER Ø16×Ø10.2×2", [
      S.tube({ r0: 5.05, r1: 8, from: N0 + M.NUT_H, to: N0 + M.S_REB, explode: [0, B("washerLow") - D, 0] }),
      S.tube({ r0: 5.05, r1: 8, from: SPT + M.COMP_SHIMS.length * M.SHIM_T, to: N0 + M.S_SHOULDER, explode: [0, B("washerUp") - D, 0] }),
    ], { explode: jogTo(D), anchor: { cut: [-6.5, N0 + M.S_SHOULDER - 1, 0], out: { c: [0, N0 + M.S_SHOULDER - 1, 0], r: 8, axis: "y" }, solid: 1 } }),
    S.part(14, "HEX NUT M10×1 ISO 8673", [S.extrude(S.polygon(6, 8 / Math.cos(Math.PI / 6), 0, 0, Math.PI / 6), { along: "y", from: N0, to: N0 + M.NUT_H, holes: [S.circle(0, 0, 5.05, 48)] })], {
      explode: jogTo(B("nut")), anchor: { cut: [-6.5, N0 + 4, 0], out: { c: [0, N0 + 4, 0], r: 8, axis: "box" } },
    }),
    // ---- the rod and what rides on it
    S.part(15, "PISTON ROD Ø14, M10×1 POST", [S.lathe([[0, N0 - 1], [4.4, N0 - 1], [5, N0 - 0.4], [5, sh], [7, sh], [7, ROD_TOP], [0, ROD_TOP]])], {
      explode: jogTo(D), anchor: { cut: [-3.5, 468, 0], out: { c: [0, 468, 0], r: 7, axis: "y" } },
    }),
    S.part(16, "REBOUND STOP RING Ø22", [S.tube({ r0: FIT, r1: 11, from: stop, to: stop + 3 })], {
      mat: "steel", angle: 45, explode: jogTo(D), anchor: { cut: [-9, stop + 1.5, 0], out: { c: [0, stop + 1.5, 0], r: 11, axis: "y" } },
    }),
    S.part(17, "REBOUND BUFFER Ø25×12", [S.lathe([[FIT, stop + 3], [12, stop + 3], [12.5, stop + 3.5], [12.5, stop + 11], [10, N0 + M.S_BUFFER_TOP], [FIT, N0 + M.S_BUFFER_TOP]])], {
      mat: "rubber", explode: jogTo(D), anchor: { cut: [10, stop + 8, 0], out: { c: [0, stop + 8, 0], r: 12.5, axis: "y" } },
    }),
    // ---- rod guide and seals (fixed)
    S.part(18, "ROD GUIDE", [S.lathe(guideLoop())], {
      mat: "alu", angle: 135, explode: [0, above.guide, 0], anchor: { cut: [16, G0 + 13, 0], out: { c: [0, G0 + 13, 0], r: 23, axis: "y" } },
    }),
    S.part(19, "GUIDE BUSHING Ø14×Ø18×14", [S.tube({ r0: FIT, r1: 9, from: G0, to: G0 + 14 })], {
      mat: "bronze", angle: 45, explode: [0, above.bush, 0], anchor: { cut: [-8, G0 + 7, 0], out: { c: [0, G0 + 7, 0], r: 9, axis: "y" } },
    }),
    S.part(20, "ROD SEAL Ø14×Ø26×8", [
      S.lathe(seal),
      S.torus([0, G0 + 21.4, 0], 10.4, 0.75, { hatch: "solid", own: true }),
    ], { mat: "rubber", explode: [0, above.seal, 0], anchor: { cut: [12, G0 + 24.5, 0], out: { c: [0, G0 + 22, 0], r: 13, axis: "y" } } }),
    S.part(21, "DUST WIPER Ø14×Ø24", [S.lathe(wiper)], {
      mat: "plastic", angle: 45, explode: [0, above.wiper, 0], anchor: { cut: [-10.5, G0 + 30, 0], out: { c: [0, G0 + 31, 0], r: 11.5, axis: "y" } },
    }),
    S.part(22, "O-RING 41×2.5 ISO 3601-1", [S.lathe(K.rrect(20.5, G0 + 4.3, 22.98, G0 + 7.7, 1.2))], {
      mat: "rubber", explode: [0, above.oring2, 0], anchor: { cut: [-21.75, G0 + 6, 0], out: { c: [0, G0 + 6, 0], r: 22.98, axis: "y" } },
    }),
    S.part(23, "RETAINING RING DIN 472-46", [S.tube({ r0: 21.2, r1: 23.85, from: M.GUIDE_TOP, to: M.GUIDE_TOP + 1.75 })], {
      hatch: "solid", explode: [0, above.clip, 0], anchor: { cut: [-22.5, M.GUIDE_TOP + 0.9, 0], out: { c: [0, M.GUIDE_TOP + 0.9, 0], r: 23.85, axis: "y" } },
    }),
    // ---- the top: bump stop, dust shield and upper eye (move with the rod)
    S.part(24, "BUMP STOP Ø32×43", [S.lathe(bump)], {
      mat: "foam", explode: jogTo(D - 150), anchor: { cut: [-12, 546, 0], out: { c: [0, 546, 0], r: 16, axis: "y" } },
    }),
    S.part(25, "DUST SHIELD Ø62×1", [
      S.lathe([[30, M.SHIELD_BOT0], [31, M.SHIELD_BOT0], [31, t], [FIT, t], [FIT, t - 1], [30, t - 1]]),
      S.lathe([[FIT, t - 1], [9.4, t - 1], [FIT, t - 3.4]], { own: true }),
    ], { hatch: "solid", explode: jogTo(D), anchor: { cut: [30.5, 500, 0], out: { c: [0, 500, 0], r: 31, axis: "y" } } }),
    // the upper eye is the same three items as the lower one: their balloons are on the lower eye
    S.part("3u", "EYE RING Ø40×4", eyeRing(E, -1), { mat: "steel", angle: 45, explode: jogTo(D) }),
    S.part("4u", "EYE BUSH Ø32/Ø16×40", [eyeBush(E)], { mat: "rubber", explode: jogTo(D, 44) }),
    S.part("5u", "INNER SLEEVE Ø16×2×40", [eyeSleeve(E)], { mat: "steel", angle: 135, explode: jogTo(D, 84) }),
  ];
}

// ---------------------------------------------------------------- the oil
// Thin sheets on the plane (see the header). A sheet along y: outline [x, z], swept from..to in y.
const SHEET = [[-22.97, -0.3], [22.97, -0.3], [22.97, 0.3], [-22.97, 0.3]];
const sheet = (from, to) => S.extrude(SHEET, { along: "y", from, to });
export const OIL = {
  // above the piston, built at c = 0; it moves down with the piston (offset −c) and its top stretches
  // back up to the guide (stretch +c)
  above: { from: ZC0, to: G0 + 0.5 },
  // below the piston, built at full bump (c = STROKE, the shortest); offset (STROKE − c)·FP_RATIO
  // with the floating piston, stretch (STROKE − c)·(1 − FP_RATIO) up to the piston
  below: { from: M.fpV(M.STROKE) + M.FP_H - 0.3, to: N0 - M.STROKE + M.S_PM },
};
// The jet through the open port and out past the lifted stack, as a band round the sheet's flow path
// (P.flowPath at full lift), in the piston's frame at c = 0. Compression: up the +x port.
function band(pts, w) {
  const L = [];
  const R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const c = pts[Math.min(pts.length - 1, i + 1)];
    const dx = c[0] - a[0];
    const dy = c[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    const n = [-dy / l, dx / l];
    L.push([pts[i][0] + n[0] * w, pts[i][1] + n[1] * w]);
    R.push([pts[i][0] - n[0] * w, pts[i][1] - n[1] * w]);
  }
  return [...L, ...R.reverse()];
}
const jet = (dir) => S.extrude(band(P.flowPath(null, N0, dir, M.LIFT_MAX), 1.6), { along: "z", from: -0.3, to: 0.3 });

export function fluids() {
  return [
    S.fluid("oil-above", sheet(OIL.above.from, OIL.above.to), { stretch: { from: OIL.above.from + 1 } }),
    S.fluid("oil-below", sheet(OIL.below.from, OIL.below.to), { stretch: { from: OIL.below.from + 1 } }),
    S.fluid("jet-comp", jet(1)),
    S.fluid("jet-reb", jet(-1)),
  ];
}

// centre lines: the damper's axis, and each eye's axis and cross line (the upper ones ride with it)
const eyeLines = (vc) => [[[0, vc, -27], [0, vc, 27]], [[-27, vc, 0], [27, vc, 0]]];
export const centres = () => [
  [[0, -30, 0], [0, M.EYE_TOP0 + 30, 0]],
  ...eyeLines(0),
  ...eyeLines(M.EYE_TOP0).map((line) => ({ line, part: "3u" })),
];

export const scene = () => ({ parts: parts(), fluids: fluids(), centres: centres() });
