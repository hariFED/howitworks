// The main gear's solids for its 3D view (main-gear-3d.html), in the sheet's world mm: x = u
// (outboard), y = v (up from the runway at the static load), z toward the viewer = forward, so the
// cut (z > 0 removed) is the sheet's section A-A on the leg's mid-plane. Pure data built with
// kit/solid3d.mjs from model.mjs and the sheet's profiles (parts.mjs).
//
// The leg is built at the static load and reshaped by live3d.js as it bends; everything on its tip
// (axle, wheel, brake, tyre) is built in the static pose and moved and tilted with the axle; the
// wheel's solids also spin about the axle. The attachment's bolted pieces are built in the leg's own
// frame (x along it, y across it) about the saddle and turned onto the leg's 30° by live3d.js.
// NTS simplifications (the sheet is the authority): the leg's width tapers in six steps instead of
// smoothly; the axle bolts (11) and the inner tube are left out (the sheet shows them); the bearings
// are solid rings; the brake line is a square-section strip; the fuselage is a 320 mm slice.

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const A0 = M.AXLE_STATIC;
const [SU, SV] = M.SADDLE;
// a point in the axle frame (s, r) at the static pose, in world (x, y)
export const ax = ([s, r]) => [A0[0] + s, A0[1] + r];
const axPts = (pts) => pts.map(ax);
// a point in the leg's frame (x along, y across), before the turn onto the leg's angle: about the saddle
const pre = (x, y) => [SU + x, SV + y];
export const LEG_PIVOT = [SU, SV, 0];
export const LEG_TURN = (-M.THETA * Math.PI) / 180;
export const AXLE_PIVOT = [A0[0], A0[1], 0];
const Z_FUS = 160; // the fuselage slice's half-length, fore and aft
const H0 = M.H0 / 2;

// ---------------------------------------------------------------- the leg (reshaped as it bends)
// six steps of width from the saddle to the tip, plus the inner end (inside the gear box)
export const X_IN = -M.A_IN + 6.4; // the inner end piece stops just past the bolt
export const STEPS = [X_IN, 0, 176, 352, 528, 704, M.L];
export const stepWidth = (i) => (i === 0 ? M.B0 : M.breadth((STEPS[i] + STEPS[i + 1]) / 2));
// a segment's outline under the load F: upper face out, lower face back
export function legSegment(F, x0, x1, n = 8) {
  const up = [];
  const lo = [];
  for (let k = 0; k <= n; k++) {
    const x = x0 + ((x1 - x0) * k) / n;
    const h = M.thick(x) / 2;
    const a = P.legAt(F, x, h);
    const b = P.legAt(F, x, -h);
    up.push([a[0], a[1]]);
    lo.push([b[0], b[1]]);
  }
  return [...up, ...lo.reverse()];
}
// the brake line along the leg's upper face (and its riser to the bulkhead union), under F
export function lineShape(F) {
  const pts = P.lineOnLeg(F);
  const a = pts[0];
  const U = P.UNION;
  const riser = [];
  for (let k = 0; k <= 8; k++) {
    const t = k / 8;
    const b = [(1 - t) ** 3, 3 * t * (1 - t) ** 2, 3 * t * t * (1 - t), t ** 3];
    const c = [[U[0], U[1] - 6], [U[0], U[1] - 30], [a[0] - 24, a[1] + 14], a];
    riser.push([b[0] * c[0][0] + b[1] * c[1][0] + b[2] * c[2][0] + b[3] * c[3][0], b[0] * c[0][1] + b[1] * c[1][1] + b[2] * c[2][1] + b[3] * c[3][1]]);
  }
  return P.strip([...riser, ...pts.slice(1)], P.LINE_R);
}

export function parts() {
  const F = M.F_STATIC;
  const out = [];
  // ---------------------------------------------------------------- 1 the leg
  const segs = [];
  for (let i = 0; i < STEPS.length - 1; i++) {
    const w = stepWidth(i) / 2;
    segs.push(S.extrude(legSegment(F, STEPS[i], STEPS[i + 1]), { along: "z", from: -w, to: w, live: `seg${i}` }));
  }
  // the inner end, with the bolt's hole: built along the leg's y, turned onto the leg
  const endShape = K.rect(-M.A_IN - 25, -M.B0 / 2, X_IN, M.B0 / 2).map(([x, z]) => [SU + x, z]);
  segs.push(S.extrude(endShape, { along: "y", from: SV - H0, to: SV + H0, holes: [S.circle(SU - M.A_IN, 0, 6.4, 28)], pivot: LEG_PIVOT, live: "end" }));
  out.push(S.part(1, "MAIN GEAR LEG", segs, { mat: "steel", angle: 45, anchor: { cut: [...M.legPoint(150, 0), 0], out: { c: [...M.legPoint(150, 0), 40], r: 0 } } }));
  // ---------------------------------------------------------------- the attachment (turned onto the leg)
  const turned = (s, live) => ({ ...s, pivot: LEG_PIVOT, live });
  const boltHoles = [S.circle(SU, 56.5, 5.65, 24), S.circle(SU, -56.5, 5.65, 24)];
  // 2 saddle: the clamp block over the leg and its cheeks either side, then the flange up to the fuselage
  const block = K.rect(-40, -70, 40, 70).map(([x, z]) => [SU + x, z]);
  const cheek = (sg) => K.rect(-40, sg > 0 ? 47 : -70, 40, sg > 0 ? 70 : -47).map(([x, z]) => [SU + x, z]);
  const cheekHole = (sg) => [S.circle(SU, sg * 56.5, 5.65, 24)];
  const sp = P.saddlePts();
  const flange = sp.slice(2);
  out.push(S.part(2, "SADDLE FORGING", [
    turned(S.extrude(block, { along: "y", from: SV + H0, to: SV + P.SAD_Y, holes: boltHoles }), "block"),
    turned(S.extrude(cheek(1), { along: "y", from: SV - H0, to: SV + H0, holes: cheekHole(1) }), "ch1"),
    turned(S.extrude(cheek(-1), { along: "y", from: SV - H0, to: SV + H0, holes: cheekHole(-1) }), "ch2"),
    S.extrude(flange, { along: "z", from: -45, to: 45 }),
  ], { mat: "alu", angle: 135, explode: [55, 95, 0], anchor: { cut: [...M.legPoint(0, 28), 0], out: { c: [...M.legPoint(0, 28), 70], r: 0 } } }));
  // 3 cap under the leg
  const capShape = K.rect(-36, -70, 36, 70).map(([x, z]) => [SU + x, z]);
  out.push(S.part(3, "SADDLE CAP", [turned(S.extrude(capShape, { along: "y", from: SV - H0 - P.CAP.t, to: SV - H0, holes: boltHoles }), "cap")], {
    mat: "steel", angle: 45, explode: [-30, -52, 0], anchor: { cut: [...M.legPoint(0, -H0 - 6), 0], out: { c: [...M.legPoint(0, -H0 - 6), 70], r: 0 } },
  }));
  // 4 cap bolts, along the leg's y either side of it
  const capBolt = (z, k) =>
    turned(S.lathe([[0, SV - H0 - P.CAP.t - 11], [9.5, SV - H0 - P.CAP.t - 11], [9.5, SV - H0 - P.CAP.t], [5.55, SV - H0 - P.CAP.t], [5.55, SV + P.SAD_Y], [9, SV + P.SAD_Y], [9, SV + P.SAD_Y + 7], [0, SV + P.SAD_Y + 7]], { axis: "y", at: [SU, z], own: true }), `b${k}`);
  out.push(S.part(4, "CAP BOLT AN7", [capBolt(-56.5, 0), capBolt(56.5, 1)], {
    hatch: "none", explode: [90, 156, 0], anchor: { cut: [...M.legPoint(0, P.SAD_Y + 7), -56.5], out: { c: [...M.legPoint(0, P.SAD_Y + 7), -56.5], r: 0 } },
  }));
  // 5 inboard fitting under the leg's inner end, 6 its bolt
  const fit = K.rect(P.FIT.x0, -40, P.FIT.x1, 40).map(([x, z]) => [SU + x, z]);
  out.push(S.part(5, "INBOARD FITTING", [turned(S.extrude(fit, { along: "y", from: SV - H0 - P.FIT.depth, to: SV - H0, holes: [S.circle(SU - M.A_IN, 0, 6.4, 28)] }), "fit")], {
    mat: "steel", angle: 135, explode: [-40, -70, 0], anchor: { cut: [...M.legPoint(-185, -H0 - 18), 0], out: { c: [...M.legPoint(-185, -H0 - 18), 40], r: 0 } },
  }));
  const yb = -H0 - P.FIT.depth;
  out.push(S.part(6, "INBOARD BOLT AN8", [
    turned(S.lathe([[0, SV + yb - 13], [11, SV + yb - 13], [11, SV + yb - 1.5], [6.35, SV + yb - 1.5], [6.35, SV + H0], [10, SV + H0], [10, SV + H0 + 8], [0, SV + H0 + 8]], { axis: "y", at: [SU - M.A_IN, 0] }), "bolt"),
  ], { hatch: "none", layer: 1, explode: [45, 78, 0], anchor: { cut: [...M.legPoint(-M.A_IN, H0 + 4), 0], out: { c: [...M.legPoint(-M.A_IN, H0 + 4), 10], r: 0 } } }));
  // ---------------------------------------------------------------- the fuselage slice
  const c = [P.CORNER_U, P.BELLY + P.CORNER_R];
  const bh = [[0, P.BELLY], [P.CORNER_U, P.BELLY], ...K.arc(c[0], c[1], P.CORNER_R, -90, 0, 14).slice(1), [P.SIDE, P.FLOOR], [0, P.FLOOR]];
  const hole = K.rrect(30, 640, 120, 740, 22);
  out.push(S.part(7, "GEAR BOX BULKHEAD", [
    S.extrude(bh, { along: "z", from: -73.6, to: -72, holes: [hole], explode: [0, 0, -60] }),
    S.extrude(bh, { along: "z", from: 72, to: 73.6, holes: [hole], explode: [0, 0, 60] }),
  ], { hatch: "solid", explode: [-60, 0, 0], anchor: { cut: [200, 760, -72.8], out: { c: [200, 760, -72], r: 0 } } }));
  const rail = (u) => [[u - 10, P.FLOOR + 1.8], [u + 10, P.FLOOR + 1.8], [u + 10, P.FLOOR + 4.5], [u + 2, P.FLOOR + 4.5], [u + 2, P.FLOOR + 18], [u + 7, P.FLOOR + 18], [u + 7, P.FLOOR + 22], [u - 7, P.FLOOR + 22], [u - 7, P.FLOOR + 18], [u - 2, P.FLOOR + 18], [u - 2, P.FLOOR + 4.5], [u - 10, P.FLOOR + 4.5]];
  out.push(S.part(8, "CABIN FLOOR AND SEAT RAILS", [
    S.extrude(K.rect(0, P.FLOOR, P.SIDE, P.FLOOR + 1.8), { along: "z", from: -Z_FUS, to: Z_FUS, hatch: "solid" }),
    ...P.RAILS.map((u) => S.extrude(rail(u), { along: "z", from: -Z_FUS, to: Z_FUS, own: true })),
  ], { mat: "alu", angle: 45, explode: [-40, 140, 0], anchor: { cut: [P.RAILS[0], P.FLOOR + 14, 0], out: { c: [P.RAILS[0], P.FLOOR + 22, 0], r: 0 } } }));
  out.push(S.part(9, "SKIN, BELLY AND SIDE", P.skinStrips().map((pts) => S.extrude(pts, { along: "z", from: -Z_FUS, to: Z_FUS })), {
    hatch: "solid", explode: [-60, -90, 0], anchor: { cut: [150, P.BELLY - 1, 0], out: { c: [150, P.BELLY - 2, 0], r: 0 } },
  }));
  // ---------------------------------------------------------------- the tip assembly (static pose)
  const tip = (id, name, solids, o) => S.part(id, name, solids, { pivot: AXLE_PIVOT, ...o });
  const lathe = (loop, o = {}) => S.lathe(loop.map(([r, s]) => [r, A0[0] + s]), { axis: "x", at: [A0[1], 0], ...o });
  const xAlong = (shape, s0, s1, o = {}) => S.extrude(shape.map(([z, r]) => [z, A0[1] + r]), { along: "x", from: A0[0] + s0, to: A0[0] + s1, ...o });
  const holesAt = (pts, r, n = 20) => pts.map(([z, y]) => S.circle(z, A0[1] + y, r, n));
  // 10 axle: the block (bolted under the leg), the hollow spindle, the spacer
  const blockPts = P.axlePts().filter(([s]) => s <= P.BLOCK.s1);
  const blk = [[P.BLOCK.s0, P.BLOCK.bot], [P.BLOCK.s1, P.BLOCK.bot], ...P.axlePts().slice(-7)];
  void blockPts;
  out.push(tip(10, "AXLE Ø31.75", [
    S.extrude(axPts(blk), { along: "z", from: -30, to: 30 }),
    S.bore(lathe([[0, -160], [7, -160], [7, P.BLOCK.s1], [0, P.BLOCK.s1]])),
    lathe([[7, P.BLOCK.s1], [P.SP_R, P.BLOCK.s1], [P.SP_R, 62], [12.7, 62], [12.7, 86], [7, 86]]),
    lathe([[P.SP_R + 0.05, -120], [22, -120], [22, -66], [P.SP_R + 0.05, -66]], { own: true }),
  ], { mat: "steel", angle: 135, explode: [0, -40, 0], anchor: { cut: [...ax([-170, -14]), 0], out: { c: [...ax([-170, -14]), 30], r: 0 } } }));
  out.push(tip(11, "TAPERED SHIM", [S.extrude(axPts(P.shimPts()), { along: "z", from: -30, to: 30 })], {
    hatch: "solid", explode: [0, -22, 0], anchor: { cut: [...ax(P.tipPt(30, -M.thick(M.L - 30) / 2 - 1.6)), 0], out: { c: [...ax(P.tipPt(30, -M.thick(M.L - 30) / 2 - 1.6)), 30], r: 0 } },
  }));
  // 12 torque plate, keyed on the spindle, with the two anchor bushings
  const ANCH = [[40, 100.3], [-40, 100.3]];
  const tpShape = [[-22, -42], [22, -42], [30, -20], [48, 90], [48, 112], [36, P.TP.top], [-36, P.TP.top], [-48, 112], [-48, 90], [-30, -20]];
  out.push(tip(12, "TORQUE PLATE", [xAlong(tpShape, P.TP.s0, P.TP.s1, { holes: [S.circle(0, A0[1], P.SP_R + 0.05, 48), ...holesAt(ANCH, 4.8)] })], {
    mat: "steel", angle: 45, explode: [0, 150, 0], anchor: { cut: [...ax([-123, 40]), 0], out: { c: [...ax([-123, 40]), 30], r: 0 } },
  }));
  // 13 wheel: hubs and rims (lathes), webs (with the tie bolts' holes), the four lugs; it spins
  const BOLTS = [[0, 55], [55, 0], [0, -55], [-55, 0]]; // (z, r) of the four tie bolts
  const spin = (s, k) => ({ ...s, pivot: AXLE_PIVOT, live: k });
  const rimIn = [[70, -57], [70, 0], [P.RIM, 0], [P.RIM, -51], [88.5, -51], [92, -53.5], [92, -57]];
  const hubIn = [[29.55, -66], [40, -66], [40, 0], [26, 0], [26, -42], [29.55, -42]];
  const flipS = (loop) => loop.map(([r, s]) => [r, -s]);
  const web = (s0, s1, r) => xAlong(K.circle(0, 0, 70, 96), s0, s1, { holes: [S.circle(0, A0[1], 40, 64), ...holesAt(BOLTS, r)] });
  out.push(tip(13, "WHEEL 6.00-6", [
    spin(lathe(hubIn), "w0"), spin(lathe(rimIn), "w1"), spin(lathe(flipS(hubIn)), "w2"), spin(lathe(flipS(rimIn)), "w3"),
    spin(web(-24, -14, 7), "w4"), spin(web(14, 24, 4.05), "w5"),
    ...BOLTS.map(([z, r], k) => spin(S.tube({ axis: "x", at: [A0[1] + r, z], r0: 4.02, r1: 7, from: A0[0] - 86, to: A0[0] + 14 }), `l${k}`)),
  ], { mat: "alu", angle: 45, explode: [250, 0, 0], anchor: { cut: [...ax([-36, 73]), 0], out: { c: [...ax([-36, 73]), 0], r: 92, axis: "x" } } }));
  // 14 tie bolts through the disc, the lugs and both webs
  const tieBolt = ([z, r], k) => spin(S.lathe([[0, -99.3], [6, -99.3], [6, -92.4], [3.97, -92.4], [3.97, 24], [6, 24], [6, 30], [0, 30]].map(([rr, s]) => [rr, A0[0] + s]), { axis: "x", at: [A0[1] + r, z], own: true }), `t${k}`);
  out.push(tip(14, "WHEEL TIE BOLT AN5", BOLTS.map(tieBolt), { hatch: "none", explode: [640, 0, 0], anchor: { cut: [...ax([-44, 55]), 0], out: { c: [...ax([30, 55]), 0], r: 0 } } }));
  // 15 bearings, 16 seals, 17 nut
  const brg = (sg) => lathe([[P.SP_R + 0.05, sg * 41], [21.6, sg * 41], [24.6, sg * 42], [29.5, sg * 42], [29.5, sg * 59], [26.6, sg * 59], [21, sg * 60], [P.SP_R + 0.05, sg * 60]].map(([r, s]) => [r, s]));
  out.push(tip(15, "TAPERED ROLLER BEARING", [spin({ ...brg(-1), explode: [60, 0, 0] }, "b0"), spin({ ...brg(1), explode: [190, 0, 0] }, "b1")], {
    mat: "steel", angle: 135, explode: [140, 0, 0], anchor: { cut: [...ax([-50, 25]), 0], out: { c: [...ax([-50, 0]), 0], r: 29.5, axis: "x" } },
  }));
  out.push(tip(16, "GREASE SEAL", [
    spin({ ...lathe([[P.SP_R + 0.05, -66], [29.5, -66], [29.5, -60.1], [P.SP_R + 0.05, -60.1]]), explode: [40, 0, 0] }, "s0"),
    spin({ ...lathe([[21, 60.1], [29.5, 60.1], [29.5, 66], [21, 66]]), explode: [210, 0, 0] }, "s1"),
  ], { mat: "rubber", explode: [140, 0, 0], anchor: { cut: [...ax([-63, 22]), 0], out: { c: [...ax([-63, 0]), 0], r: 29.5, axis: "x" } } }));
  out.push(tip(17, "AXLE NUT", [lathe([[12.75, 60.1], [20.5, 60.1], [20.5, 72], [12.75, 72]])], { hatch: "none", explode: [760, 0, 0], anchor: { cut: [...ax([66, 16]), 0], out: { c: [...ax([66, 0]), 0], r: 20.5, axis: "x" } } }));
  // 18 tyre (its tube is left out)
  out.push(tip(18, "TYRE 6.00-6", [spin(lathe(P.tyrePts(36).map(([s, r]) => [r, s])), "tyre")], {
    mat: "rubber", angle: 45, explode: [450, 0, 0], anchor: { cut: [...ax([0, 218]), 0], out: { c: [...ax([0, 0]), 0], r: M.TYRE_R, axis: "x" } },
  }));
  // 19 disc on the lugs
  out.push(tip(19, "BRAKE DISC Ø190.5", [spin(xAlong(K.circle(0, 0, P.DISC.r1, 128), P.DISC.s0, P.DISC.s1, { holes: [S.circle(0, A0[1], P.DISC.r0, 64), ...holesAt(BOLTS, 4.02)] }), "disc")], {
    mat: "steel", angle: 135, explode: [120, 0, 0], anchor: { cut: [...ax([-89.2, 48]), 0], out: { c: [...ax([-89.2, 48]), 0], r: 0 } },
  }));
  // the caliper: 20 cylinder (housing), 21 piston, 22 pressure plate, 23 back plate, 24 anchor bolts
  const C = P.CAL;
  const hsg = K.rrect(-50, C.r0, 50, C.r1, 6);
  out.push(tip(20, "CALIPER CYLINDER", [
    xAlong(hsg, C.s0, C.bore0, { holes: holesAt(ANCH, 4.8) }),
    xAlong(hsg, C.bore0, C.s1, { holes: [...holesAt(ANCH, 4.8), S.circle(0, A0[1] + 78, M.CAL_BORE / 2, 72)] }),
    S.bore(S.cylinder({ axis: "y", at: [A0[0] - 109.5, 0], r: 1.5, from: A0[1] + C.rb1, to: A0[1] + C.r1 })),
    S.cylinder({ axis: "y", at: [A0[0] - 109.5, 0], r: 4.5, from: A0[1] + C.r1, to: A0[1] + 126, own: true }),
  ], { mat: "alu", angle: 45, explode: [-30, 250, 0], anchor: { cut: [...ax([-110, 112]), 0], out: { c: [...ax([-110, 126]), 0], r: 0 } } }));
  const pisLathe = (loop) => S.lathe(loop.map(([r, s]) => [r, A0[0] + s]), { axis: "x", at: [A0[1] + 78, 0] });
  out.push(tip(21, "PISTON Ø44.45", [
    { ...pisLathe(P.PISTON_LOOP), live: "piston" },
    { ...S.torus([A0[0] - 108, A0[1] + 78, 0], P.PISTON_R - 1.25, 1.15, { axis: "x" }), hatch: "solid", own: true, live: "oring" },
  ], { mat: "alu", angle: 135, explode: [10, 250, 0], anchor: { cut: [...ax([-108, 66]), 0], out: { c: [...ax([-100.5, 78]), 0], r: 0 } } }));
  const lin = K.rrect(-32, 64, 32, 92, 8);
  const half = M.PAD_GAP / 2;
  out.push(tip(22, "PRESSURE PLATE AND LINING", [
    xAlong(K.rrect(-34, 62, 34, 96, 8), C.s1, -97),
    { ...xAlong(lin, -97, P.DISC.s0 - half), hatch: ["plastic", 60], own: true },
  ], { mat: "steel", angle: 45, explode: [50, 250, 0], anchor: { cut: [...ax([-98.7, 80]), 0], out: { c: [...ax([-98.7, 80]), 34], r: 0 } } }));
  out.push(tip(23, "BACK PLATE AND LINING", [
    { ...xAlong(lin, P.DISC.s1 + half, -81.75), hatch: ["plastic", 30], own: true },
    xAlong(K.rrect(-50, 62, 50, 112, 8), -81.75, -78.25, { holes: holesAt(ANCH, 4.8) }),
  ], { mat: "steel", angle: 135, explode: [110, 250, 0], anchor: { cut: [...ax([-80, 105]), 0], out: { c: [...ax([-80, 105]), 0], r: 0 } } }));
  out.push(tip(24, "ANCHOR BOLT", ANCH.map(([z, r], k) => ({ ...S.cylinder({ axis: "x", at: [A0[1] + r, z], r: 4.75, from: A0[0] + P.TP.s0, to: A0[0] - 78.25 }), live: `a${k}` })), {
    hatch: "none", explode: [40, 330, 0], anchor: { cut: [...ax([-90, 105.05]), -40], out: { c: [...ax([-90, 105.05]), -40], r: 0 } },
  }));
  // 25 the brake line on the leg (reshaped with it), and its union and hose on the tip
  out.push(S.part(25, "BRAKE LINE Ø4.76", [S.extrude(lineShape(F), { along: "z", from: -P.LINE_R, to: P.LINE_R, live: "line" })], {
    hatch: "none", explode: [0, 70, 0], anchor: { cut: [...P.lineOnLeg(F)[12], 0], out: { c: [...P.lineOnLeg(F)[12], P.LINE_R], r: 0 } },
  }));
  out.push(tip("25a", "BRAKE HOSE", [
    S.extrude(axPts(P.strip(P.hosePts(), 4)), { along: "z", from: -4, to: 4 }),
    S.extrude(axPts(P.unionPts()), { along: "z", from: -5, to: 5, own: true }),
  ], { hatch: "none", explode: [0, 120, 0] }));
  return out;
}

// ---------------------------------------------------------------- the brake fluid behind the piston, and up the port
export function fluids() {
  return [
    S.fluid("cal", S.lathe([[0, A0[0] + P.CAL.bore0], [M.CAL_BORE / 2 - 0.3, A0[0] + P.CAL.bore0], [M.CAL_BORE / 2 - 0.3, A0[0] - 114.5], [0, A0[0] - 114.5]], { axis: "x", at: [A0[1] + 78, 0] })),
    S.fluid("port", S.cylinder({ axis: "y", at: [A0[0] - 109.5, 0], r: 1.4, from: A0[1] + P.CAL.rb1 - 0.5, to: A0[1] + P.CAL.r1 })),
  ];
}

export const centres = () => [[[0, -40, 0], [0, 900, 0]]];
export const scene = () => ({ parts: parts(), fluids: fluids(), centres: centres() });
// the wheel's spinning solids, by part: live names
export const SPIN = { 13: ["w0", "w1", "w2", "w3", "w4", "w5", "l0", "l1", "l2", "l3"], 14: ["t0", "t1", "t2", "t3"], 15: ["b0", "b1"], 16: ["s0", "s1"], 18: ["tyre"], 19: ["disc"] };
export const TIP = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, "25a"];
export const TURNED = { 1: ["end"], 2: ["block", "ch1", "ch2"], 3: ["cap"], 4: ["b0", "b1"], 5: ["fit"], 6: ["bolt"] };
