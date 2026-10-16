// The Stirling demonstrator's solids for its 3D view (stirling-3d.html), in the 2D sheet's own world
// mm: x = the sheet's u, y = its v, the cylinder axis at x = 0, the gear centres at (±E, 0), and the
// sheet's axial section is the plane z = 0. Pure data built with kit/solid3d.mjs from model.mjs and
// parts.mjs (the piston's half-profile, the rod capsule and every station come from there).
//
// Depth (z) is not on the sheet, which shows the section only. The rhombic drive is stacked behind
// the plane, as a real one is: the yokes sit on the axis (cut in half), the piston's rods behind them,
// the displacer's rods behind those, the gears behind all four, the crank pins through both rod eyes
// into the gears, the shafts back through the rear wall to the flywheel behind the crankcase.
// Moving parts are built at phi = 0, as on the sheet; live3d.js poses them from the model.

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const E = M.E;
const CT = M.CAP_TOP;
const YP0 = P.YP0;
const YD0 = P.YD0;
const PB0 = P.PB0;
const PT0 = P.PT0;
const DB0 = P.DB0;
const DT0 = P.DT0;
const R = M.DISP_D / 2;
const B = M.BORE / 2;
const C = P.CYL;

// depth stations (mm, z): the castings' half-depths and the drive's layers
export const Z = {
  case: 38, // crankcase outside
  wall: 6,
  boss: 44, // the bearing bosses behind the rear wall
  yokeP: [-6, 6], // piston yoke
  yokeD: [-12, 6], // displacer yoke: reaches back to its rods
  rodP: [-11.5, -6.5], // the piston's two rods
  rodD: [-17.5, -12.5], // the displacer's two rods
  gear: [-24, -18],
  hub: -31.9,
  fly: { hub: [-61, -45], rim: [-62, -48], web: [-57, -53] },
  nut: [-67.5, -61],
};
const ZIN = Z.case - Z.wall;

// explode: the base and crankcase stay with the whole drive in them; the top end lifts off the axis,
// the piston (left) and the displacer with its rod (right) come out up jogged parallel axes
export const JOG = 118;
export const EX = {
  woodScrews: 34,
  lowScrews: 40,
  liner: 50,
  cylinder: 90,
  gasket: 95,
  cap: 101,
  capScrews: 115,
  burner: 146,
  shield: 160,
  piston: [-JOG, 22, 0],
  displacer: [JOG, 100, 0],
};

const ring = (n, r, a0 = 0) => Array.from({ length: n }, (_, k) => [r * Math.cos(((a0 + (k * 360) / n) * Math.PI) / 180), r * Math.sin(((a0 + (k * 360) / n) * Math.PI) / 180)]);
const TOP_HOLES = ring(6, P.BOLT_R); // the cap screws, two of them in the plane
const LOW_HOLES = ring(4, P.BOLT_R); // the cylinder screws, two of them in the plane
const holes = (pts, r) => pts.map(([x, z]) => S.circle(x, z, r, 24));
const disc = (r) => S.circle(0, 0, r, r > 20 ? 144 : 96);

// A socket head cap screw M5 (parts.mjs screw()): seat face, length under the head, on axis y at (x, z)
function capScrew(x, z, seat, len, o = {}) {
  const end = seat - len;
  return S.lathe([[0, end], [2, end], [2.5, end + 0.5], [2.5, seat], [4.25, seat], [4.25, seat + 4.6], [3.85, seat + 5], [0, seat + 5]], { at: [x, z], ...o });
}

// ---------------------------------------------------------------- the parts
export function parts() {
  const out = [];
  const { top: bTop, bot: bBot, half } = P.BASE;
  const c = P.CASE;

  // 1 BASE: the oak board
  out.push(
    S.part(1, "BASE 170×100×20", [S.extrude(S.rrectAt(0, 0, half - 1, 50 - 1, 3), { along: "y", from: bBot, to: bTop, bevel: 1 })], {
      mat: "wood", angle: 30, anchor: { cut: [-75, -72, 0], out: { c: [-70, bTop, 30] } },
    }),
  );

  // 2 CRANKCASE: foot plate, side walls (cut), front and rear walls, the roof with the liner bore and
  // the four tapped holes, the bearing bosses behind the rear wall
  const wallY = [c.floor, c.roof];
  out.push(
    S.part(2, "CRANKCASE", [
      S.extrude(S.rrectAt(0, 0, c.flange, Z.case, 4), { along: "y", from: c.bot, to: c.floor, holes: [S.circle(-58, 0, 3.05, 32), S.circle(58, 0, 3.05, 32)] }),
      // side walls (along x: outline [z, y]), each with an inspection window onto the drive behind the plane
      ...[[c.wall, c.out], [-c.out, -c.wall]].map(([x0, x1]) =>
        S.extrude(K.rect(-Z.case, wallY[0], Z.case, wallY[1]), { along: "x", from: x0, to: x1, holes: [S.rrectAt(-19, -2, 12, 34, 5)] })),
      S.extrude(K.rect(-c.wall, wallY[0], c.wall, wallY[1]), { along: "z", from: ZIN, to: Z.case }),
      S.extrude(K.rect(-c.wall, wallY[0], c.wall, wallY[1]), { along: "z", from: -Z.case, to: -ZIN, holes: [S.circle(-E, 0, 4.05, 48), S.circle(E, 0, 4.05, 48)] }),
      S.extrude(K.rect(-c.out, -Z.case, c.out, Z.case), { along: "y", from: c.roof, to: c.top, holes: [disc(P.LINER.r1 + 0.05), ...holes(LOW_HOLES, 2.55)] }),
      S.tube({ axis: "z", at: [-E, 0], r0: 4.05, r1: 13, from: -Z.boss, to: -Z.case }),
      S.tube({ axis: "z", at: [E, 0], r0: 4.05, r1: 13, from: -Z.boss, to: -Z.case }),
    ], { mat: "alu", angle: 45, anchor: { cut: [-49, 20, 0], out: { c: [-30, 20, Z.case] } } }),
  );

  // 3 WOOD SCREWS 6×25: through the foot into the board (the sheet's two, in the plane)
  const wood = [[0, bBot + 4.6], [0.4, bBot + 4.6], [3, bBot + 9], [3, c.floor], [5, c.floor], [5, c.floor + 3.4], [4.4, c.floor + 4], [0, c.floor + 4]];
  out.push(
    S.part(3, "WOOD SCREW 6×25 DIN 571", [S.lathe(wood, { at: [-58, 0] }), S.lathe(wood, { at: [58, 0] })], {
      explode: [0, EX.woodScrews, 0], anchor: { cut: [-58, c.floor + 2, 0], out: { c: [-58, c.floor + 4, 0] } },
    }),
  );

  // ---- the rhombic drive
  // 4 SPUR GEARS m1 z40 (the right one carries the balloon), 5 SHAFTS, 6 CRANK PINS
  const gearSolids = (side) => {
    const cx = side * E;
    const pin = [cx - side * M.R_CRANK, 0];
    const light = [45, 135, 225, 315].map((a) => S.circle(cx + 11.5 * Math.cos((a * Math.PI) / 180), 11.5 * Math.sin((a * Math.PI) / 180), 3.2, 24));
    return [
      S.extrude(S.gearOutline({ teeth: 40, module: 1, cx, cy: 0, phase: side < 0 ? 0 : 4.5 }), {
        along: "z", from: Z.gear[0], to: Z.gear[1], holes: [S.circle(cx, 0, 4.05, 48), S.circle(pin[0], 0, 3.05, 32), ...light],
      }),
      S.tube({ axis: "z", at: [cx, 0], r0: 4.05, r1: 9, from: Z.hub, to: Z.gear[0] }),
    ];
  };
  out.push(
    S.part(4, "SPUR GEAR m1 z40", gearSolids(1), { mat: "steel", angle: 135, pivot: [E, 0, 0], anchor: { cut: [E + 6, -15.5, Z.gear[1]], out: { c: [E + 6, -15.5, Z.gear[1]] } } }),
    S.part("4L", "SPUR GEAR m1 z40", gearSolids(-1), { mat: "steel", angle: 45, pivot: [-E, 0, 0] }),
  );
  const fz = Z.fly;
  out.push(
    S.part(5, "GEAR SHAFT Ø8, NUT M8", [
      S.lathe([[0, Z.nut[0] - 1], [3.5, Z.nut[0] - 1], [4, Z.nut[0] - 0.5], [4, Z.gear[1]], [0, Z.gear[1]]], { axis: "z", at: [E, 0] }),
      S.extrude(S.hexagon(13, E, 0), { along: "z", from: Z.nut[0], to: Z.nut[1], holes: [S.circle(E, 0, 4.05, 48)], own: true }),
    ], { hatch: "none", pivot: [E, 0, 0], anchor: { cut: [E, 0, Z.gear[1]], out: { c: [E, 0, Z.gear[1]] } } }),
    S.part("5L", "GEAR SHAFT Ø8", [S.lathe([[0, -Z.boss], [4, -Z.boss], [4, Z.gear[1]], [0, Z.gear[1]]], { axis: "z", at: [-E, 0] })], { hatch: "none", pivot: [-E, 0, 0] }),
  );
  const crankPin = (side) => S.cylinder({ axis: "z", at: [side * (E - M.R_CRANK), 0], r: 3, from: Z.gear[0], to: Z.rodP[1] });
  out.push(
    S.part(6, "CRANK PIN Ø6", [crankPin(1)], { mat: "steel", angle: 45, pivot: [E, 0, 0], anchor: { cut: [E - M.R_CRANK, 0, Z.rodP[1]], out: { c: [E - M.R_CRANK, 0, Z.rodP[1]] } } }),
    S.part("6L", "CRANK PIN Ø6", [crankPin(-1)], { mat: "steel", angle: 135, pivot: [-E, 0, 0] }),
  );

  // 7 CONNECTING RODS: the sheet's capsule, built along +x from its yoke eye at the origin; live3d.js
  // turns each about that eye and moves it onto its yoke pin
  const rod = ([z0, z1]) =>
    S.extrude(P.rodShape([0, 0], [M.ROD_L, 0]), { along: "z", from: z0, to: z1, holes: [S.circle(0, 0, 3.05, 32), S.circle(M.ROD_L, 0, 3.05, 32)] });
  out.push(
    S.part(7, "CONNECTING ROD, 34 CTRS", [rod(Z.rodP)], { mat: "alu", angle: 45, anchor: { cut: [M.ROD_L * 0.55, 0, Z.rodP[1]], out: { c: [M.ROD_L * 0.55, 0, Z.rodP[1]] } } }),
    S.part("7L", "CONNECTING ROD", [rod(Z.rodP)], { mat: "alu", angle: 45 }),
    S.part("7D", "CONNECTING ROD", [rod(Z.rodD)], { mat: "alu", angle: 135 }),
    S.part("7DL", "CONNECTING ROD", [rod(Z.rodD)], { mat: "alu", angle: 135 }),
  );

  // 8 YOKE PINS, cut across in the plane; 9 PISTON YOKE, 10 DISPLACER YOKE: a centre block bored for
  // the tube (or the rod) and two ears bored for the pins
  const a = M.YOKE_A;
  out.push(
    S.part(8, "YOKE PIN 6m6×16 ISO 8734", [-1, 1].map((s) => S.cylinder({ axis: "z", at: [s * a, YP0], r: 3, from: Z.rodP[0], to: Z.yokeP[1] })), {
      mat: "steel", angle: 135, anchor: { cut: [a + 1, YP0 + 1, 0], out: { c: [a, YP0, Z.yokeP[1]] } },
    }),
    S.part("8D", "YOKE PIN 6m6×16 ISO 8734", [-1, 1].map((s) => S.cylinder({ axis: "z", at: [s * a, YD0], r: 3, from: Z.rodD[0], to: Z.yokeD[1] })), { mat: "steel", angle: 45 }),
  );
  const ears = (y, [z0, z1]) => [-1, 1].map((s) => S.extrude(K.rect(s * 5.5, y - 5, s * 14, y + 5), { along: "z", from: z0, to: z1, holes: [S.circle(s * a, y, 3.05, 32)] }));
  const block = (y0, y1, [z0, z1], r) => S.extrude(K.rect(-5.5, z0, 5.5, z1), { along: "y", from: y0, to: y1, holes: [S.circle(0, 0, r, 48)] });
  out.push(
    S.part(9, "PISTON YOKE", [block(YP0 - 1, YP0 + 5, Z.yokeP, 5), block(YP0 - 5, YP0 - 1, Z.yokeP, 3.5), ...ears(YP0, Z.yokeP)], {
      mat: "steel", angle: 45, anchor: { cut: [12, YP0 + 2.5, 0], out: { c: [12, YP0 + 2.5, Z.yokeP[1]] } },
    }),
    S.part(10, "DISPLACER YOKE", [block(YD0 - 5, YD0 + 5, Z.yokeD, 2.55), ...ears(YD0, Z.yokeD)], {
      mat: "steel", angle: 135, anchor: { cut: [12, YD0 - 2.5, 0], out: { c: [12, YD0 - 2.5, Z.yokeD[1]] } },
    }),
    S.part(25, "HEX NUT M5 ISO 4032", [S.extrude(S.hexagon(9.2), { along: "y", from: YD0 - 9, to: YD0 - 5, holes: [S.circle(0, 0, 2.55, 32)] })], {
      anchor: { cut: [3.6, YD0 - 7, 0], out: { c: [4.6, YD0 - 7, 0] } },
    }),
  );

  // 11 PISTON ROD TUBE, 12 DISPLACER ROD (through it), 13 PISTON, 14 RINGS, 15 BUSHING
  out.push(
    S.part(11, "PISTON ROD TUBE Ø10×1.5", [S.tube({ r0: 3.5, r1: 4.95, from: YP0 - 1, to: PB0 + 10 })], {
      mat: "steel", angle: 135, anchor: { cut: [-4.2, YP0 + 14, 0], out: { c: [0, YP0 + 14, 0], r: 4.95, axis: "y" } },
    }),
    S.part(12, "DISPLACER ROD Ø5", [S.lathe([[0, YD0 - 10.5], [2, YD0 - 10.5], [2.5, YD0 - 10], [2.5, DB0 + 5], [0, DB0 + 5]])], {
      explode: { to: EX.displacer }, anchor: { cut: [0, -3, 0], out: { c: [0, -3, 0], r: 2.5, axis: "y" } },
    }),
  );
  const pistonLoop = P.pistonLoop(PB0).map(([r, s]) => [r === B ? B - 0.05 : r, s]); // a 0.05 running fit in the liner
  const ringAt = (v) => S.tube({ r0: 18.6, r1: B - 0.05, from: v, to: v + 1.4 });
  out.push(
    S.part(13, "POWER PISTON Ø40", [S.lathe(pistonLoop)], {
      mat: "alu", angle: 45, explode: { to: EX.piston }, anchor: { cut: [-11, PT0 - 5, 0], out: { c: [0, PT0 - 5, 0], r: B, axis: "y" } },
    }),
    S.part(14, "PISTON RING Ø40×1.4", [ringAt(PT0 - 5.45, ), ringAt(PT0 - 10.45)].map((s, i) => ({ ...s, explode: [0, i ? 13 : 20, 0] })), {
      hatch: "solid", explode: { to: EX.piston }, anchor: { cut: [-19.3, PT0 - 4.75, 0], out: { c: [0, PT0 - 4.75, 0], r: B, axis: "y" }, solid: 0 },
    }),
    S.part(15, "ROD BUSHING Ø5/Ø10×14", [S.tube({ r0: 2.55, r1: 4.95, from: PT0 - 14, to: PT0 })], {
      mat: "bronze", angle: 135, explode: { to: [EX.piston[0], EX.piston[1] + 60, 0] }, anchor: { cut: [-3.7, PT0 - 3, 0], out: { c: [0, PT0 - 3, 0], r: 4.95, axis: "y" } },
    }),
  );

  // 16 LINER, 17 COOLER CYLINDER (flange and head as plates with their screw holes, the finned core
  // turned), 19 GASKET, 20 HOT CAP (the sheet's shell, welded to a flange), 18 CAP SCREWS
  const L = P.LINER;
  out.push(
    S.part(16, "CYLINDER LINER Ø40/Ø46", [S.tube({ r0: L.r0, r1: L.r1, from: L.bot, to: L.top })], {
      mat: "iron", angle: 135, explode: [0, EX.liner, 0], anchor: { cut: [-22, 128, 0], out: { c: [0, 60, 0], r: L.r1, axis: "y" } },
    }),
  );
  const core = [[L.r1 + 0.05, C.flangeTop], [C.core, C.flangeTop]];
  for (let k = 0; k < C.finN; k++) {
    const v = C.finFrom + k * C.finPitch;
    core.push([C.core, v], [C.fin, v], [C.fin, v + C.finT], [C.core, v + C.finT]);
  }
  const HEAD = C.top - 6.5; // the head plate carries the tapped holes for the cap screws
  core.push([C.core, C.upper], [C.fin, C.upper], [C.fin, HEAD], [L.r1 + 0.05, HEAD]);
  out.push(
    S.part(17, "COOLER CYLINDER, 10 FINS", [
      S.extrude(disc(36), { along: "y", from: C.bot, to: C.flangeTop, holes: [disc(L.r1 + 0.05), ...holes(LOW_HOLES, 2.75)] }),
      S.lathe(core),
      S.extrude(disc(C.fin), { along: "y", from: HEAD, to: C.top, holes: [disc(L.r1 + 0.05), ...holes(TOP_HOLES, 2.55)] }),
    ], { mat: "alu", angle: 135, explode: [0, EX.cylinder, 0], anchor: { cut: [-35, C.finFrom + 5 * 5 + 1, 0], out: { c: [0, C.finFrom + 5 * 5 + 1, 0], r: C.fin, axis: "y" } } }),
    S.part(19, "GASKET Ø40/Ø76×1", [S.extrude(disc(38), { along: "y", from: C.top, to: C.top + 1, holes: [disc(B), ...holes(TOP_HOLES, 2.75)] })], {
      hatch: "solid", explode: [0, EX.gasket, 0], anchor: { cut: [25.5, C.top + 0.5, 0], out: { c: [0, C.top + 0.5, 0], r: 38, axis: "y" } },
    }),
  );
  const shell = [[B, 151], [B + 1, 151], ...K.arc(16, CT - 4, 5, 0, 90, 8), [0, CT + 1], [0, CT], ...K.arc(16, CT - 4, 4, 90, 0, 8)];
  out.push(
    S.part(20, "HOT CAP Ø42×1, ON FLANGE", [
      S.lathe(shell),
      S.extrude(disc(38), { along: "y", from: 151, to: 156, holes: [disc(B + 1.05), ...holes(TOP_HOLES, 2.75)], hatch: ["steel", 45], own: true }),
    ], { hatch: "solid", explode: [0, EX.cap, 0], anchor: { cut: [-20.5, 178, 0], out: { c: [0, 178, 0], r: B + 1, axis: "y" } } }),
  );
  out.push(
    S.part(18, "CAP SCREW M5×12 ISO 4762", [
      ...TOP_HOLES.map(([x, z]) => capScrew(x, z, 156, 12, { explode: [0, EX.capScrews, 0] })),
      ...LOW_HOLES.map(([x, z]) => capScrew(x, z, C.flangeTop, 12, { explode: [0, EX.lowScrews, 0] })),
    ], { anchor: { cut: [P.BOLT_R + 1.2, 147, 0], out: { c: [P.BOLT_R, 161, 0] }, solid: 0 } }),
  );

  // 22 HEAT SHIELD: a 0.8 mm tube, notched where the burner pipe passes; 23 BURNER RING (hollow ring,
  // feed pipe, union nut, stub)
  const SH = P.SHIELD;
  const RG = P.RING;
  const notch = (() => {
    const t0 = Math.asin(3.2 / SH.r1);
    const t1 = Math.asin(3.2 / SH.r0);
    const n = 140;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = t0 + ((2 * Math.PI - 2 * t0) * i) / n;
      pts.push([SH.r1 * Math.cos(t), SH.r1 * Math.sin(t)]);
    }
    for (let i = n; i >= 0; i--) {
      const t = t1 + ((2 * Math.PI - 2 * t1) * i) / n;
      pts.push([SH.r0 * Math.cos(t), SH.r0 * Math.sin(t)]);
    }
    return pts;
  })();
  out.push(
    S.part(22, "HEAT SHIELD Ø67.6×0.8", [
      S.tube({ r0: SH.r0, r1: SH.r1, from: SH.bot, to: RG.v - 3.2 }),
      S.extrude(notch, { along: "y", from: RG.v - 3.2, to: RG.v + 3.2 }),
      S.tube({ r0: SH.r0, r1: SH.r1, from: RG.v + 3.2, to: SH.top }),
    ], { hatch: "solid", explode: [0, EX.shield, 0], anchor: { cut: [-SH.r0 - 0.4, 205, 0], out: { c: [0, 205, 0], r: SH.r1, axis: "y" } } }),
  );
  const ringHalf = (a0, a1) => {
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const a = ((a0 + ((a1 - a0) * i) / 16) * Math.PI) / 180;
      pts.push([RG.r + RG.tube * Math.cos(a), RG.v + RG.tube * Math.sin(a)]);
    }
    for (let i = 16; i >= 0; i--) {
      const a = ((a0 + ((a1 - a0) * i) / 16) * Math.PI) / 180;
      pts.push([RG.r + RG.bore * Math.cos(a), RG.v + RG.bore * Math.sin(a)]);
    }
    return pts;
  };
  const PI = P.PIPE;
  out.push(
    S.part(23, "BURNER RING Ø6×1, 12 JETS", [
      S.lathe(ringHalf(0, 180)),
      S.lathe(ringHalf(180, 360)),
      S.tube({ axis: "x", at: [RG.v, 0], r0: RG.bore, r1: RG.tube, from: RG.r + RG.bore + 0.1, to: PI.to }),
      S.extrude(S.hexagon(11, 0, RG.v), { along: "x", from: PI.to, to: PI.nut + 0.6, holes: [S.circle(0, RG.v, RG.bore, 32)], hatch: "none", own: true }),
      S.tube({ axis: "x", at: [RG.v, 0], r0: RG.bore, r1: RG.tube, from: PI.nut + 0.6, to: PI.end }),
    ], { hatch: "solid", explode: [0, EX.burner, 0], anchor: { cut: [-RG.r, RG.v + 2.5, 0], out: { c: [-RG.r, RG.v, 0], r: RG.tube, axis: "box" } } }),
  );

  // 21 DISPLACER: the 0.5 mm shell and its plug, the rod screwed into the plug
  const dShell = [[R, DB0], ...K.arc(R - 3, DT0 - 3, 3, 0, 90, 6), [0, DT0], [0, DT0 - 0.5], ...K.arc(R - 3, DT0 - 3, 2.5, 90, 0, 6), [R - 0.5, DB0]];
  const plug = [[2.55, DB0], [R - 0.5, DB0], [R - 0.5, DB0 + 6], [0, DB0 + 6], [0, DB0 + 5], [2.55, DB0 + 5]];
  out.push(
    S.part(21, "DISPLACER Ø38×80", [S.lathe(dShell), S.lathe(plug, { hatch: ["alu", 30], own: true })], {
      hatch: "solid", explode: { to: EX.displacer }, anchor: { cut: [-10, DB0 + 3, 0], out: { c: [0, DB0 + 40, 0], r: R, axis: "y" } },
    }),
  );

  // 24 FLYWHEEL Ø110 on the right shaft behind the crankcase: rim, a web with five windows, the hub
  const FL = P.FLY;
  const windows = [];
  for (let i = 0; i < FL.spokes; i++) {
    const a0 = (i * 360) / FL.spokes + 11;
    const a1 = ((i + 1) * 360) / FL.spokes - 11;
    windows.push([...K.arc(E, 0, FL.rim - 0.5, a0, a1, 12), ...K.arc(E, 0, FL.hub + 5, a1 - 6, a0 + 6, 8)]);
  }
  out.push(
    S.part(24, "FLYWHEEL Ø110", [
      S.tube({ axis: "z", at: [E, 0], r0: FL.rim, r1: FL.r, from: fz.rim[0], to: fz.rim[1] }),
      S.extrude(S.circle(E, 0, FL.rim + 0.3, 144), { along: "z", from: fz.web[0], to: fz.web[1], holes: [S.circle(E, 0, FL.hub - 0.2, 48), ...windows] }),
      S.tube({ axis: "z", at: [E, 0], r0: 4.05, r1: FL.hub, from: fz.hub[0], to: fz.hub[1] }),
    ], { mat: "iron", angle: 45, pivot: [E, 0, 0], anchor: { cut: [E + 46, -22, fz.rim[1]], out: { c: [E + 46, -22, fz.rim[1]] } } }),
  );
  return out;
}

// ---------------------------------------------------------------- the working gas
// Three spaces, as the model has them: hot (between the displacer's crown and the cap), cold (between
// the piston and the displacer, round the rod) and the regenerator gap round the displacer in bands,
// cold at the bottom. The hot and cold spaces are rebuilt from the model each frame (live3d.js); the
// bands ride with the displacer.
const IN = 0.03;
export function hotLoop(dt) {
  return [[0, dt + IN], ...K.arc(R - 3, dt - 3, 3 + IN, 90, 0, 6), [B - IN, dt - 3], [B - IN, CT - 4], ...K.arc(16, CT - 4, 4 - IN, 0, 90, 8), [0, CT - IN]];
}
export function coldLoop(pt, db) {
  return [[M.ROD_D / 2 + IN, pt + IN], [B - IN, pt + IN], [B - IN, db - IN], [M.ROD_D / 2 + IN, db - IN]];
}
export const BANDS = P.GAP_BANDS;
const BAND_H = (M.DISP_L - 3) / BANDS;
export function fluids() {
  const out = [S.fluid("hot", S.lathe(hotLoop(DT0))), S.fluid("cold", S.lathe(coldLoop(PT0, DB0 + 8)))];
  for (let i = 0; i < BANDS; i++) out.push(S.fluid(`gap-${i}`, S.tube({ r0: R + IN, r1: B - IN, from: DB0 + i * BAND_H, to: DB0 + (i + 1) * BAND_H })));
  return out;
}

// centre lines: the cylinder axis, the shafts, the burner pipe, the wood screws
export const centres = () => [
  [[0, P.BASE.bot - 4, 0], [0, P.SHIELD.top + 6, 0]],
  [[-E, 0, -Z.boss - 6], [-E, 0, 2]],
  [[E, 0, Z.nut[0] - 6], [E, 0, 2]],
  [[P.PIPE.from - 2, P.RING.v, 0], [P.PIPE.end + 4, P.RING.v, 0]],
  [[-58, P.BASE.bot - 3, 0], [-58, P.CASE.floor + 8, 0]],
  [[58, P.BASE.bot - 3, 0], [58, P.CASE.floor + 8, 0]],
];

export const scene = () => ({ parts: parts(), fluids: fluids(), centres: centres() });
