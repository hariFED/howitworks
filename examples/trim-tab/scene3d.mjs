// The trim tab's solids for its 3D view (trim-tab-3d.html), in the elevator's own frame, mm: x = the
// sheet's u (aft of the elevator hinge), y = v (up from the chord line), z = outboard from the
// actuator's centre plane (BL −485), so the cut (z > 0 removed) is the sheet's Detail B and Section
// A-A, looking outboard, and the trim cables arrive from the kept, inboard side.
// Pure data built with kit/solid3d.mjs from the sheet's profiles (parts.mjs).
//
// What moves (live3d.js poses it from the same model as the sheet): the drum and screw turn, the nut
// slides, the rod runs from the nut's pin to the horn's, the tab, horn and the hinge's tab leaf turn
// about the tab hinge, the cables' strands walk along the drum.
// NTS simplifications: a 240 mm slice of the elevator and tab; the thread and the drum's groove are
// rings, not helices; the bearing's balls are one ring.

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

export const ZS = 70; // the slice's half-span
const AX = P.AXV;
const toLoop = (pts) => pts.map(([u, v]) => [Math.max(0, v - AX), u]); // a profile above the axis → [r, s]
export const TAB_PIVOT = [P.TAB_U, 0, 0];
export const AXIS_PIVOT = [0, AX, 0];
// the rod at rest: from the nut's pin to the horn's, built along +x from its own origin
export const REST = (() => {
  const sol = M.solve(M.state());
  const e = P.rodEnds({ ...sol, tab: 0, nut: 0, fail: false });
  return { a: e.a, L: Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]), strand: P.strands(M.screwTurns(0)).top[0] };
})();
const anchorCut = (x, y, z = 0) => ({ cut: [x, y, 0], out: { c: [x, y, z], r: 0 } });

export function scene() {
  const parts = [];
  const zfull = { from: -ZS, to: ZS };

  // 18 the elevator: skins (the lower one slotted for the rod), the two spar webs
  parts.push(S.part(18, "ELEVATOR", [
    S.extrude(P.skinUpper(), { along: "z", ...zfull }),
    S.extrude(P.skinLowerAft(), { along: "z", ...zfull }),
    S.extrude(P.skinLowerSlot(), { along: "z", from: -ZS, to: -4 }),
    S.extrude(P.skinLowerSlot(), { along: "z", from: 4, to: ZS }),
    S.extrude(P.frontSpar(), { along: "z", ...zfull }),
    S.extrude(P.rearSpar(), { along: "z", ...zfull }),
  ], { hatch: "solid", explode: [0, 0, -260], anchor: anchorCut(60, P.half(60) - 0.5, -60) }));

  // 11 housing: the bearing's boss, the tube (slotted below between the stops), the end wall
  const H = P.HOUS;
  const ring = (() => {
    const g = 3;
    const ao = Math.asin(g / H.rTube) / (Math.PI / 180);
    const ai = Math.asin(g / H.bore) / (Math.PI / 180);
    const outer = K.arc(0, AX, H.rTube, -90 + ao, 270 - ao, 40);
    const inner = K.arc(0, AX, H.bore, 270 - ai, -90 + ai, 32);
    return [...outer, ...inner];
  })();
  parts.push(S.part(11, "ACTUATOR HOUSING", [
    S.lathe([[P.BRG.ro, H.u0], [H.rBoss, H.u0], [H.rBoss, H.boss], [H.bore, H.boss], [H.bore, P.BRG.u1], [P.BRG.ro, P.BRG.u1]], { axis: "x", at: [AX, 0], segments: 48 }),
    S.tube({ axis: "x", at: [AX, 0], r0: H.bore, r1: H.rTube, from: H.boss, to: P.SLOT_H[0], segments: 48 }),
    S.extrude(ring, { along: "x", from: P.SLOT_H[0], to: P.SLOT_H[1] }),
    S.tube({ axis: "x", at: [AX, 0], r0: H.bore, r1: H.rTube, from: P.SLOT_H[1], to: H.end, segments: 48 }),
    S.tube({ axis: "x", at: [AX, 0], r0: P.BUSH.ro, r1: H.rTube, from: H.end, to: H.u1, segments: 48 }),
  ], { mat: "alu", angle: 135, explode: [0, 70, 0], anchor: anchorCut(140, AX + H.rTube - 1.2, 8) }));

  // 10 bearing: inner and outer rings, the balls as one ring
  const b = P.BRG;
  const m = (b.ri + b.ro) / 2;
  parts.push(S.part(10, "BALL BEARING 6000", [
    S.tube({ axis: "x", at: [AX, 0], r0: b.ri + 0.05, r1: m - b.ball * 0.62, from: b.u0, to: b.u1, segments: 40, hatch: ["steel", 30], own: true }),
    S.tube({ axis: "x", at: [AX, 0], r0: m + b.ball * 0.62, r1: b.ro - 0.02, from: b.u0, to: b.u1, segments: 40, hatch: ["steel", 60], own: true }),
    S.torus([(b.u0 + b.u1) / 2, AX, 0], m, b.ball, { axis: "x", hatch: "none", own: true }),
  ], { mat: "steel", angle: 30, explode: [-20, 110, 0], anchor: anchorCut((b.u0 + b.u1) / 2, AX + b.ro - 1, 4) }));

  // 12 bush, 13 stops
  parts.push(S.part(12, "AFT BUSH", [S.tube({ axis: "x", at: [AX, 0], r0: P.BUSH.ri, r1: P.BUSH.ro - 0.02, from: P.BUSH.u0, to: P.BUSH.u1, segments: 32 })], { mat: "bronze", angle: 45, explode: [60, 60, 0], anchor: anchorCut(173, AX + P.BUSH.ro - 0.4, 2) }));
  parts.push(S.part(13, "STOP BLOCKS", [
    S.box([P.STOPS.f[0], AX - H.rTube + 0.3, -2.98], [P.STOPS.f[1], AX - H.bore, 2.98]),
    S.box([P.STOPS.a[0], AX - H.rTube + 0.3, -2.98], [P.STOPS.a[1], AX - H.bore, 2.98]),
  ], { mat: "steel", angle: 45, explode: [0, -70, 0], anchor: anchorCut((P.STOPS.a[0] + P.STOPS.a[1]) / 2, AX - H.rTube + 1.5, 3) }));

  // 7 drum and 8 screw: they turn together about the axis
  parts.push(S.part(7, "ACTUATOR DRUM", [S.lathe(toLoop(P.drumHalves(0).up), { axis: "x", at: [AX, 0], segments: 48 })], { mat: "alu", angle: 45, pivot: AXIS_PIVOT, explode: [-90, 0, 0], anchor: anchorCut(P.DRUM.u0 + 4, AX + 12, 20) }));
  const scr = P.screwOutline(0).filter(([, v]) => v >= AX - 1e-9);
  const sl = [[0, P.SCR.u0], ...toLoop(scr.slice(0).sort(() => 0)), [0, P.SCR.u1]];
  parts.push(S.part(8, "JACKSCREW Tr10×2", [S.lathe(sl, { axis: "x", at: [AX, 0], segments: 28 })], { hatch: "none", layer: 1, pivot: AXIS_PIVOT, explode: [-150, -40, 0], anchor: anchorCut(150, AX + 2, 5) }));

  // 9 nut: the threaded ring and its lug (the rod's clevis takes the lug's pin)
  const c0 = P.nutC(0);
  const nu = P.nutHalves(0, 0).upper.filter(([, v]) => v < AX + P.NUT.r - 1e-6);
  const nutLoop = [...toLoop(nu), [P.NUT.r, c0 + P.NUT.half], [P.NUT.r, c0 - P.NUT.half]];
  const lug = [[c0 - P.NUT.lug, AX - P.NUT.r + 0.6], [c0 + P.NUT.lug, AX - P.NUT.r + 0.6], [c0 + P.NUT.lug, P.NUT.lugBot + 1.2], [c0 + P.NUT.lug - 1.2, P.NUT.lugBot], [c0 - P.NUT.lug + 1.2, P.NUT.lugBot], [c0 - P.NUT.lug, P.NUT.lugBot + 1.2]];
  parts.push(S.part(9, "NUT", [
    S.lathe(nutLoop, { axis: "x", at: [AX, 0], segments: 40 }),
    S.extrude(lug, { along: "z", from: -1.3, to: 1.3, holes: [S.circle(c0, P.NUT.pinV, P.PIN_R + 0.05, 16)] }),
  ], { mat: "bronze", angle: 45, explode: [0, -50, 0], anchor: anchorCut(c0 + 4, AX + P.NUT.r - 1.2, 8) }));

  // 14 rod: the tube, a clevis at each end, the pins (built along +x from the nut's pin)
  const L = REST.L;
  const eye = (x) => [...S.circle(x, 0, P.EYE_R, 20)];
  const cheeks = (x, z0, z1) => [S.extrude(eye(x), { along: "z", from: z0, to: z1, holes: [S.circle(x, 0, P.PIN_R + 0.05, 12)] }), S.extrude(eye(x), { along: "z", from: -z1, to: -z0, holes: [S.circle(x, 0, P.PIN_R + 0.05, 12)] })];
  parts.push(S.part(14, "PUSH-PULL ROD", [
    S.cylinder({ axis: "x", at: [0, 0], r: P.ROD_R, from: 4.2, to: L - 5.2, segments: 20 }),
    ...cheeks(0, 1.4, 2.8),
    ...cheeks(L, 1.7, 3.0),
    S.extrude([[2.2, -1.2], [4.4, -1.2], [4.4, 1.2], [2.2, 1.2]], { along: "z", from: -2.8, to: 2.8 }),
    S.extrude([[L - 5.4, -1.2], [L - 2.4, -1.2], [L - 2.4, 1.2], [L - 5.4, 1.2]], { along: "z", from: -3.0, to: 3.0 }),
    S.cylinder({ axis: "z", at: [0, 0], r: P.PIN_R, from: -3.2, to: 3.2, segments: 12 }),
    S.cylinder({ axis: "z", at: [L, 0], r: P.PIN_R, from: -3.4, to: 3.4, segments: 12 }),
  ], { hatch: "none", explode: [0, -110, 0], anchor: { cut: [L * 0.5, 0, 0], out: { c: [L * 0.5, 0, 0], r: P.ROD_R, axis: "x" } } }));

  // 15 horn, 17 tab: turn about the tab hinge
  parts.push(S.part(15, "TAB HORN", [S.extrude(P.hornPlate(), { along: "z", from: -1.6, to: 1.6, holes: [S.circle(P.HORN_PIN[0], P.HORN_PIN[1], P.PIN_R + 0.05, 14)] })], { mat: "steel", angle: 135, pivot: TAB_PIVOT, explode: [40, -110, 0], anchor: anchorCut(P.TAB_U + 3, -24, 1.6) }));
  parts.push(S.part(17, "TRIM TAB", [
    S.extrude(P.tabSkin(), { along: "z", ...zfull }),
    S.extrude(P.tabSpar(), { along: "z", ...zfull }),
  ], { hatch: "solid", pivot: TAB_PIVOT, explode: [120, 0, 0], anchor: anchorCut(318, P.half(318) - 0.5, -40) }));

  // 16 piano hinge: the fixed leaf with its knuckle, the wire, the tab's leaf (turns with the tab)
  parts.push(S.part(16, "PIANO HINGE", [
    S.extrude(P.fixedLeaf(), { along: "z", ...zfull, holes: [P.knuckleBore()] }),
    S.cylinder({ axis: "z", at: [P.TAB_U, 0], r: P.WIRE, from: -ZS - 2, to: ZS + 2, segments: 12, hatch: "none", own: true }),
    S.extrude(P.tabLeaf(), { along: "z", ...zfull, pivot: TAB_PIVOT, live: "leaf" }),
  ], { hatch: "solid", explode: [70, 0, 0], anchor: anchorCut(P.TAB_U + 1.6, 1.2, -30) }));

  // 5 the trim cables' two strands, arriving along the hinge line from inboard onto the drum
  const st = P.strands(M.screwTurns(0));
  parts.push(S.part(5, "TRIM CABLES", [
    S.cylinder({ axis: "z", at: st.top, r: M.CABLE_D / 2, from: -ZS, to: 0, segments: 10 }),
    S.cylinder({ axis: "z", at: st.bot, r: M.CABLE_D / 2, from: -ZS, to: 0, segments: 10 }),
  ], { hatch: "none", explode: [-60, 0, -120], anchor: { cut: [st.top[0], st.top[1], 0], out: { c: [st.top[0], st.top[1], -70], r: M.CABLE_D / 2, axis: "z" } } }));

  return { parts, fluids: [], centres: [{ line: [[P.SCR.u0 - 6, AX, 0], [P.SCR.u1 + 6, AX, 0]] }] };
}
export const parts = () => scene().parts;
