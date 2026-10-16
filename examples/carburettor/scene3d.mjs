// The carburettor's solids for its 3D view (carburettor-3d.html), in the same world mm as parts.mjs:
// u is x (air flows +x, air horn on the left, engine flange on the right), v is y, the bore's axis is
// y = z = 0, and the sheet's cutting plane (through the bore axis and every vertical jet axis) is
// z = 0. Pure data built with kit/solid3d.mjs from the sheet's numbers (model.mjs, parts.mjs).
//
// Depth (z), which the section cannot give, comes from View C: the body is 40 wide under the bore,
// the bowl 44 outside (2.5 walls), the flange ±20 × ±32, the inlet nipple on +z, the spindles' stubs
// as the end view draws them.
//
// The body is a casting without CSG: the bore is a turned tube (its inner surface is the sheet's
// bellmouth, venturi and diffuser), the block under it is extruded along the bore with its top on
// the tube's 144-gon, so the two meet without a gap or an overlap, and the drillings are bore volumes
// butted end to end as the sheet draws them. The throttle and choke plates sit in slots through
// their spindles, so the plate and the two halves of its spindle touch and never overlap. Moving parts
// are built at rest (plates at φ = 0 across the bore, float at the set level, screw at 1 turn out);
// live3d.js poses them from the model.

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const NZ = P.NZ; // nozzle / emulsion tube / main jet axis, u = -2
const PJ = P.PJ_U; // pilot jet axis
const SU = P.SCREW_U; // mixture screw axis
const NU = M.NEEDLE_U; // float needle axis
const [PU, PV] = M.PIVOT; // float hinge
const OUT = 20.5; // the bore tube's outer radius (the sheet's upper edge, v = 20.5)
const W = OUT * Math.sin((77.5 * Math.PI) / 180); // the block's half-width, on a tube vertex (20.01)
const BW = 22; // bowl, outside, ±z
const BI = 19.5; // bowl, inside
const T = P.BOWL_TOP; // -26.8, the bowl's top under the gasket
const E = T - 4; // the ears' underside
export const LEVEL0 = -40; // the bowl fuel is built to here and stretched to the model's level
export const COL0 = -35; // the main column's top as built
export const SPRAY1 = P.spray(1); // the spray as built (full); scaled down in live3d.js
export const PLUME1 = P.idlePlume(1);
export const STREAM = { u: NU - 1.8, top: -27.2, w: 0.65, bottom: LEVEL0 };

// the plates and spindles come out along their axes (-z, the far side) on a line jogged up clear of
// the body, so they land in the free space above it
const LIFT = (dz) => [0, 34, -dz];
const rad = (d) => (d * Math.PI) / 180;
const ellipse = (a, b, n = 64, cx = 0, cy = 0) => Array.from({ length: n }, (_, i) => [cx + a * Math.cos((2 * Math.PI * i) / n), cy + b * Math.sin((2 * Math.PI * i) / n)]);
const rectXZ = (x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

// The block under the bore tube, seen along the bore (z, y): bottom at yb, sides at ±W, top on the
// tube's own vertices (every 2.5°), so it touches the tube along its whole lower half.
function underBlock(yb) {
  const arc = [];
  for (let k = 31; k >= -31; k--) arc.push([OUT * Math.sin(rad(2.5 * k)), -OUT * Math.cos(rad(2.5 * k))]);
  return [[-W, yb], [W, yb], ...arc];
}

// A plate's spindle, slotted for the plate: the two D-shaped halves either side of the slot, across
// the bore (z within ±zr), as extrusions along z. (x, y) about the spindle centre cu.
function spindleHalves(cu, r, slot, zr) {
  const a = Math.acos(slot / r);
  const half = (sx) => {
    const pts = [];
    for (let i = 0; i <= 20; i++) {
      const t = -a + (2 * a * i) / 20;
      pts.push([cu + sx * r * Math.cos(t), r * Math.sin(t)]);
    }
    return pts;
  };
  return [1, -1].map((sx) => S.extrude(half(sx), { along: "z", from: -zr, to: zr }));
}

// ---------------------------------------------------------------- the body (1)
function body() {
  const g = P.GALLERY;
  // the bore tube: inner surface the sheet's boreR, outer the sheet's top edge with the air-horn bead
  const inner = [];
  // the sheet's breaks, and every mm through the bellmouth, venturi and diffuser
  const us = new Set([-58, -50, -30, -6, 2, 18, 40]);
  for (let u = -57; u < 18; u++) if (u < -50 || (u > -30 && u < -6) || u > 2) us.add(u);
  for (const u of [...us].sort((a, b) => a - b)) inner.push([P.boreR(u), u]);
  const tube = [...inner, [OUT, 40], [OUT, -52], [21.5, -52.5], [21.5, -54.5], [OUT, -55], [OUT, -57.5], [20, -58]];
  const lug = [[PU - 2.4, -26], [PU - 2.4, PV], ...K.arc(PU, PV, 2.4, 180, 360, 10).slice(1, -1), [PU + 2.4, PV], [PU + 2.4, -26]];
  const vlathe = (loop, u) => S.lathe(loop, { axis: "y", at: u });
  const xlathe = (loop, v) => S.lathe(loop, { axis: "x", at: v });
  return [
    S.lathe(tube, { axis: "x", at: 0 }),
    // engine flange, ±20 × ±32 with two Ø6.5 bolt holes, the bore through it
    S.extrude(S.rrectAt(0, 0, 20, 32, 4, 4), { along: "x", from: 40, to: 46, holes: [S.circle(0, 0, 13, 144), S.circle(0, 25, 3.25, 32), S.circle(0, -25, 3.25, 32)] }),
    // the block under the bore: down to the bowl face, and stepped up to v = -21 before the flange
    S.extrude(underBlock(M.BOWL_FACE), { along: "x", from: -52, to: 36.5 }),
    S.extrude(underBlock(-21), { along: "x", from: 36.5, to: 40 }),
    // the main well's boss, the mixture screw's boss, the float's hinge lugs (beyond the plane)
    vlathe([[0, -37], [5, -37], [5.5, -36.5], [5.5, -26], [0, -26]], NZ),
    S.extrude([[28, -4.5], [36, -4.5], [36.5, -4], [36.5, 4.5], [28, 4.5]], { along: "y", from: -30, to: -26 }),
    S.extrude(lug, { along: "z", from: -6.5, to: -3.2, holes: [S.circle(PU, PV, 1.05, 24)], own: true }),
    S.extrude(lug, { along: "z", from: 3.2, to: 6.5, holes: [S.circle(PU, PV, 1.05, 24)], own: true }),
    // ---- the passages, butted end to end as the sheet draws them
    // main well: main jet thread, emulsion-tube well, nozzle bore up to the throat
    S.bore(vlathe([[0, -37], [3.05, -37], [3.05, -33], [3.52, -33], [3.52, -16], [2.52, -16], [2.52, -P.boreR(NZ)], [0, -P.boreR(NZ)]], NZ)),
    // main air: the jet's bore from the bellmouth floor, the drilling (ball-plugged) to the well
    S.bore(vlathe([[0, P.MA.v + P.MA.r], [1.52, P.MA.v + P.MA.r], [1.52, -P.boreR(P.MAJ_U)], [0, -P.boreR(P.MAJ_U)]], P.MAJ_U)),
    S.bore(xlathe([[0, -58], [1, -58], [1, -56.5], [P.MA.r, -56.5], [P.MA.r, NZ - 3.52], [0, NZ - 3.52]], P.MA.v)),
    // pilot: the jet's thread and riser, the drilling either side of the screw, its plugged end
    S.bore(vlathe([[0, -26], [2.52, -26], [2.52, -22], [0.62, -22], [0.62, P.PD.v - P.PD.r], [0, P.PD.v - P.PD.r]], PJ)),
    S.bore(xlathe([[0, PJ - 0.62], [P.PD.r, PJ - 0.62], [P.PD.r, SU - 1.52], [0, SU - 1.52]], P.PD.v)),
    S.bore(xlathe([[0, SU + 1.52], [P.PD.r, SU + 1.52], [P.PD.r, 44.5], [1, 44.5], [1, 46], [0, 46]], P.PD.v)),
    S.bore(vlathe([[0, P.PD.v + P.PD.r], [1.52, P.PD.v + P.PD.r], [1.52, -13], [0, -13]], P.PAJ_U)),
    ...M.PROGS.map(([u, d]) => S.bore(vlathe([[0, P.PD.v + P.PD.r], [d / 2, P.PD.v + P.PD.r], [d / 2, -13], [0, -13]], u))),
    // mixture screw: thread, cavity, idle port
    S.bore(vlathe([[0, -30], [2.55, -30], [2.55, -19.5], [1.52, -19.5], [1.52, -16.5], [M.JETS.idlePort / 2 + 0.02, -16.5], [M.JETS.idlePort / 2 + 0.02, -13], [0, -13]], SU)),
    // float needle seat thread and the fuel gallery from the inlet nipple (+z)
    S.bore(vlathe([[0, -26], [3.05, -26], [3.05, -22], [0, -22]], NU)),
    S.bore(S.extrude(S.circle(g.u, g.v, g.r, 32), { along: "z", from: -3, to: W })),
    // tapped holes for the bowl screws, with their drill points
    ...P.SCREWS.map((u) => S.bore(vlathe([[0, -26], [2.05, -26], [2.05, -20.6], [0, -19.4]], u))),
  ];
}

// ---------------------------------------------------------------- the bowl (2) and gasket (3)
function bowl() {
  const ear = (x0, x1, u) => S.extrude(rectXZ(x0, x1, -5, 5), { along: "y", from: E, to: T, holes: [S.circle(u, 0, 2.25, 32)] });
  return [
    S.extrude(rectXZ(-45, 19, -BW, BW), { along: "y", from: -58, to: P.BOWL_IN.v0, holes: [S.circle(NZ, 0, 5.05, 48)] }),
    // walls: the left one carries the vent tube's hole
    S.extrude(rectXZ(-BW, BW, P.BOWL_IN.v0, T), { along: "x", from: -45, to: P.BOWL_IN.u0, holes: [S.circle(0, -40, 2.05, 32)] }),
    S.extrude([[-BW, P.BOWL_IN.v0], [BW, P.BOWL_IN.v0], [BW, T], [-BW, T]], { along: "x", from: P.BOWL_IN.u1, to: 19 }),
    S.extrude(K.rect(P.BOWL_IN.u0, P.BOWL_IN.v0, P.BOWL_IN.u1, T), { along: "z", from: BI, to: BW }),
    S.extrude(K.rect(P.BOWL_IN.u0, P.BOWL_IN.v0, P.BOWL_IN.u1, T), { along: "z", from: -BW, to: -BI }),
    ear(-53, -45, P.SCREWS[0]),
    ear(19, 27, P.SCREWS[1]),
    // the drain boss under the floor
    S.lathe([[5.05, -61], [6.5, -61], [7, -60.5], [7, -58], [5.05, -58]], { axis: "y", at: NZ }),
  ];
}
const gasketOutline = [[-53, -5], [-45, -5], [-45, -BW], [19, -BW], [19, -5], [27, -5], [27, 5], [19, 5], [19, BW], [-45, BW], [-45, 5], [-53, 5]];

// ---------------------------------------------------------------- moving: float, arm (rest: level at the set)
// float: the sheet's 0.8 shell; its inside is a cavity (a bore of the float itself)
const floatOuter = K.rrect(-30, -38, -9.5, -28, 2.4, 3);
const floatInner = K.rrect(-29.2, -37.2, -10.3, -28.8, 1.6, 3);
// arm: the strip the needle rides on, from the eye to the float's side (stopped clear of its corner)
const armStrip = [[PU + 1.4, PV + 0.1], [-29.5, PV + 0.1], [-29.5, PV + 0.9], [PU + 1.2, PV + 0.9]];

// the mixture screw at its factory setting, and its spring between the head and the boss
const A0 = P.screwApex(M.SCREW_TURNS);
const TL = 1.3 / Math.tan(rad(M.SCREW_TAPER));
export const SCREW0 = { apex: A0, springLen: -30 - (A0 - 20) };
export const SPRING_PIVOT = [SU, -30, 0];
// the needle seated (lift 0): the sheet's profile
const needleLoop = (() => {
  const apex = -23 + 0.75;
  const base = P.tabV(M.LEVEL_SET);
  return [[0, apex], [1.5, apex - 1.5], [1.5, base + 0.3], [1.2, base], [0, base]];
})();

// the bowl screws, pan head M4×10 (ISO 7045), from under the ears
const screwLoop = [[0, -20.4], [1.6, -20.4], [2, -20.8], [2, E], [4, E], [4, E - 1.4], ...K.arc(2.6, E - 1.4, 1.4, 0, -90, 3).slice(1), [0, E - 2.8]];

const PLATE_Z = 12.97; // a hair inside the Ø26 bore's 144-gon
const TS_Z = Math.sqrt(13 ** 2 - 2.5 ** 2) - 0.01; // throttle spindle ends at the bore wall
const CS_Z = Math.sqrt(13 ** 2 - 2 ** 2) - 0.01;

export function parts() {
  const vl = (loop, u, o = {}) => S.lathe(loop, { axis: "y", at: u, ...o });
  const down = (dy) => [0, dy, 0];
  return [
    S.part(1, "BODY, Ø26 BORE, Ø20 VENTURI", body(), { mat: "alu", angle: 45, anchor: { cut: [-20, 16.5, 0], out: { c: [-20, 0, 0], r: OUT, axis: "x" } } }),
    S.part(2, "FLOAT BOWL", bowl(), { mat: "alu", angle: 135, explode: down(-68), anchor: { cut: [-43.75, -49, 0], out: { c: [-17, -48, 0], r: 31, axis: "box" } } }),
    S.part(3, "BOWL GASKET 0.8", [S.extrude(gasketOutline, { along: "y", from: T, to: M.BOWL_FACE, holes: [rectXZ(P.BOWL_IN.u0, P.BOWL_IN.u1, -BI, BI), S.circle(P.SCREWS[0], 0, 2.25, 32), S.circle(P.SCREWS[1], 0, 2.25, 32)] })], {
      hatch: "solid", explode: down(-14), anchor: { cut: [16.5 + 1.2, -26.4, 0], out: { c: [-17, -26.4, 0], r: 31, axis: "box" } },
    }),
    S.part(4, "SCREW M4×10 ISO 7045", P.SCREWS.map((u) => vl(screwLoop, u)), { explode: down(-104), anchor: { cut: [P.SCREWS[0], E - 1.8, 0], out: { c: [P.SCREWS[0], E - 1.4, 0], r: 4, axis: "y" } } }),
    S.part(5, "DRAIN PLUG M10×1.25", [
      vl([[0, -61], [5, -61], [5, -56.1], [4.9, -56], [0, -56]], NZ),
      S.extrude(S.hexagon(13 * Math.cos(Math.PI / 6), NZ, 0), { along: "y", from: -66, to: -62 }),
    ], { explode: down(-94), anchor: { cut: [NZ + 3, -64, 0], out: { c: [NZ, -64, 0], r: 6.5, axis: "box" } } }),
    S.part(6, "SEALING WASHER 10×14×1", [S.tube({ axis: "y", at: NZ, r0: 5.05, r1: 7, from: -62, to: -61 })], { explode: down(-80), anchor: { cut: [NZ + 6, -61.5, 0], out: { c: [NZ, -61.5, 0], r: 7, axis: "y" } } }),
    // ---- the main circuit, out of the boss downward: nozzle, emulsion tube, main jet
    S.part(7, `MAIN JET #${Math.round(M.JETS.main * 100)}`, [vl([[1.3, -33], [3, -33], [3, -37], [3.5, -37], [3.5, -41], [1.5, -41], [1.5, -37.5], [M.JETS.main / 2, -37.5], [M.JETS.main / 2, -35.5], [1.3, -35.5]], NZ)], {
      mat: "brass", angle: 135, explode: down(-40), anchor: { cut: [NZ + 2.5, -39.5, 0], out: { c: [NZ, -39.5, 0], r: 3.5, axis: "y" } },
    }),
    S.part(8, "EMULSION TUBE, 6× Ø0.8 BLEEDS", [
      vl([[1.3, -33], [2.5, -33], [2.5, -17], [3.5, -17], [3.5, -16], [1.3, -16]], NZ),
      // the bleed holes, drilled across through both walls (each half butts on the bore)
      ...P.BLEEDS.flatMap((b) => [S.bore(S.lathe([[0, NZ - 2.5], [0.4, NZ - 2.5], [0.4, NZ - 1.3], [0, NZ - 1.3]], { axis: "x", at: b })), S.bore(S.lathe([[0, NZ + 1.3], [0.4, NZ + 1.3], [0.4, NZ + 2.5], [0, NZ + 2.5]], { axis: "x", at: b }))]),
    ], { mat: "brass", angle: 60, explode: down(-33), anchor: { cut: [NZ - 1.9, -21.5, 0], out: { c: [NZ, -21.5, 0], r: 2.5, axis: "y" } } }),
    S.part(9, "MAIN NOZZLE Ø5×2.6", [vl([[1.3, M.NOZZLE_TIP], [2.1, M.NOZZLE_TIP], [2.5, M.NOZZLE_TIP - 0.4], [2.5, -16], [1.3, -16]], NZ)], {
      mat: "brass", angle: 135, explode: down(-31), anchor: { cut: [NZ - 1.9, -11.5, 0], out: { c: [NZ, -11.5, 0], r: 2.5, axis: "y" } },
    }),
    S.part(10, `MAIN AIR JET Ø${M.JETS.mainAir}`, [vl([[M.JETS.mainAir / 2, P.MA.v + P.MA.r], [1.5, P.MA.v + P.MA.r], [1.5, -P.boreR(P.MAJ_U)], [M.JETS.mainAir / 2, -P.boreR(P.MAJ_U)]], P.MAJ_U)], {
      mat: "brass", angle: 135, explode: down(9), anchor: { cut: [P.MAJ_U - 0.95, -15.2, 0], out: { c: [P.MAJ_U, -13.5, 0], r: 1.5, axis: "y" } },
    }),
    // ---- the pilot circuit
    S.part(11, `PILOT JET #${Math.round(M.JETS.pilot * 100)}`, [vl([[0.6, -22], [2.5, -22], [2.5, -26], [3, -26], [3, -29], [2, -29], [2, -36], [0.6, -36], [0.6, -34], [M.JETS.pilot / 2, -34], [M.JETS.pilot / 2, -33], [0.6, -33]], PJ)], {
      mat: "brass", angle: 135, explode: down(-22), anchor: { cut: [PJ + 2.5, -27.5, 0], out: { c: [PJ, -27.5, 0], r: 3, axis: "y" } },
    }),
    S.part(12, `PILOT AIR JET Ø${M.JETS.pilotAir}`, [vl([[M.JETS.pilotAir / 2, P.PD.v + P.PD.r], [1.5, P.PD.v + P.PD.r], [1.5, -13], [M.JETS.pilotAir / 2, -13]], P.PAJ_U)], {
      mat: "brass", angle: 135, explode: down(9), anchor: { cut: [P.PAJ_U + 1.15, -15.2, 0], out: { c: [P.PAJ_U, -13.5, 0], r: 1.5, axis: "y" } },
    }),
    S.part(13, "MIXTURE SCREW M5×0.5, 10°", [vl([[0, A0], [1.3, A0 - TL], [1.3, A0 - TL - 0.8], [2.5, A0 - TL - 1.2], [2.5, A0 - 20], [3, A0 - 20], [3, A0 - 22.6], [0, A0 - 22.6]], SU)], {
      explode: down(-42), anchor: { cut: [SU - 1.4, -27, 0], out: { c: [SU, -36, 0], r: 3, axis: "y" } },
    }),
    S.part(14, "SCREW SPRING Ø6, 3 TURNS", [S.helix({ axis: "y", at: SU, from: A0 - 20, to: -30, radius: 3, wire: 0.5, turns: 3, pivot: SPRING_PIVOT, live: "spring" })], {
      hatch: "solid", explode: down(-9), anchor: { cut: [SU + 3, -32.4, 0], out: { c: [SU, -32.4, 0], r: 3.25, axis: "y" } },
    }),
    // ---- the float and its needle valve
    S.part(15, "FLOAT, HOLLOW, 0.8 WALL", [S.extrude(floatOuter, { along: "z", from: -15, to: 15 }), S.bore(S.extrude(floatInner, { along: "z", from: -14.2, to: 14.2 }))], {
      hatch: "solid", pivot: [PU, PV, 0], explode: down(-26), anchor: { cut: [-20, -37.6, 0], out: { c: [-20, -33, 0], r: 15, axis: "z" } },
    }),
    S.part(16, "FLOAT ARM 0.8", [
      S.extrude(armStrip, { along: "z", from: -3, to: 3 }),
      S.extrude(K.circle(PU, PV, 1.8, 24), { along: "z", from: -3, to: 3, holes: [S.circle(PU, PV, 1.05, 24)] }),
    ], { hatch: "solid", pivot: [PU, PV, 0], explode: down(-26), anchor: { cut: [-33, PV + 0.5, 0], out: { c: [-33, PV + 0.5, 0], r: 3, axis: "z" } } }),
    S.part(17, "HINGE PIN Ø2×12", [S.cylinder({ axis: "z", at: [PU, PV], r: 1, from: -6.5, to: 6.5 })], {
      mat: "steel", angle: 45, explode: [0, -26, 22], anchor: { cut: [PU, PV, 0], out: { c: [PU, PV, 6.5], r: 0 } },
    }),
    S.part(18, "FLOAT NEEDLE, FKM TIP", [vl(needleLoop, NU)], { explode: down(-19), anchor: { cut: [NU + 0.4, -26.6, 0], out: { c: [NU, -25.5, 0], r: 1.5, axis: "y" } } }),
    S.part(19, "NEEDLE SEAT Ø1.5", [vl([[0.75, -22], [3, -22], [3, -26], [3.5, -26], [3.5, -27.2], [1.8, -27.2], [1.8, -23], [0.75, -23]], NU)], {
      mat: "brass", angle: 135, explode: down(-10), anchor: { cut: [NU + 2.4, -24, 0], out: { c: [NU, -26.6, 0], r: 3.5, axis: "y" } },
    }),
    // ---- choke and throttle: plates across the bore at φ = 0, in slots through their spindles
    S.part(20, "CHOKE PLATE 0.8, 2× Ø6.5", [
      S.extrude(ellipse(PLATE_Z, 13 / Math.cos(rad(M.CHOKE_SHUT - 0.01)) - 0.1), { along: "x", from: M.CHOKE_U - 0.4, to: M.CHOKE_U + 0.4, holes: [S.circle(0, 6.5, M.CHOKE_HOLE / 2, 32), S.circle(0, -6.5, M.CHOKE_HOLE / 2, 32)] }),
    ], { hatch: "solid", pivot: [M.CHOKE_U, 0, 0], explode: LIFT(50), anchor: { cut: [M.CHOKE_U, 11.4, 0], out: { c: [M.CHOKE_U, 11.4, -6], r: 0 } } }),
    S.part(21, "CHOKE SPINDLE Ø4", [
      ...spindleHalves(M.CHOKE_U, 2, 0.4, CS_Z),
      S.cylinder({ axis: "z", at: [M.CHOKE_U, 0], r: 2, from: -25, to: -20.45 }),
    ], { mat: "steel", angle: 135, pivot: [M.CHOKE_U, 0, 0], explode: LIFT(84), anchor: { cut: [M.CHOKE_U + 1.2, -0.9, 0], out: { c: [M.CHOKE_U, 0, -12], r: 2, axis: "z" } } }),
    S.part(22, "THROTTLE PLATE Ø26.1×1.2", [S.extrude(ellipse(PLATE_Z, M.PLATE_R - 0.02), { along: "x", from: M.SPINDLE_U - 0.6, to: M.SPINDLE_U + 0.6 })], {
      mat: "brass", angle: 30, pivot: [M.SPINDLE_U, 0, 0], explode: LIFT(50), anchor: { cut: [M.SPINDLE_U, 9, 0], out: { c: [M.SPINDLE_U, 9, -6], r: 0 } },
    }),
    S.part(23, "THROTTLE SPINDLE Ø5", [
      ...spindleHalves(M.SPINDLE_U, 2.5, 0.6, TS_Z),
      S.cylinder({ axis: "z", at: [M.SPINDLE_U, 0], r: 2.5, from: -23, to: -20.45 }),
      S.cylinder({ axis: "z", at: [M.SPINDLE_U, 0], r: 2.5, from: 20.45, to: 26 }),
    ], { mat: "steel", angle: 135, pivot: [M.SPINDLE_U, 0, 0], explode: LIFT(84), anchor: { cut: [M.SPINDLE_U + 1.6, 0.6, 0], out: { c: [M.SPINDLE_U, 0, 23], r: 2.5, axis: "z" } } }),
    // ---- plugs, vent, inlet
    S.part(24, "BALL PLUG Ø2", [
      S.sphere([-57.5, P.MA.v, 0], 0.98, { explode: [-10, 0, 0] }),
      S.sphere([45.5, P.PD.v, 0], 0.98, { explode: [10, 0, 0] }),
    ], { explode: null, anchor: { cut: [-57.3, P.MA.v + 0.3, 0], out: { c: [-57.5, P.MA.v, 0], r: 1, axis: "sphere" }, solid: 0 } }),
    S.part(25, "BOWL VENT TUBE Ø4×0.5", [S.tube({ axis: "x", at: -40, r0: 1.5, r1: 2, from: -52, to: -43 })], {
      hatch: "solid", explode: [-16, -68, 0], anchor: { cut: [-50, -38.25, 0], out: { c: [-50, -40, 0], r: 2, axis: "x" } },
    }),
    S.part(26, "FUEL INLET NIPPLE Ø6", [S.lathe([[P.GALLERY.r, W], [3, W], [3, 28], [2.2, 28.5], [1.6, 33], [1.5, 33.5], [P.GALLERY.r, 33.5]], { axis: "z", at: [NU, P.GALLERY.v] })], {
      mat: "brass", angle: 135, explode: [0, 0, 16], anchor: { cut: [NU, P.GALLERY.v, -2], out: { c: [NU, P.GALLERY.v, 28], r: 3, axis: "z" } },
    }),
  ];
}

// ---------------------------------------------------------------- the fuel (the accent)
export function fluids() {
  const vl = (loop, u) => S.lathe(loop, { axis: "y", at: u });
  const g = P.GALLERY;
  const zs = (shape, h) => S.extrude(shape, { along: "z", from: -h, to: h });
  return [
    // the bowl, built to LEVEL0 and stretched to the model's level; the fuel over the drain plug
    S.fluid("bowl", S.extrude(rectXZ(P.BOWL_IN.u0, P.BOWL_IN.u1, -BI, BI), { along: "y", from: P.BOWL_IN.v0, to: LEVEL0 }), { stretch: { from: LEVEL0 - 0.5 } }),
    S.fluid("drain", vl([[0, -56], [5.02, -56], [5.02, P.BOWL_IN.v0], [0, P.BOWL_IN.v0]], NZ)),
    // the main jet's bore and the column in the emulsion tube, built to COL0 and stretched
    S.fluid("column", vl([[0, -41], [1.47, -41], [1.47, -37.5], [M.JETS.main / 2 - 0.03, -37.5], [M.JETS.main / 2 - 0.03, -35.5], [1.27, -35.5], [1.27, COL0], [0, COL0]], NZ), { stretch: { from: COL0 - 0.2 } }),
    // emulsion while the main circuit flows: the well round the tube, the tube and nozzle above the bleeds
    S.fluid("well", vl([[2.53, -33], [3.49, -33], [3.49, -16.03], [2.53, -16.03]], NZ)),
    S.fluid("emulsion", vl([[0, M.BLEED_V], [1.27, M.BLEED_V], [1.27, M.NOZZLE_TIP], [0, M.NOZZLE_TIP]], NZ)),
    S.fluid("spray", zs(SPRAY1, 1.6)),
    // pilot: jet and riser, the drilling, the screw's cavity and idle port, the progression ports
    S.fluid("pilot", vl([[0, -36], [0.57, -36], [0.57, -34], [M.JETS.pilot / 2 - 0.02, -34], [M.JETS.pilot / 2 - 0.02, -33], [0.57, -33], [0.57, P.PD.v - 0.2], [0, P.PD.v - 0.2]], PJ)),
    S.fluid("pdrill", S.lathe([[0, PJ - 0.6], [0.57, PJ - 0.6], [0.57, 44.5], [0, 44.5]], { axis: "x", at: P.PD.v })),
    S.fluid("idle", vl([[0, -19.5], [1.49, -19.5], [1.49, -16.5], [M.JETS.idlePort / 2 - 0.01, -16.5], [M.JETS.idlePort / 2 - 0.01, -13.01], [0, -13.01]], SU)),
    ...M.PROGS.map(([u, d], i) => S.fluid(`prog${i}`, vl([[0, P.PD.v], [d / 2 - 0.02, P.PD.v], [d / 2 - 0.02, -13.01], [0, -13.01]], u))),
    S.fluid("plume", zs(PLUME1, 0.5)),
    S.fluid("pplume", zs(P.idlePlume(1, M.PROG_U), 0.4)),
    // supply: the gallery from the inlet, the seat round the needle, and the stream into the bowl
    S.fluid("gallery", S.extrude(S.circle(g.u, g.v, g.r - 0.03, 32), { along: "z", from: -2.97, to: W })),
    S.fluid("seat", vl([[0, -27.2], [1.77, -27.2], [1.77, -23], [0.72, -23], [0.72, -22], [0, -22]], NU)),
    S.fluid("stream", zs(K.rect(STREAM.u - STREAM.w, STREAM.bottom, STREAM.u, STREAM.top), 0.5)),
  ];
}
export const BOWL = ["bowl", "drain"];

// centre lines: the bore, the vertical jet axes, the spindles and the hinge pin (the moving ones ride along)
export const centres = () => [
  [[-64, 0, 0], [52, 0, 0]],
  [[NZ, -5, 0], [NZ, -44, 0]],
  [[PJ, -15, 0], [PJ, -38, 0]],
  [[SU, -11, 0], [SU, -39, 0]],
  [[NU, -18, 0], [NU, -30, 0]],
  [[M.SPINDLE_U, 0, -27], [M.SPINDLE_U, 0, 4]],
  [[M.CHOKE_U, 0, -28], [M.CHOKE_U, 0, 4]],
];

export const scene = () => ({ parts: parts(), fluids: fluids(), centres: centres() });
