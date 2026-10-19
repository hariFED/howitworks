// The electrical system's 3D view (electrical-3d.html): the alternator, the starter at its ring gear,
// the battery and one panel breaker, each cut on the plane of the sheet's section (z = 0), built with
// kit/solid3d.mjs from the sheet's own profiles (parts.mjs) and numbers (model.mjs). Pure data.
//
// Placement (NTS, side by side, not in their installed places):
//   the ALTERNATOR on the x axis, u → x (Section A-A), the pulley at x = 0;
//   the STARTER below it on y = SY, u → x (Section D-D), the ring gear's arc above its pinion;
//   the BATTERY to the right, standing on its base, Section E-E on z = 0;
//   one BREAKER above the battery, its axis vertical as in Detail G.
// Simplifications (the sheet is the authority): the claws are straight prisms (the sheet tapers
// them), the belt is a band on the upper half of the pulley, the starter's brushes and the alternator's
// rectifier are left out, the battery's plates are one comb a cell, the ring gear is an arc of 19 teeth.

import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

export const SY = -230; // the starter's axis
export const BAT = { x: 190, y: -330 }; // the battery's lower-left corner (u = 0, v = 0)
export const CBX = { x: 270, y: -60 }; // the breaker's axis, at its panel face
const AL = P.AL;
const ax = (loop) => S.lathe(loop, { axis: "x", at: [0, 0] });
const axS = (loop) => S.lathe(loop, { axis: "x", at: [SY, 0] });
const rect = (r0, r1, u0, u1) => [[r0, u0], [r1, u0], [r1, u1], [r0, u1]];
const rad = Math.PI / 180;

export function parts() {
  const out = [];
  const r = AL.rotor;
  // ================================================================ the alternator
  out.push(S.part(1, "DRIVE-END FRAME", [ax(AL.de)], { mat: "alu", angle: 45, explode: [-50, 0, 0], anchor: { cut: [40, 50, 0], out: { c: [40, 0, 0], r: 61, axis: "x" } } }));
  out.push(S.part(2, "SLIP-RING-END FRAME", [ax(AL.sre)], { mat: "alu", angle: 135, explode: [60, 0, 0], anchor: { cut: [116, 50, 0], out: { c: [116, 0, 0], r: 61, axis: "x" } } }));
  const st = AL.stator;
  out.push(S.part(3, "STATOR", [
    ax(rect(st.ri, st.ro, st.u0, st.u1)),
    S.lathe(rect(st.endR[0], st.endR[1], st.end0, st.u0 - 0.05), { axis: "x", at: [0, 0], hatch: ["bronze", 60], own: true }),
    S.lathe(rect(st.endR[0], st.endR[1], st.u1 + 0.05, st.end1), { axis: "x", at: [0, 0], hatch: ["bronze", 60], own: true }),
  ], { mat: "steel", angle: 30, explode: [0, 0, 160], anchor: { cut: [77, 58, 0], out: { c: [77, 0, 0], r: 61, axis: "x" } } }));
  // the rotor: core and plates turned; fourteen claws, seven from each half, alternating
  const pitch = 360 / (2 * M.ALT.pairs);
  const claws = [];
  for (let i = 0; i < 2 * M.ALT.pairs; i++) {
    const a = 90 + i * pitch;
    const shape = P.sector(40.2, r.rOut, a - 7.5, a + 7.5, 4).map(([y, z]) => [z, y]);
    const front = i % 2 === 0;
    claws.push(S.extrude(shape.map(([z, y]) => [z, y]), { along: "x", from: front ? r.u0 : r.u0 + 2, to: front ? r.u1 - 2 : r.u1, hatch: ["steel", front ? 135 : 45], own: true }));
  }
  out.push(S.part(4, "CLAW-POLE ROTOR AND SHAFT", [
    ax([[AL.shaft.r1 + 0.05, r.u0], [r.root, r.u0], [r.root, r.u0 + r.plate], [r.hub, r.u0 + r.plate], [r.hub, r.u1 - r.plate], [r.root, r.u1 - r.plate], [r.root, r.u1], [AL.shaft.r1 + 0.05, r.u1]]),
    ...claws,
    S.cylinder({ axis: "x", at: [0, 0], r: AL.shaft.r2, from: AL.shaft.front, to: AL.shaft.end, hatch: "none", own: true }),
  ], { mat: "steel", angle: 135, pivot: [0, 0, 0], layer: 1, explode: [0, 0, 0], anchor: { cut: [r.u0 + 4, 30, 0], out: { c: [77, 0, 0], r: 46, axis: "x" } } }));
  const c = AL.coil;
  out.push(S.part(5, "FIELD WINDING", [ax(rect(c.r0, c.r1, c.u0, c.u1))], { mat: "bronze", angle: 45, pivot: [0, 0, 0], explode: [0, 0, 90], anchor: { cut: [77, 28, 0], out: { c: [77, 0, 0], r: 37, axis: "x" } } }));
  out.push(S.part(6, "SLIP RINGS", [
    ax(rect(AL.sleeve.r0 + 0.05, AL.sleeve.r1, AL.sleeve.u0, AL.sleeve.u1)),
    ...AL.rings.map(([u0, u1]) => S.lathe(rect(AL.ringR[0] + 0.02, AL.ringR[1], u0, u1), { axis: "x", at: [0, 0], hatch: ["bronze", 135], own: true })),
  ], { mat: "plastic", angle: 135, pivot: [0, 0, 0], explode: [90, 0, 0], anchor: { cut: [103, 10.5, 0], out: { c: [103, 0, 0], r: 11.5, axis: "x" } } }));
  out.push(S.part(7, "BRUSHES", AL.brush.map(([u0, u1]) => S.box([u0, AL.brushR[0] + 0.05, -3], [u1, AL.brushR[1], 3])), { mat: "iron", angle: 60, explode: [90, 50, 0], anchor: { cut: [103, 17, 0], out: { c: [103, 22, 0], r: 0 } } }));
  out.push(S.part(9, "PULLEY AND FAN", [ax(AL.pulley), ax(rect(AL.fan.hub[0], AL.fan.disc[1], AL.fan.disc[2], AL.fan.disc[3]))], { mat: "steel", angle: 45, pivot: [0, 0, 0], explode: [-110, 0, 0], anchor: { cut: [10, 32, 0], out: { c: [10, 0, 0], r: 37, axis: "x" } } }));
  out.push(S.part(10, "BALL BEARINGS", [ax(rect(AL.brgF.ri + 0.05, AL.brgF.ro - 0.02, AL.brgF.u0, AL.brgF.u1)), ax(rect(AL.brgR.ri + 0.05, AL.brgR.ro - 0.02, AL.brgR.u0, AL.brgR.u1))], { mat: "steel", angle: 45, explode: [0, 0, 40], anchor: { cut: [43, 14, 0], out: { c: [43, 0, 0], r: 20, axis: "x" } } }));
  // the belt: a band over the pulley's upper half, in its groove
  const band = [...P.sector(28, 38.5, 0, 180, 24)].map(([y, z]) => [z, y]);
  out.push(S.part(11, "ALTERNATOR V-BELT", [S.extrude(band.map(([a, b]) => [b, a]), { along: "x", from: 6.8, to: 13.2, live: "belt" })], { mat: "rubber", angle: 45, explode: [-110, 40, 0], anchor: { cut: [10, 33, 0], out: { c: [10, 38.5, 0], r: 0 } } }));
  // ================================================================ the starter and its ring gear
  const T = P.ST;
  out.push(S.part(18, "STARTER FRAMES AND MAGNETS", [
    axS(T.nose),
    axS(rect(T.yoke.ri, T.yoke.ro, T.yoke.u0, T.yoke.u1)),
    axS(T.cap),
    S.lathe(rect(T.magnet.ri, T.magnet.ro - 0.05, T.magnet.u0, T.magnet.u1), { axis: "x", at: [SY, 0], hatch: ["iron", 60], own: true }),
  ], { mat: "alu", angle: 135, explode: [0, 0, 0], anchor: { cut: [61, SY - 40, 0], out: { c: [110, SY, 0], r: 38, axis: "x" } } }));
  out.push(S.part(19, "STARTER ARMATURE", [
    axS(rect(T.arm.ri + 0.05, T.arm.ro, T.arm.u0, T.arm.u1)),
    S.lathe(rect(T.comm.ri + 0.05, T.comm.ro, T.comm.u0, T.comm.u1), { axis: "x", at: [SY, 0], hatch: ["bronze", 135], own: true }),
    S.cylinder({ axis: "x", at: [SY, 0], r: T.shaft.r, from: T.shaft.u0, to: T.shaft.u1, hatch: "none", own: true }),
  ], { mat: "iron", angle: 135, pivot: [0, SY, 0], layer: 1, explode: [0, -90, 0], anchor: { cut: [112, SY - 16, 0], out: { c: [112, SY, 0], r: 26, axis: "x" } } }));
  const pin = P.pinionGear(0).map(([h, v]) => [h, v + SY]);
  out.push(S.part(20, "BENDIX DRIVE AND PINION", [
    S.extrude(pin, { along: "x", from: 0, to: T.pinion.w, holes: [S.circle(0, SY, T.pinion.rIn + 0.05, 32)] }),
    S.lathe(rect(T.pinion.rIn + 0.05, T.barrel.r, T.barrel.u0, T.barrel.u1), { axis: "x", at: [SY, 0], own: true }),
    S.helix({ axis: "x", at: [SY, 0], from: T.barrel.u1, to: T.spring.u1, radius: T.spring.r, wire: T.spring.wire, turns: T.spring.turns, hatch: "solid", own: true, pivot: [T.spring.u1, SY, 0], live: "spring" }),
  ], { mat: "steel", angle: 45, explode: [-60, 0, 0], anchor: { cut: [7, SY - 10, 0], out: { c: [7, SY, 0], r: 12, axis: "x" } } }));
  const ring = P.ringArc(0).map(([h, v]) => [h, v + SY]);
  out.push(S.part("R", "RING GEAR 149 T (ADJACENT)", [S.extrude(ring, { along: "x", from: P.RINGG.u0, to: P.RINGG.u1, live: "ring" })], { mat: "steel", angle: 135, pivot: [0, SY + M.CENTRES, 0], explode: [0, 40, 0], anchor: { cut: [-9, SY + 18, 0], out: { c: [-9, SY + 26, 0], r: 0 } } }));
  // ================================================================ the battery
  const B = P.BT;
  const bp = ([u, v]) => [BAT.x + u, BAT.y + v];
  const casePts = [[0, 0], [B.L, 0], [B.L, B.H]];
  for (let i = B.cells - 1; i >= 0; i--) casePts.push([P.cellX(i) + B.cellW, B.H], [P.cellX(i) + B.cellW, B.floor], [P.cellX(i), B.floor], [P.cellX(i), B.H]);
  casePts.push([0, B.H]);
  const D = 85; // half the case's depth (its 180 less the walls)
  out.push(S.part(13, "BATTERY CASE AND LID", [
    S.extrude(casePts.map(bp), { along: "z", from: -D - 4, to: D + 4 }),
    S.box([BAT.x, BAT.y + B.lid[0], -D - 4], [BAT.x + B.L, BAT.y + B.lid[1], D + 4], { hatch: ["plastic", 135], own: true }),
    S.box([BAT.x - 0.01, BAT.y + B.floor, -D - 4], [BAT.x + B.L + 0.01, BAT.y + B.H, -D], { own: true }),
    S.box([BAT.x - 0.01, BAT.y + B.floor, D], [BAT.x + B.L + 0.01, BAT.y + B.H, D + 4], { own: true }),
  ], { mat: "plastic", angle: 45, explode: [0, 0, 0], anchor: { cut: [BAT.x + B.L - 1.75, BAT.y + 80, 0], out: { c: [BAT.x + B.L / 2, BAT.y + 80, D + 4], r: 0 } } }));
  const combs = [];
  for (let i = 0; i < B.cells; i++) {
    const pl = P.plates(i).filter((p) => p[2]);
    const pts = [[pl[0][0] - 0.6, B.strap[1]]];
    pl.forEach(([u0, u1], k) => {
      pts.push([u0 - (k ? 0 : 0.6), B.strap[0]], [u0, B.strap[0]], [u0, B.floor + B.rest], [u1, B.floor + B.rest], [u1, B.strap[0]]);
    });
    pts.push([pl[pl.length - 1][1] + 0.6, B.strap[0]], [pl[pl.length - 1][1] + 0.6, B.strap[1]]);
    const clean = pts.filter((p, j) => j === 0 || p[0] !== pts[j - 1][0] || p[1] !== pts[j - 1][1]);
    combs.push(S.extrude(clean.map(bp), { along: "z", from: -D + 6, to: D - 6, own: true }));
  }
  out.push(S.part(14, "CELL ELEMENTS", combs, { hatch: "solid", explode: [0, 0, 170], anchor: { cut: [BAT.x + P.plates(2)[3][0] + 1, BAT.y + 60, 0], out: { c: [BAT.x + 80, BAT.y + 129, 0], r: 0 } } }));
  // ================================================================ one breaker, axis vertical (Detail G)
  const G = P.CBG;
  const ay = (loop) => S.lathe(loop, { axis: "y", at: [CBX.x, 0] });
  const gy = (v) => CBX.y + v;
  const inner = G.body.ro - G.body.wall;
  out.push(S.part(25, "CIRCUIT BREAKER", [
    ay([[inner, gy(G.body.v1)], [G.body.ro, gy(G.body.v1)], [G.body.ro, gy(G.body.v0)], [0, gy(G.body.v0)], [0, gy(G.body.v0 + G.body.floor)], [inner, gy(G.body.v0 + G.body.floor)]]),
    S.lathe([[G.bush.ri, gy(G.bush.v0 - 2)], [inner - 0.05, gy(G.bush.v0 - 2)], [inner - 0.05, gy(G.bush.v0)], [G.bush.ro, gy(G.bush.v0)], [G.bush.ro, gy(G.bush.v1)], [G.bush.ri, gy(G.bush.v1)]], { axis: "y", at: [CBX.x, 0], hatch: ["brass", 135], own: true }),
    S.box([CBX.x + G.bimetal.u - G.bimetal.t / 2, gy(G.bimetal.v0), -1.5], [CBX.x + G.bimetal.u + G.bimetal.t / 2, gy(G.bimetal.v1), 1.5], { hatch: "solid", own: true, live: "bimetal", pivot: [CBX.x + G.bimetal.u, gy(G.bimetal.v0), 0] }),
  ], { mat: "plastic", angle: 45, explode: [0, 0, 0], anchor: { cut: [CBX.x - G.body.ro + 0.75, gy(-24), 0], out: { c: [CBX.x, gy(-24), 0], r: G.body.ro, axis: "y" } } }));
  out.push(S.part("25a", "BREAKER BUTTON", [S.cylinder({ axis: "y", at: [CBX.x, 0], r: G.plunger.r - 0.05, from: gy(G.plunger.bot), to: gy(G.plunger.top) })], { hatch: "none", layer: 1, explode: [0, 25, 0] }));
  return out;
}

export function fluids() {
  const B = P.BT;
  return Array.from({ length: B.cells }, (_, i) =>
    S.fluid(`acid${i}`, S.extrude(P.electrolyte(i).map(([u, v]) => [BAT.x + u, BAT.y + v]), { along: "z", from: -84, to: 84 })),
  );
}
export const centres = () => [
  [[AL.shaft.front - 8, 0, 0], [AL.shaft.end + 8, 0, 0]],
  [[P.ST.shaft.u0 - 6, SY, 0], [P.ST.shaft.u1 + 8, SY, 0]],
];
export const scene = () => ({ parts: parts(), fluids: fluids(), centres: centres() });
void rad;
