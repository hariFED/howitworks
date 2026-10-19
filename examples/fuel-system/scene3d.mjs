// The fuel system's 3D view (fuel-system-3d.html): the selector valve and the strainer (gascolator),
// cut open on their sections from the sheet, built with kit/solid3d.mjs from the sheet's own profiles
// (parts.mjs) and numbers (model.mjs). Pure data.
//
// The two units are shown side by side, not in their installed places, each on its own section:
//   the SELECTOR at the origin, lying on its back so that its section C-C (the ports' plane, seen
//     from above) is the cut z = 0: x to starboard, y forward, z up out of the floor (the handle).
//     The z > 0 half (cover, shaft, handle, upper O-ring) is what the cut removes.
//   the STRAINER at x = X0, upright on its section D-D: x across, y up from the casting's lower face,
//     z toward the viewer.
// NTS simplifications (the sheet is the authority): the selector's drillings are square ducts the
// width of the Ø7.75 drilling; its mounting ears sit in the lug band; the feed lines and the outlet
// line stop short; the strainer casting is a plain block 50 mm deep; water drops are drawn 4× size.

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

export const X0 = 150; // the strainer's axis
const rad = Math.PI / 180;
const SEL = P.SEL;
const GG = P.GG;
const ROT = P.ROT;
// a tube authored along +x, turned about z onto a port's axis (warp of a closed solid: exact)
const turnTo = (deg) => {
  const c = Math.cos(deg * rad);
  const s = Math.sin(deg * rad);
  return (x, y, z) => [x * c - y * s, x * s + y * c, z];
};
// the port axes as angles from +x: the left port points forward-left (135°), the right forward-right (45°)
export const PORT_DEG = { L: 90 - M.PORT_ANGLE.L, R: 90 - M.PORT_ANGLE.R };
const band = (side, r0, r1, w = SEL.port) => P.portBand(side, r0, r1, w);
// the detent's place: on the left port's axis (Section G-G's plane), 12 mm out
export const DETENT = [Math.sin(M.PORT_ANGLE.L * rad) * 12, Math.cos(M.PORT_ANGLE.L * rad) * 12];

export function parts() {
  const out = [];
  // ================================================================ the selector
  // 9 BODY: the star (boss, port lugs, ears) through the lug band; turned rings above and below;
  // the cover on top; the port drillings as bores
  out.push(S.part(9, "SELECTOR BODY", [
    S.extrude(P.selOutline(), { along: "z", from: -14, to: 14, holes: [S.circle(0, 0, SEL.bore + 0.05, 96), ...P.earHoles()] }),
    S.lathe([[SEL.bore + 0.05, 14], [SEL.boss, 14], [SEL.boss, GG.bodyTop], [SEL.bore + 0.05, GG.bodyTop]], { axis: "z", at: [0, 0] }),
    S.lathe([[6.5, GG.bodyBot], [SEL.boss, GG.bodyBot], [SEL.boss, -14], [SEL.bore + 0.05, -14], [SEL.bore + 0.05, GG.bodyBot + 8], [6.5, GG.bodyBot + 8]], { axis: "z", at: [0, 0] }),
    S.extrude(S.circle(0, 0, SEL.boss, 96), { along: "z", from: GG.bodyTop, to: GG.bodyTop + GG.cover, holes: [S.circle(0, 0, 4.95, 32), S.circle(DETENT[0], DETENT[1], 2.6, 20)], explode: [0, 0, 70], own: true }),
    S.bore(S.extrude(band("L", SEL.bore + 0.05, SEL.lug), { along: "z", from: -SEL.port, to: SEL.port })),
    S.bore(S.extrude(band("R", SEL.bore + 0.05, SEL.lug), { along: "z", from: -SEL.port, to: SEL.port })),
  ], { mat: "alu", angle: 45, anchor: { cut: [24, -10, 0], out: { c: [24, -10, 14], r: 0 } } }));
  // 10 ROTOR: a plug with its centre bore, the window through its wall at the ports' plane, grooves
  const g = P.ORING.groove;
  const zb = GG.bodyBot + 8.5;
  const zt = GG.bodyTop - 1;
  const [oUp, oLo] = P.ORING_Z;
  out.push(S.part(10, "SELECTOR ROTOR", [
    S.lathe([[ROT.bore, zb], [ROT.r, zb], [ROT.r, oLo - g[1]], [g[0], oLo - g[1]], [g[0], oLo + g[1]], [ROT.r, oLo + g[1]], [ROT.r, -7], [ROT.bore, -7]], { axis: "z", at: [0, 0] }),
    S.extrude(P.rotorShape(), { along: "z", from: -7, to: 7 }),
    S.lathe([[ROT.bore, 7], [ROT.r, 7], [ROT.r, oUp - g[1]], [g[0], oUp - g[1]], [g[0], oUp + g[1]], [ROT.r, oUp + g[1]], [ROT.r, zt], [0, zt], [0, zt - 5], [ROT.bore, zt - 5]], { axis: "z", at: [0, 0] }),
  ], { mat: "brass", angle: 135, pivot: [0, 0, 0], explode: [0, 0, 130], anchor: { cut: [-12, -4, 0], out: { c: [0, 0, 0], r: 18, axis: "z" } } }));
  // 11 O-RINGS in the rotor's grooves
  out.push(S.part(11, "ROTOR O-RING", [S.torus([0, 0, oUp], P.ORING.R, P.ORING.r, { axis: "z", explode: [0, 0, 175] }), S.torus([0, 0, oLo], P.ORING.R, P.ORING.r, { axis: "z", explode: [0, 0, 120] })], {
    hatch: "solid", pivot: [0, 0, 0], explode: [0, 0, 0], anchor: { cut: [-P.ORING.R, 0, oLo], out: { c: [0, 0, oLo], r: P.ORING.R + 1.4, axis: "z" } },
  }));
  // 12 DETENT BALL and its spring, in the cover
  out.push(S.part(12, "DETENT BALL AND SPRING", [
    S.sphere([DETENT[0], DETENT[1], GG.bodyTop + 1.6], 2.4),
    S.helix({ axis: "z", at: DETENT, from: GG.bodyTop + 4, to: GG.bodyTop + GG.cover, radius: 1.7, wire: 0.5, turns: 3, own: true }),
  ], { hatch: "none", explode: [0, 0, 80], anchor: { cut: [DETENT[0], DETENT[1], GG.bodyTop + 1.6], out: { c: [DETENT[0], DETENT[1], GG.bodyTop + 1.6], r: 2.4, axis: "sphere" } } }));
  // 13 SHAFT AND HANDLE: through the cover (and the floorboard, not drawn) to the handle
  out.push(S.part(13, "SELECTOR SHAFT AND HANDLE", [
    S.cylinder({ axis: "z", at: [0, 0], r: 4.75, from: zt, to: GG.handle }),
    S.cylinder({ axis: "z", at: [0, 0], r: 9, from: GG.handle, to: GG.handle + 10, own: true }),
    S.extrude([[-4.4, 9], [4.4, 9], [3, 30], [-3, 30]], { along: "z", from: GG.handle + 2, to: GG.handle + 8, own: true }),
  ], { hatch: "none", pivot: [0, 0, 0], explode: [0, 0, 200], anchor: { cut: [0, 0, GG.handle - 8], out: { c: [0, 0, GG.handle + 10], r: 0 } } }));
  // 8 FEED LINES: a fitting in each port lug and the tube, turned onto the port's axis
  const line = (side, k) => [
    { ...S.tube({ axis: "x", at: [0, 0], r0: SEL.port, r1: 7.5, from: SEL.lug, to: SEL.fit }), warp: turnTo(PORT_DEG[side]), own: true, live: `f${k}` },
    { ...S.tube({ axis: "x", at: [0, 0], r0: SEL.port, r1: 4.76, from: SEL.fit, to: 92 }), warp: turnTo(PORT_DEG[side]), live: `t${k}` },
  ];
  out.push(S.part(8, "FEED LINES Ø9.53", [...line("L", 0), ...line("R", 1)], {
    hatch: "solid", explode: [0, 40, 0], anchor: { cut: [P.portLine("R", 76, 76)[0][0] - 3.04, P.portLine("R", 76, 76)[0][1] + 3.04, 0], out: { c: [...P.portLine("R", 76, 76)[0], 0], r: 4.76, axis: "z" } },
  }));
  // 14 LINE, SELECTOR TO STRAINER: its fitting in the selector's outlet, and its end at the strainer
  out.push(S.part(14, "LINE, SELECTOR–STRAINER", [
    S.tube({ axis: "z", at: [0, 0], r0: 3.88, r1: 6.45, from: GG.bodyBot, to: GG.bodyBot + 8, own: true }),
    S.tube({ axis: "z", at: [0, 0], r0: 3.88, r1: 8.5, from: GG.bodyBot - 7, to: GG.bodyBot, own: true }),
    S.tube({ axis: "z", at: [0, 0], r0: 3.88, r1: 4.76, from: -66, to: GG.bodyBot - 7 }),
    S.tube({ axis: "x", at: [P.GS.zc, 0], r0: 3.88, r1: 7.5, from: X0 - P.GS.w - 13, to: X0 - P.GS.w, own: true }),
    S.tube({ axis: "x", at: [P.GS.zc, 0], r0: 3.88, r1: 4.76, from: X0 - P.GS.w - 30, to: X0 - P.GS.w - 13 }),
  ], { hatch: "solid", explode: [0, 0, 0], anchor: { cut: [X0 - P.GS.w - 22, P.GS.zc + 4.3, 0], out: { c: [X0 - P.GS.w - 22, P.GS.zc, 0], r: 4.76, axis: "x" } } }));

  // ================================================================ the strainer, at x = X0
  const gs = P.GS;
  const atY = [X0, 0];
  const block = [[-gs.w, 0], [gs.w, 0], [gs.w, gs.top - 2], [gs.w - 2, gs.top], [-gs.w + 2, gs.top], [-gs.w, gs.top - 2]].map(([x, y]) => [X0 + x, y]);
  out.push(S.part(16, "STRAINER TOP CASTING", [
    S.extrude(block, { along: "z", from: -25, to: 25 }),
    S.lathe([[0, 0], [0, gs.spigBot], [26.2, gs.spigBot], [26.2, -7.5], [29, -7.5], [29, gs.spigBot], [gs.spig, gs.spigBot], [gs.spig, 0]], { axis: "y", at: atY }),
    S.bore(S.cylinder({ axis: "x", at: [gs.zc, 0], r: gs.r, from: X0 - gs.w, to: X0 + gs.xi + gs.r })),
    S.bore(S.cylinder({ axis: "y", at: [X0 + gs.xi, 0], r: gs.r, from: gs.spigBot, to: gs.zc - gs.r })),
    S.bore(S.cylinder({ axis: "y", at: atY, r: gs.cp, from: gs.spigBot, to: gs.zc + gs.r })),
    S.bore(S.cylinder({ axis: "x", at: [gs.zc, 0], r: gs.r, from: X0 + gs.cp, to: X0 + gs.w })),
    S.bore(S.cylinder({ axis: "y", at: [X0 + gs.xp, 0], r: gs.rp, from: gs.zc + gs.r, to: gs.top })),
  ], { mat: "alu", angle: 45, anchor: { cut: [X0 - 30, 8, 0], out: { c: [X0 - 30, 8, 25], r: 0 } } }));
  out.push(S.part(17, "STRAINER BOWL", [S.lathe(P.BOWL_PROFILE, { axis: "y", at: atY })], { mat: "alu", angle: 135, explode: [0, -110, 0], anchor: { cut: [X0 - 27.75, -50, 0], out: { c: [X0, -50, 0], r: 29, axis: "y" } } }));
  out.push(S.part(19, "BOWL GASKET", [S.lathe(P.GASKET_PROFILE, { axis: "y", at: atY })], { hatch: "solid", explode: [0, -40, 0], anchor: { cut: [X0 + 27.6, -8.75, 0], out: { c: [X0, -8.75, 0], r: 29, axis: "y" } } }));
  out.push(S.part(20, "BOWL RETAINING NUT", [S.lathe(P.NUT_PROFILE, { axis: "y", at: atY })], { mat: "alu", angle: 45, explode: [0, -70, 0], anchor: { cut: [X0 - 35, -8, 0], out: { c: [X0, -8, 0], r: 37, axis: "y" } } }));
  const m = P.SCREEN_MESH;
  out.push(S.part(18, "SCREEN, CAP AND SPRING", [
    S.lathe(P.SCREEN_RING, { axis: "y", at: atY }),
    S.tube({ axis: "y", at: atY, r0: m.r0, r1: m.r1, from: m.z0, to: m.z1, hatch: "solid", own: true }),
    S.lathe(P.SCREEN_CAP, { axis: "y", at: atY }),
    S.helix({ axis: "y", at: atY, from: -82, to: -60, radius: 9.5, wire: 1.2, turns: 5, hatch: "solid", own: true }),
  ], { mat: "brass", angle: 135, explode: [110, -40, 0], anchor: { cut: [X0 + 13, -30, 0], out: { c: [X0, -30, 0], r: 13.2, axis: "y" } } }));
  // 21 DRAIN VALVE: the body in the bowl's boss and its spring (static); the poppet (21a) moves
  out.push(S.part(21, "STRAINER DRAIN VALVE", [
    S.lathe(P.DRAIN_BODY, { axis: "y", at: atY }),
    S.helix({ axis: "y", at: atY, from: -116, to: -104, radius: 3.6, wire: 0.6, turns: 4, hatch: "solid", own: true, pivot: [X0, -104, 0], live: "spring" }),
  ], { mat: "brass", angle: 45, explode: [0, -150, 0], anchor: { cut: [X0 - 7, -99, 0], out: { c: [X0, -99, 0], r: 9.5, axis: "y" } } }));
  out.push(S.part("21a", "DRAIN POPPET", [
    S.cylinder({ axis: "y", at: atY, r: 6.5, from: -81.2, to: -78.6 }),
    S.cylinder({ axis: "y", at: atY, r: 6.2, from: -82, to: -81.2, hatch: "solid", own: true }),
    S.cylinder({ axis: "y", at: atY, r: 1.6, from: -116, to: -82 }),
    S.cylinder({ axis: "y", at: atY, r: 4.6, from: -119, to: -116, own: true }),
  ], { hatch: "none", explode: [0, -190, 0] }));
  // 22 HOSE TO THE CARBURETTOR (its end at the strainer's outlet) and 27 the primer line's stub
  out.push(S.part(22, "HOSE TO THE CARBURETTOR", [
    S.tube({ axis: "x", at: [gs.zc, 0], r0: 3.88, r1: 7.5, from: X0 + gs.w, to: X0 + gs.w + 13, own: true }),
    S.tube({ axis: "x", at: [gs.zc, 0], r0: 3.88, r1: 5.6, from: X0 + gs.w + 13, to: X0 + gs.w + 30 }),
  ], { hatch: "solid", explode: [40, 0, 0], anchor: { cut: [X0 + gs.w + 22, gs.zc + 4.7, 0], out: { c: [X0 + gs.w + 22, gs.zc, 0], r: 5.6, axis: "x" } } }));
  out.push(S.part(27, "PRIMER LINE Ø3.18", [S.tube({ axis: "y", at: [X0 + gs.xp, 0], r0: 1.0, r1: 1.59, from: gs.top, to: gs.top + 16 })], {
    hatch: "solid", explode: [0, 40, 0], anchor: { cut: [X0 + gs.xp + 1.3, gs.top + 9, 0], out: { c: [X0 + gs.xp, gs.top + 9, 0], r: 1.59, axis: "y" } },
  }));
  return out;
}

// ---------------------------------------------------------------- the fuel, the water and its drops
export const WATER_FLOOR = P.BOWL_IN.z0;
export const DROP_NAMES = M.DROPS.map((_, i) => `drop${i}`);
export function fluids() {
  const gs = P.GS;
  const atY = [X0, 0];
  const lineFuel = (side) => S.extrude(band(side, SEL.fit - 10, 92, SEL.port - 0.3), { along: "z", from: -(SEL.port - 0.3), to: SEL.port - 0.3 });
  const drop = (i) => S.lathe(K.arc(0, 0, 1, -90, 90, 10).map(([x, y]) => [Math.max(0, x), y]), { axis: "y", at: [X0 + M.DROPS[i].x, 0], segments: 16 });
  return [
    // the selector: ports and lines by branch, the window (turns with the rotor), centre and outlet
    S.fluid("port-L", S.extrude(band("L", SEL.bore + 0.05, SEL.lug), { along: "z", from: -SEL.port, to: SEL.port })),
    S.fluid("port-R", S.extrude(band("R", SEL.bore + 0.05, SEL.lug), { along: "z", from: -SEL.port, to: SEL.port })),
    S.fluid("line-L", lineFuel("L")),
    S.fluid("line-R", lineFuel("R")),
    S.fluid("win", S.extrude(P.windowShape(), { along: "z", from: -7, to: 7 })),
    S.fluid("centre", S.cylinder({ axis: "z", at: [0, 0], r: ROT.bore, from: GG.bodyBot + 8, to: GG.bodyTop - 6 })),
    S.fluid("outlet", S.cylinder({ axis: "z", at: [0, 0], r: 3.85, from: -66, to: GG.bodyBot + 8 })),
    // the strainer: drillings, the bowl, the lines, the drain's bore
    S.fluid("in-h", S.cylinder({ axis: "x", at: [gs.zc, 0], r: gs.r - 0.05, from: X0 - gs.w - 30, to: X0 + gs.xi + gs.r })),
    S.fluid("in-v", S.cylinder({ axis: "y", at: [X0 + gs.xi, 0], r: gs.r - 0.05, from: gs.spigBot, to: gs.zc - gs.r })),
    S.fluid("bowl", S.cylinder({ axis: "y", at: atY, r: P.BOWL_IN.r - 0.05, from: P.BOWL_IN.z0, to: P.BOWL_IN.z1 })),
    S.fluid("screen-in", S.cylinder({ axis: "y", at: atY, r: P.SCREEN_MESH.r0 - 0.05, from: P.SCREEN_CAP[2][1] + 0.05, to: P.SCREEN_RING[0][1] - 0.05 })),
    S.fluid("ring-in", S.cylinder({ axis: "y", at: atY, r: P.SCREEN_RING[0][0] - 0.05, from: P.SCREEN_RING[0][1] - 0.05, to: gs.spigBot })),
    S.fluid("mid", S.cylinder({ axis: "y", at: atY, r: gs.cp - 0.05, from: gs.spigBot, to: gs.zc + gs.r })),
    S.fluid("out-h", S.cylinder({ axis: "x", at: [gs.zc, 0], r: gs.r - 0.05, from: X0 + gs.cp, to: X0 + gs.w + 30 })),
    S.fluid("prime", S.cylinder({ axis: "y", at: [X0 + gs.xp, 0], r: gs.rp - 0.05, from: gs.zc + gs.r, to: gs.top + 16 })),
    S.fluid("drain", S.lathe([[0, -104], [3.35, -104], [3.35, -86.5], [4.95, -86.5], [4.95, -82], [0, -82]], { axis: "y", at: atY })),
    S.fluid("water", S.cylinder({ axis: "y", at: atY, r: P.BOWL_IN.r - 0.1, from: WATER_FLOOR, to: WATER_FLOOR + 0.6 }), { stretch: { from: WATER_FLOOR + 0.3 } }),
    ...DROP_NAMES.map((n, i) => S.fluid(n, drop(i))),
  ];
}
export const FLUID_ORDER = () => fluids().map((f) => f.name);
export const SELECTOR_FUEL = { L: ["port-L", "line-L"], R: ["port-R", "line-R"], C: ["win", "centre", "outlet"] };
export const STRAINER_FUEL = ["in-h", "in-v", "bowl", "screen-in", "ring-in", "mid", "out-h"];
export const centres = () => [
  [[0, 0, GG.bodyBot - 8], [0, 0, GG.handle + 12]],
  [[X0, -124, 0], [X0, 42, 0]],
];
export const scene = () => ({ parts: parts(), fluids: fluids(), centres: centres() });
