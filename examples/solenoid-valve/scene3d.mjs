// The solenoid valve's solids for its 3D view (solenoid-valve-3d.html), in the same world mm as
// parts.mjs: u is x, v is y, the valve's axis is x = z = 0, the body's underside is y = 0, and the
// sheet's axial section (through both ports) is the cutting plane z = 0. Pure data built with
// kit/solid3d.mjs. Profiles are the 2D sheet's (parts.mjs exports sleeveLoop, underside, POCKET;
// model.mjs the dimensions). Moving parts are built shut (x = z = 0), as the sheet draws them;
// live3d.js moves the plunger group by x and the diaphragm group by z, rebuilds the diaphragm's
// convolution and the three water volumes that change with z, and scales the spring.
//
// What the sheet draws only in section and the 3D view has to invent, kept plain:
//   - the body is a 50 x 50 square forging (the cover's plan, View C) with hex port bosses (28 across
//     flats: View C's hex edges) on both sides; its turned inside (seat tube, annulus, bead groove)
//     is one lathe inside a square tube, so the open cavities are real geometry;
//   - the inlet gallery and the outlet passage are slots 14 and 12 mm wide (z) whose ends lie on the
//     seat tube, so their section at z = 0 is the sheet's;
//   - the yoke frame and plate are a 24 mm wide strap (z), the housing a rounded block 42 x 34
//     (View C) that fills the space round the winding.

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const PV = M.PORT_V;
const ST = M.SEAT_TOP;
const WEB = M.WEB;
const SL = M.SEAL_LOW;
const PT = M.PLUNGER_TOP;
const RT = 9.32; // G1/2 minor radius (as parts.mjs)
export const SPRING = { from: P.POCKET, to: M.POLE_FACE };
export const SPRING_LEN = SPRING.to - SPRING.from;
const STRAP = 12; // half-width (z) of the yoke frame and plate
const SCREWS = [[-19, -19], [19, -19], [19, 19], [-19, 19]];
// The plunger, its seal and spring explode up a parallel axis this far to the left (a jogged
// explosion line), so the armature tube can come off upwards without them.
export const JOG = -58;

// ---------------------------------------------------------------- extrusions with holes (a kit workaround)
// S.extrude along y or x mirrors the outline before three.js sees it; a counter-clockwise outline then
// keeps its holes as given, and a hole given counter-clockwise comes out inside out (its walls are back
// faces and the cut hatches across it). Give every hole the winding that ends up correct.
const area = (pts) => pts.reduce((a, [x0, y0], i) => {
  const [x1, y1] = pts[(i + 1) % pts.length];
  return a + x0 * y1 - x1 * y0;
}, 0);
function extrude(shape, o) {
  const mirrored = o.along === "y" || o.along === "x";
  const holes = (o.holes ?? []).map((h) => (area(h) > 0 === mirrored ? h.slice().reverse() : h));
  return S.extrude(shape, { ...o, holes });
}
// Points of a circle of radius r at the angles a 96-segment lathe uses (so faces meet without moire),
// between a0 and a1 degrees in the (x, z) plane, plus the exact end points.
function arcXZ(r, a0, a1) {
  const out = [[r * Math.cos((a0 * Math.PI) / 180), r * Math.sin((a0 * Math.PI) / 180)]];
  const step = 360 / 96;
  const lo = Math.min(a0, a1);
  const hi = Math.max(a0, a1);
  const mid = [];
  for (let a = Math.ceil(lo / step + 1e-6) * step; a < hi - 1e-6; a += step) mid.push([r * Math.cos((a * Math.PI) / 180), r * Math.sin((a * Math.PI) / 180)]);
  if (a0 > a1) mid.reverse();
  out.push(...mid, [r * Math.cos((a1 * Math.PI) / 180), r * Math.sin((a1 * Math.PI) / 180)]);
  return out;
}
const deg = (x) => (x * 180) / Math.PI;

// ---------------------------------------------------------------- the diaphragm (changes shape with z)
const BEAD = [[15, 34], [17.1, 34], [17.5, 34.4], [17.5, 35.6], [17.1, 36], [15, 36]];
const conv = (z) => P.underside(z).slice(1); // the convolution's underside, r 12 -> 15
// The convolution and bead: a closed half-profile in the diaphragm's own frame (it is moved by z).
export function convLoop(z) {
  const under = conv(z);
  const top = under.map(([r, v]) => [r, v + WEB]).reverse();
  return [...under, ...BEAD, ...top].map(([r, v]) => [r, v - z]);
}

// ---------------------------------------------------------------- water that changes with z (world frame)
// A fluid shows its far wall through the cut, so each volume follows the walls round it (0.03 mm
// inside them): where it ran into a solid, the solid's near face would hide the stipple behind it.
// Under the diaphragm on the inlet side: the annulus round the seat tube and the curtain over the lip.
export function underLoop(z) {
  const top = conv(z).map(([r, v]) => [r, v - 0.03]).reverse();
  top[0][0] = 14.97;
  const lip = Math.max(ST + z - 0.03, ST + 0.06); // over the lip: closed, it is a film inside the rubber
  return [[8.53, 24.03], [14.97, 24.03], ...top.slice(0, -1), [12, lip], [6.53, lip], [6.53, ST + 0.03], [8, ST + 0.03], [8.53, ST - 0.5]];
}
// The outlet side inside the seat, round the support washer and the pilot sleeve, up the pilot bore
// to the sleeve's top.
export function seatLoop(z) {
  return [
    [0, 5.1], [6.47, 7.03], [6.47, ST + z - 0.03], [6.03, ST + z - 0.03], [6.03, 32.97 + z], [3.23, 32.97 + z], [3.23, 32.4 + z],
    [3.01, 32.17 + z], [M.PILOT_D / 2 - 0.03, 32.17 + z], [M.PILOT_D / 2 - 0.03, SL + z], [0, SL + z],
  ];
}
// Above the diaphragm: the control chamber round the sleeve, the cover bore and the armature tube up
// to the pole (the plunger, which moves, is cut where it stands in it).
export function chamberLoop(z) {
  const top = conv(z).map(([r, v]) => [r, v + WEB + 0.03]);
  return [
    [0, SL + z], [1.33, SL + z + 0.03], [1.53, 37.4 + z], [1.53, 37.03 + z], [4.53, 37.03 + z], [4.53, ST + WEB + 0.03 + z],
    ...top, [14.97, top[top.length - 1][1]], [14.97, 39.47], [5.97, 39.47], [5.97, M.POLE_FACE - 0.03], [0, M.POLE_FACE - 0.03],
  ];
}

// ---------------------------------------------------------------- the body's pieces
function bodySolids() {
  const boss = S.polygon(6, 16.17, 0, PV); // across flats 28: flats on y = 0 and y = 28
  const port = [S.circle(0, PV, RT, 96)];
  return [
    // the forging up to the annulus floor: a solid block, its passages bored as volumes inside it
    S.extrude(S.rrectAt(0, 0, 25, 25, 1.5), { along: "y", from: 0, to: 24 }),
    // above: the rim the cover screws into, round the turned seat tube and the bead groove
    extrude(S.rrectAt(0, 0, 25, 25, 1.5), { along: "y", from: 24, to: 36, holes: [S.circle(0, 0, 17.5, 96), ...SCREWS.map(([x, z]) => S.circle(x, z, 2.55, 24))] }),
    S.lathe([[6.5, 24], [8.5, 24], [8.5, ST - 0.5], [8, ST], [6.5, ST]]),
    S.lathe([[15, 24], [17.5, 24], [17.5, 34], [15, 34]]),
    extrude(boss, { along: "x", from: 25, to: 36, holes: port }),
    extrude(boss, { along: "x", from: -36, to: -25, holes: port }),
    // passages, butted end to end: inlet port -> gallery -> annulus; seat bore -> outlet passage -> port
    S.bore(S.lathe([[0, -25], [RT, -25], [RT, -23], [0, -23]], { axis: "x", at: PV })),
    S.bore(S.extrude([[-23, 7], [-8.5, 7], [-8.5, 24], [-15, 24], [-15, 21], [-23, 21]], { along: "z", from: -7, to: 7, conform: { x: -8.5, r: 8.5 } })),
    S.bore(S.lathe([[0, 5.05], [6.5, 7], [6.5, 24], [0, 24]])),
    S.disc([0, 24.03, 0], 6.5, { role: "mouth" }), // where the seat bore opens into the seat tube
    S.bore(S.extrude([[6.5, 7], [23, 7], [23, 21], [6.5, 21]], { along: "z", from: -6, to: 6, conform: { x: 6.5, r: 6.5 } })),
    S.bore(S.lathe([[0, 23], [RT, 23], [RT, 25], [0, 25]], { axis: "x", at: PV })),
    S.disc([25.03, PV, 0], RT, { normal: "x", role: "mouth" }),
  ];
}

// ---------------------------------------------------------------- the cover's pieces
function coverSolids() {
  const inner = [[6.0, 39.5], [15, 39.5], [15, 48], [11.2, 48], [11.2, 46.2], [9, 46.2], [9, 42], [6.0, 42]];
  return [
    extrude(S.rrectAt(0, 0, 25, 25, 1.5), { along: "y", from: 36, to: 48, holes: [S.circle(0, 0, 15, 96), ...SCREWS.map(([x, z]) => S.circle(x, z, 2.75, 24))] }),
    S.lathe(inner),
  ];
}

// ---------------------------------------------------------------- the coil housing's pieces
function housingSolids() {
  const R = 16.4; // the bobbin's flanges
  const a = deg(Math.asin(STRAP / R));
  const cavity = [
    [19, -STRAP], [19, STRAP], ...arcXZ(R, a, 180 - a), [-19, STRAP], [-19, -STRAP], ...arcXZ(R, 180 + a, 360 - a),
  ];
  const outline = S.rrectAt(0, 0, 21, 17, 2);
  // fillers between the round winding and the flat frame legs (the overmoulding), each side
  const crescent = (r, sx) => {
    const arc = arcXZ(r, -45, 45).map(([x, z]) => [sx * x, z]);
    const z1 = r * Math.sin(Math.PI / 4);
    return sx > 0 ? [...arc, [17, z1], [17, -z1]] : [...arc, [-17, z1], [-17, -z1]].reverse();
  };
  const fills = [-1, 1].flatMap((sx) => [
    S.extrude(crescent(16, sx), { along: "y", from: 57, to: 93 }),
    S.extrude(crescent(16.4, sx), { along: "y", from: 56, to: 57 }),
    S.extrude(crescent(16.4, sx), { along: "y", from: 93, to: 94 }),
  ]);
  return [
    extrude(outline, { along: "y", from: 51, to: 96, holes: [cavity] }),
    extrude(cavity, { along: "y", from: 51, to: 53, holes: [S.circle(0, 0, 6.6, 96)] }),
    extrude(outline, { along: "y", from: 96, to: 98, holes: [S.circle(0, 0, 3.2, 48)] }),
    ...fills,
  ];
}

// ---------------------------------------------------------------- parts

const down = (dy) => [0, dy, 0];
const at = (dy) => ({ to: [0, dy, 0] });
const jog = (dy) => ({ to: [JOG, dy, 0] });
const COIL = 110; // the coil assembly lifts this far, clear of the armature tube and pole
const ARM = 44; // the armature tube (with its pole) lifts this far

export function parts() {
  const plunger = [
    [0, 39.6], [2.0, 39.6], [2.0, 37.8], [2.8, 37.8], [2.8, 41], [M.PLUNGER_R, 43.5], [M.PLUNGER_R, PT - 0.5], [M.PLUNGER_R - 0.5, PT],
    [2.0, PT], [2.0, P.POCKET], [0, P.POCKET - 1.2],
  ];
  const pole = [[0, M.POLE_FACE], [5.6, M.POLE_FACE], [6, M.POLE_FACE + 0.4], [6, 94], [6.5, 94], [6.5, 96], [3, 96], [3, 105.5], [2.5, 106], [0, 106]];
  const screw = [[0, 32], [2.5, 32], [2.5, 48], [4.25, 48], [4.25, 52.6], [3.85, 53], [2.3, 53], [2.3, 50.5], [0, 50.5]];
  const nutHex = S.polygon(6, 5 / Math.cos(Math.PI / 6), 0, 0, Math.PI / 6); // flats at x = +-5, as the section
  const bush = [[0.4, 33.7], [1.3, 33.7], [1.3, 34], [0.9, 34], [0.9, 35.5], [1.3, 35.5], [1.3, 35.8], [0.4, 35.8]];
  const w = M.WIND;
  return [
    S.part(1, "VALVE BODY G1/2", bodySolids(), {
      mat: "brass", angle: 45, explode: down(-48), anchor: { cut: [30, 26, 0], out: { c: [30, 26, 16] } },
    }),
    // ---- the diaphragm group (moves by z)
    S.part(2, "DIAPHRAGM Ø35", [
      extrude(S.circle(0, 0, 12, 96), { along: "y", from: ST, to: ST + WEB, holes: [S.circle(0, 0, 2.5, 48), S.circle(M.BLEED_U, 0, 0.9, 48)] }),
      S.lathe(convLoop(0), { live: "conv" }),
    ], { mat: "rubber", explode: at(-16), anchor: { cut: [-7.5, ST + WEB / 2, 0], out: { c: [0, ST + WEB, 0], r: 12, axis: "y" } } }),
    S.part(3, "PILOT SLEEVE Ø1.6", [S.lathe(P.sleeveLoop)], {
      mat: "brass", angle: 135, explode: at(-2), anchor: { cut: [3.9, 36.3, 0], out: { c: [0, 37, 0], r: 4.5, axis: "y" } },
    }),
    S.part(4, "SUPPORT WASHER Ø12×1", [S.tube({ r0: 2.5, r1: 6, from: 33, to: 34 })], {
      mat: "brass", angle: 30, explode: at(-22), anchor: { cut: [-4.5, 33.5, 0], out: { c: [0, 33.5, 0], r: 6, axis: "y" } },
    }),
    S.part(5, "BLEED BUSH Ø0.8", [S.lathe(bush, { at: M.BLEED_U })], {
      hatch: "solid", explode: at(-16), anchor: { cut: [M.BLEED_U + 0.65, 34.75, 0], out: { c: [M.BLEED_U, 35.8, 0], r: 1.3, axis: "y" } },
    }),
    // ---- the cover and the armature tube
    S.part(6, "COVER 50×50", coverSolids(), {
      mat: "brass", angle: 135, explode: down(22), anchor: { cut: [-21, 42, 0], out: { c: [-21, 48, -12] } },
    }),
    S.part(7, "CAP SCREW M5×16", SCREWS.map(([x, z]) => S.lathe(screw, { at: [x, z] })), {
      explode: down(46), anchor: { cut: [19, 53, -19], out: { c: [19, 53, -19] } },
    }),
    S.part(8, "O-RING 20×1.8", [S.lathe(K.rrect(9.15, 46.3, 11.05, 47.95, 0.8))], {
      mat: "rubber", explode: down(30), anchor: { cut: [10.1, 47.1, 0], out: { c: [0, 47.95, 0], r: 11, axis: "y" } },
    }),
    S.part(9, "TUBE BASE M18×1", [S.lathe([[6.0, 42], [8.5, 42], [9, 42.5], [9, 48], [11, 48], [11, 50.6], [10.6, 51], [6.5, 51], [6.5, 49], [6.0, 49]])], {
      mat: "brass", angle: 30, explode: down(38), anchor: { cut: [10.3, 49.5, 0], out: { c: [0, 49.5, 0], r: 11, axis: "y" } },
    }),
    S.part(10, "ARMATURE TUBE Ø13×0.5", [S.tube({ r0: M.TUBE_RI, r1: M.TUBE_RO, from: 49, to: 94 })], {
      hatch: "solid", explode: down(ARM), anchor: { cut: [-6.25, 62, 0], out: { c: [0, 62, 0], r: 6.5, axis: "y" } },
    }),
    S.part(11, "POLE PIECE WITH STUD M6", [S.lathe(pole)], {
      explode: down(ARM), anchor: { cut: [3.5, 89, 0], out: { c: [0, 101, 0], r: 3, axis: "y" } },
    }),
    // ---- the plunger group (moves by x; explodes up the jogged axis)
    S.part(12, "PLUNGER Ø11.2", [S.lathe(plunger)], {
      mat: "iron", angle: 45, explode: jog(30), anchor: { cut: [-3.8, 58, 0], out: { c: [0, 58, 0], r: M.PLUNGER_R, axis: "y" } },
    }),
    S.part(13, "PILOT SEAL Ø4×2", [S.lathe([[0, SL], [2.0, SL], [2.0, 39.6], [0, 39.6]])], {
      mat: "rubber", explode: jog(20), anchor: { cut: [-1.0, 38.6, 0], out: { c: [0, 38.6, 0], r: 2, axis: "y" } },
    }),
    S.part(14, `PLUNGER SPRING ${M.SPRING_TURNS} TURNS`, [
      S.helix({ axis: "y", at: 0, from: SPRING.from, to: SPRING.to, radius: 1.75, wire: 0.4, turns: M.SPRING_TURNS, pivot: [0, SPRING.to, 0], live: "spring" }),
    ], { hatch: "solid", explode: jog(52), anchor: { cut: [1.75, SPRING.from + 0.2 + (SPRING_LEN - 0.4) * (5 / 32), 0], out: { c: [0, 76, 0], r: 1.95, axis: "y" }, solid: 0 } }),
    // ---- the coil assembly (lifts off the armature tube)
    S.part(15, "COIL BOBBIN", [S.lathe([[6.6, 56], [16.4, 56], [16.4, 57], [7.6, 57], [7.6, 93], [16.4, 93], [16.4, 94], [6.6, 94]])], {
      mat: "plastic", angle: 60, explode: down(COIL), anchor: { cut: [12, 56.5, 0], out: { c: [0, 94, 0], r: 16.4, axis: "y" } },
    }),
    S.part(16, `WINDING ${M.TURNS} TURNS`, [S.lathe([[w.ri, w.v0], [w.ro, w.v0], [w.ro, w.v1], [w.ri, w.v1]])], {
      mat: "bronze", angle: 135, explode: down(COIL), anchor: { cut: [-12, 76, 0], out: { c: [0, 76, 0], r: 16, axis: "y" } },
    }),
    S.part(17, "YOKE FRAME 2 mm", [
      extrude(K.rect(-19, -STRAP, 19, STRAP), { along: "y", from: 94, to: 96, holes: [S.circle(0, 0, 6.6, 96)] }),
      S.extrude(K.rect(17, -STRAP, 19, STRAP), { along: "y", from: 53, to: 94 }),
      S.extrude(K.rect(-19, -STRAP, -17, STRAP), { along: "y", from: 53, to: 94 }),
    ], { mat: "steel", angle: 135, explode: down(COIL), anchor: { cut: [-18, 82, 0], out: { c: [-18, 82, -STRAP] } } }),
    S.part(18, "YOKE PLATE 3 mm", [extrude(K.rect(-17, -STRAP, 17, STRAP), { along: "y", from: 53, to: 56, holes: [S.circle(0, 0, 6.6, 96)] })], {
      mat: "steel", angle: 30, explode: down(COIL), anchor: { cut: [14, 54.5, 0], out: { c: [14, 54.5, -STRAP] } },
    }),
    S.part(19, "COIL HOUSING", housingSolids(), {
      mat: "plastic", angle: 45, explode: down(COIL), anchor: { cut: [-20, 66, 0], out: { c: [-21, 66, -6] } },
    }),
    S.part(20, "WASHER 6.4", [S.tube({ r0: 3.2, r1: 6, from: 98, to: 99.6 })], {
      explode: down(COIL + 8), anchor: { cut: [5.2, 98.8, 0], out: { c: [0, 99.6, 0], r: 6, axis: "y" } },
    }),
    S.part(21, "HEX NUT M6", [extrude(nutHex, { along: "y", from: 99.6, to: 104.8, holes: [S.circle(0, 0, 3.05, 96)] })], {
      explode: down(COIL + 14), anchor: { cut: [-4, 102.5, 0], out: { c: [0, 102.5, 0], r: 5.8, axis: "box" } },
    }),
  ];
}

// ---------------------------------------------------------------- water (the accent)
// Inlet (supply pressure p1), the control chamber (pC) and the outlet (p2): each a volume of its own,
// so live3d.js stipples them by their own pressure. The three marked LIVE change with the lift z.
export function fluids() {
  return [
    S.fluid("in-port", S.lathe([[0, -36], [RT - 0.03, -36], [RT - 0.03, -23], [0, -23]], { axis: "x", at: PV })),
    S.fluid("in-gallery", S.extrude([[-23, 7.03], [-8.5, 7.03], [-8.5, 24.03], [-14.97, 24.03], [-14.97, 20.97], [-23, 20.97]], { along: "z", from: -6.97, to: 6.97, conform: { x: -8.5, r: 8.53 } })),
    S.fluid("in-under", S.lathe(underLoop(0))),
    S.fluid("out-seat", S.lathe(seatLoop(0))),
    S.fluid("out-passage", S.extrude([[6.5, 7.03], [23, 7.03], [23, 20.97], [6.5, 20.97]], { along: "z", from: -5.97, to: 5.97, conform: { x: 6.5, r: 6.47 } })),
    S.fluid("out-port", S.lathe([[0, 23], [RT - 0.03, 23], [RT - 0.03, 36], [0, 36]], { axis: "x", at: PV })),
    S.fluid("chamber", S.lathe(chamberLoop(0))),
  ];
}
export const INLET = ["in-port", "in-gallery", "in-under"];
export const OUTLET = ["out-seat", "out-passage", "out-port"];
export const CHAMBER = ["chamber"];
export const LIVE = { "in-under": underLoop, "out-seat": seatLoop, chamber: chamberLoop };

export const DIAPHRAGM = [2, 3, 4, 5]; // move by z
export const PLUNGER = [12, 13]; // move by x

// centre lines: the valve's axis, the ports' axis, the bleed's (riding with the diaphragm)
export const centres = () => [
  [[0, -4, 0], [0, 110, 0]],
  [[-40, PV, 0], [40, PV, 0]],
  { line: [[M.BLEED_U, 31.5, 0], [M.BLEED_U, 38, 0]], part: 5 },
];

export const scene = () => ({ parts: parts(), fluids: fluids(), centres: centres() });
