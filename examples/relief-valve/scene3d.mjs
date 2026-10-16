// The relief valve's solids for its 3D view (relief-valve-3d.html), in the same world mm as parts.mjs:
// u is x, v is y, the valve's axis is x = z = 0 and the sheet's cutting plane (through the valve's
// axis and the outlet's) is z = 0. Pure data built with kit/solid3d.mjs.
//
// The half-profiles are the 2D sheet's numbers (parts.mjs draws each part from them; where it
// exports them they are imported: holderLoop, SEAT_V, PLATE_V, SPRING_TOP, OUT_V, OUT_R, OUT_FACE,
// PIN, STUD_R, and the spring from the model). The disc assembly is built seated (h = 0) and the
// setting parts at the nominal set, as on the sheet; live3d.js moves them.
//
// The body is a cast tee without CSG: a lower and an upper turned piece, the wall between them as
// C-shaped extrusions that leave room for the outlet, a boss block (extruded along x, its inner face
// conformed onto the bore) carrying the outlet passage, and the outlet branch and flanges with real
// bolt holes. A thin wall cannot hide a bore volume (its own back face is nearer than the bore's far
// wall), so every hole through a wall here is a true hole in an extrusion.

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const OV = P.OUT_V; // outlet axis height, 95
const OR = P.OUT_R; // outlet bore radius, 21.5
const BR = 33; // outlet branch outer radius (the sheet's 62 … 128 about v = 95)
const SR = P.STUD_R; // bonnet stud circle radius, 51
const B = P.SPRING_TOP + 8; // the adjusting screw's foot (upper plate top), 294
// live3d.js turns the coil a quarter turn about its axis so its wire sections lie where the sheet
// draws them (+x at the start of each turn); this anchor, given before that turn, lands on the
// second section on -x, as the sheet's springDot does
const PITCH = (M.L_SET - M.WIRE) / M.ACTIVE;
const SPRING_DOT = P.PLATE_V + M.WIRE / 2 + 1.5 * PITCH;
export const SPRING_PIVOT = [0, P.PLATE_V, 0]; // the spring scales about its seat on the lower plate
// The internals (nozzle, disc assembly, guide, spring and setting parts) explode up a parallel axis
// this far to the left, in the order they go in: a jogged explosion along the spindle's axis.
export const JOG = -165;

const rad = (d) => (d * Math.PI) / 180;
// four holes on a pitch circle, at 0, 90, 180 and 270 degrees, as an extrude's outline (a, b)
const four = (R, r, n = 40) => [0, 90, 180, 270].map((a) => S.circle(R * Math.cos(rad(a)), R * Math.sin(rad(a)), r, n));
const ring144 = (r) => S.circle(0, 0, r, 144); // the same vertices as a lathe of r > 20

// An annular sector in the (x, z) plane, from angle a0 to a1 (degrees, CCW from +x), whose ends are
// cut at constant z (z = ±g) so they butt flat onto a block; ri, ro inner and outer radii.
function sector(ri, ro, gEnd0, gEnd1, upper) {
  // upper: the z > 0 side runs from the +x gap (gEnd0) round to the -x gap (gEnd1); else mirrored
  const a0o = Math.asin(gEnd0 / ro);
  const a0i = Math.asin(gEnd0 / ri);
  const a1o = Math.PI - Math.asin(gEnd1 / ro);
  const a1i = Math.PI - Math.asin(gEnd1 / ri);
  const pts = [];
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const a = a0o + ((a1o - a0o) * i) / n;
    pts.push([ro * Math.cos(a), ro * Math.sin(a)]);
  }
  for (let i = n; i >= 0; i--) {
    const a = a0i + ((a1i - a0i) * i) / n;
    pts.push([ri * Math.cos(a), ri * Math.sin(a)]);
  }
  return upper ? pts : pts.map(([x, z]) => [x, -z]).reverse();
}
// A full C: a ring with one gap of half-width g on +x
function cRing(ri, ro, g) {
  const a0o = Math.asin(g / ro);
  const a0i = Math.asin(g / ri);
  const pts = [];
  const n = 120;
  for (let i = 0; i <= n; i++) {
    const a = a0o + ((2 * Math.PI - 2 * a0o) * i) / n;
    pts.push([ro * Math.cos(a), ro * Math.sin(a)]);
  }
  for (let i = n; i >= 0; i--) {
    const a = a0i + ((2 * Math.PI - 2 * a0i) * i) / n;
    pts.push([ri * Math.cos(a), ri * Math.sin(a)]);
  }
  return pts;
}

// The upper or lower half of the square window in the outlet pad less the round passage, in (z, y):
// its edges are subdivided so the conformed face is triangulated finely.
// The window is 2 mm wider than the passage, so no corner piece thins to a cusp (a wall thinner
// than the cut-face bias would show its cut face through the surface in front of it).
const WIN = OR + 2;
function corner(sy) {
  const n = 24;
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push([WIN * (1 - (2 * i) / n), OV + sy * WIN]);
  for (let i = 0; i < 4; i++) pts.push([-WIN, OV + sy * WIN * (1 - i / 4)]);
  for (let i = 0; i <= 72; i++) {
    const a = Math.PI * (1 - i / 72);
    pts.push([OR * Math.cos(a), OV + sy * OR * Math.sin(a)]);
  }
  for (let i = 0; i < 4; i++) pts.push([WIN, OV + sy * WIN * (i / 4)]);
  return pts;
}

// ---------------------------------------------------------------- the body (1)
function body() {
  const yb = (from, to) => ({ along: "y", from, to });
  const LOCK = [69, 83]; // the band of wall that carries the ring lock screw's tapped hole
  return [
    // inlet neck, nozzle thread bore and cavity floor (parts.mjs body(): the left half-profile)
    S.lathe([[18, 0], [34, 0], [34, 20], [32, 20], [32, 46], [44, 58], [44, 62], [36, 62], [36, 58], [25, 58], [25, 52], [20, 52], [20, 28], [18, 28]]),
    // inlet flange Ø115 with four Ø14 holes on Ø85
    S.extrude(ring144(57.5), { ...yb(2, 20), holes: [ring144(34), ...four(42.5, 7)] }),
    // the wall round the cavity, open on +x for the outlet boss, and round the lock screw on -x
    S.extrude(cRing(36, 44, BR), yb(62, LOCK[0])),
    S.extrude(sector(36, 44, BR, 8, true), yb(...LOCK)),
    S.extrude(sector(36, 44, BR, 8, false), yb(...LOCK)),
    S.extrude(cRing(36, 44, BR), yb(LOCK[1], 128)),
    // the outlet boss, a flat pad on the casting, with the outlet passage through it: slabs swept
    // across the plane (their inner face conformed onto the bore) above, below and beside the
    // passage, and two pieces that round the passage off
    ...[[62, OV - WIN, -BR, BR], [OV + WIN, 128, -BR, BR], [OV - WIN, OV + WIN, WIN, BR], [OV - WIN, OV + WIN, -BR, -WIN]].map(([y0, y1, z0, z1]) =>
      S.extrude([[36, y0], [44, y0], [44, y1], [36, y1]], { along: "z", from: z0, to: z1, conform: { x: 36, r: 36 } })
    ),
    ...[1, -1].map((sy) => S.extrude(corner(sy), { along: "x", from: 36, to: 44, conform: { x: 36, r: 36 } })),
    // the lock screw's boss: the tapped M10 hole through the wall at v = 76, outer face on the casting
    S.extrude([[-8, LOCK[0]], [8, LOCK[0]], [8, LOCK[1]], [-8, LOCK[1]]], { along: "x", from: -44, to: -36, holes: [S.circle(0, 76, 5.05, 40)], conform: { x: -44, r: 44 } }),
    // outlet branch, DN40 flange Ø150 with four Ø18 holes on Ø110, raised face Ø88
    S.tube({ axis: "x", at: OV, r0: OR, r1: BR, from: 44, to: 85 }),
    S.extrude(S.circle(0, OV, 75, 144), { along: "x", from: 85, to: 103, holes: [S.circle(0, OV, OR, 96), ...four(55, 9).map((c) => c.map(([a, b]) => [a, b + OV]))] }),
    S.tube({ axis: "x", at: OV, r0: OR, r1: 44, from: 103, to: P.OUT_FACE }),
    // top: the guide's spigot bore, and the bonnet flange with four tapped M12 stud holes
    S.lathe([[31, 122], [36, 122], [36, 128], [40, 128], [40, 146], [37.5, 146], [37.5, 140], [31, 140]]),
    S.tube({ r0: 40, r1: 63, from: 128, to: 133 }),
    S.extrude(ring144(63), { ...yb(133, 146), holes: [ring144(40), ...four(SR, 6.05)] }),
  ];
}

// ---------------------------------------------------------------- the lifting lever (20)
function lever() {
  const [pu, pv] = P.PIN;
  // the eye round the pin: the sheet's left piece, extruded across the plane
  const eye = [[-6.5, 362], [-6.5, 368], ...K.arc(pu, pv, 6.5, 27.5, 332.5, 14)];
  // the arm, a flat bar 6 thick: in plan, forked round the spindle and rounded at its end
  const arm = [[-6.5, -9], ...K.arc(86, 0, 9, -90, 90, 10), [-6.5, 9], [-6.5, 6.5], [0, 6.5], ...K.arc(0, 0, 6.5, 90, -90, 14).slice(1, -1), [0, -6.5], [-6.5, -6.5]];
  return [
    S.extrude(eye, { along: "z", from: -9, to: 9, holes: [S.circle(pu, pv, 4.05, 48)] }),
    S.extrude(arm, { along: "y", from: 362, to: 368 }),
  ];
}

// ---------------------------------------------------------------- parts
export function parts() {
  const J = JOG;
  const up = (dy, dx = J) => [dx, dy, 0];
  const to = (dy, dx = J) => ({ to: [dx, dy, 0] });
  const outY = (c, r) => ({ c, r, axis: "y" });
  const stud = [[0, 134], [6, 134], [6, 173.9], [5.4, 174.5], [0, 174.5]];
  const studAt = (x, z) => S.lathe(stud, { at: [x, z] });
  const nutAt = (x, z) => S.extrude(S.hexagon(17.32, x, z), { along: "y", from: 161.5, to: 172.3, holes: [S.circle(x, z, 6.05, 48)] });
  const at4 = [[SR, 0], [0, SR], [-SR, 0], [0, -SR]];
  return [
    S.part(1, "BODY DN25 PN40 × DN40 PN16", body(), { mat: "steel", angle: 45, anchor: { cut: [-40, 100, 0], out: outY([0, 100, 0], 44) } }),
    S.part(2, "NOZZLE d0 23, M42×2", [
      // the sheet's profile, its thread drawn at the body's minor diameter so the two only touch
      S.lathe([[14.5, 30], [20, 30], [20, 52], [24, 52], [24, 61], [23, 62], [17, 62], [17, 81], [14, 81], [14, 86.5], [12.5, P.SEAT_V], [11.5, P.SEAT_V], [11.5, 44]]),
    ], { mat: "steel", angle: 135, explode: up(0), anchor: { cut: [16.5, 40, 0], out: outY([0, 40, 0], 20) } }),
    S.part(3, "ADJUSTING RING M34×1.5", [S.lathe([[17, 70], [22, 70], [22, 80.5], [20.5, 82], [17, 82]])], {
      mat: "steel", angle: 30, explode: up(32), anchor: { cut: [19.5, 76, 0], out: outY([0, 76, 0], 22) },
    }),
    S.part(4, "RING LOCK SCREW M10×25", [
      S.lathe([[0, -45.2], [4.4, -45.2], [5, -44.6], [5, -25.2], [3.5, -25.2], [3.5, -22.05], [0, -22.05]], { axis: "x", at: 76 }),
    ], { explode: [-46, 0, 0], anchor: { cut: [-31, 76, 0], out: { c: [-31, 76, 0], r: 5, axis: "x" } } }),
    // ---- the disc assembly: moves with the lift h
    S.part(5, "DISC Ø30, SEAT Ø24", [S.lathe([[0, P.SEAT_V], [15, P.SEAT_V], [15, 94.2], [14.2, 95], [5, 95], [5, 99], [0, 99]])], {
      mat: "steel", angle: 45, explode: to(46), anchor: { cut: [-10, 91.5, 0], out: outY([0, 91.5, 0], 15) },
    }),
    S.part(6, "DISC HOLDER, SKIRT Ø31", [S.lathe(P.holderLoop)], {
      mat: "steel", angle: 135, explode: to(78), anchor: { cut: [-17.75, 100, 0], out: outY([0, 100, 0], 20) },
    }),
    S.part(7, "GUIDE", [S.lathe([[7.5, 120], [20.5, 120], [20.5, 100], [25, 100], [25, 140], [37, 140], [37, 147.5], [7.5, 147.5]])], {
      mat: "steel", angle: 60, explode: up(132), anchor: { cut: [-22.75, 128, 0], out: outY([0, 128, 0], 25) },
    }),
    S.part(8, "SPINDLE Ø14/Ø12", [S.lathe([[0, 99], [3, 99], [5.5, 100.2], [5.5, 103], [7, 103.6], [7, 170], [6, 170], [6, 379.4], [5.4, 380], [0, 380]])], {
      explode: to(150), anchor: { cut: [-3, 236, 0], out: outY([0, 236, 0], 6) },
    }),
    S.part(9, "SPLIT RING", [S.lathe(K.rect(5.6, 101.1, 8.5, 102.9))], {
      explode: to(94), anchor: { cut: [7, 102, 0], out: outY([0, 102, 0], 8.5) },
    }),
    // ---- the bonnet and its fastening
    S.part(10, "BONNET", [
      S.lathe([[30, 147.5], [37, 147.5], [37, 161.5], [40, 161.5], [36, 165.5], [36, 308], [32, 312], [26, 312], [26, 324], [12.05, 324], [12.05, 300], [30, 300]]),
      S.extrude(ring144(63), { along: "y", from: 147.5, to: 161.5, holes: [ring144(37), ...four(SR, 7.05)] }),
    ], { mat: "steel", angle: 135, explode: up(150, 0), anchor: { cut: [-33, 236, 0], out: outY([0, 236, 0], 36) } }),
    S.part(11, "STUD M12×42", at4.map(([x, z]) => studAt(x, z)), {
      explode: up(56, 0), anchor: { cut: [SR + 3, 140, 0], out: outY([SR, 140, 0], 6) },
    }),
    S.part(12, "HEX NUT M12", at4.map(([x, z]) => nutAt(x, z)), {
      explode: up(160, 0), anchor: { cut: [SR + 6, 167, 0], out: { c: [SR, 167, 0], r: 10, axis: "box" } },
    }),
    S.part(13, "GASKET Ø124×Ø76×1.5", [S.extrude(ring144(62), { along: "y", from: 146, to: 147.5, holes: [ring144(38), ...four(SR, 7.05)] })], {
      hatch: "solid", explode: up(100, 0), anchor: { cut: [-41, 146.75, 0], out: outY([0, 146.75, 0], 62) },
    }),
    // ---- the spring and its plates
    S.part(14, "LOWER SPRING PLATE", [S.lathe([[6.2, 170], [27, 170], [27, P.PLATE_V], [19.5, P.PLATE_V], [19.5, 181], [18.5, 182], [6.2, 182]])], {
      mat: "steel", angle: 60, explode: to(150), anchor: { cut: [24, 173, 0], out: outY([0, 173, 0], 27) },
    }),
    S.part(15, "SPRING d6 D46 n5 L0 127", [
      S.helix({ axis: "y", at: 0, from: P.PLATE_V, to: P.PLATE_V + M.L_SET, radius: M.COIL_D / 2, wire: M.WIRE, turns: M.ACTIVE, pivot: SPRING_PIVOT, live: "spring" }),
    ], { hatch: "solid", explode: to(170), anchor: { cut: [0, SPRING_DOT, -M.COIL_D / 2], out: outY([0, SPRING_DOT, 0], 26), solid: 0 } }),
    S.part(16, "UPPER SPRING PLATE", [S.lathe([[7, P.SPRING_TOP - 5], [19.5, P.SPRING_TOP - 5], [19.5, P.SPRING_TOP], [27, P.SPRING_TOP], [27, B], [7, B]])], {
      mat: "steel", angle: 30, explode: to(186), anchor: { cut: [-23, P.SPRING_TOP + 4, 0], out: outY([0, P.SPRING_TOP + 4, 0], 27) },
    }),
    S.part(17, "ADJUSTING SCREW M24×2", [S.lathe([[7, B], [11.5, B], [12, B + 0.5], [12, 343], [11, 344], [10, 344], [10, 355.4], [9.4, 356], [7, 356]])], {
      explode: to(198), anchor: { cut: [-9.5, 336, 0], out: outY([0, 336, 0], 12) },
    }),
    S.part(18, "LOCK NUT M24×2", [S.extrude(S.hexagon(31.18), { along: "y", from: 324, to: 336, holes: [S.circle(0, 0, 12.05, 96)] })], {
      explode: up(244), anchor: { cut: [15, 330, 0], out: { c: [0, 330, 0], r: 18, axis: "box" } },
    }),
    // ---- the cap and the lifting gear
    S.part(19, "CAP", [
      S.lathe([[24, 324], [26, 324], [26, 312], [32, 312], [32, 359], [24, 359]]),
      S.extrude(cRing(24, 32, 10), { along: "y", from: 359, to: 371 }),
      S.lathe([[24, 371], [32, 371], [32, 404], [28, 408], [0, 408], [0, 400], [24, 400]]),
    ], { mat: "iron", angle: 45, explode: up(180, 0), anchor: { cut: [-28, 386, 0], out: outY([0, 386, 0], 32) } }),
    S.part(20, "LIFTING LEVER", lever(), { mat: "steel", angle: 30, explode: up(236, 0), anchor: { cut: [62, 365, 0], out: { c: [62, 368, 0], r: 0 } } }),
    S.part(21, "LEVER PIN Ø8×40", [S.cylinder({ axis: "z", at: P.PIN, r: 4, from: -20, to: 20 })], {
      mat: "steel", angle: 135, layer: 1, explode: [0, 236, 0], anchor: { cut: [P.PIN[0], P.PIN[1], 0], out: { c: [P.PIN[0], P.PIN[1], 0], r: 4, axis: "z" } },
    }),
    S.part(22, "LIFTING NUT M12", [S.extrude(S.hexagon(15.59), { along: "y", from: 370, to: 376, holes: [S.circle(0, 0, 6.05, 48)] })], {
      explode: to(220), anchor: { cut: [7.5, 373, 0], out: { c: [0, 373, 0], r: 9, axis: "box" } },
    }),
    S.part(23, "DRAIN PLUG G1/4", [
      S.extrude(S.hexagon(15.59, 60, 0), { along: "y", from: 54, to: 61 }),
      S.lathe([[0, 61], [6.6, 61], [6.6, 71.4], [6, 72], [0, 72]], { at: 60 }),
    ], { layer: 1, explode: [0, -30, 0], anchor: { cut: [64, 57.5, 0], out: { c: [60, 57.5, 0], r: 9, axis: "box" } } }),
  ];
}

// ---------------------------------------------------------------- the gas
// Vessel side: the inlet and the nozzle bore up to the disc (its top rides with the lift).
// Huddling chamber: the annulus under the disc, inside the holder's skirt (offset by the lift).
// Discharge side: the body cavity round the nozzle and under the guide, and the outlet bore.
export function fluids() {
  return [
    S.fluid("inlet", S.lathe([[0, 0], [17.97, 0], [17.97, 30.03], [14.47, 30.03], [11.47, 44], [11.47, P.SEAT_V], [0, P.SEAT_V]]), { stretch: { from: P.SEAT_V - 0.5 } }),
    S.fluid("huddle", S.tube({ r0: 11.53, r1: 15.47, from: 84, to: P.SEAT_V })),
    S.fluid("cavity", S.lathe([[17.03, 58.03], [35.97, 58.03], [35.97, 121.97], [25.03, 121.97], [25.03, 100], [20.03, 100], [20.03, 92], [15.53, 92], [15.53, 84], [14.03, 84], [14.03, 81], [17.03, 81]])),
    S.fluid("outlet", S.cylinder({ axis: "x", at: OV, r: OR - 0.03, from: 35.97, to: P.OUT_FACE })),
  ];
}
export const OUTLET = ["cavity", "outlet"];

// centre lines: the valve's axis, the outlet's, the studs', the inlet flange holes', the drain's,
// the lock screw's, and the spindle's own (it rides with the spindle when exploded)
export const centres = () => [
  [[0, -6, 0], [0, 416, 0]],
  [[30, OV, 0], [P.OUT_FACE + 8, OV, 0]],
  ...[-1, 1].map((s) => [[s * SR, 126, 0], [s * SR, 180, 0]]),
  ...[-1, 1].map((s) => [[s * 42.5, -3, 0], [s * 42.5, 23, 0]]),
  [[60, 50, 0], [60, 77, 0]],
  [[-50, 76, 0], [-18, 76, 0]],
  [[P.OUT_FACE - 11, OV - 55 - 12, 0], [P.OUT_FACE - 11, OV - 55 + 12, 0]],
  [[P.OUT_FACE - 11, OV + 55 - 12, 0], [P.OUT_FACE - 11, OV + 55 + 12, 0]],
  { line: [[0, 92, 0], [0, 388, 0]], part: 8 },
];

export const scene = () => ({ parts: parts(), fluids: fluids(), centres: centres() });
