// The nose gear's solids for its 3D view (nose-gear-3d.html), in the sheet's world mm: x = u (forward
// is −x), y = v (up), z toward the viewer = the aircraft's LEFT side, so the cut (z > 0 removed) is the
// sheet's section A-A on the centre line. Pure data built with kit/solid3d.mjs from model.mjs and the
// sheet's profiles (parts.mjs).
//
// Everything below the outer cylinder is built fully extended (c = 0) with the wheel straight, as on
// the sheet; live3d.js lifts it by c and turns it by ψ about the strut axis. The torque links are built
// at c = 0 and turned about their pins. NTS simplifications (the sheet is the authority): the cams'
// V flanks are two steps each; the shimmy damper and the bungees are closed bodies (their insides
// are drawn in the sheet's E-E); the horns, damper eye and bungee eyes are stacked on one pin; the
// engine mount's legs are flat bars.

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const rad = Math.PI / 180;
export const MOVING = [6, 8, 9, 10, 11, 16, 17, 25, 26, 27, 28];
export const DAMPER_V = 524; // the damper's axis sits on the horn pin above the horn (NTS)
export const BUNGEE_V = 500.5; // the bungees' below it
export const Z_R = -M.HORN_R; // the aircraft's right side (beyond the cut)

// annular sector in the (x, z) plane, for an extrusion along y
function sector(r0, r1, a0, a1, n = 10) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (a0 + ((a1 - a0) * i) / n) * rad;
    pts.push([r1 * Math.cos(a), r1 * Math.sin(a)]);
  }
  for (let i = n; i >= 0; i--) {
    const a = (a0 + ((a1 - a0) * i) / n) * rad;
    pts.push([r0 * Math.cos(a), r0 * Math.sin(a)]);
  }
  return pts;
}
const nb = M.CAM_TOP - M.CAM_DEPTH;
const STEPS = [0, 1].map((i) => {
  const lo = nb + 6 * i;
  const hi = lo + 6;
  return { lo, hi, half: (M.CAM_HALF * (lo + 3 - nb)) / M.CAM_DEPTH };
});
// the fixed cam: a ring up to the notch bottom, then three steps that leave the V notches at 0° and 180°
function fixedCamSolids() {
  const out = [S.tube({ r0: 25.9, r1: 33.3, from: M.CAM_BOT, to: nb })];
  for (const s of STEPS) {
    out.push(S.extrude(sector(25.9, 33.3, s.half, 180 - s.half), { along: "y", from: s.lo, to: s.hi }));
    out.push(S.extrude(sector(25.9, 33.3, 180 + s.half, 360 - s.half), { along: "y", from: s.lo, to: s.hi }));
  }
  return out;
}
// the moving cam: a ring, and the two teeth as the same steps, a degree and a half narrower
function movingCamSolids() {
  const out = [S.tube({ r0: 25.45, r1: 33.2, from: M.MCAM_BOT, to: M.MCAM_TOP })];
  for (const s of STEPS) {
    const h = Math.max(0.8, s.half - 1.5);
    out.push(S.extrude(sector(25.9, 33.2, -h, h, 4), { along: "y", from: s.lo + 0.02, to: s.hi }));
    out.push(S.extrude(sector(25.9, 33.2, 180 - h, 180 + h, 4), { along: "y", from: s.lo + 0.02, to: s.hi }));
  }
  return out;
}

// a round-ended plate between two pins in the (x, y) plane, holes at both, extruded along z
const linkPlate = (a, b, w, re, z0, z1) => S.extrude(P.bar(a, b, w, re), { along: "z", from: z0, to: z1, holes: [S.circle(a[0], a[1], 4.1, 20), S.circle(b[0], b[1], 4.1, 20)] });
function lugOutline([lu, lv], x0, r) {
  const pts = [[x0, lv - r], [lu, lv - r]];
  for (let i = 1; i < 12; i++) {
    const a = (-90 - (180 * i) / 12) * rad;
    pts.push([lu + r * Math.cos(a), lv + r * Math.sin(a)]);
  }
  pts.push([lu, lv + r], [x0, lv + r]);
  return pts;
}
// a flat bar from a to b in (x, y), half-width r
function strip(a, b, r) {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const n = [-Math.sin(ang) * r, Math.cos(ang) * r];
  return [[a[0] + n[0], a[1] + n[1]], [a[0] - n[0], a[1] - n[1]], [b[0] - n[0], b[1] - n[1]], [b[0] + n[0], b[1] + n[1]]];
}

export const K0 = M.knee(0);
export const BOT0 = M.LINK_BOT0;
export const TOP = M.LINK_TOP;

export function parts() {
  const B = M.BOLT_V;
  const out = [];
  // ---------------------------------------------------------------- the fixed strut
  out.push(S.part(1, "OUTER CYLINDER Ø76.2×4.75", [S.tube({ r0: M.OUTER_ID / 2, r1: M.OUTER_OD / 2, from: M.OUTER_BOT, to: M.OUTER_TOP })], {
    mat: "steel", angle: 45, anchor: { cut: [-35.7, 760, 0], out: { c: [0, 760, 0], r: 38.1, axis: "y" } },
  }));
  const fitting = [[15.05, M.CAP_BOT], [31.5, M.CAP_BOT], [33.3, 871.8], [33.3, 876], [30.5, 876], [30.5, 882], [33.3, 882], [33.3, 890], [44, 890], [44, 918], [0, 918], [0, 906.5], [2.5, 906.5], [2.5, 885], [15.05, 885]];
  const lug = [[-22, 918], [22, 918], [22, 950], ...K.arc(0, 950, 22, 0, 180, 12).slice(1, -1), [-22, 950]];
  out.push(S.part(2, "TOP FITTING", [
    S.lathe(fitting),
    S.extrude(lug, { along: "z", from: -20, to: 20, holes: [S.circle(0, 940, 6.6, 28)] }),
    S.bore(S.cylinder({ axis: "x", at: [904, 0], r: 5.05, from: 30, to: 44 })),
  ], { mat: "alu", angle: 135, explode: [0, 150, 0], anchor: { cut: [-38, 904, 0], out: { c: [0, 904, 0], r: 44, axis: "y" } } }));
  out.push(S.part(3, "AIR FILLER VALVE", [S.lathe([[0, 30.5], [5, 30.5], [5, 44], [8, 44], [8, 56], [4, 56], [4, 66], [4.5, 66], [4.5, 73], [0, 73]], { axis: "x", at: [904, 0] })], {
    mat: "brass", angle: 45, explode: [60, 150, 0], anchor: { cut: [50, 904, 0], out: { c: [50, 904, 0], r: 8, axis: "x" } },
  }));
  const gland = P.GLAND.map(([r, v]) => [Math.min(r, 33.3), v]);
  out.push(S.part(4, "GLAND NUT", [S.lathe(gland)], { mat: "bronze", angle: 135, explode: [0, -60, 0], anchor: { cut: [-40, 465, 0], out: { c: [0, 465, 0], r: 44, axis: "y" } } }));
  out.push(S.part(5, "CENTERING CAM, FIXED", fixedCamSolids(), { mat: "steel", angle: 30, explode: [0, -48, 0], anchor: { cut: [-29.6, 509, 0], out: { c: [0, 518, 0], r: 33.3, axis: "y" } } }));
  out.push(S.part(14, "O-RINGS + BACKUP", [
    S.lathe([[25.65, 490.1], [29.15, 490.1], [29.15, 494.6], [29.55, 494.6], [29.55, 495.9], [25.65, 495.9]], { explode: [0, -60, 0] }),
    S.tube({ r0: 31.05, r1: 33.25, from: 498.5, to: 500.5, explode: [0, -60, 0] }),
    S.tube({ r0: 30.55, r1: 33.25, from: 877.8, to: 880.2, explode: [0, 150, 0] }),
  ], { hatch: "solid", anchor: { cut: [27.4, 491.6, 0], out: { c: [0, 879, 0], r: 33.25, axis: "y" }, solid: 0 } }));
  out.push(S.part(15, "WIPER RING", [S.lathe([[25.45, 461], [28.5, 461], [28.5, 467], [26.4, 467], [25.45, 464.2]])], { mat: "rubber", explode: [0, -60, 0], anchor: { cut: [27, 464, 0], out: { c: [0, 464, 0], r: 28.5, axis: "y" } } }));
  out.push(S.part(12, "ORIFICE TUBE Ø30×3", [
    S.tube({ r0: 12, r1: 15, from: M.PLATE_TOP, to: M.VENT - 3 }),
    S.tube({ r0: 12, r1: 15, from: M.VENT + 3, to: 885 }),
  ], { mat: "alu", angle: 60, explode: [170, 60, 0], anchor: { cut: [13.5, 700, 0], out: { c: [0, 700, 0], r: 15, axis: "y" } } }));
  out.push(S.part(13, "ORIFICE PLATE Ø7.5", [S.lathe([[M.D_ORIFICE / 2, M.PLATE_BOT], [15, M.PLATE_BOT], [15, M.PLATE_TOP], [M.D_ORIFICE / 2 + 0.8, M.PLATE_TOP], [M.D_ORIFICE / 2, M.PLATE_TOP - 0.8]])], {
    mat: "bronze", angle: 45, explode: [170, 30, 0], anchor: { cut: [10, 545, 0], out: { c: [0, 545, 0], r: 15, axis: "y" } },
  }));
  // ---------------------------------------------------------------- the sliding, turning strut (c = 0, ψ = 0)
  out.push(S.part(6, "CENTERING CAM, MOVING", movingCamSolids(), { mat: "steel", angle: 135, explode: { to: [0, -230, 0] }, anchor: { cut: [-29.6, 531, 0], out: { c: [0, 531, 0], r: 33.2, axis: "y" } } }));
  out.push(S.part(7, "SNUBBER RING", [S.tube({ r0: 27.5, r1: 31.5, from: M.SNUB_BOT, to: M.SNUB_BOT + M.SNUB_T })], { hatch: "solid", explode: { to: [0, -215, 0] }, anchor: { cut: [29.5, 538, 0], out: { c: [0, 538, 0], r: 31.5, axis: "y" } } }));
  const head = [[15.5, M.TUBE_TOP], [25.45, M.TUBE_TOP], [25.45, M.HEAD_BOT], [33.2, M.HEAD_BOT], [33.2, M.HEAD_TOP - 1], [32.2, M.HEAD_TOP], [15.5, M.HEAD_TOP]];
  out.push(S.part(8, "PISTON HEAD", [S.lathe(head)], { mat: "alu", angle: 45, explode: { to: [0, -200, 0] }, anchor: { cut: [-30, 556, 0], out: { c: [0, 556, 0], r: 33.2, axis: "y" } } }));
  out.push(S.part(9, "PISTON TUBE Ø50.8×3.2", [
    S.tube({ r0: 22.225, r1: 25.4, from: M.PISTON_BOT, to: M.TUBE_TOP }),
    S.bore(S.cylinder({ axis: "x", at: [B, 0], r: 6.4, from: -25.4, to: -22.2 })),
    S.bore(S.cylinder({ axis: "x", at: [B, 0], r: 6.4, from: 22.2, to: 25.4 })),
  ], { mat: "steel", angle: 135, explode: { to: [0, -260, 0] }, anchor: { cut: [-23.8, 420, 0], out: { c: [0, 420, 0], r: 25.4, axis: "y" } } }));
  out.push(S.part(10, "LOWER PLUG", [
    S.lathe([[0, M.PLUG_BOT], [22.15, M.PLUG_BOT], [22.15, M.PLUG_TOP], [4.05, M.PLUG_TOP], [4.05, M.PLUG_TOP - 10], [0, M.PLUG_TOP - 10]]),
    S.bore(S.cylinder({ axis: "x", at: [B, 0], r: 6.4, from: -22.15, to: 22.15 })),
  ], { mat: "steel", angle: 45, explode: { to: [0, -260, 0] }, anchor: { cut: [12, 250, 0], out: { c: [0, 250, 0], r: 22.2, axis: "y" } } }));
  const pin = [[0, M.PLUG_TOP - 10], ...P.pinProfile(), [0, M.PIN_TIP]];
  out.push(S.part(11, "METERING PIN", [S.lathe(pin)], { hatch: "none", explode: { to: [0, -260, 0] }, anchor: { cut: [0, 470, 0], out: { c: [0, 470, 0], r: 4, axis: "y" } } }));
  // fork: crown boss, bridges, legs (each a plate with its axle boss), the link lug's two ears
  const leg = [[-34, 245], [34, 245], [24, 0], ...K.arc(0, 0, 24, 0, -180, 16).slice(1, -1), [-24, 0]];
  const legSolid = (z0, z1) => S.extrude(leg, { along: "z", from: z0, to: z1, holes: [S.circle(0, 0, 12.75, 36)] });
  const ear = lugOutline(M.LINK_BOT0, -35.6, 10);
  const earSolid = (z0, z1) => S.extrude(ear, { along: "z", from: z0, to: z1, holes: [S.circle(BOT0[0], BOT0[1], 4.1, 20)] });
  out.push(S.part(16, "FORK", [
    S.tube({ r0: 25.45, r1: 36, from: M.CROWN_BOT, to: M.CROWN_TOP }),
    S.bore(S.cylinder({ axis: "x", at: [B, 0], r: 6.4, from: -36, to: -25.45 })),
    S.bore(S.cylinder({ axis: "x", at: [B, 0], r: 6.4, from: 25.45, to: 36 })),
    S.box([-30, M.CROWN_BOT, 36], [30, 245, 74]),
    S.box([-30, M.CROWN_BOT, -74], [30, 245, -36]),
    legSolid(74, 90),
    legSolid(-90, -74),
    earSolid(5, 9),
    earSolid(-9, -5),
  ], { mat: "alu", angle: 135, explode: { to: [0, -380, 0] }, anchor: { cut: [34, 235, 0], out: { c: [0, 120, 82], r: 0 } } }));
  out.push(S.part(17, "FORK BOLT AN8", [
    S.lathe([[0, -45], [10, -45], [10, -36.2], [6.35, -36.2], [6.35, 36.2], [10, 36.2], [10, 44], [6, 44], [6, 48], [0, 48]], { axis: "x", at: [B, 0] }),
  ], { hatch: "none", layer: 1, explode: { to: [100, -380, 0] }, anchor: { cut: [40, B, 0], out: { c: [40, B, 0], r: 9.5, axis: "x" } } }));
  // the wheel: axle, spacer, sleeves and bolt; two hub halves; bearings; tyre and tube
  out.push(S.part(25, "AXLE Ø25.4, SPACERS, BOLT", [
    // tube, spacer and the two sleeves, as one body of revolution
    S.lathe([[5.6, -96], [12.7, -96], [12.7, -73.8], [18, -73.8], [18, -44.2], [12.7, -44.2], [12.7, -20.3], [16, -20.3], [16, 20.3], [12.7, 20.3], [12.7, 44.2], [18, 44.2], [18, 73.8], [12.7, 73.8], [12.7, 96], [5.6, 96]], { axis: "z", at: [0, 0] }),
    S.lathe([[0, -112], [10, -112], [10, -104], [5.55, -104], [5.55, 98], [10.5, 98], [10.5, 106], [5.5, 106], [5.5, 110], [0, 110]], { axis: "z", at: [0, 0], hatch: "none", own: true }),
  ], { mat: "steel", angle: 135, explode: { to: [0, -380, 170] }, anchor: { cut: [9, -12, 0], out: { c: [0, 0, 106], r: 0 } } }));
  const half = P.WHEEL_HALF.map(([y, r]) => [r, y]);
  out.push(S.part(26, "WHEEL 5.00-5, SPLIT HUB", [
    S.lathe([...half.slice(1), ...half.slice(1, -1).reverse().map(([r, y]) => [r, -y])], { axis: "z", at: [0, 0] }),
  ], { mat: "alu", angle: 45, explode: { to: [0, -380, 0] }, anchor: { cut: [-45, -2, 0], out: { c: [0, 45, 8], r: 0 } } }));
  const brg = (sg) => {
    const f = (pts) => pts.map(([y, r]) => [r, sg * y]);
    return [S.lathe(f([[20.5, 12.75], [40, 12.75], [40, 16.5], [44, 21.6], [44, 25.15], [22, 25.15], [22, 21.6], [20.5, 18.5]]), { axis: "z", at: [0, 0] })];
  };
  out.push(S.part(27, "TAPERED ROLLER BEARING", [...brg(1), ...brg(-1)], { mat: "steel", angle: 45, explode: { to: [0, -380, 0] }, anchor: { cut: [-23.4, -2, 0], out: { c: [0, 23.4, 44], r: 0 } } }));
  const tyre = P.tyreProfile(9).map(([y, r]) => [r, y]);
  out.push(S.part(28, "TYRE 5.00-5 + INNER TUBE", [
    S.lathe(tyre, { axis: "z", at: [0, 0] }),
  ], { mat: "rubber", explode: { to: [0, -380, 0] }, anchor: { cut: [-170, 0, 0], out: { c: [0, 0, 0], r: M.TYRE_R, axis: "z" } } }));
  // ---------------------------------------------------------------- steering: collar, horns, links, damper, bungees
  const collarTop = S.extrude(P.collarOutline().map(([x, y]) => [x, -y]), { along: "y", from: 505, to: M.COLLAR_TOP, holes: [S.circle(0, 0, 38.2, 72), S.circle(0, M.HORN_R, 4.1, 16), S.circle(0, -M.HORN_R, 4.1, 16)] });
  out.push(S.part(18, "STEERING COLLAR WITH HORNS", [
    S.tube({ r0: 38.2, r1: 47, from: M.COLLAR_BOT, to: 505 }),
    collarTop,
    S.extrude(lugOutline(M.LINK_TOP, -46.6, 10), { along: "z", from: -4.5, to: 4.5, holes: [S.circle(TOP[0], TOP[1], 4.1, 20)] }),
    S.cylinder({ axis: "y", at: [0, M.HORN_R], r: 4, from: 494, to: 530, hatch: "none", own: true }),
    S.cylinder({ axis: "y", at: [0, -M.HORN_R], r: 4, from: 494, to: 530, hatch: "none", own: true }),
  ], { mat: "alu", angle: 135, explode: [0, -110, 0], anchor: { cut: [-42.6, 490, 0], out: { c: [0, 512, -60], r: 0 } } }));
  out.push(S.part(19, "TORQUE LINK, UPPER", [linkPlate(TOP, K0, 7, 10, 5, 9.5), linkPlate(TOP, K0, 7, 10, -9.5, -5)], {
    mat: "alu", angle: 45, pivot: [TOP[0], TOP[1], 0], explode: [-90, -110, 0], anchor: { cut: [(TOP[0] + K0[0]) / 2, (TOP[1] + K0[1]) / 2, 9.5], out: { c: [(TOP[0] + K0[0]) / 2, (TOP[1] + K0[1]) / 2, 9.5], r: 0 } },
  }));
  out.push(S.part(20, "TORQUE LINK, LOWER", [linkPlate(K0, BOT0, 6, 9, -4.5, 4.5)], {
    mat: "alu", angle: 135, pivot: [K0[0], K0[1], 0], explode: [-90, -150, 0], anchor: { cut: [(K0[0] + BOT0[0]) / 2, (K0[1] + BOT0[1]) / 2, 0], out: { c: [(K0[0] + BOT0[0]) / 2, (K0[1] + BOT0[1]) / 2, 4.5], r: 0 } },
  }));
  const linkBolt = (p) => S.cylinder({ axis: "z", at: p, r: 4, from: -11, to: 11 });
  out.push(S.part(21, "TORQUE LINK BOLT AN5", [linkBolt(K0)], { hatch: "none", pivot: [K0[0], K0[1], 0], explode: [-90, -130, 30], anchor: { cut: [K0[0], K0[1], 0], out: { c: [K0[0], K0[1], 11], r: 0 } } }));
  out.push(S.part("21a", "TORQUE LINK BOLT AN5", [linkBolt(TOP)], { hatch: "none", pivot: [TOP[0], TOP[1], 0], explode: [-90, -110, 30] }));
  out.push(S.part("21b", "TORQUE LINK BOLT AN5", [linkBolt(BOT0)], { hatch: "none", pivot: [BOT0[0], BOT0[1], 0], explode: { to: [-90, -380, 30] } }));
  // shimmy damper on the right horn (z = −75), body pinned to the bracket; the rod follows the horn
  const DV = DAMPER_V;
  const D = P.DAMPER;
  out.push(S.part(22, "SHIMMY DAMPER Ø28", [
    S.lathe([[0, -171.5], [5, -171.5], [5, D.body0], [D.r, D.body0], [D.r, D.body1], [0, D.body1]], { axis: "x", at: [DV, Z_R] }),
    S.tube({ axis: "y", at: [D.eye, Z_R], r0: 4.1, r1: 8, from: DV - 3.5, to: DV + 3.5 }),
    S.cylinder({ axis: "x", at: [DV, Z_R], r: D.rod, from: D.body1, to: -8, hatch: "none", own: true, live: "rod" }),
    S.tube({ axis: "y", at: [0, Z_R], r0: 4.1, r1: 7.9, from: DV - 3.5, to: DV + 3.5, own: true, live: "eye" }),
  ], { mat: "steel", angle: 45, explode: [-40, 60, -80], anchor: { cut: [-100, DV, Z_R + 14], out: { c: [-100, DV, Z_R], r: 14, axis: "x" } } }));
  out.push(S.part(23, "DAMPER BRACKET", [
    S.tube({ r0: 38.2, r1: 46, from: 530, to: 555 }),
    S.extrude(P.bar([-38, -32], [D.eye, Z_R], 6, 9), { along: "y", from: 555, to: 561, holes: [S.circle(D.eye, Z_R, 4.1, 16)] }),
    S.cylinder({ axis: "y", at: [D.eye, Z_R], r: 4, from: DV - 5, to: 564, hatch: "none", own: true }),
  ], { mat: "steel", angle: 60, explode: [-40, 100, -80], anchor: { cut: [-42, 545, 0], out: { c: [0, 545, 0], r: 46, axis: "y" } } }));
  // the two bungees: horn end (eye, rod, cartridge) follows the horn; plunger follows the pedal
  const bungee = (z) => [
    S.tube({ axis: "y", at: [0, z], r0: 4.1, r1: 7.9, from: BUNGEE_V - 3.5, to: BUNGEE_V + 3.5, live: z < 0 ? "eyeR" : "eyeL" }),
    S.lathe([[0, 8], [5, 8], [5, 72], [16, 72], [16, 212], [0, 212]], { axis: "x", at: [BUNGEE_V, z], live: z < 0 ? "tubeR" : "tubeL" }),
    S.cylinder({ axis: "x", at: [BUNGEE_V, z], r: 5, from: 212, to: 300, hatch: "none", own: true, live: z < 0 ? "plR" : "plL" }),
  ];
  out.push(S.part(24, "BUNGEE SPRING CARTRIDGE", [...bungee(Z_R), ...bungee(-Z_R)], { mat: "steel", angle: 45, explode: [120, -40, 0], anchor: { cut: [150, BUNGEE_V, Z_R + 16], out: { c: [150, BUNGEE_V, Z_R], r: 16, axis: "x" } } }));
  // ---------------------------------------------------------------- the attachment: engine mount and clamp
  const plate = [[-34, 922], [44, 922], [44, 962], [-20, 962], [-34, 950]];
  out.push(S.part(29, "ENGINE MOUNT, LOWER LEGS", [
    S.extrude(plate, { along: "z", from: 20.2, to: 26, holes: [S.circle(0, 940, 6.6, 28)] }),
    S.extrude(plate, { along: "z", from: -26, to: -20.2, holes: [S.circle(0, 940, 6.6, 28)] }),
    S.cylinder({ axis: "z", at: [0, 940], r: 6.35, from: -30, to: 30, hatch: "none", own: true }),
    S.extrude(strip([44, 942], [330, 958], 11), { along: "z", from: -32, to: 32 }),
    S.extrude(strip([90, 708], [330, 905], 11), { along: "z", from: -6, to: 6 }),
  ], { mat: "steel", angle: 30, explode: [100, 120, 0], anchor: { cut: [250, 840, 0], out: { c: [250, 840, 6], r: 0 } } }));
  const earC = [[44, 690], [70, 690], ...K.arc(70, 702.5, 12.5, -90, 90, 8).slice(1, -1), [70, 715], [44, 715]];
  out.push(S.part(30, "STRUT CLAMP", [
    S.tube({ r0: 38.2, r1: 44, from: 690, to: 715 }),
    S.extrude(earC, { along: "z", from: -8, to: 8, holes: [S.circle(70, 702.5, 4.1, 16)] }),
    S.cylinder({ axis: "z", at: [70, 702.5], r: 4, from: -12, to: 12, hatch: "none", own: true }),
  ], { mat: "steel", angle: 135, explode: [60, 0, 0], anchor: { cut: [41, 702, 0], out: { c: [0, 702, 0], r: 44, axis: "y" } } }));
  return out;
}

// ---------------------------------------------------------------- the oil and the air
export function fluids() {
  return [
    S.fluid("oil-a", S.lathe([[0, nb], [33.3, nb], [33.3, M.OIL_TOP0], [0, M.OIL_TOP0]]), { stretch: { from: M.OIL_TOP0 - 1 } }),
    S.fluid("oil-b", S.lathe([[0, M.PLUG_TOP], [22.2, M.PLUG_TOP], [22.2, M.PLATE_BOT], [0, M.PLATE_BOT]]), { stretch: { from: M.PLUG_TOP + 1 } }),
  ];
}

export const centres = () => [[[0, -40, 0], [0, 975, 0]], [[0, 0, -120], [0, 0, 120]]];
export const scene = () => ({ parts: parts(), fluids: fluids(), centres: centres() });
