// The four-stroke single's solids for its 3D view (four-stroke-3d.html), in the 2D sheet's own world
// mm: x = the sheet's u, y = its v, the crank axis at the origin, and the section plane through the
// cylinder and both valve axes is z = 0. Pure data built with kit/solid3d.mjs from model.mjs and
// parts.mjs (the profiles parts.mjs keeps private are rebuilt here from its exported stations).
//
// The valve axes lean 20° off the cylinder axis, and S.lathe only turns about x, y or z. So every
// solid on a valve axis is built upright, as a lathe about a vertical line through its spring seat
// (VALVE_PIVOT), and carries `tilt: key`: live3d.js turns its holder about that seat once, onto the
// axis, and slides the parts that ride on the valve along the axis by the lift (`ride: key`).
// Moving parts are built at TDC (crank angle 0), as on the sheet.

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const rad = Math.PI / 180;
const HF = M.HEAD_FACE;
const SV = M.SPHERE_V;
const SR = M.SPHERE_R;
const DOME_TOP = HF + M.DOME_H;
const BR = M.BORE / 2;
const R = M.CRANK_R;
const T = M.TIP_S;
const PU = P.PLUG_U;
const PV0 = M.pinV(0); // gudgeon pin centre at TDC
const C0 = M.crownAtTDC;

// half-depths (z) of the castings: the sheet shows their section only
export const Z = { case: 60, chamber: 27, head: 48, dome: 24, cover: 44, coverEnd: 48 };

// ---------------------------------------------------------------- valve frames
export const KEYS = ["in", "ex"];
// the turn about z that puts an upright solid onto a valve axis (inlet leans left, exhaust right)
export const TILT = { in: -M.VALVES.in.side * M.VALVE_ANGLE * rad, ex: -M.VALVES.ex.side * M.VALVE_ANGLE * rad };
// the spring seat on each axis: the pivot of every solid on that axis
export const VALVE_PIVOT = { in: P.W("in", 0, P.FLOOR("in")), ex: P.W("ex", 0, P.FLOOR("ex")) };
const E = { in: P.axes("in").e, ex: P.axes("ex").e };
// a point in a valve's own frame (r across, s along from the dome centre) in its upright build frame
export const upright = (key, r, s) => {
  const [px, py] = VALVE_PIVOT[key];
  return [px + r, py + s - P.FLOOR(key), 0];
};
// a lathe on a valve axis from an [r, s] half-profile
function axial(key, loop, o = {}) {
  const [px, py] = VALVE_PIVOT[key];
  const f = P.FLOOR(key);
  return S.lathe(loop.map(([r, s]) => [r, py + s - f]), { axis: "y", at: [px, 0], pivot: [px, py, 0], tilt: key, ...o });
}
const along = (key, d, base = [0, 0, 0]) => [base[0] + E[key][0] * d, base[1] + E[key][1] * d, base[2]];

// ---------------------------------------------------------------- the valve train's profiles (parts.mjs)
const throatR = (key) => (M.THROAT * M.VALVES[key].d) / 2;
const insertR = (key) => M.VALVES[key].rv + 1.3;
const GUIDE_TOP = (key) => P.FLOOR(key) + 7;
function valveLoop(key) {
  const { rv, s0 } = M.VALVES[key];
  const pts = [[0, s0], [rv, s0], [rv, s0 + 0.9], [rv - 1.6, s0 + 2.5]];
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    pts.push([M.STEM_R + (rv - 1.6 - M.STEM_R) * (1 - t) ** 2, s0 + 2.5 + 13.5 * t]);
  }
  pts.push([M.STEM_R, T - 0.5], [M.STEM_R - 0.5, T], [0, T]);
  return pts;
}
const insertLoop = (key) => {
  const { rv, s0 } = M.VALVES[key];
  const rt = throatR(key);
  return [[rt, s0 + 7], [rt, s0 + 0.9 + (rv - rt)], [rv + 0.3, s0 + 0.6], [rv + 0.6, s0 - 0.4], [insertR(key), s0 - 0.4], [insertR(key), s0 + 7]];
};
const guideLoop = (key) => {
  const lo = P.GUIDE_LOW(key);
  const hi = GUIDE_TOP(key);
  return [[M.STEM_R, lo], [5.25, lo + 0.5], [5.25, hi - 0.5], [M.STEM_R + 0.5, hi], [M.STEM_R, hi]];
};
const sealLoop = (key) => {
  const hi = GUIDE_TOP(key);
  return [[5.25, hi - 5], [6.6, hi - 5], [6.6, hi + 2.2], [5.6, hi + 3], [M.STEM_R, hi + 3], [M.STEM_R, hi], [M.STEM_R + 0.5, hi], [5.25, hi - 0.5]];
};
const RETAINER = [[4.6, T - 2], [11, T - 2], [11, T - 4.5], [7.6, T - 4.5], [6, T - 8], [3.9, T - 8]];
const COLLET = [[M.STEM_R, T - 1.6], [4.55, T - 1.6], [3.92, T - 7.8], [M.STEM_R, T - 7.8]];
const BUCKET = [[0, T], [11.8, T], [11.8, T - 19], [13, T - 19], [13, T + 4], [12.1, T + 4], [12.1, T + 3], [0, T + 3]];
const SHIM = [[0, T + 3], [12, T + 3], [12, T + 3 + M.SHIM_T], [0, T + 3 + M.SHIM_T]];
export const SPRING_FROM = (key) => P.FLOOR(key);
export const SPRING_TO = T - 4.5;

// ---------------------------------------------------------------- the head's section outline
const TOWER_W = 17.55;
const inner = (key) => (key === "in" ? 1 : -1);
function wallAt(key, r, v) {
  const { e, n } = P.axes(key);
  const s = (v - P.CS[1] - r * n[1]) / e[1];
  return P.W(key, r, s);
}
const domeArc = (r = SR) => {
  const a = (Math.asin(BR / SR) * 180) / Math.PI;
  return K.arc(0, SV, r, 90 - a, 90 + a, 24);
};
// parts.mjs headOutline() without its two fins a side (here they are square plates all round)
function headOutline() {
  const ti = TOWER_W * inner("in");
  const te = TOWER_W * inner("ex");
  return [
    [-48, HF], [-48, 166], [-60, 166], [-60, 198], [-54, 198], [-54, 206], [-84, 206], [-84, 214],
    wallAt("in", -ti, 214), P.W("in", -ti, P.TOWER), P.W("in", ti, P.TOWER), wallAt("in", ti, P.VALLEY),
    wallAt("ex", te, P.VALLEY), P.W("ex", te, P.TOWER), P.W("ex", -te, P.TOWER), wallAt("ex", -te, 214),
    [84, 214], [84, 206], [54, 206], [54, 192], [60, 192], [60, 160], [48, 160], [48, HF],
    [BR, HF], ...domeArc(), [-BR, HF],
  ];
}
const HEAD_FINS = [[153.5, 156.3], [159.9, 162.7]];
const BARREL_FINS = Array.from({ length: 9 }, (_, i) => 80 + i * 7.6);

// ---------------------------------------------------------------- explode (the crankcase stays)
const EP = 40; // piston and rod up
const EB = 168; // barrel and liner up, clear of the piston and its rings
const EH = 205; // head up
export const EX = {
  crank: [0, -112, 0], rod: [0, EP, 0], piston: [0, EP, 0], pin: [0, EP, 64],
  ring8: [0, EP + 24.5, 0], ring9: [0, EP + 22, 0], ring10: [0, EP + 19.5, 0],
  liner: [0, EB, 0], barrel: [0, EB, 0], gasket: [0, EB + 22, 0], head: [0, EH, 0],
  cams: [0, EH + 118, 0], cover: [0, EH + 190, 0], plug: [0, EH + 52, 0],
  manifold: [-46, EH, 0], pipe: [52, EH, 0],
};
// valve-train parts slide out of the head along their own axes (on top of the head's lift)
const AX = { spring: 40, retainer: 60, collet: 68, bucket: 88, seal: 18 };

// ---------------------------------------------------------------- parts
export function parts() {
  const out = [];
  const zc = Z.chamber;
  const zo = Z.case;

  // 1 CRANKCASE: the sheet's section outline split at the mouth's top, a chamber between side walls
  const top = Math.sqrt(P.CC_R ** 2 - P.MOUTH ** 2);
  const a0 = (Math.atan2(top, P.MOUTH) * 180) / Math.PI;
  const lower = [[-60, top], [-60, 0], ...K.arc(0, 0, 60, 180, 256.5, 12), [-14, -64], [14, -64], ...K.arc(0, 0, 60, 283.5, 360, 12).slice(1), [60, top]];
  const chamberU = [...lower, [P.MOUTH, top], ...K.arc(0, 0, P.CC_R, a0, -180 - a0, 48).slice(1, -1), [-P.MOUTH, top]];
  const journalHole = [S.circle(0, 0, 12.3, 96)];
  out.push(
    S.part(1, "CRANKCASE", [
      S.extrude(chamberU, { along: "z", from: -zc, to: zc }),
      S.extrude(lower, { along: "z", from: zc, to: zo, holes: journalHole }),
      S.extrude(lower, { along: "z", from: -zo, to: -zc, holes: journalHole }),
      S.extrude(S.rrectAt(0, 0, 60, zo, 22, 6), { along: "y", from: top, to: 50, holes: [S.circle(0, 0, P.MOUTH, 144)] }),
      S.lathe([[P.MOUTH, 50], [60, 50], [46, 63], [46, 70], [P.MOUTH, 70]]),
    ], { mat: "alu", angle: 45, anchor: { cut: [-56.5, -8, 0], out: { c: [-30, -30, 0], r: 60, axis: "z" } } }),
  );

  // 2 FLYWHEEL WEBS with their main journals; 3 CRANKPIN; 4 NEEDLE CAGE: the crank, pin straight up
  const web = [...K.arc(0, R, 17, 160, 20, 14), ...K.arc(0, 0, 48, -18, -162, 24)];
  const pinHole = [S.circle(0, R, 11.05, 64)];
  out.push(
    S.part(2, "FLYWHEEL WEB, COUNTERWEIGHTED", [
      S.extrude(web, { along: "z", from: 9, to: 25, holes: pinHole }),
      S.extrude(web, { along: "z", from: -25, to: -9, holes: pinHole }),
      S.cylinder({ axis: "z", at: [0, 0], r: 12, from: 25, to: 64 }),
      S.cylinder({ axis: "z", at: [0, 0], r: 12, from: -64, to: -25 }),
    ], { mat: "steel", angle: 60, explode: EX.crank, anchor: { cut: [0, -40, -9], out: { c: [0, -40, -9] } } }),
    S.part(3, "CRANKPIN Ø22", [S.tube({ axis: "z", at: [0, R], r0: 3, r1: 11, from: -25, to: 25 })], {
      mat: "steel", angle: 45, explode: EX.crank, anchor: { cut: [5.5, R - 5.5, 0], out: { c: [0, R, 0], r: 11, axis: "z" } },
    }),
  );
  const rollers = [];
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * 2 * Math.PI;
    rollers.push(S.cylinder({ axis: "z", at: [12.5 * Math.cos(t), R + 12.5 * Math.sin(t)], r: 1.38, from: -7.4, to: 7.4 }));
  }
  rollers.push(S.tube({ axis: "z", at: [0, R], r0: 11.3, r1: 13.7, from: 7.5, to: 8.4, hatch: "solid" }));
  rollers.push(S.tube({ axis: "z", at: [0, R], r0: 11.3, r1: 13.7, from: -8.4, to: -7.5, hatch: "solid" }));
  out.push(S.part(4, "NEEDLE CAGE K 22×28×17", rollers, { explode: EX.crank, anchor: { cut: [12.5, R, 0], out: { c: [12.5, R, 0] } } }));

  // 5 CONNECTING ROD: the sheet's outline, at TDC (big end on the pin, small end straight above)
  const rod = [...K.arc(0, 0, 20, 71, -251, 40), [-4.6, M.ROD - 9.7], ...K.arc(0, M.ROD, 10.5, 245, -65, 30), [4.6, M.ROD - 9.7]].map(([x, y]) => [x, y + R]);
  out.push(
    S.part(5, "CONNECTING ROD, 98 C/C", [S.extrude(rod, { along: "z", from: -8.4, to: 8.4, holes: [S.circle(0, R, 14.05, 64), S.circle(0, R + M.ROD, 7.05, 48)] })], {
      mat: "steel", angle: 135, pivot: [0, R, 0], explode: EX.rod, anchor: { cut: [0, R + 52, 0], out: { c: [0, R + 52, 0], r: 8.4, axis: "z" } },
    }),
  );

  // 6 GUDGEON PIN, 7 PISTON (the sheet's half-section turned; pin bosses beyond the cut), 8–10 RINGS
  out.push(
    S.part(6, "GUDGEON PIN Ø14×Ø9×44", [S.tube({ axis: "z", at: [0, PV0], r0: 4.5, r1: 7, from: -22, to: 22 })], {
      mat: "steel", angle: 30, explode: EX.pin, anchor: { cut: [-5.75, PV0, 0], out: { c: [0, PV0, 22] } },
    }),
  );
  const full = P.pistonOutline(PV0);
  const half = full.slice(0, full.length / 2);
  const boss = [...K.arc(0, PV0, 11.5, 200, 340, 12), [11.2, C0 - 5.5], [-11.2, C0 - 5.5]];
  const bossHole = [S.circle(0, PV0, 7.05, 48)];
  out.push(
    S.part(7, "PISTON Ø56.5", [
      S.lathe([[0, C0], ...half, [0, C0 - 5.5]]),
      S.extrude(boss, { along: "z", from: 9, to: 24, holes: bossHole }),
      S.extrude(boss, { along: "z", from: -24, to: -9, holes: bossHole }),
    ], { mat: "alu", angle: 60, explode: EX.piston, anchor: { cut: [-16, C0 - 2.6, 0], out: { c: [0, C0 - 20, 0], r: 28.15, axis: "y" } } }),
  );
  const r0 = 25.9;
  const r1 = BR;
  out.push(
    S.part(8, "TOP RING 56.5×1.0", [S.tube({ r0, r1, from: C0 - 5.45, to: C0 - 4.55 })], {
      hatch: "solid", explode: EX.ring8, anchor: { cut: [27.1, C0 - 5, 0], out: { c: [0, C0 - 5, 0], r: r1, axis: "y" } },
    }),
    S.part(9, "SECOND RING 56.5×1.2, TAPER", [S.lathe([[r0, C0 - 9.65], [r1, C0 - 9.65], [r1, C0 - 8.9], [r1 - 0.4, C0 - 8.55], [r0, C0 - 8.55]])], {
      hatch: "solid", explode: EX.ring9, anchor: { cut: [-27.1, C0 - 9.1, 0], out: { c: [0, C0 - 9.1, 0], r: r1, axis: "y" } },
    }),
    S.part(10, "OIL RING 56.5×2.0, 3-PIECE", [S.tube({ r0: r0 + 0.3, r1, from: C0 - 12.95, to: C0 - 12.55 }), S.tube({ r0: r0 + 0.3, r1, from: C0 - 14.45, to: C0 - 14.05 })], {
      hatch: "solid", explode: EX.ring10, anchor: { cut: [27.3, C0 - 12.75, 0], out: { c: [0, C0 - 13.5, 0], r: r1, axis: "y" } },
    }),
  );

  // 11 LINER, 12 BARREL (turned core, square fins), 13 GASKET
  out.push(
    S.part(11, "CYLINDER LINER Ø56.5×Ø64", [S.tube({ r0: BR, r1: 32, from: P.LINER_LOW, to: M.DECK })], {
      mat: "iron", angle: 30, explode: EX.liner, anchor: { cut: [-30.1, 72, 0], out: { c: [0, 60, 0], r: 32, axis: "y" } },
    }),
  );
  const fins = BARREL_FINS.map((v) => S.extrude(S.rrectAt(0, 0, 64, 64, 22, 6), { along: "y", from: v + 0.25, to: v + 2.75, holes: [S.circle(0, 0, 38, 144)] }));
  out.push(
    S.part(12, "CYLINDER BARREL, FINNED", [
      S.lathe([[32, 70], [46, 70], [46, 74], [38, 77], [38, 146.5], [46, 148], [46, M.DECK], [32, M.DECK]]),
      ...fins,
    ], { mat: "alu", angle: 135, explode: EX.barrel, anchor: { cut: [-56, BARREL_FINS[5] + 1.5, 0], out: { c: [0, BARREL_FINS[5] + 1.5, 0], r: 64, axis: "box" } } }),
    S.part(13, "HEAD GASKET 0.8", [S.tube({ r0: BR + 0.5, r1: 48, from: M.DECK, to: HF })], {
      hatch: "solid", explode: EX.gasket, anchor: { cut: [40, M.DECK + 0.4, 0], out: { c: [0, M.DECK + 0.4, 0], r: 48, axis: "y" } },
    }),
  );

  // 14 CYLINDER HEAD: the section outline swept ±48, the dome closed off beyond |z| = 24, square fins
  // round it, and its passages as bores: the ports, the seat pockets and throats, the guide holes, the
  // tappet bores (their mouths on the tower tops), the plug well and its tapping
  const zh = Z.head;
  const dome = [[BR, HF], ...domeArc(), [-BR, HF]];
  const headSolids = [
    S.extrude(headOutline(), { along: "z", from: -zh, to: zh }),
    S.extrude(dome, { along: "z", from: Z.dome, to: zh }),
    S.extrude(dome, { along: "z", from: -zh, to: -Z.dome }),
    S.extrude(S.rrectAt(0, 0, 64, 64, 22, 6), { along: "y", from: HEAD_FINS[0][0], to: HEAD_FINS[0][1], holes: [[[-48, -zh], [48, -zh], [48, zh], [-48, zh]]] }),
    S.extrude(S.rrectAt(0, 0, 64, 64, 22, 6), { along: "y", from: HEAD_FINS[1][0], to: HEAD_FINS[1][1], holes: [[[-48, -zh], [60, -zh], [60, zh], [-48, zh]]] }),
  ];
  for (const key of KEYS) {
    const { s0 } = M.VALVES[key];
    const rt = throatR(key);
    const ri = insertR(key);
    headSolids.push(
      S.bore(S.extrude(P.portGas(key)[1], { along: "z", from: -rt, to: rt })),
      S.bore(axial(key, [[0, s0 - 0.6], [ri, s0 - 0.6], [ri, s0 + 7], [0, s0 + 7]])),
      S.bore(axial(key, [[0, s0 + 0.6], [rt, s0 + 0.6], [rt, s0 + 7.2], [0, s0 + 7.2]])),
      S.bore(axial(key, [[0, P.GUIDE_LOW(key)], [5.3, P.GUIDE_LOW(key)], [5.3, P.FLOOR(key)], [0, P.FLOOR(key)]])),
      S.bore(axial(key, [[0, P.FLOOR(key)], [P.BORE_R, P.FLOOR(key)], [P.BORE_R, P.TOWER + 1.5], [0, P.TOWER + 1.5]])),
      S.disc(upright(key, 0, P.TOWER + 0.03), P.BORE_R, { normal: "y", role: "mouth", pivot: [...VALVE_PIVOT[key], 0], tilt: key }),
    );
  }
  headSolids.push(
    S.bore(S.lathe([[0, P.PLUG_SEAT], [P.WELL_R, P.PLUG_SEAT], [P.WELL_R, P.VALLEY + 1.5], [0, P.VALLEY + 1.5]], { at: [PU, 0] })),
    S.bore(S.lathe([[0, DOME_TOP - 1.5], [5.02, DOME_TOP - 1.5], [5.02, P.PLUG_SEAT + 0.5], [0, P.PLUG_SEAT + 0.5]], { at: [PU, 0] })),
    S.disc([PU, P.VALLEY + 0.03, 0], P.WELL_R, { normal: "y", role: "mouth" }),
    S.disc([60.03, P.EXHAUST_C, 0], 10.4, { normal: "x", role: "mouth" }),
  );
  out.push(S.part(14, "CYLINDER HEAD, FINNED", headSolids, { mat: "alu", angle: 45, explode: EX.head, anchor: { cut: [-72, 210, 0], out: { c: [-72, 210, 0], r: zh, axis: "z" } } }));

  // 15 SEAT INSERTS, 16 GUIDES, 19 STEM SEALS (static on each axis), 17 / 18 VALVES, 20 SPRINGS,
  // 21 RETAINERS, 22 COLLETS, 23 BUCKETS + SHIMS (riding on each valve)
  const both = (fn) => KEYS.map((key) => fn(key));
  const sx = (key, d) => along(key, d);
  out.push(
    S.part(15, "VALVE SEAT INSERT", both((key) => axial(key, insertLoop(key))), {
      mat: "steel", angle: 135, explode: EX.head,
      anchor: { cut: upright("ex", -(M.VALVES.ex.rv + 0.6 + insertR("ex")) / 2 - 0.2, M.VALVES.ex.s0 + 2.5), out: { c: upright("ex", 0, M.VALVES.ex.s0 + 3) }, solid: 1 },
    }),
    S.part(16, "VALVE GUIDE Ø5.5", both((key) => axial(key, guideLoop(key))), {
      mat: "bronze", angle: 135, explode: EX.head,
      anchor: { cut: upright("in", 4, P.GUIDE_LOW("in") + 12), out: { c: upright("in", 0, P.GUIDE_LOW("in") + 12) }, solid: 0 },
    }),
    S.part(19, "VALVE STEM SEAL", both((key) => axial(key, sealLoop(key), { explode: sx(key, AX.seal) })), {
      mat: "rubber", angle: 45, explode: EX.head,
      anchor: { cut: upright("ex", -6, GUIDE_TOP("ex") + 0.6), out: { c: upright("ex", 0, GUIDE_TOP("ex")) }, solid: 1 },
    }),
  );
  for (const [id, key, name] of [[17, "in", "INLET VALVE Ø22"], [18, "ex", "EXHAUST VALVE Ø18.5"]]) {
    out.push(
      S.part(id, name, [axial(key, valveLoop(key), { ride: key })], {
        explode: EX.head, anchor: { cut: upright(key, 0, 86), out: { c: upright(key, 0, 86) }, solid: 0 },
      }),
    );
  }
  out.push(
    S.part(20, "VALVE SPRING, 6 TURNS", both((key) => {
      const [px, py] = VALVE_PIVOT[key];
      return S.helix({ axis: "y", at: [px, 0], from: py, to: py + SPRING_TO - SPRING_FROM(key), radius: P.SPRING.radius, wire: P.SPRING.wire, turns: P.SPRING.turns, pivot: [px, py, 0], tilt: key, spring: key, explode: sx(key, AX.spring) });
    }), {
      hatch: "solid", explode: EX.head,
      anchor: { cut: upright("in", 9.5, P.FLOOR("in") + 1.4 + (9 / 24) * (SPRING_TO - P.FLOOR("in") - 2.8)), out: { c: upright("in", 0, P.FLOOR("in") + 12) }, solid: 0 },
    }),
    S.part(21, "SPRING RETAINER", both((key) => axial(key, RETAINER, { ride: key, explode: sx(key, AX.retainer) })), {
      mat: "steel", angle: 45, explode: EX.head, anchor: { cut: upright("ex", 9.6, T - 3.25), out: { c: upright("ex", 0, T - 3.25) }, solid: 1 },
    }),
    S.part(22, "VALVE COLLET, PAIR", both((key) => axial(key, COLLET, { ride: key, explode: sx(key, AX.collet) })), {
      hatch: "solid", explode: EX.head, anchor: { cut: upright("in", -3.45, T - 4.8), out: { c: upright("in", 0, T - 4.8) }, solid: 0 },
    }),
    S.part(23, "BUCKET TAPPET Ø26 + SHIM", KEYS.flatMap((key) => [
      axial(key, BUCKET, { ride: key, explode: sx(key, AX.bucket) }),
      axial(key, SHIM, { ride: key, explode: sx(key, AX.bucket), hatch: ["steel", 45] }),
    ]), {
      mat: "steel", angle: 135, explode: EX.head, anchor: { cut: upright("in", -12.4, T - 9), out: { c: upright("in", 0, T - 9) }, solid: 0 },
    }),
  );

  // 24 / 25 CAMSHAFTS: the model's flat-follower lobe (nose along +x, the part turns it), hollow shaft
  const PROFILE = M.camProfile(144);
  for (const [id, key, name] of [[24, "in", "INLET CAMSHAFT"], [25, "ex", "EXHAUST CAMSHAFT"]]) {
    const [cu, cv] = P.camCentre(key);
    const lobe = PROFILE.map(([x, y]) => [cu + x, cv + y]);
    out.push(
      S.part(id, name, [
        S.extrude(lobe, { along: "z", from: -7, to: 7, holes: [S.circle(cu, cv, 4.5, 32), S.circle(cu - 9.5, cv, 1.6, 16)] }),
        S.tube({ axis: "z", at: [cu, cv], r0: 4.5, r1: 11, from: 7, to: Z.cover }),
        S.tube({ axis: "z", at: [cu, cv], r0: 4.5, r1: 11, from: -Z.cover, to: -7 }),
      ], { mat: "iron", angle: 60, pivot: [cu, cv, 0], explode: EX.cams, anchor: { cut: [cu, cv + 10.5, 0], out: { c: [cu, cv, -Z.cover / 2], r: 11, axis: "z" } } }),
    );
  }

  // 26 CAM COVER: the sheet's two shells swept along z, closed by end plates
  const cl = [[-84, 214], [-84, 262], [-65, 281], [-12.5 + PU, 281], [-12.5 + PU, P.VALLEY], [-16 + PU, P.VALLEY], [-16 + PU, 277], [-63.3, 277], [-80, 260.3], [-80, 214]];
  const cr = [[84, 214], [84, 262], [65, 281], [12.5 + PU, 281], [12.5 + PU, P.VALLEY], [16 + PU, P.VALLEY], [16 + PU, 277], [63.3, 277], [80, 260.3], [80, 214]];
  const plate = [[-84, 214], [84, 214], [84, 262], [65, 281], [-65, 281], [-84, 262]];
  out.push(
    S.part(26, "CAM COVER", [
      S.extrude(cl, { along: "z", from: -Z.cover, to: Z.cover }),
      S.extrude(cr, { along: "z", from: -Z.cover, to: Z.cover }),
      S.extrude(plate, { along: "z", from: Z.cover, to: Z.coverEnd }),
      S.extrude(plate, { along: "z", from: -Z.coverEnd, to: -Z.cover }),
    ], { mat: "alu", angle: 135, explode: EX.cover, anchor: { cut: [-82, 236, 0], out: { c: [-84, 236, 0], r: 0, axis: "z" } } }),
  );

  // 27 SPARK PLUG M10×1: shell, washer, hex, crimp, ribbed insulator, terminal, electrodes (not hatched)
  const ins = [[0, 188.5], [5.3, 188.5]];
  for (let i = 0; i < 5; i++) {
    const b = 191 + i * 3.6;
    ins.push([5.3, b], [5.8, b + 0.6], [5.8, b + 1.8], [5.3, b + 2.4]);
  }
  ins.push([5.3, 210], [4.4, 212], [0, 212]);
  const pl = (loop, o = {}) => S.lathe(loop, { at: [PU, 0], ...o });
  out.push(
    S.part(27, "SPARK PLUG M10×1, 12.7 REACH", [
      pl([[0, DOME_TOP - 0.3], [4.6, DOME_TOP - 0.3], [5, DOME_TOP + 0.2], [5, P.PLUG_SEAT], [0, P.PLUG_SEAT]]),
      pl([[0, P.PLUG_SEAT], [7.8, P.PLUG_SEAT], [7.8, P.PLUG_SEAT + 1.5], [0, P.PLUG_SEAT + 1.5]]),
      S.extrude(S.hexagon(16, PU, 0), { along: "y", from: P.PLUG_SEAT + 1.5, to: 185.5 }),
      pl([[0, 185.5], [7, 185.5], [7, 188.5], [0, 188.5]]),
      pl(ins, { own: true }),
      pl([[0, 212], [2.9, 212], [2.9, 216], [2.2, 216.6], [2, 216.6], [2, 219.5], [1.5, 220], [0, 220]], { own: true }),
      pl([[0, DOME_TOP - 1.8], [1.25, DOME_TOP - 1.8], [1.25, DOME_TOP - 0.3], [0, DOME_TOP - 0.3]]),
      S.extrude([[4.2, DOME_TOP - 0.3], [4.2, DOME_TOP - 3.9], [-1.6, DOME_TOP - 3.9], [-1.6, DOME_TOP - 2.7], [3, DOME_TOP - 2.7], [3, DOME_TOP - 0.3]].map(([a, b]) => [PU + a, b]), { along: "z", from: -1.2, to: 1.2 }),
    ], { hatch: "none", explode: EX.plug, anchor: { cut: [PU - 7, 180, 0], out: { c: [PU, 180, 0], r: 9.2, axis: "y" } } }),
  );

  // 28 INLET MANIFOLD, 29 EXHAUST PIPE
  out.push(
    S.part(28, "INLET MANIFOLD", [S.lathe([[12, -100], [15.5, -100], [15.5, -68], [17, -68], [17, -60], [12, -60]], { axis: "x", at: [P.INLET_C, 0] })], {
      mat: "alu", angle: 135, explode: EX.manifold, anchor: { cut: [-88, P.INLET_C + 13.75, 0], out: { c: [-88, P.INLET_C, 0], r: 15.5, axis: "x" } },
    }),
    S.part(29, "EXHAUST PIPE Ø27×1.5", [
      S.tube({ axis: "x", at: [P.EXHAUST_C, 0], r0: 12, r1: 13.5, from: 65, to: 112 }),
      S.lathe([[12, 60], [18, 60], [18, 65], [12, 65]], { axis: "x", at: [P.EXHAUST_C, 0], hatch: ["steel", 45], own: true }),
    ], { hatch: "solid", explode: EX.pipe, anchor: { cut: [96, P.EXHAUST_C - 12.75, 0], out: { c: [96, P.EXHAUST_C, 0], r: 13.5, axis: "x" } } }),
  );
  return out;
}

// ---------------------------------------------------------------- the gas
// The cylinder's charge at TDC (live3d.js moves its floor with the crown: offset down, top stretched
// back up), the flame (rebuilt as it grows), and the gas in each port and throat.
const IN = 0.03;
export function cylinderLoop(floor) {
  const arc = [];
  const sr = SR - IN;
  for (let i = 0; i <= 20; i++) {
    const r = (BR - IN) * (1 - i / 20);
    arc.push([r, SV + Math.sqrt(sr * sr - r * r)]);
  }
  return [[0, floor], [BR - IN, floor], ...arc];
}
// the flame: the ball of radius rf round the plug gap, inside the cylinder's gas above `floor`
export function flameLoop(rf, floor) {
  const gy = P.GAP[1];
  const sr = SR - IN;
  const y0 = Math.max(floor + IN, gy - rf);
  const y1 = Math.min(gy + rf, DOME_TOP - IN - 0.01);
  if (y1 - y0 < 0.05) return null;
  const out = [[0, y0]];
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const y = y0 + ((y1 - y0) * i) / n;
    let r = Math.min(BR - IN, Math.sqrt(Math.max(0, rf * rf - (y - gy) ** 2)));
    if (y > SV) r = Math.min(r, Math.sqrt(Math.max(0, sr * sr - (y - SV) ** 2)));
    out.push([Math.max(0.01, r), y]);
  }
  out.push([0, y1]);
  return out;
}
export const FLUIDS = ["cyl", "flame", "in-port", "in-throat", "ex-port", "ex-throat"];
export function fluids() {
  const out = [
    S.fluid("cyl", S.lathe(cylinderLoop(C0 + 0.02)), { stretch: { from: C0 + 0.5 } }),
    S.fluid("flame", S.lathe(flameLoop(4, C0 + 0.02))),
  ];
  for (const key of KEYS) {
    const { s0 } = M.VALVES[key];
    const rt = throatR(key) - IN;
    out.push(S.fluid(`${key}-port`, S.extrude(P.portGas(key)[1], { along: "z", from: -rt, to: rt })));
    out.push(S.fluid(`${key}-throat`, axial(key, [[0, s0 + 0.3], [rt, s0 + 0.3], [rt, s0 + 7.4], [0, s0 + 7.4]])));
  }
  return out;
}

// centre lines: cylinder, valve and plug axes in the plane; crank and camshaft axes along z
export const centres = () => [
  [[0, -72, 0], [0, 150, 0]],
  [[PU, 166, 0], [PU, 226, 0]],
  ...KEYS.map((key) => [[...P.W(key, 0, 47), 0], [...P.W(key, 0, 178), 0]]),
  [[0, 0, -72], [0, 0, 10]],
  ...KEYS.map((key) => [[...P.camCentre(key), -52], [...P.camCentre(key), 8]]),
];

export const scene = () => ({ parts: parts(), fluids: fluids(), centres: centres() });
