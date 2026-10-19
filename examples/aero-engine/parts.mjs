// The engine's parts in world mm, drawn into any view and returning SVG, so the plan, Section A-A
// and every detail draw the same geometry at their own scale.
//
// Two world frames:
//   PLAN (u, v): u across (+ = right bank), v along the crank (+ = forward), crank axis on v, centre
//     main bearing at v = 0. The section plane is horizontal, through all four cylinder axes.
//   A-A (u, z): a transverse section through cylinder 1 (v = 127.5), stepped to its inlet valve
//     (v = 95.5), looking aft; z is up. Drawn with x = -u, so cylinder 1 is on the left.
// A cylinder's own frame (a, c): a outward along its axis from the crank axis, c across it (v - v_k
// in plan, z in A-A). plan(V, k) and aa(V) turn any view into such a frame.
//
// Moving parts are drawn at a pose given as an argument (crank angle, lift); the page redraws them.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;
const rad = Math.PI / 180;
const HF = M.HEAD_FACE;
export const BR = M.BORE / 2;
const SR = M.SPHERE_R;
const SA = M.SPHERE_A;

// ---------------------------------------------------------------- frames
export const plan = (V, k) => ({ ...V, p: ([a, c]) => V.p([M.CYL[k].side * a, M.CYL[k].v + c]) });
export const aa = (V) => ({ ...V, p: ([u, z]) => V.p([-u, z]) });
const rot = (pts, [cx, cy], t) => pts.map(([x, y]) => [cx + (x - cx) * Math.cos(t) - (y - cy) * Math.sin(t), cy + (x - cx) * Math.sin(t) + (y - cy) * Math.cos(t)]);
const paper = (V, pts) => `<path class="paper" d="${K.d(V, pts)}"/>`;
const outline = (V, pts) => K.line(V, pts, "vis", true);
export const mirrorU = (pts) => pts.map(([u, v]) => [-u, v]).reverse();

// ---------------------------------------------------------------- cylinder barrel (9), steel, finned
export const SKIRT = 115; // barrel skirt end, inside the crankcase
export const PAD = 150; // crankcase pad face, where the base flange sits
export const BARREL_R = 70;
export const FIN_R = 85;
export function barrelLoop() {
  const L = [[BR, SKIRT], [BARREL_R, SKIRT], [BARREL_R, PAD], [95, PAD], [95, PAD + 6], [72, PAD + 9]];
  for (let i = 0; i < 10; i++) {
    const a = 166 + i * 7;
    L.push([72, a], [FIN_R, a + 1], [FIN_R, a + 3], [72, a + 4]);
  }
  L.push([BARREL_R, 233.5], [BARREL_R, HF], [BR, HF]);
  return L;
}
export const barrel = (VL) => part(9, K.section(VL, { ...K.revolve(barrelLoop(), { axis: "u" }), edges: [] }, { mat: "steel", angle: 45 }));

// ---------------------------------------------------------------- the chamber: a spherical cap over the bore
const TM = Math.asin(BR / SR);
export function domeArc(from = TM, to = -TM, n = 24) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = from + ((to - from) * i) / n;
    out.push([SA + SR * Math.cos(t), SR * Math.sin(t)]);
  }
  return out;
}

// ---------------------------------------------------------------- cylinder head (10), plan cut
export const HEAD_END = 412;
export const HEAD_IN = 234; // the head's skirt, shrunk and screwed onto the barrel
export function headPlanOutline() {
  const top = [[HEAD_IN, BARREL_R], [HEAD_IN, 78]];
  for (let a = 238; a <= 398; a += 10) top.push([a, 78], [a + 1, 98], [a + 4, 98], [a + 5, 78]);
  top.push([HEAD_END - 6, 78], [HEAD_END, 72]);
  const bottom = top.map(([a, c]) => [a, -c]).reverse();
  return [...top, ...bottom, [HF, -BARREL_R], [HF, -BR], ...domeArc(-TM, TM), [HF, BR], [HF, BARREL_R]];
}
export const headPlan = (VL) => part(10, K.cut(VL, headPlanOutline(), { mat: "alu", angle: 135 }));

// ---------------------------------------------------------------- the valve train, in A-A (cylinder 1 frame)
export const INLET_OFF = 32; // the inlet valve, pushrod and pipe sit this far aft of the cylinder axis
export const VALVE_TILT = 8 * rad; // the inlet valve's axis, above the cylinder axis
const E = [Math.cos(VALVE_TILT), Math.sin(VALVE_TILT)];
const N = [-Math.sin(VALVE_TILT), Math.cos(VALVE_TILT)];
export const CS = [SA, 0];
export const W = (r, s) => [CS[0] + s * E[0] + r * N[0], CS[1] + s * E[1] + r * N[1]];
export const RV = M.VALVES.in.d / 2;
export const S0 = Math.sqrt(SR ** 2 - RV ** 2); // the valve face, on the dome
export const TIP = 208; // valve tip, along its axis from the dome centre
export const FLOOR = 158; // spring seat
const STEM = M.STEM_R;
export const THROAT_R = (M.THROAT * M.VALVES.in.d) / 2;
// valve lift: the valve slides along its axis toward the chamber
export const liftVec = (lift) => [-E[0] * lift, -E[1] * lift];

// The rocker: a straight lever on a shaft above the valve tip. Valve arm 45, pushrod arm 31 (1.45).
export const ARM_V = 45;
export const ARM_P = ARM_V / M.ROCKER_RATIO;
export const VALVE_TIP = W(0, TIP);
export const PIVOT = [VALVE_TIP[0] + ARM_V * N[0], VALVE_TIP[1] + ARM_V * N[1]];
export const CUP = [PIVOT[0] + ARM_P * N[0], PIVOT[1] + ARM_P * N[1]];
export const rockerAngle = (lift) => -lift / ARM_V; // clockwise in (u, z): the tip pushes the valve open

// Camshaft above the crank; tappets run outward along the cylinder's direction to the pushrods.
export const CAM_C = [0, 125];
export const TAPPET_L = 52;
export const TAPPET_R = 10.5;
export const SOCKET = M.RB + TAPPET_L - 5; // pushrod ball seat, base circle
export const BOSS_END = 122; // tappet boss face, where the shroud tube starts
export const PUSH_DIR = (() => {
  const dx = CUP[0] - SOCKET;
  const dy = CUP[1] - CAM_C[1];
  const L = Math.hypot(dx, dy);
  return [dx / L, dy / L];
})();
export const PUSH_LEN = Math.hypot(CUP[0] - SOCKET, CUP[1] - CAM_C[1]);

// ---------------------------------------------------------------- intake port (a Bézier tube)
const bez = (P, t) => {
  const m = 1 - t;
  const a = m * m * m;
  const b = 3 * m * m * t;
  const c = 3 * m * t * t;
  const d = t * t * t;
  return [a * P[0][0] + b * P[1][0] + c * P[2][0] + d * P[3][0], a * P[0][1] + b * P[1][1] + c * P[2][1] + d * P[3][1]];
};
export const PORT_EXIT = [356, -100];
export function portWalls() {
  const P0 = W(0, S0 + 9);
  const P1 = [P0[0] + 18 * E[0], P0[1] + 18 * E[1]];
  const P2 = [PORT_EXIT[0] - 8, PORT_EXIT[1] + 56];
  const P = [P0, P1, P2, PORT_EXIT];
  const left = [];
  const right = [];
  const n = 30;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const c = bez(P, t);
    const c2 = bez(P, Math.min(1, t + 0.001));
    const c1 = bez(P, Math.max(0, t - 0.001));
    const dx = c2[0] - c1[0];
    const dy = c2[1] - c1[1];
    const L = Math.hypot(dx, dy);
    const w = THROAT_R + (19 - THROAT_R) * t;
    left.push([c[0] - (dy / L) * w, c[1] + (dx / L) * w]);
    right.push([c[0] + (dy / L) * w, c[1] - (dx / L) * w]);
  }
  return { roof: left, floor: right };
}
const PORT = portWalls();
// where the roof crosses the valve axis (s), so the guide stops there
const sideOf = ([x, y]) => (x - CS[0]) * N[0] + (y - CS[1]) * N[1];
const along = ([x, y]) => (x - CS[0]) * E[0] + (y - CS[1]) * E[1];
export const GUIDE_LOW = (() => {
  const r = PORT.roof;
  for (let i = 1; i < r.length; i++) {
    const a = sideOf(r[i - 1]);
    const b = sideOf(r[i]);
    if (Math.sign(a) !== Math.sign(b)) {
      const k = a / (a - b);
      return along([r[i - 1][0] + (r[i][0] - r[i - 1][0]) * k, r[i - 1][1] + (r[i][1] - r[i - 1][1]) * k]);
    }
  }
  return S0 + 30;
})();
export function portGas() {
  const throat = [W(-THROAT_R, S0 + 0.8), W(THROAT_R, S0 + 0.8), W(THROAT_R, S0 + 9.2), W(-THROAT_R, S0 + 9.2)];
  const tube = [...PORT.roof, [PORT.roof.at(-1)[0], PORT_EXIT[1] - 2.5], [PORT.floor.at(-1)[0], PORT_EXIT[1] - 2.5], ...PORT.floor.slice().reverse()];
  return [throat, tube];
}

// ---------------------------------------------------------------- spark plugs, top and bottom
// Each plug's tip sits on the dome 31° off the cylinder axis; its axis leans 10° outboard of vertical.
export const PLUG_AT = 31 * rad;
export const PLUGS = [1, -1].map((sg) => {
  const tip = [SA + SR * Math.cos(PLUG_AT), sg * SR * Math.sin(PLUG_AT)];
  const d = [Math.cos(80 * rad), sg * Math.sin(80 * rad)];
  return { sg, tip, d, n: [-d[1], d[0]] };
});
const plugPt = (P, s, r) => [P.tip[0] + s * P.d[0] + r * P.n[0], P.tip[1] + s * P.d[1] + r * P.n[1]];
const plugRect = (P, s0, s1, r0, r1) => [plugPt(P, s0, r0), plugPt(P, s0, r1), plugPt(P, s1, r1), plugPt(P, s1, r0)];
export const PLUG_THREAD = 12.7;
export function plugs(V) {
  let out = "";
  for (const P of PLUGS) {
    const sym = (s0, s1, r) => plugRect(P, s0, s1, -r, r);
    out +=
      K.body(V, sym(28, 62, 9.5)) +
      K.body(V, sym(62, 70, 7.5)) +
      K.body(V, sym(14.5, 28, 12.8)) +
      K.body(V, sym(12.7, 14.5, 12)) +
      K.body(V, sym(-0.3, 12.7, 9)) +
      K.body(V, sym(-3.2, -0.3, 1.4)) +
      K.lines(V, [[plugPt(P, 1, -7.7), plugPt(P, 11.5, -7.7)], [plugPt(P, 1, 7.7), plugPt(P, 11.5, 7.7)]], "thin") +
      K.lines(V, [[plugPt(P, 14.5, -6.4), plugPt(P, 28, -6.4)], [plugPt(P, 14.5, 6.4), plugPt(P, 28, 6.4)]], "vis") +
      K.lines(V, [32, 36, 40, 44].map((s) => [plugPt(P, s, -9.5), plugPt(P, s, 9.5)]), "thin");
  }
  return part(17, out);
}
export const plugGap = (P) => plugPt(P, -2.2, 0);

// ---------------------------------------------------------------- cylinder head (10), A-A cut
export const BOX = { a0: 314, a1: HEAD_END, top: 140, wall: 8, floor: 30 };
export function headAAOutline() {
  const top = [[HEAD_IN, BARREL_R], [HEAD_IN, 78]];
  for (let a = 238; a <= 298; a += 10) top.push([a, 78], [a + 1, 96], [a + 4, 96], [a + 5, 78]);
  top.push([308, 78], [BOX.a0, 86], [BOX.a0, BOX.top], [BOX.a1, BOX.top], [BOX.a1, -40], [396, -100]);
  const bottom = [[HEAD_IN, -BARREL_R], [HEAD_IN, -78]];
  for (let a = 238; a <= 318; a += 10) bottom.push([a, -78], [a + 1, -96], [a + 4, -96], [a + 5, -78]);
  bottom.push([328, -78], [334, -100]);
  return [...top, ...bottom.reverse(), [HF, -BARREL_R], [HF, -BR], ...domeArc(-TM, TM), [HF, BR], [HF, BARREL_R]];
}
// the rocker box and spring pocket, one cavity
export function boxCavity() {
  const hi = W(21, FLOOR);
  const lo = W(-21, FLOOR);
  const inner = BOX.a1 - BOX.wall;
  const s = (inner - CS[0] + 21 * N[0]) / E[0];
  return [hi, lo, W(-21, s), [inner, BOX.top + 0.01], [BOX.a0 + 24, BOX.top + 0.01], [BOX.a0 + 24, hi[1]]];
}
function pushBore() {
  const at = (x) => [x, CUP[1] - (CUP[0] - x) * (PUSH_DIR[1] / PUSH_DIR[0])];
  const [a0, a1] = [BOX.a0 - 0.5, BOX.a0 + 24.5];
  const p0 = at(a0);
  const p1 = at(a1);
  return [[a0, p0[1] - 7], [a1, p1[1] - 7], [a1, p1[1] + 7], [a0, p0[1] + 7]];
}
function plugHole(P) {
  const end = 130 / Math.abs(P.d[1]); // run out of the head's top or bottom face
  return [plugRect(P, -1.5, PLUG_THREAD + 0.1, -9, 9), plugRect(P, PLUG_THREAD, end, -14, 14)];
}
export function headAA(V) {
  const gas = portGas();
  const guide = [W(-STEM - 0.05, GUIDE_LOW - 2), W(STEM + 0.05, GUIDE_LOW - 2), W(STEM + 0.05, FLOOR), W(-STEM - 0.05, FLOOR)];
  const holes = [...PLUGS.flatMap(plugHole), guide, ...gas, boxCavity(), pushBore()];
  const edges =
    K.line(V, PORT.roof, "vis") +
    K.line(V, PORT.floor, "vis") +
    K.lines(V, [[guide[3], guide[0]], [guide[1], guide[2]]]) +
    K.line(V, boxCavity(), "vis", true) +
    PLUGS.map((P) => K.lines(V, [[plugPt(P, -0.2, -9), plugPt(P, PLUG_THREAD, -9), plugPt(P, PLUG_THREAD, -14), plugPt(P, 40, -14)], [plugPt(P, -0.2, 9), plugPt(P, PLUG_THREAD, 9), plugPt(P, PLUG_THREAD, 14), plugPt(P, 40, 14)]])).join("") +
    K.lines(V, [pushBore().slice(0, 2), pushBore().slice(2)]);
  return part(10, K.cut(V, headAAOutline(), { mat: "alu", angle: 135 }) + holes.map((h) => paper(V, h)).join("") + edges);
}

// valve (11): head, seat face, tapered neck, stem; and its seat (drawn with the valve, fixed)
function valveLoop() {
  const pts = [[0, S0], [RV, S0], [RV, S0 + 1.6], [RV - 3, S0 + 4.4]];
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    pts.push([STEM + (RV - 3 - STEM) * (1 - t) ** 2, S0 + 4.4 + 26 * t]);
  }
  pts.push([STEM, TIP - 0.8], [STEM - 0.8, TIP], [0, TIP]);
  return pts;
}
const valveView = (V, lift = 0) => ({ ...V, p: ([r, s]) => V.p(W(r, s - lift)) });
export function valve(V) {
  const VL = valveView(V);
  return part(11, K.body(VL, K.revolve(valveLoop()).cuts[0]) + K.lines(VL, [[[-RV, S0 + 1.6], [RV, S0 + 1.6]]], "thin"));
}
// springs (12): outer and inner, redrawn at each lift; and the retainer riding on the valve
export const SPRINGS = [{ wire: 4.2, radius: 17, turns: 5 }, { wire: 3, radius: 11.4, turns: 6 }];
const RETAINER = [[7.2, TIP - 6], [20, TIP - 6], [20, TIP - 10], [14, TIP - 10], [9.5, TIP - 15], [7.2, TIP - 15]];
export const retainer = (V) => K.section(valveView(V), { ...K.revolve(RETAINER), edges: [] }, { mat: "steel", angle: 45 });
export function springs(V, lift) {
  const VL = valveView(V);
  return SPRINGS.map((s) => K.springSection(VL, { from: FLOOR, to: TIP - 10 - lift, ...s, axis: "v", at: 0 })).join("");
}
// rocker arm (13) on its shaft, turned by the lift
export function rocker(V, lift) {
  const t = rockerAngle(lift);
  const tipEnd = [VALVE_TIP[0] - 2 * N[0], VALVE_TIP[1] - 2 * N[1]];
  const cupEnd = [CUP[0] + 6 * N[0], CUP[1] + 6 * N[1]];
  const w = 7;
  const side = (p, k) => [p[0] + k * w * E[0], p[1] + k * w * E[1]];
  const arm = [side(tipEnd, -1), side(tipEnd, 1), side(cupEnd, 1), side(cupEnd, -1)];
  const boss = K.circle(PIVOT[0], PIVOT[1], 12, 28);
  const shaft = K.circle(PIVOT[0], PIVOT[1], 6.5, 20);
  const cup = K.circle(CUP[0], CUP[1], 5.2, 16);
  const R = (pts) => rot(pts, PIVOT, t);
  return part(13, K.cut(V, R(arm), { mat: "steel", angle: 45 }) + K.cut(V, R(boss), { mat: "steel", angle: 45 }) + K.body(V, shaft) + paper(V, R(cup)) + K.line(V, R(cup), "vis", true));
}
// pushrod (14) and its shroud tube; the rod slides along its own line by the tappet lift
export function shroud(V) {
  const a0 = BOSS_END;
  const a1 = BOX.a0;
  const at = (x, off) => [x, CUP[1] - (CUP[0] - x) * (PUSH_DIR[1] / PUSH_DIR[0]) + off];
  const wall = (o0, o1) => [at(a0, o0), at(a1, o0), at(a1, o1), at(a0, o1)];
  return K.cut(V, wall(9.6, 11), { mat: "solid" }) + K.cut(V, wall(-11, -9.6), { mat: "solid" });
}
export function pushrod(V, tlift) {
  const d = PUSH_DIR;
  const n = [-d[1], d[0]];
  const s0 = [SOCKET + tlift, CAM_C[1]];
  const L = PUSH_LEN;
  const P = (s, r) => [s0[0] + s * d[0] + r * n[0], s0[1] + s * d[1] + r * n[1]];
  const rod = [P(2, -4.75), P(L - 2, -4.75), P(L, -3.5), P(L, 3.5), P(L - 2, 4.75), P(2, 4.75), P(0, 3.5), P(0, -3.5)];
  return K.body(V, rod);
}
// hydraulic tappet (15): body, plunger, check ball and socket, along +u at the cam's height
export function tappetLoops() {
  const s0 = M.RB;
  return {
    body: [[0, s0], [TAPPET_R, s0], [TAPPET_R, s0 + TAPPET_L], [7.65, s0 + TAPPET_L], [7.65, s0 + 6], [0, s0 + 6]],
    plunger: [[2.2, s0 + 11.8], [7.6, s0 + 11.8], [7.6, s0 + 36], [5, s0 + 36], [5, s0 + 15.5], [2.2, s0 + 15.5]],
    socket: [[0, s0 + 36.2], [7.6, s0 + 36.2], [7.6, s0 + 50], [5.2, s0 + 50], [3, s0 + 46.5], [0, s0 + 46]],
  };
}
export function tappet(V, tlift, fine = false) {
  const TV = { ...V, p: ([r, s]) => V.p([s + tlift, CAM_C[1] + r]) };
  const L = tappetLoops();
  const sec = (loop, mat, angle) => K.section(TV, { ...K.revolve(loop), edges: [] }, { mat, angle });
  let out = sec(L.body, "steel", 45) + sec(L.plunger, "steel", 135) + sec(L.socket, "steel", 30);
  out += K.body(TV, K.circle(0, M.RB + 9.6, 2.4, 14)); // check ball
  if (fine) out += K.lines(TV, [[[-2.2, M.RB + 11.8], [-2.2, M.RB + 9.6]], [[2.2, M.RB + 11.8], [2.2, M.RB + 9.6]]], "thin");
  return out;
}
// camshaft (16): the inlet lobe of cylinder 1, cut across; it turns at half crank speed, against it
const PROFILE = M.camProfile(120);
export function cam(V, psi) {
  const t = M.camRel("in", psi) * rad;
  const [cx, cy] = CAM_C;
  const pts = PROFILE.map(([x, y]) => [cx + x * Math.cos(t) - y * Math.sin(t), cy + x * Math.sin(t) + y * Math.cos(t)]);
  return part(16, K.cut(V, pts, { mat: "iron", angle: 60 }) + paper(V, K.circle(cx, cy, 6, 18)) + K.line(V, K.circle(cx, cy, 6, 18), "vis", true));
}
// rocker box cover (18)
export function cover(V) {
  const t = BOX.top;
  const pts = [[BOX.a0, t], [BOX.a0, t + 7], [BOX.a0 + 7, t + 14], [BOX.a1 - 7, t + 14], [BOX.a1, t + 7], [BOX.a1, t], [BOX.a1 - 6, t], [BOX.a1 - 6, t + 5], [BOX.a1 - 10, t + 9], [BOX.a0 + 10, t + 9], [BOX.a0 + 6, t + 5], [BOX.a0 + 6, t]];
  return part(18, K.cut(V, pts, { mat: "alu", angle: 45 }));
}

// ---------------------------------------------------------------- piston (6), rings (7), pin (8)
export const PR = 65.0;
export const PIN_R = 14;
export const SKIRT_BELOW = 40; // skirt end below the pin centre
export function pistonHalf(pa) {
  const C = pa + M.COMP_H;
  const S = pa - SKIRT_BELOW;
  return [
    [C, 0], [C, PR - 1.5], [C - 1.5, PR], [C - 7.5, PR], [C - 7.5, 60], [C - 10, 60], [C - 10, PR],
    [C - 14, PR], [C - 14, 60], [C - 16.5, 60], [C - 16.5, PR], [C - 21, PR], [C - 21, 60], [C - 25.5, 60], [C - 25.5, PR],
    [S, PR], [S, 60.5], [C - 30, 60.5], [C - 12, 55], [C - 12, 0],
  ];
}
const fullPiston = (pa) => {
  const h = pistonHalf(pa);
  return [...h, ...h.slice(1, -1).reverse().map(([a, c]) => [a, -c])];
};
// the ring grooves' rings (a: down from the crown)
const RINGS = [[7.6, 9.9], [14.1, 16.4], [21.1, 25.4]];
function rings(VL, pa) {
  const C = pa + M.COMP_H;
  let out = "";
  for (const sg of [1, -1]) for (const [d0, d1] of RINGS) out += K.cut(VL, K.rect(C - d1, sg * 60.3, C - d0, sg * BR), { mat: "solid" });
  return part(7, out);
}
// plan: cut through the pin axis; the bosses are cut, the pin lies in the plane (not hatched)
export function pistonPlan(VL, pa) {
  const bosses = [1, -1].flatMap((sg) => [K.rect(pa + PIN_R, sg * 17, pa + 20, sg * 60.5), K.rect(pa - 20, sg * 17, pa - PIN_R, sg * 60.5)]);
  return part(6, [fullPiston(pa), ...bosses].map((p) => K.cut(VL, p, { mat: "alu", angle: 60 })).join("")) + rings(VL, pa);
}
export function pinPlan(VL, pa) {
  return part(8, K.body(VL, K.rect(pa - PIN_R, -61.5, pa + PIN_R, 61.5)) + K.cut(VL, K.rect(pa - 9, 61.5, pa + 9, 64.3), { mat: "alu", angle: 45 }) + K.cut(VL, K.rect(pa - 9, -64.3, pa + 9, -61.5), { mat: "alu", angle: 45 }) + K.lines(VL, [[[pa - 9, -61.5], [pa - 9, 61.5]], [[pa + 9, -61.5], [pa + 9, 61.5]]], "hid"));
}
// A-A: cut across the pin; the bosses lie beyond
export function pistonAA(VL, pa) {
  const C = pa + M.COMP_H;
  const boss = [...K.arc(pa, 0, 21, 90, 270, 12), [C - 12, -21], [C - 12, 21]];
  return part(6, K.body(VL, boss) + K.cut(VL, fullPiston(pa), { mat: "alu", angle: 60 })) + rings(VL, pa);
}
export function pinAA(VL, pa) {
  return part(8, K.cut(VL, K.circle(pa, 0, PIN_R, 32), { mat: "steel", angle: 30 }) + paper(VL, K.circle(pa, 0, 9, 24)) + K.line(VL, K.circle(pa, 0, 9, 24), "vis", true));
}

// ---------------------------------------------------------------- connecting rod (5)
export const BIG_R = 40;
export const SMALL_R = 22;
export const PIN_CRANK_R = 28.6; // crankpin Ø57.2
// A-A: the rod in its swing plane, cut (hatched), from crankpin P to gudgeon G, both [a, c]
export function rodAA(V, P, G) {
  const L = Math.hypot(G[0] - P[0], G[1] - P[1]);
  const ax = [(G[0] - P[0]) / L, (G[1] - P[1]) / L];
  const bx = [-ax[1], ax[0]];
  const to = ([x, y]) => [P[0] + x * bx[0] + y * ax[0], P[1] + x * bx[1] + y * ax[1]];
  const outline = [...K.arc(0, 0, BIG_R, 68, -248, 40), [-9.5, L - 17], ...K.arc(0, L, SMALL_R, 245, -65, 28), [9.5, L - 17]].map(to);
  const holes = [K.circle(0, 0, PIN_CRANK_R + 0.2, 40), K.circle(0, L, PIN_R + 0.2, 30)].map((c) => c.map(to));
  const split = [[-BIG_R, 0], [BIG_R, 0]].map(to);
  const bolts = [[[-31, -14], [-31, 14]], [[31, -14], [31, 14]]].map((l) => l.map(to));
  return part(5, K.cut(V, outline, { mat: "steel", angle: 135 }) + holes.map((h) => paper(V, h) + K.line(V, h, "vis", true)).join("") + K.lines(V, [split], "thin") + K.lines(V, bolts, "hid"));
}
// plan: the rod seen from above, foreshortened (the crank pin swings it out of the plane)
export function rodPlan(VL, psi) {
  const ap = M.CRANK_R * Math.cos(psi * rad);
  const ag = M.pinA(psi);
  const pts = [[ap - BIG_R, -16], [ap + BIG_R, -16], [ap + BIG_R, -11], [ag - SMALL_R, -11], [ag - SMALL_R, -15.5], [ag + SMALL_R, -15.5], [ag + SMALL_R, 15.5], [ag - SMALL_R, 15.5], [ag - SMALL_R, 11], [ap + BIG_R, 11], [ap + BIG_R, 16], [ap - BIG_R, 16]];
  return K.body(VL, pts) + K.lines(VL, [[[ap, -16], [ap, 16]]], "thin");
}

// ---------------------------------------------------------------- crankshaft (4), plan, in view
export const MAIN_R = 30.15; // Ø60.3 journals
export const SHELL_R = 33.5;
export const MAINS = { front: [172, 229.5], centre: [-23, 23], rear: [-214.5, -172] };
export const NOSE_R = 34;
export const FLANGE = { v0: 300, v1: 314, r: 82.5, pilot: 330, pilotR: 30, bolt: 60.3 };
export const WEBS = [
  { v: [144.5, 172], ends: ["main", 1] },
  { v: [89.5, 110.5], ends: [1, 2] },
  { v: [23, 55.5], ends: [2, "main"] },
  { v: [-55.5, -23], ends: ["main", 3] },
  { v: [-110.5, -89.5], ends: [3, 4] },
  { v: [-172, -144.5], ends: [4, "main"] },
];
const WEB_R = 40;
const PIN_HALF = 17;
// a web's u-extent seen from above: the hull of discs round its two ends
function webSpan(ends, phi) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const e of ends) {
    const u = e === "main" ? 0 : M.crankPin(e, phi)[0];
    const r = e === "main" ? WEB_R : WEB_R - 4;
    lo = Math.min(lo, u - r);
    hi = Math.max(hi, u + r);
  }
  return [lo, hi];
}
export function crankPlan(V, phi) {
  let out = "";
  const rect = (u0, v0, u1, v1) => K.body(V, K.rect(u0, v0, u1, v1));
  for (const w of WEBS) {
    const [lo, hi] = webSpan(w.ends, phi);
    out += rect(lo, w.v[0], hi, w.v[1]);
  }
  for (const k of M.IDS) {
    const u = M.crankPin(k, phi)[0];
    out += rect(u - PIN_CRANK_R, M.THROW_V[k] - PIN_HALF, u + PIN_CRANK_R, M.THROW_V[k] + PIN_HALF);
  }
  for (const [v0, v1] of Object.values(MAINS)) out += rect(-MAIN_R, v0, MAIN_R, v1);
  out += rect(-NOSE_R, MAINS.front[1], NOSE_R, FLANGE.v0);
  out += K.body(V, [[-FLANGE.r, FLANGE.v0], [FLANGE.r, FLANGE.v0], [FLANGE.r, FLANGE.v1], [-FLANGE.r, FLANGE.v1]]);
  out += rect(-FLANGE.pilotR, FLANGE.v1, FLANGE.pilotR, FLANGE.pilot);
  out += K.lines(V, [-1, 1].map((sg) => [[sg * FLANGE.bolt - 7, FLANGE.v0], [sg * FLANGE.bolt - 7, FLANGE.v1]]).concat([-1, 1].map((sg) => [[sg * FLANGE.bolt + 7, FLANGE.v0], [sg * FLANGE.bolt + 7, FLANGE.v1]])), "hid");
  out += K.lines(V, [[[-20, MAINS.front[1] + 4], [-20, FLANGE.pilot]], [[20, MAINS.front[1] + 4], [20, FLANGE.pilot]]], "hid");
  out += rect(-26, -250, 26, MAINS.rear[0]);
  return part(4, out);
}
// A-A: crankpin 1 cut across; the web joining pins 1 and 2 beyond, turning
export function crankAA(V, phi) {
  const p1 = M.crankPin(1, phi);
  const p2 = M.crankPin(2, phi);
  const ang = (Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180) / Math.PI;
  const web = [...K.arc(p1[0], p1[1], WEB_R - 4, ang + 90, ang + 270, 18), ...K.arc(p2[0], p2[1], WEB_R - 4, ang - 90, ang + 90, 18)];
  return part(4, K.body(V, web) + K.cut(V, K.circle(p1[0], p1[1], PIN_CRANK_R, 40), { mat: "steel", angle: 45 }) + paper(V, K.circle(p1[0], p1[1], 9, 18)) + K.line(V, K.circle(p1[0], p1[1], 9, 18), "vis", true) + K.centerMark(V, p1, 6, 2));
}

// ---------------------------------------------------------------- crankcase halves (1, 2), plan
export const CASE = { out: 150, wall: 140, notch: 82, back: -222, front: 236, nose: 272, noseR: 60, bore: 46 };
export const HOLE_R = 70.5;
export function holeOf(v) {
  return [v - HOLE_R, v + HOLE_R];
}
// the crank chamber between two bulkheads, opened out through the side wall where a barrel passes
export function chamber(b0, b1, [h0, h1]) {
  const pts = [[0, b0]];
  if (h0 < b0) pts.push([CASE.notch, b0], [CASE.notch, h0], [CASE.out, h0]);
  else pts.push([CASE.wall, b0], [CASE.wall, h0], [CASE.out, h0]);
  if (h1 > b1) pts.push([CASE.out, h1], [CASE.notch, h1], [CASE.notch, b1]);
  else pts.push([CASE.out, h1], [CASE.wall, h1], [CASE.wall, b1]);
  pts.push([0, b1]);
  return pts;
}
export function caseHalf(V, side) {
  const cyls = M.IDS.filter((k) => M.CYL[k].side === side).map((k) => M.CYL[k].v).sort((a, b) => b - a);
  const s = (pts) => (side > 0 ? pts : mirrorU(pts));
  const outer = [[0, CASE.back], [CASE.out, CASE.back], [CASE.out, CASE.front], [CASE.noseR + 18, CASE.front], [CASE.noseR, CASE.front + 14], [CASE.noseR, CASE.nose], [0, CASE.nose]];
  const bore = [[0, CASE.back], [36, CASE.back], [36, MAINS.rear[0]], [SHELL_R, MAINS.rear[0]], [SHELL_R, MAINS.rear[1]], [0, MAINS.rear[1]]];
  const centreBore = [[0, MAINS.centre[0]], [SHELL_R, MAINS.centre[0]], [SHELL_R, MAINS.centre[1]], [0, MAINS.centre[1]]];
  const nose = [[0, MAINS.front[0]], [SHELL_R, MAINS.front[0]], [SHELL_R, MAINS.front[1]], [CASE.bore, MAINS.front[1]], [CASE.bore, CASE.nose], [0, CASE.nose]];
  const front = chamber(MAINS.centre[1], MAINS.front[0], holeOf(cyls[0]));
  const rear = chamber(MAINS.rear[1], MAINS.centre[0], holeOf(cyls[1]));
  const cav = [bore, centreBore, nose, front, rear].map(s);
  const id = side > 0 ? 1 : 2;
  return part(id, K.cut(V, s(outer), { mat: "alu", angle: side > 0 ? 45 : 135 }) + cav.map((c) => paper(V, c)).join("") + cav.map((c) => K.line(V, c.slice(1, -1), "vis")).join(""));
}
export function shellsPlan(V) {
  let out = "";
  for (const [v0, v1] of Object.values(MAINS)) for (const sg of [1, -1]) out += K.cut(V, K.rect(sg * MAIN_R, v0, sg * SHELL_R, v1), { mat: "solid" });
  return part(3, out);
}
export const SEAL = { v0: 260, v1: 270 };
export function seal(V) {
  let out = "";
  for (const sg of [1, -1]) out += K.cut(V, sg > 0 ? [[NOSE_R, SEAL.v0], [CASE.bore, SEAL.v0], [CASE.bore, SEAL.v1], [NOSE_R + 4, SEAL.v1], [NOSE_R, SEAL.v1 - 3]] : mirrorU([[NOSE_R, SEAL.v0], [CASE.bore, SEAL.v0], [CASE.bore, SEAL.v1], [NOSE_R + 4, SEAL.v1], [NOSE_R, SEAL.v1 - 3]]), { mat: "rubber", angle: 45 });
  return part(27, out);
}

// ---------------------------------------------------------------- accessory drive, plan
export const GEAR = { m: 3, z: 24, pr: 36, tip: 39, root: 32.25, v0: -244, v1: -230 };
export const MAG_U = 2 * GEAR.pr; // 1:1, the magnetos turn at crank speed
export const ACC = { v0: -222, v1: -262, half: 150, cav: [-224, -250], cavHalf: 118 };
function gearBody(V, u, id, extra = "") {
  const r = K.rect(u - GEAR.tip, GEAR.v0, u + GEAR.tip, GEAR.v1);
  return part(id, K.body(V, r) + K.lines(V, [[[u - GEAR.root, GEAR.v0], [u - GEAR.root, GEAR.v1]], [[u + GEAR.root, GEAR.v0], [u + GEAR.root, GEAR.v1]]], "thin") + K.lines(V, [[[u - GEAR.pr, GEAR.v0 - 3], [u - GEAR.pr, GEAR.v1 + 3]], [[u + GEAR.pr, GEAR.v0 - 3], [u + GEAR.pr, GEAR.v1 + 3]]], "ctr") + extra);
}
export const crankGear = (V) => gearBody(V, 0, 19);
export function magnetoGears(V) {
  let out = "";
  for (const sg of [1, -1]) {
    const u = sg * MAG_U;
    out += K.body(V, K.rect(u - 12, -264, u + 12, GEAR.v1 + 2));
    out += K.body(V, K.rect(u - GEAR.tip, GEAR.v0, u + GEAR.tip, GEAR.v1));
    out += K.lines(V, [[[u - GEAR.root, GEAR.v0], [u - GEAR.root, GEAR.v1]], [[u + GEAR.root, GEAR.v0], [u + GEAR.root, GEAR.v1]]], "thin");
    out += K.lines(V, [[[u - GEAR.pr, GEAR.v0 - 3], [u - GEAR.pr, GEAR.v1 + 3]], [[u + GEAR.pr, GEAR.v0 - 3], [u + GEAR.pr, GEAR.v1 + 3]]], "ctr");
  }
  return part(20, out);
}
export function accessoryHousing(V) {
  const outer = [[-ACC.half, ACC.v0], [ACC.half, ACC.v0], [ACC.half, ACC.v1 + 8], [ACC.half - 8, ACC.v1], [-ACC.half + 8, ACC.v1], [-ACC.half, ACC.v1 + 8]];
  const cav = K.rect(-ACC.cavHalf, ACC.cav[1], ACC.cavHalf, ACC.cav[0]);
  const bores = [K.rect(-MAG_U - 12.5, ACC.v1 - 0.5, -MAG_U + 12.5, ACC.cav[1] + 0.5), K.rect(MAG_U - 12.5, ACC.v1 - 0.5, MAG_U + 12.5, ACC.cav[1] + 0.5), K.rect(-8.5, ACC.v1 - 0.5, 8.5, ACC.cav[1] + 0.5)];
  return part(23, K.cut(V, outer, { mat: "alu", angle: 60 }) + [cav, ...bores].map((h) => paper(V, h)).join("") + K.line(V, cav, "vis", true) + K.lines(V, bores.flatMap((b) => [[b[0], b[3]], [b[1], b[2]]])));
}
export const PUMP = { v0: -262, v1: -298, half: 27 };
export function oilPump(V) {
  const body = [[-PUMP.half, PUMP.v0], [PUMP.half, PUMP.v0], [PUMP.half, PUMP.v1 + 5], [PUMP.half - 5, PUMP.v1], [-PUMP.half + 5, PUMP.v1], [-PUMP.half, PUMP.v1 + 5]];
  const pocket = K.rect(-13.2, -290, 13.2, -268);
  const gear = K.rect(-13, -289.8, 13, -268.2);
  return part(
    22,
    K.cut(V, body, { mat: "alu", angle: 45 }) + paper(V, pocket) + K.body(V, gear) + K.lines(V, [[[-11, -289.8], [-11, -268.2]], [[11, -289.8], [11, -268.2]]], "thin") + K.body(V, K.rect(-8, -268, 8, GEAR.v0)) + K.lines(V, [[[-13, -268.2], [-13, -289.8]]], "vis"),
  );
}
export const MAG = { v0: -262, v1: -372, r: 38 };
export function magnetos(V) {
  let out = "";
  for (const sg of [1, -1]) {
    const u = sg * MAG_U;
    out += K.body(V, [[u - 44, MAG.v0], [u + 44, MAG.v0], [u + 44, MAG.v0 - 6], [u - 44, MAG.v0 - 6]]);
    out += K.body(V, [[u - MAG.r, MAG.v0 - 6], [u + MAG.r, MAG.v0 - 6], [u + MAG.r, -342], [u + MAG.r - 8, -350], [u - MAG.r + 8, -350], [u - MAG.r, -342]]);
    out += K.body(V, [[u - 24, -350], [u + 24, -350], [u + 24, -366], [u + 18, MAG.v1], [u - 18, MAG.v1], [u - 24, -366]]);
    out += K.lines(V, [[[u - MAG.r, -300], [u + MAG.r, -300]], [[u - MAG.r, -306], [u + MAG.r, -306]]], "thin");
  }
  return part(21, out);
}

// ---------------------------------------------------------------- A-A: crankcase, sump, intake, carburettor
const AAC = { top: 165, out: 150, bottom: -95, camR: 28 };
export function caseAAOuter() {
  return [[0, AAC.top], [62, AAC.top], [100, 152], [BOSS_END, 140], [BOSS_END, 110], [140, 100], [AAC.out, 95], [AAC.out, AAC.bottom], [0, AAC.bottom]];
}
function camChamber(withBore) {
  const R = AAC.camR;
  const [cx, cy] = CAM_C;
  const tb = TAPPET_R + 0.05;
  const x0 = Math.sqrt(R * R - tb * tb);
  const a1 = (Math.asin(tb / R) * 180) / Math.PI;
  if (!withBore) return K.arc(cx, cy, R, 90, -90, 20);
  return [...K.arc(cx, cy, R, 90, a1, 12), [cx + x0, cy + tb], [BOSS_END + 0.5, cy + tb], [BOSS_END + 0.5, cy - tb], [cx + x0, cy - tb], ...K.arc(cx, cy, R, -a1, -90, 12)];
}
export function crankChamberAA() {
  return [[0, AAC.bottom - 0.5], [90, AAC.bottom - 0.5], [90, -85], [110, -85], [110, -HOLE_R], [AAC.out + 0.5, -HOLE_R], [AAC.out + 0.5, HOLE_R], [110, HOLE_R], [110, 88], [0, 88]];
}
export function caseAA(VA, side) {
  const s = (pts) => (side > 0 ? pts : mirrorU(pts));
  const cav = side > 0 ? [crankChamberAA(), camChamber(true)] : [crankChamberAA(), camChamber(false)];
  const id = side > 0 ? 1 : 2;
  return part(id, K.cut(VA, s(caseAAOuter()), { mat: "alu", angle: side > 0 ? 45 : 135 }) + cav.map((c) => paper(VA, s(c))).join("") + cav.map((c) => K.line(VA, s(c).slice(1, -1), "vis")).join(""));
}
export const SUMP = { top: -95, flange: -103, wall: 122, floor: -222, oil: -132 };
export const PIPE_Z = -152;
export const PIPE_R = 19;
export function sumpOuter() {
  return [[0, SUMP.top], [132, SUMP.top], [132, SUMP.flange], [SUMP.wall, -112], [SUMP.wall, -200], [100, SUMP.floor], [0, SUMP.floor]];
}
export function sumpInner() {
  return [[0, SUMP.top - 0.5], [116, SUMP.top - 0.5], [116, -198], [96, SUMP.floor + 6], [0, SUMP.floor + 6]];
}
export function oilShape() {
  return [[-116, SUMP.oil], [116, SUMP.oil], [116, -198], [96, SUMP.floor + 6], [-96, SUMP.floor + 6], [-116, -198]];
}
export function sump(VA) {
  const hole = [[SUMP.wall - 6.5, PIPE_Z - PIPE_R], [SUMP.wall + 0.5, PIPE_Z - PIPE_R], [SUMP.wall + 0.5, PIPE_Z + PIPE_R], [SUMP.wall - 6.5, PIPE_Z + PIPE_R]];
  let out = "";
  for (const sg of [1, -1]) {
    const s = (pts) => (sg > 0 ? pts : mirrorU(pts));
    out += K.cut(VA, s(sumpOuter()), { mat: "alu", angle: sg > 0 ? 135 : 45 }) + paper(VA, s(sumpInner()));
    if (sg > 0) out += paper(VA, hole);
    out += K.line(VA, s(sumpInner()).slice(1, -1), "vis");
  }
  return part(24, out);
}
// the inlet pipe of cylinder 1: from the riser in the sump (submerged in the oil), out under the barrel
// and up to the head's inlet flange. Thin walls, blacked in.
export function pipePath() {
  return [[30, PIPE_Z], [300, PIPE_Z], [330, PIPE_Z + 6], [348, PIPE_Z + 20], [PORT_EXIT[0], PIPE_Z + 40], [PORT_EXIT[0], PORT_EXIT[1] - 8]];
}
function offsetPath(path, off) {
  return path.map((p, i) => {
    const a = path[Math.max(0, i - 1)];
    const b = path[Math.min(path.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy);
    return [p[0] - (dy / L) * off, p[1] + (dx / L) * off];
  });
}
export function intakePipe(VA) {
  const P = pipePath();
  const band = (o0, o1) => [...offsetPath(P, o0), ...offsetPath(P, o1).reverse()];
  const fl = [[PORT_EXIT[0] - 30, PORT_EXIT[1] - 8], [PORT_EXIT[0] - 30, PORT_EXIT[1] - 0.05], [PORT_EXIT[0] + 30, PORT_EXIT[1] - 0.05], [PORT_EXIT[0] + 30, PORT_EXIT[1] - 8]];
  const flHole = K.rect(PORT_EXIT[0] - PIPE_R, PORT_EXIT[1] - 8.5, PORT_EXIT[0] + PIPE_R, PORT_EXIT[1] + 0.5);
  return part(25, K.cut(VA, band(PIPE_R - 2, PIPE_R), { mat: "solid" }) + K.cut(VA, band(-PIPE_R, -PIPE_R + 2), { mat: "solid" }) + K.cut(VA, fl, { mat: "alu", angle: 45 }) + paper(VA, flHole) + K.breakLine(VA, [30, PIPE_Z - PIPE_R - 3], [30, PIPE_Z + PIPE_R + 3]));
}
export const pipeGas = () => {
  const P = pipePath();
  return [...offsetPath(P, PIPE_R - 2), ...offsetPath(P, -PIPE_R + 2).reverse()];
};
export function carburettor(VA) {
  const z0 = SUMP.floor;
  const out =
    K.body(VA, [[-55, z0], [55, z0], [55, z0 - 7], [-55, z0 - 7]]) +
    K.body(VA, [[-34, z0 - 7], [34, z0 - 7], [34, z0 - 40], [-34, z0 - 40]]) +
    K.body(VA, [[-58, z0 - 40], [58, z0 - 40], [58, z0 - 74], [50, z0 - 82], [-50, z0 - 82], [-58, z0 - 74]]) +
    K.body(VA, [[-38, z0 - 82], [38, z0 - 82], [38, z0 - 100], [-38, z0 - 100]]) +
    K.lines(VA, [[[-34, z0 - 23], [34, z0 - 23]]], "thin") +
    K.body(VA, K.circle(44, z0 - 23, 6, 16)) +
    K.lines(VA, [[[-26, z0 - 7], [-26, z0 - 40]], [[26, z0 - 7], [26, z0 - 40]]], "hid");
  return part(26, out);
}

// ---------------------------------------------------------------- the gas
// one cylinder's charge between the crown and the dome, in its own frame
export function cylinderGas(psi) {
  const c = M.crown(psi);
  return [[c - 1.2, -BR], [c - 1.2, BR], [HF, BR], ...domeArc(TM, -TM, 20), [HF, -BR]];
}
export const gasPath = (V, shapes) => shapes.map((s) => K.d(V, s)).join("");
