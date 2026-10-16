// The bottle jack's solids for its 3D view (bottle-jack-3d.html), in the same world mm as parts.mjs:
// u is x, v is y, and the sheet's cutting plane (through the ram axis and the pump axis) is z = 0.
// Pure data built with kit/solid3d.mjs. The half-profiles are the 2D sheet's numbers: model.mjs
// constants, parts.mjs exports (P0, F0, CAVITIES' drillings, RELIEF_U, DROP_U, GAL_V) and, where
// parts.mjs keeps a constant private, the same value retyped below with its parts.mjs name.
// Moving parts are built at rest (ram down, plunger up, socket level at x = 0.5 as on the sheet) and
// live3d.js moves them. Running fits get 0.03–0.05 mm of clearance so no two parts share a surface.

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

// ---------------------------------------------------------------- parts.mjs's private constants
const PU = M.PUMP_U;
const REL_V = 28; // release valve axis
const DEL_V = 24; // delivery passage axis
const SEAT_U = 60; // delivery seat's left face
const BALL_SEAT_V = 18; // suction seat
const R0 = M.RAM_LOW;
const HEAD_TOP = R0 + M.HEAD_H;
const BORE_LOW = 146;
const SCREW_LOW = 150;
const NECK = 224;
const TUBE0 = PU + 16; // socket tube
const TUBE1 = PU + 44;
const SV = P.P0[1];
const [BU, BV] = M.LINK_B;
const RU = P.RELIEF_U;
const GV = P.GAL_V;
const DU = P.DROP_U;
export const SUC_C = BALL_SEAT_V + Math.sqrt(9 - 4);
export const DEL_C = SEAT_U - Math.sqrt(9 - 2.25);
export const REL_C = 30 + Math.sqrt(4 - 1.5625);
const NEEDLE_TIP = -22 + (1.5 - 0.4) / Math.tan((M.NEEDLE_HALF * Math.PI) / 180);
const NEEDLE_BASE = NEEDLE_TIP - (3.2 - 0.4) / Math.tan((M.NEEDLE_HALF * Math.PI) / 180);

// ---------------------------------------------------------------- 3D-only choices
export const HANDLE_END = 200; // the sheet breaks the handle at x 124; here it runs on to x 200
export const GRIP = [HANDLE_END - 12, SV]; // where the drag takes hold, level pose
// the handle's grip moves this far down over a full stroke (drag length)
export const GRIP_TRAVEL = P.onSocket(0, GRIP)[1] - P.onSocket(1, GRIP)[1];
export const JOG = 120; // the pump column explodes sideways this far (a jogged explosion line)
export const SOCKET_TO = [JOG, 155, 0];
export const HANDLE_TO = [JOG + 60, 155, 0];
export const PIN_Z = 40; // the pins draw out along their axes, toward the viewer
export const SPRING_D0 = DEL_C - 3 - 44; // delivery spring free length at rest
export const SPRING_R0 = 37.5 - (REL_C + 2); // relief spring length at rest
export const REST = { R0, SV, F0: P.F0, P0: P.P0, DEL_C, SUC_C, REL_C };

const xz = (loop) => loop.map(([u, r]) => [r, u]); // (u, r) pairs as a lathe's (r, s) along x
const pin = (at, len) => S.lathe([[0, -len - 1], [4.5, -len - 1], [4.5, -len], [3, -len], [3, len], [0, len]], { axis: "z", at, explode: [0, 0, PIN_Z] });

export function parts() {
  // the plan: 170 × 72 with r8 corners, edges rounded r3 (the section's 3 mm chamfers)
  const plan = S.rrectAt(15, 0, 85 - 3, 36 - 3, 5);
  const ramLoop = [
    [0, R0], [14.5, R0], [15.95, R0 + 1.45], [15.95, R0 + 3], [12.5, R0 + 3], [12.5, R0 + 11], [15.95, R0 + 11],
    [15.95, HEAD_TOP - 1], [14.95, HEAD_TOP], [14.95, M.RAM_TOP - 1], [14, M.RAM_TOP], [12, M.RAM_TOP], [12, SCREW_LOW],
    [10.9, SCREW_LOW], [10.9, BORE_LOW], [0, BORE_LOW - 6.5],
  ];
  const relHalf = [
    [NEEDLE_TIP, 0.4], [NEEDLE_BASE, 3.2], [-45.5, 3.2], [-45.5, 2.2], [-48, 2.2], [-48, 3.2], [-52.02, 3.2],
    [-52.5, 5.38], [-70, 5.38], [-70, 5], [-80.5, 5], [-82, 3.5], [-82, 1.2], [-78.5, 1.2], [-78.5, 0], [NEEDLE_TIP, 0],
  ];
  const linkShape = [...K.arc(BU, BV + M.LINK_L, 5, 0, 180, 10), ...K.arc(BU, BV, 5, 180, 360, 10)];
  const linkHoles = [S.circle(BU, BV + M.LINK_L, 3.05, 32), S.circle(BU, BV, 3.05, 32)];
  const plate = [...K.arc(P.F0[0], SV, 8, 90, 270, 12), [TUBE0, SV - 8], [TUBE0, SV + 8]];
  const plateHoles = [S.circle(P.F0[0], SV, 3.05, 32), S.circle(PU, SV, 3.05, 32)];
  const lug = [[68, 98], [66, 100], [66, 108], [63, 111], ...K.arc(BU, BV, 6.5, 90, 270, 12), [62, 98]];
  const pinTop = M.pinV(0);
  return [
    // ---- the cast base: a block, the pump boss, and every drilling as a bore
    S.part(1, "BASE", [
      S.extrude(plan, { along: "y", from: 0, to: M.BASE_TOP, bevel: 3 }),
      S.lathe([[12.05, M.BASE_TOP], [16, M.BASE_TOP], [16, 55], [13, 58], [12.05, 58]], { at: PU }),
      // ram well, cylinder counterbore and O-ring groove, reservoir counterbore
      S.bore(S.lathe([[0, 11.8], [7, 16], [7, M.CYL_SEAT], [20.05, M.CYL_SEAT], [20.05, 36], [22.2, 36], [22.2, 39.2], [20.05, 39.2], [20.05, M.RES_FLOOR], [35.5, M.RES_FLOOR], [35.5, M.BASE_TOP], [0, M.BASE_TOP]])),
      // pump: suction riser Ø4, chamber Ø12, cylinder thread M24
      S.bore(S.lathe([[0, GV + 2.45], [2, GV + 2.45], [2, BALL_SEAT_V], [6, BALL_SEAT_V], [6, 30], [12.05, 30], [12.05, M.BASE_TOP], [0, M.BASE_TOP]], { at: PU })),
      // suction gallery Ø5 (drilled from the right, plugged) and the drop from the reservoir
      S.bore(S.lathe([[0, DU], [2.5, DU], [2.5, 100], [0, 100]], { axis: "x", at: GV })),
      S.bore(S.lathe([[0, 4], [2.5, GV - 2.49], [2.5, M.RES_FLOOR], [0, M.RES_FLOOR]], { at: DU })),
      // delivery: Ø5 passage into the well, Ø7 bore for spring, ball and seat (plugged)
      // (butted against the well and the pump chamber: overlapping bores would show a false wall)
      S.bore(S.lathe([[0, 7], [2.5, 7], [2.5, 44], [3.5, 44], [3.5, PU - 6], [0, PU - 6]], { axis: "x", at: DEL_V })),
      S.bore(S.lathe([[0, PU + 6], [3.5, PU + 6], [3.5, 100], [0, 100]], { axis: "x", at: DEL_V })),
      // relief: Ø2.5 seat, Ø6 pocket, M8 thread up into the reservoir
      S.bore(S.lathe([[0, DEL_V + 2.5], [1.25, DEL_V + 2.5], [1.25, 30], [3, 30], [3, 37.5], [3.45, 37.5], [3.45, M.RES_FLOOR], [0, M.RES_FLOOR]], { at: RU })),
      // release: Ø3 seat into the well, Ø7 bore, M12 thread
      S.bore(S.lathe([[0, -70], [5.4, -70], [5.4, -52], [3.5, -52], [3.5, -22], [1.5, -22], [1.5, -7], [0, -7]], { axis: "x", at: REL_V })),
    ], { mat: "iron", angle: 45, anchor: { cut: [-50, 12, 0], out: { c: [-50, 22, 0], r: 36, axis: "box" } } }),
    S.part(11, "O-RING 40×2.5", [S.lathe(K.rrect(20.03, 36.3, 22.17, 38.9, 1))], {
      mat: "rubber", explode: [0, 12, 0], anchor: { cut: [21.1, 37.6, 0], out: { c: [0, 37.6, 0], r: 22.2, axis: "y" } },
    }),
    S.part(2, "RAM CYLINDER Ø40×4", [
      S.tube({ r0: 16, r1: 20, from: M.CYL_SEAT, to: M.TUBE_TOP }),
      S.bore(S.lathe([[0, 15.9], [1, 15.9], [1, 20.1], [0, 20.1]], { axis: "x", at: 180 })), // Ø2 vent
    ], { mat: "steel", angle: 135, explode: [0, 20, 0], anchor: { cut: [-18, 120, 0], out: { c: [0, 120, 0], r: 20, axis: "y" } } }),
    S.part(3, "RESERVOIR TUBE Ø70×2.5", [S.tube({ r0: M.RES_RO, r1: 34.97, from: M.RES_FLOOR, to: M.TUBE_TOP })], {
      mat: "steel", angle: 135, explode: [0, 10, 0], anchor: { cut: [-33.7, 96, 0], out: { c: [0, 96, 0], r: 35, axis: "y" } },
    }),
    S.part(4, "TOP NUT M70×1.5", [
      S.lathe([[15.2, 190], [35, 190], [35, 172], [39.5, 172], [39.5, 202], [37.5, 204], [18.5, 204], [18.5, 199], [15.2, 199]]),
      S.bore(S.lathe([[0, 190], [2.75, 190], [2.75, 204], [0, 204]], { at: -26.25 })), // filler hole
    ], { mat: "steel", angle: 60, explode: [0, 80, 0], anchor: { cut: [-37, 186, 0], out: { c: [0, 186, 0], r: 39.5, axis: "y" } } }),
    S.part(10, "FILLER PLUG", [S.lathe([[0, 191.5], [2.72, 191.5], [2.72, 204], [4.25, 204], [4.25, 206.5], [3.25, 207.5], [0, 207.5]], { at: -26.25 })], {
      mat: "rubber", explode: [0, 100, 0], anchor: { cut: [-26.25, 198, 0], out: { c: [-26.25, 206, 0], r: 4.25, axis: "y" } },
    }),
    S.part(7, "WIPER 30×37×5", [S.lathe([[15, 199], [18.47, 199], [18.47, 204], [16.2, 204], [15, 202.6]])], {
      mat: "rubber", explode: [0, 102, 0], anchor: { cut: [16.8, 201.5, 0], out: { c: [0, 201.5, 0], r: 18.5, axis: "y" } },
    }),
    // ---- the ram and what rides on it, built fully down
    S.part(5, "RAM Ø32 / Ø30", [S.lathe(ramLoop)], {
      mat: "steel", angle: 45, explode: { to: [0, 186, 0] }, anchor: { cut: [-7, 110, 0], out: { c: [0, 110, 0], r: 15, axis: "y" } },
    }),
    S.part(6, "U-CUP SEAL 32×25×8", [S.lathe([[12.53, R0 + 11], [15.97, R0 + 11], [15.97, R0 + 3.3], [15.6, R0 + 3], [14.8, R0 + 5.2], [13.7, R0 + 5.2], [12.9, R0 + 3], [12.53, R0 + 3.3]])], {
      mat: "rubber", explode: { to: [0, 186, 0] }, anchor: { cut: [-14.3, R0 + 9, 0], out: { c: [0, R0 + 8, 0], r: 16, axis: "y" } },
    }),
    S.part(8, "EXTENSION SCREW M24×2", [S.lathe([[0, SCREW_LOW], [11.4, SCREW_LOW], [11.95, SCREW_LOW + 0.55], [11.95, M.RAM_TOP], [11, M.RAM_TOP + 1], [11, NECK], [8, NECK], [8, M.CLOSED_H - 2], [0, M.CLOSED_H - 2]])], {
      explode: { to: [0, 262, 0] }, anchor: { cut: [6, 219, 0], out: { c: [0, 219, 0], r: 11, axis: "y" } },
    }),
    S.part(9, "SADDLE Ø34, SERRATED", [S.lathe([[8.05, NECK], [16, NECK], [17, NECK + 1], [17, 231], [16, 232], [14, 231], [12, 232], [10, 231], [8.05, 232]])], {
      mat: "steel", angle: 135, explode: { to: [0, 280, 0] }, anchor: { cut: [13, 228, 0], out: { c: [0, 228, 0], r: 17, axis: "y" } },
    }),
    // ---- the pump: cylinder with its lug, seal, plunger, link, socket, handle, pins
    S.part(12, "PUMP CYLINDER M24×1.5", [
      S.lathe([[6, 30], [12, 30], [12, 96], [10, 98], [6, 98], [6, 87.5], [8.2, 87.5], [8.2, 84], [6, 84]], { at: PU }),
      S.extrude(lug, { along: "z", from: -4, to: 4, holes: [S.circle(BU, BV, 3.05, 32)] }),
    ], { mat: "steel", angle: 135, explode: [JOG, 0, 0], anchor: { cut: [83, 66, 0], out: { c: [PU, 66, 0], r: 12, axis: "y" } } }),
    S.part(15, "O-RING 12×2.5 + BACK-UP", [
      S.lathe(K.rrect(6, 84.05, 8.15, 86.45, 1), { at: PU }),
      S.lathe([[6, 86.65], [8.15, 86.65], [8.15, 87.45], [6, 87.45]], { at: PU, hatch: "solid", own: true }),
    ], { mat: "rubber", explode: [JOG, 45, 0], anchor: { cut: [81.1, 85.2, 0], out: { c: [PU, 85.2, 0], r: 8.2, axis: "y" } } }),
    S.part(14, "PUMP PLUNGER Ø12", [
      S.lathe([[0, M.PL_UP], [5.45, M.PL_UP], [5.95, M.PL_UP + 0.5], [5.95, pinTop - 6], [0, pinTop - 6]], { at: PU }),
      S.extrude([[PU - 5.95, pinTop - 6], [PU + 5.95, pinTop - 6], ...K.arc(PU, pinTop, 5.95, 0, 180, 16)], { along: "z", from: -4, to: 4, holes: [S.circle(PU, pinTop, 3.05, 32)] }),
    ], { explode: { to: [JOG, 115, 0] }, anchor: { cut: [71, 110, 0], out: { c: [PU, 110, 0], r: 6, axis: "y" } } }),
    S.part(16, "LINK", [
      S.extrude(linkShape, { along: "z", from: 4.05, to: 8.05, holes: linkHoles, explode: [0, 0, 24] }),
      S.extrude(linkShape, { along: "z", from: -8.05, to: -4.05, holes: linkHoles, explode: [0, 0, -24] }),
    ], { mat: "steel", angle: 45, pivot: [BU, BV, 0], explode: [JOG - 50, 60, 0], anchor: { cut: [BU - 3, BV + 15, -4.05], out: { c: [BU - 3, BV + 15, -4.05] }, solid: 1 } }),
    S.part(17, "HANDLE SOCKET", [
      S.extrude(plate, { along: "z", from: 8.05, to: 10.05, holes: plateHoles }),
      S.extrude(plate, { along: "z", from: -10.05, to: -8.05, holes: plateHoles }),
      S.box([P.F0[0] - 4, SV + 8, -10.05], [TUBE0, SV + 10, 10.05], { hatch: "solid" }),
      S.lathe([[0, TUBE0], [13, TUBE0], [13, TUBE1], [11, TUBE1], [11, TUBE0 + 2], [0, TUBE0 + 2]], { axis: "x", at: SV }),
    ], { mat: "steel", angle: 30, pivot: [...P.P0, 0], explode: { to: SOCKET_TO }, anchor: { cut: [106, SV + 12, 0], out: { c: [106, SV, 0], r: 13, axis: "x" } } }),
    S.part(18, "HANDLE Ø22×2", [S.tube({ axis: "x", at: SV, r0: 9, r1: 10.95, from: TUBE0 + 5, to: HANDLE_END })], {
      mat: "steel", angle: 135, pivot: [...P.P0, 0], explode: { to: HANDLE_TO }, anchor: { cut: [170, SV + 10, 0], out: { c: [170, SV, 0], r: 11, axis: "x" } },
    }),
    // three clevis pins: the link's base pin, the fulcrum F and the plunger pin P (live3d.js moves
    // the last two with the socket)
    S.part(19, "CLEVIS PIN Ø6 ISO 2341-B", [pin([BU, BV], 8.5), { ...pin(P.F0, 10.5), live: "F" }, { ...pin(P.P0, 10.5), live: "P" }], {
      explode: [JOG, 0, 0], layer: 1, anchor: { cut: [BU, BV + 1, 0], out: { c: [BU, BV, 8.5] }, solid: 0 },
    }),
    // ---- valves
    S.part(20, "SUCTION BALL Ø6", [S.sphere([PU, SUC_C, 0], 3)], {
      explode: { to: [0, 50, 0] }, anchor: { cut: [PU + 0.6, SUC_C + 0.5, 0], out: { c: [PU, SUC_C, 0], r: 3, axis: "sphere" } },
    }),
    S.part(21, "DELIVERY BALL Ø6", [S.sphere([DEL_C, DEL_V, 0], 3)], {
      explode: { to: [64, 0, 0] }, anchor: { cut: [DEL_C - 0.6, DEL_V + 0.9, 0], out: { c: [DEL_C, DEL_V, 0], r: 3, axis: "sphere" } },
    }),
    S.part(22, "DELIVERY SEAT Ø7", [S.lathe([[1.9, SEAT_U], [1.5, SEAT_U + 0.4], [1.5, 68], [3.47, 68], [3.47, SEAT_U]], { axis: "x", at: DEL_V })], {
      mat: "brass", angle: 135, explode: [70, 0, 0], anchor: { cut: [64, DEL_V + 2.5, 0], out: { c: [64, DEL_V, 0], r: 3.5, axis: "x" } },
    }),
    S.part(23, "DELIVERY SPRING", [S.helix({ axis: "x", at: DEL_V, from: 44, to: DEL_C - 3, radius: 2.7, wire: 0.6, turns: 5, pivot: [44, DEL_V, 0], live: "spring" })], {
      hatch: "solid", explode: [62, 0, 0], anchor: { cut: [44.8, DEL_V - 2.7, 0], out: { c: [46, DEL_V, 0], r: 3, axis: "x" } },
    }),
    S.part(24, "RELIEF BALL Ø4", [S.sphere([RU, REL_C, 0], 2)], {
      explode: { to: [0, 20, 0] }, anchor: { cut: [RU + 0.6, REL_C + 0.3, 0], out: { c: [RU, REL_C, 0], r: 2, axis: "sphere" } },
    }),
    S.part(25, "RELIEF SPRING", [S.helix({ axis: "y", at: RU, from: REL_C + 2, to: 37.5, radius: 2.2, wire: 0.5, turns: 3, pivot: [RU, 37.5, 0], live: "spring" })], {
      hatch: "solid", explode: [0, 35, 0], anchor: { cut: [RU - 2.2, 36.96, 0], out: { c: [RU, 35.2, 0], r: 2.5, axis: "y" } },
    }),
    S.part(26, "SET SCREW M8×1×4", [S.lathe([[1, 37.5], [3.42, 37.5], [3.42, M.RES_FLOOR], [1, M.RES_FLOOR]], { at: RU })], {
      explode: [0, 50, 0], anchor: { cut: [RU + 2.5, 39.6, 0], out: { c: [RU, 39.6, 0], r: 3.45, axis: "y" } },
    }),
    S.part(27, "RELEASE SCREW M12×1", [S.lathe(xz(relHalf), { axis: "x", at: REL_V })], {
      explode: [-40, 0, 0], anchor: { cut: [-76, REL_V + 3, 0], out: { c: [-76, REL_V, 0], r: 5, axis: "x" } },
    }),
    S.part(28, "O-RING 4×1.3", [S.lathe(xz(K.rrect(-47.9, 2.2, -45.6, 3.47, 0.5)), { axis: "x", at: REL_V })], {
      mat: "rubber", explode: [-40, 0, 0], anchor: { cut: [-46.75, REL_V + 2.9, 0], out: { c: [-46.75, REL_V, 0], r: 3.5, axis: "x" } },
    }),
    S.part(29, "EXPANDER PLUG Ø7 / Ø5", [
      S.cylinder({ axis: "x", at: DEL_V, r: 3.47, from: 95, to: 99.97 }),
      S.cylinder({ axis: "x", at: GV, r: 2.47, from: 95, to: 99.97 }),
    ], { explode: [80, 0, 0], anchor: { cut: [97.5, GV + 1, 0], out: { c: [99.97, GV, 0] } } }),
    // ---- item 13, the oil on the reservoir side (atmospheric): the annulus, the drop, the gallery,
    // the riser, the release bore and the relief pocket. The oil under pressure is in fluids().
    S.part(13, "OIL ISO VG 15", [
      S.fluid("res", S.lathe([[20.03, M.RES_FLOOR + 0.03], [32.47, M.RES_FLOOR + 0.03], [32.47, M.OIL_LEVEL], [20.03, M.OIL_LEVEL]]), { stretch: { from: 60 } }),
      S.fluid("drop", S.lathe([[0, 4.03], [2.47, 5.5], [2.47, M.RES_FLOOR + 0.03], [0, M.RES_FLOOR + 0.03]], { at: DU })),
      S.fluid("gallery", S.lathe([[0, DU], [2.47, DU], [2.47, 95], [0, 95]], { axis: "x", at: GV })),
      S.fluid("riser", S.lathe([[0, GV + 2.45], [1.97, GV + 2.45], [1.97, BALL_SEAT_V + 0.03], [0, BALL_SEAT_V + 0.03]], { at: PU })),
      S.fluid("relbore", S.lathe([[0, -52], [3.47, -52], [3.47, -22], [0, -22]], { axis: "x", at: REL_V })),
      S.fluid("pocket", S.lathe([[0, 30.5], [2.97, 30.5], [2.97, 37.5], [0.97, 37.5], [0.97, M.RES_FLOOR + 0.03], [0, M.RES_FLOOR + 0.03]], { at: RU })),
    ], { anchor: { cut: [-26, 80, 0], out: { c: [-26, 80, 0] } } }),
  ];
}
export const OIL13 = ["res", "drop", "gallery", "riser", "relbore", "pocket"];

// The oil under pressure: the ram side (chamber, well, delivery passage, release and relief seats)
// at p, and the pump side (chamber under the plunger, seat bore, plugged drilling) at pp.
export function fluids() {
  const L = (loop, o) => S.lathe(loop, o);
  return [
    S.fluid("ram", L([[0, 11.83], [6.97, 15.99], [6.97, M.CYL_SEAT + 0.03], [15.97, M.CYL_SEAT + 0.03], [15.97, R0 + 0.6], [0, R0 + 0.6]]), { stretch: { from: R0 - 0.2 } }),
    S.fluid("deliv", L([[0, 7], [2.47, 7], [2.47, 44], [3.47, 44], [3.47, SEAT_U], [0, SEAT_U]], { axis: "x", at: DEL_V })),
    S.fluid("relseat", L([[0, -22], [1.47, -22], [1.47, -6.5], [0, -6.5]], { axis: "x", at: REL_V })),
    S.fluid("reliefseat", L([[0, DEL_V + 2.5], [1.22, DEL_V + 2.5], [1.22, 30.5], [0, 30.5]], { at: RU })),
    S.fluid("chamber", L([[0, BALL_SEAT_V + 0.03], [5.97, BALL_SEAT_V + 0.03], [5.97, M.PL_UP], [0, M.PL_UP]], { at: PU }), { stretch: { from: 26 } }),
    S.fluid("seatbore", L([[0, SEAT_U], [1.47, SEAT_U], [1.47, 68], [0, 68]], { axis: "x", at: DEL_V })),
    S.fluid("plugged", L([[0, PU + 6], [3.47, PU + 6], [3.47, 95], [0, 95]], { axis: "x", at: DEL_V })),
  ];
}
export const RAM_SIDE = ["ram", "deliv", "relseat", "reliefseat"];
export const PUMP_SIDE = ["chamber", "seatbore", "plugged"];

export const centres = () => [
  [[0, -6, 0], [0, M.CLOSED_H + M.LIFT_MAX + 6, 0]],
  [[PU, 4, 0], [PU, 150, 0]],
  [[-88, REL_V, 0], [-4, REL_V, 0]],
  [[40, DEL_V, 0], [104, DEL_V, 0]],
  [[RU, 20, 0], [RU, 46, 0]],
];

export const scene = () => ({ parts: parts(), fluids: fluids(), centres: centres() });
