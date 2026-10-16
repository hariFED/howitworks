// The engine's parts in world mm: u right, v up, the crank axis at (0, 0), the cylinder axis at u = 0.
// Each function draws one part into a view and returns SVG, so the section and every detail draw
// the same geometry at their own scale. The valves are drawn in their own frame (r across the
// valve axis, s along it from the dome's centre) through a local view, so the kit's revolve and
// spring work along a tipped axis. Moving parts take their position as an argument.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;
const rad = Math.PI / 180;
const SA = Math.sin(M.VALVE_ANGLE * rad);
const CA = Math.cos(M.VALVE_ANGLE * rad);
export const CS = [0, M.SPHERE_V];
const T = M.TIP_S;
const CAM_RMAX = M.RB + M.LIFT_MAX;

// ---------------------------------------------------------------- valve frames
export function axes(key) {
  const side = M.VALVES[key].side;
  return { e: [side * SA, CA], n: [CA, -side * SA] };
}
export const W = (key, r, s) => {
  const { e, n } = axes(key);
  return [CS[0] + s * e[0] + r * n[0], CS[1] + s * e[1] + r * n[1]];
};
// A view along a valve's axis, shifted toward the chamber by a lift.
export const local = (V, key, lift = 0) => ({ ...V, p: ([r, s]) => V.p(W(key, r, s - lift)) });
// The sheet offset of a lift along a valve's axis, for a translate().
export function liftShift(V, key, lift) {
  const [x0, y0] = V.p(W(key, 0, 0));
  const [x1, y1] = V.p(W(key, 0, -lift));
  return [K.r2(x1 - x0), K.r2(y1 - y0)];
}

// The inner side of each valve (toward the plug) has r of this sign.
const inner = (key) => (key === "in" ? 1 : -1);

// Valve-train stations along the axis (mm from the dome centre)
export const BORE_R = 13.05; // tappet bore
export const TOWER = 128; // top face of each tappet tower
const TOWER_W = 17.55;
export const FLOOR = (key) => M.VALVES[key].s0 + 46; // spring pocket floor
const GUIDE_TOP = (key) => FLOOR(key) + 7;
const throatR = (key) => (M.THROAT * M.VALVES[key].d) / 2;
const insertR = (key) => M.VALVES[key].rv + 1.3;

// ---------------------------------------------------------------- ports
// Each port is a tube along a cubic Bézier from the throat to the head's side face.
const PORTS = {
  in: { exit: [-62, 182], rx: 12, run: 18 },
  ex: { exit: [62, 176], rx: 10.5, run: 18 },
};
const bez = (P, t) => {
  const m = 1 - t;
  const a = m * m * m;
  const b = 3 * m * m * t;
  const c = 3 * m * t * t;
  const d = t * t * t;
  return [a * P[0][0] + b * P[1][0] + c * P[2][0] + d * P[3][0], a * P[0][1] + b * P[1][1] + c * P[2][1] + d * P[3][1]];
};
export function portWalls(key) {
  const v = M.VALVES[key];
  const { e } = axes(key);
  const P0 = W(key, 0, v.s0 + 7);
  const P1 = [P0[0] + 11 * e[0], P0[1] + 11 * e[1]];
  const ex = PORTS[key].exit;
  const P3 = ex;
  const P2 = [ex[0] - Math.sign(ex[0]) * PORTS[key].run, ex[1]];
  const P = [P0, P1, P2, P3];
  const r0 = throatR(key);
  const left = [];
  const right = [];
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const c = bez(P, t);
    const c2 = bez(P, Math.min(1, t + 0.001));
    const c1 = bez(P, Math.max(0, t - 0.001));
    const dx = c2[0] - c1[0];
    const dy = c2[1] - c1[1];
    const L = Math.hypot(dx, dy);
    const w = r0 + (PORTS[key].rx - r0) * t;
    left.push([c[0] - (dy / L) * w, c[1] + (dx / L) * w]);
    right.push([c[0] + (dy / L) * w, c[1] - (dx / L) * w]);
  }
  // the wall nearer the plug is the roof; it crosses the valve axis, where the guide passes it
  const sideOf = (pt) => (pt[0] - CS[0]) * axes(key).n[0] + (pt[1] - CS[1]) * axes(key).n[1];
  const roofIsLeft = Math.sign(sideOf(left[0])) === inner(key);
  const roof = roofIsLeft ? left : right;
  const floor = roofIsLeft ? right : left;
  let cross = null;
  for (let i = 1; i < roof.length; i++) {
    const a = sideOf(roof[i - 1]);
    const b = sideOf(roof[i]);
    if (Math.sign(a) !== Math.sign(b)) {
      const k = a / (a - b);
      const pt = [roof[i - 1][0] + (roof[i][0] - roof[i - 1][0]) * k, roof[i - 1][1] + (roof[i][1] - roof[i - 1][1]) * k];
      const { e: ee } = axes(key);
      cross = (pt[0] - CS[0]) * ee[0] + (pt[1] - CS[1]) * ee[1];
      break;
    }
  }
  return { roof, floor, cross, exitDir: Math.sign(ex[0]) };
}
const WALLS = { in: portWalls("in"), ex: portWalls("ex") };
export const GUIDE_LOW = (key) => WALLS[key].cross - 7;

// The gas spaces of a port: its throat (down to the valve) and its tube, run past the side face.
export function portGas(key) {
  const v = M.VALVES[key];
  const rt = throatR(key);
  const { roof, floor, exitDir } = WALLS[key];
  const throat = [W(key, -rt, v.s0 + 0.6), W(key, rt, v.s0 + 0.6), W(key, rt, v.s0 + 7.2), W(key, -rt, v.s0 + 7.2)];
  const ext = (pt) => [pt[0] + exitDir * 2.5, pt[1]];
  const tube = [...roof, ext(roof[roof.length - 1]), ext(floor[floor.length - 1]), ...floor.slice().reverse()];
  return [throat, tube];
}

// ---------------------------------------------------------------- crankcase, barrel, liner, gasket
export const CC_R = 53; // crank chamber
export const MOUTH = 32.2;
export function crankcase(V) {
  const top = Math.sqrt(CC_R ** 2 - MOUTH ** 2);
  const a0 = (Math.atan2(top, MOUTH) * 180) / Math.PI;
  const pts = [
    [-46, 70], [-46, 63], [-60, 50], [-60, 0],
    ...K.arc(0, 0, 60, 180, 256.5, 12),
    [-14, -64], [14, -64],
    ...K.arc(0, 0, 60, 283.5, 360, 12),
    [60, 50], [46, 63], [46, 70], [MOUTH, 70], [MOUTH, top],
    ...K.arc(0, 0, CC_R, a0, -180 - a0, 48).slice(1, -1),
    [-MOUTH, top], [-MOUTH, 70],
  ];
  return part(1, K.cut(V, pts, { mat: "alu", angle: 45 }));
}

export function barrel(V) {
  const pts = [[32, 70], [46, 70], [46, 74], [38, 77]];
  for (let i = 0; i < 9; i++) {
    const v = 80 + i * 7.6;
    pts.push([38, v], [64, v + 0.5], [64, v + 2.5], [38, v + 3]);
  }
  pts.push([38, 146.5], [46, 148], [46, M.DECK], [32, M.DECK]);
  return part(12, K.cut(V, pts, { mat: "alu", angle: 135 }) + K.cut(V, K.flipU(pts), { mat: "alu", angle: 135 }));
}

export const LINER_LOW = 56;
export function liner(V, low = LINER_LOW, high = M.DECK) {
  const r = M.BORE / 2;
  const pts = K.rect(r, low, 32, high);
  return part(11, K.cut(V, pts, { mat: "iron", angle: 30 }) + K.cut(V, K.flipU(pts), { mat: "iron", angle: 30 }));
}

export function gasket(V) {
  const pts = K.rect(M.BORE / 2 + 0.5, M.DECK, 48, M.HEAD_FACE);
  return part(13, K.cut(V, pts, { mat: "solid" }) + K.cut(V, K.flipU(pts), { mat: "solid" }));
}

// ---------------------------------------------------------------- cylinder head
const domeArc = () => {
  const a = (Math.asin(M.BORE / 2 / M.SPHERE_R) * 180) / Math.PI;
  return K.arc(CS[0], CS[1], M.SPHERE_R, 90 - a, 90 + a, 24);
};
export const PLUG_U = 0.9;
export const WELL_R = 11;
export const PLUG_SEAT = 172.5;
export const VALLEY = 212;
const DOME_TOP = M.HEAD_FACE + M.DOME_H;

// The point on a valve's tower wall (r) at sheet height v.
function wallAt(key, r, v) {
  const { e, n } = axes(key);
  const s = (v - CS[1] - r * n[1]) / e[1];
  return W(key, r, s);
}

function headOutline() {
  const HF = M.HEAD_FACE;
  const ti = TOWER_W * inner("in");
  const te = TOWER_W * inner("ex");
  return [
    [-48, HF], [-48, 153.2], [-64, 153.8], [-64, 156], [-48, 156.6], [-48, 159.6], [-64, 160.2], [-64, 162.4], [-48, 163],
    [-48, 166], [-60, 166], [-60, 198], [-54, 198], [-54, 206], [-84, 206], [-84, 214],
    wallAt("in", -ti, 214), W("in", -ti, TOWER), W("in", ti, TOWER), wallAt("in", ti, VALLEY),
    wallAt("ex", te, VALLEY), W("ex", te, TOWER), W("ex", -te, TOWER), wallAt("ex", -te, 214),
    [84, 214], [84, 206], [54, 206], [54, 192], [60, 192], [60, 160], [48, 160],
    [48, 156.6], [64, 156], [64, 153.8], [48, 153.2], [48, HF],
    [M.BORE / 2, HF], ...domeArc(), [-M.BORE / 2, HF],
  ];
}

// Cavities cut into the head: painted paper over the hatch, then their edges drawn.
function headCavities(key) {
  const rt = throatR(key);
  const ri = insertR(key);
  const v = M.VALVES[key];
  const f = FLOOR(key);
  const bore = [W(key, -BORE_R, f), W(key, BORE_R, f), W(key, BORE_R, TOWER + 1.5), W(key, -BORE_R, TOWER + 1.5)];
  const pocket = [W(key, -ri, v.s0 - 0.6), W(key, ri, v.s0 - 0.6), W(key, ri, v.s0 + 7), W(key, -ri, v.s0 + 7)];
  return { fills: [bore, pocket, ...portGas(key)], rt, f };
}

export function head(V) {
  let fills = "";
  let edges = "";
  for (const key of ["in", "ex"]) {
    const c = headCavities(key);
    fills += c.fills.map((p) => `<path class="paper" d="${K.d(V, p)}"/>`).join("");
    const { roof, floor } = WALLS[key];
    edges += K.line(V, roof, "vis") + K.line(V, floor, "vis");
    edges += K.lines(V, [
      [W(key, -BORE_R, TOWER), W(key, -BORE_R, c.f), W(key, BORE_R, c.f), W(key, BORE_R, TOWER)],
    ]);
  }
  const well = [[PLUG_U - WELL_R, PLUG_SEAT], [PLUG_U + WELL_R, PLUG_SEAT], [PLUG_U + WELL_R, VALLEY + 1.5], [PLUG_U - WELL_R, VALLEY + 1.5]];
  const tap = [[PLUG_U - 5, DOME_TOP - 1.5], [PLUG_U + 5, DOME_TOP - 1.5], [PLUG_U + 5, PLUG_SEAT + 0.5], [PLUG_U - 5, PLUG_SEAT + 0.5]];
  fills += `<path class="paper" d="${K.d(V, well)}${K.d(V, tap)}"/>`;
  edges += K.lines(V, [
    [[PLUG_U - WELL_R, VALLEY], [PLUG_U - WELL_R, PLUG_SEAT], [PLUG_U - 5, PLUG_SEAT], [PLUG_U - 5, DOME_TOP - 0.2]],
    [[PLUG_U + WELL_R, VALLEY], [PLUG_U + WELL_R, PLUG_SEAT], [PLUG_U + 5, PLUG_SEAT], [PLUG_U + 5, DOME_TOP - 0.2]],
  ]);
  return part(14, K.cut(V, headOutline(), { mat: "alu", angle: 45 }) + fills + edges);
}

// ---------------------------------------------------------------- cam cover, manifold, exhaust pipe
export function cover(V) {
  const half = [[-84, 214], [-84, 262], [-65, 281], [-12.5 + PLUG_U, 281], [-12.5 + PLUG_U, VALLEY], [-16 + PLUG_U, VALLEY], [-16 + PLUG_U, 277], [-63.3, 277], [-80, 260.3], [-80, 214]];
  const right = [[84, 214], [84, 262], [65, 281], [12.5 + PLUG_U, 281], [12.5 + PLUG_U, VALLEY], [16 + PLUG_U, VALLEY], [16 + PLUG_U, 277], [63.3, 277], [80, 260.3], [80, 214]];
  return part(26, K.cut(V, half, { mat: "alu", angle: 135 }) + K.cut(V, right, { mat: "alu", angle: 135 }));
}

export function manifold(V) {
  const c = PORTS.in.exit[1];
  const top = [[-60, c + 12], [-60, c + 17], [-68, c + 17], [-68, c + 15.5], [-100, c + 15.5], [-100, c + 12]];
  const bottom = K.flipV(top, c);
  return part(28, K.cut(V, top, { mat: "alu", angle: 135 }) + K.cut(V, bottom, { mat: "alu", angle: 135 }) + K.breakLine(V, [-100, c - 17], [-100, c + 17]));
}

export function exhaustPipe(V) {
  const c = PORTS.ex.exit[1];
  const wall = K.rect(60, c + 12, 112, c + 13.5);
  const collar = K.rect(60, c + 13.5, 65, c + 18);
  return part(
    29,
    K.cut(V, wall, { mat: "solid" }) +
      K.cut(V, K.flipV(wall, c), { mat: "solid" }) +
      K.cut(V, collar, { mat: "steel", angle: 45 }) +
      K.cut(V, K.flipV(collar, c), { mat: "steel", angle: 45 }) +
      K.breakLine(V, [112, c - 16], [112, c + 16])
  );
}
export const EXHAUST_C = PORTS.ex.exit[1];
export const INLET_C = PORTS.in.exit[1];

// ---------------------------------------------------------------- spark plug, M10×1, 12.7 reach
export const GAP = [PLUG_U, DOME_TOP - 2.25];
export function plug(V) {
  const u = PLUG_U;
  const r = (pts) => pts.map(([a, b]) => [u + a, b]);
  const sym = (half) => [...half, ...K.flipU(half)];
  const thread = r(sym([[0, DOME_TOP - 0.3], [4.6, DOME_TOP - 0.3], [5, DOME_TOP + 0.2], [5, PLUG_SEAT], [0, PLUG_SEAT]]));
  const washer = r(K.rect(-7.8, PLUG_SEAT, 7.8, PLUG_SEAT + 1.5));
  const hex = r(sym([[0, PLUG_SEAT + 1.5], [8.6, PLUG_SEAT + 1.5], [9.24, PLUG_SEAT + 2.4], [9.24, 184.6], [8.6, 185.5], [0, 185.5]]));
  const crimp = r(K.rect(-7, 185.5, 7, 188.5));
  const ins = [[0, 188.5], [5.3, 188.5]];
  for (let i = 0; i < 5; i++) {
    const b = 191 + i * 3.6;
    ins.push([5.3, b], [5.8, b + 0.6], [5.8, b + 1.8], [5.3, b + 2.4]);
  }
  ins.push([5.3, 210], [4.4, 212], [0, 212]);
  const insulator = r(sym(ins));
  const terminal = r(sym([[0, 212], [2.9, 212], [2.9, 216], [2.2, 216.6], [2, 216.6], [2, 219.5], [1.5, 220], [0, 220]]));
  const centre = r(K.rect(-1.25, DOME_TOP - 1.8, 1.25, DOME_TOP - 0.3));
  const ground = r([[4.2, DOME_TOP - 0.3], [4.2, DOME_TOP - 3.9], [-1.6, DOME_TOP - 3.9], [-1.6, DOME_TOP - 2.7], [3, DOME_TOP - 2.7], [3, DOME_TOP - 0.3]]);
  const roots = r([[-4.2, DOME_TOP + 0.6], [-4.2, PLUG_SEAT - 0.6]]);
  const roots2 = r([[4.2, DOME_TOP + 0.6], [4.2, PLUG_SEAT - 0.6]]);
  return part(
    27,
    K.body(V, insulator) + K.body(V, terminal) + K.body(V, crimp) + K.body(V, hex) + K.body(V, washer) + K.body(V, thread) +
      K.body(V, centre) + K.body(V, ground) +
      K.lines(V, [roots, roots2], "thin") +
      K.lines(V, [r([[-4.62, PLUG_SEAT + 2.2], [-4.62, 184.8]]), r([[4.62, PLUG_SEAT + 2.2], [4.62, 184.8]])], "vis")
  );
}

// ---------------------------------------------------------------- valve train
export function insert(V, key) {
  const v = M.VALVES[key];
  const rt = throatR(key);
  const ro = insertR(key);
  const s0 = v.s0;
  const loop = [[rt, s0 + 7], [rt, s0 + 0.9 + (v.rv - rt)], [v.rv + 0.3, s0 + 0.6], [v.rv + 0.6, s0 - 0.4], [ro, s0 - 0.4], [ro, s0 + 7]];
  return part(15, K.section(local(V, key), { ...K.revolve(loop), edges: [] }, { mat: "steel", angle: 135 }));
}

export function guide(V, key) {
  const VL = local(V, key);
  const lo = GUIDE_LOW(key);
  const hi = GUIDE_TOP(key);
  const g = K.revolve([[M.STEM_R, lo], [5.25, lo + 0.5], [5.25, hi - 0.5], [M.STEM_R + 0.5, hi], [M.STEM_R, hi]]);
  const seal = K.revolve([[5.25, hi - 5], [6.6, hi - 5], [6.6, hi + 2.2], [5.6, hi + 3], [M.STEM_R, hi + 3], [M.STEM_R, hi], [M.STEM_R + 0.5, hi], [5.25, hi - 0.5]]);
  return part(16, K.section(VL, { ...g, edges: [] }, { mat: "bronze", angle: 135 })) + part(19, K.section(VL, { ...seal, edges: [] }, { mat: "rubber" }));
}

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

// The parts that ride on the valve, drawn closed; the page translates them by the lift.
export function valveSet(V, key) {
  const VL = local(V, key);
  const { rv, s0 } = M.VALVES[key];
  const valve = K.revolve(valveLoop(key)).cuts[0];
  const retainer = K.revolve([[4.6, T - 2], [11, T - 2], [11, T - 4.5], [7.6, T - 4.5], [6, T - 8], [3.9, T - 8]]);
  const collet = K.revolve([[M.STEM_R, T - 1.6], [4.55, T - 1.6], [3.92, T - 7.8], [M.STEM_R, T - 7.8]]);
  const bucket = K.revolve([[0, T], [11.8, T], [11.8, T - 19], [13, T - 19], [13, T + 4], [12.1, T + 4], [12.1, T + 3], [0, T + 3]]);
  const shim = K.revolve([[0, T + 3], [12, T + 3], [12, T + 3 + M.SHIM_T], [0, T + 3 + M.SHIM_T]]);
  return (
    part(key === "in" ? 17 : 18, K.body(VL, valve) + K.lines(VL, [[[-rv, s0 + 0.9], [rv, s0 + 0.9]], [[1.6 - rv, s0 + 2.5], [rv - 1.6, s0 + 2.5]]])) +
    part(21, K.section(VL, { ...retainer, edges: [] }, { mat: "steel", angle: 45 })) +
    part(22, K.section(VL, { ...collet, edges: [] }, { mat: "solid" })) +
    part(23, K.section(VL, { ...bucket, edges: [] }, { mat: "steel", angle: 135 }) + K.section(VL, { ...shim, edges: [] }, { mat: "steel", angle: 45 }))
  );
}

export const SPRING = { wire: 2.8, radius: 9.5, turns: 6 };
export function spring(V, key, lift) {
  return part(20, K.springSection(local(V, key), { from: FLOOR(key), to: T - 4.5 - lift, ...SPRING, axis: "v", at: 0 }));
}

// ---------------------------------------------------------------- camshafts (cut across the lobe)
export const camCentre = (key) => W(key, 0, M.CAM_S);
const PROFILE = M.camProfile(144);
export function cam(V, key, phi) {
  const [cu, cv] = camCentre(key);
  const { e } = axes(key);
  const a = Math.atan2(-e[1], -e[0]) - M.camRel(key, phi) * rad;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const pts = PROFILE.map(([x, y]) => [cu + x * c - y * s, cv + x * s + y * c]);
  const bore = K.circle(cu, cv, 4.5, 24);
  return part(key === "in" ? 24 : 25, K.cut(V, pts, { mat: "iron", angle: 60 }) + K.body(V, bore) + K.body(V, K.circle(cu - 9.5 * c, cv - 9.5 * s, 1.6, 12)));
}

// ---------------------------------------------------------------- crank train
// The flywheel web seen beyond the cut, in its own frame (crank pin straight up).
export function web(V) {
  const R = M.CRANK_R;
  const pts = [...K.arc(0, R, 17, 160, 20, 14), ...K.arc(0, 0, 48, -18, -162, 24)];
  return part(2, K.body(V, pts));
}

// Rod, crankpin, needle rollers and gudgeon pin at crank angle phi, drawn where they are.
export function rodSet(V, phi) {
  const P = M.crankPin(phi);
  const G = [0, M.pinV(phi)];
  const L = Math.hypot(G[0] - P[0], G[1] - P[1]);
  const a = [(G[0] - P[0]) / L, (G[1] - P[1]) / L];
  const b = [a[1], -a[0]];
  const to = ([x, y]) => [P[0] + x * b[0] + y * a[0], P[1] + x * b[1] + y * a[1]];
  const outline = [...K.arc(0, 0, 20, 71, -251, 40), [-4.6, M.ROD - 9.7], ...K.arc(0, M.ROD, 10.5, 245, -65, 30), [4.6, M.ROD - 9.7]].map(to);
  const rollers = [];
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * 2 * Math.PI + phi * rad;
    rollers.push(K.body(V, K.circle(P[0] + 12.5 * Math.cos(t), P[1] + 12.5 * Math.sin(t), 1.42, 12)));
  }
  return (
    part(5, K.cut(V, outline, { mat: "steel", angle: 135 })) +
    part(4, `<path class="paper" d="${K.d(V, K.circle(P[0], P[1], 14, 40))}"/>` + rollers.join("") + K.line(V, K.circle(P[0], P[1], 14, 40), "vis", true)) +
    part(3, K.cut(V, K.circle(P[0], P[1], 11, 36), { mat: "steel", angle: 45 }) + `<path class="paper" d="${K.d(V, K.circle(P[0], P[1], 3, 16))}"/>` + K.line(V, K.circle(P[0], P[1], 3, 16), "vis", true)) +
    gudgeon(V, G[1])
  );
}

export function gudgeon(V, pv) {
  return part(6, K.cut(V, K.circle(0, pv, 7, 32), { mat: "steel", angle: 30 }) + `<path class="paper" d="${K.d(V, K.circle(0, pv, 4.5, 24))}"/>` + K.line(V, K.circle(0, pv, 4.5, 24), "vis", true));
}

// The piston in its own frame (gudgeon pin centre at v = pv), cut across the pin.
const PR = 28.15;
export function pistonOutline(pv) {
  const c = pv + M.COMP_H;
  const right = [
    [25.45, c], [PR, c - 1], [PR, c - 4.5],
    [25.6, c - 4.5], [25.6, c - 5.5], [PR, c - 5.5], [PR, c - 8.5],
    [25.6, c - 8.5], [25.6, c - 9.7], [PR, c - 9.7], [PR, c - 12.5],
    [25.3, c - 12.5], [25.3, c - 14.5], [PR, c - 14.5], [PR, pv - 22],
    [25.65, pv - 22], [25.65, pv + 9], [22.5, pv + 11], [22.5, c - 8.5], ...K.arc(19.5, c - 8.5, 3, 0, 90, 4),
  ];
  return [...right, ...K.flipU(right)];
}
export function piston(V, pv) {
  const c = pv + M.COMP_H;
  const boss = [...K.arc(0, pv, 11.5, 200, 340, 12), [11.2, c - 5.6], [-11.2, c - 5.6]];
  const rings = (sx) => {
    const r0 = 25.9;
    const r1 = M.BORE / 2;
    const top = K.rect(r0, c - 5.45, r1, c - 4.55);
    const second = [[r0, c - 9.65], [r1, c - 9.65], [r1, c - 8.9], [r1 - 0.4, c - 8.55], [r0, c - 8.55]];
    const rail1 = K.rect(r0 + 0.3, c - 12.95, r1, c - 12.55);
    const rail2 = K.rect(r0 + 0.3, c - 14.45, r1, c - 14.05);
    const f = sx < 0 ? (p) => K.flipU(p) : (p) => p;
    return [
      part(8, K.cut(V, f(top), { mat: "solid" })),
      part(9, K.cut(V, f(second), { mat: "solid" })),
      part(10, K.cut(V, f(rail1), { mat: "solid" }) + K.cut(V, f(rail2), { mat: "solid" }) + K.line(V, f([[r0 + 0.5, c - 13.05], [r0 + 1.2, c - 13.95], [r0 + 1.9, c - 13.05], [r0 + 2.4, c - 13.95]]).reverse(), "thin")),
    ].join("");
  };
  return part(7, K.body(V, boss) + K.cut(V, pistonOutline(pv), { mat: "alu", angle: 60 })) + rings(1) + rings(-1);
}

// The piston at BDC, as phantom lines (the other extreme of its travel).
export function pistonPhantom(V) {
  const pv = M.pinV(180);
  const c = pv + M.COMP_H;
  return K.line(V, [[-PR, pv - 22], [-PR, c - 1], [-25.45, c], [25.45, c], [PR, c - 1], [PR, pv - 22]], "phan");
}

// ---------------------------------------------------------------- the gas in the cylinder
export function cylinderGas(phi) {
  const c = M.crown(phi);
  return [[-M.BORE / 2, c - 1.2], [M.BORE / 2, c - 1.2], [M.BORE / 2, M.HEAD_FACE], ...domeArc(), [-M.BORE / 2, M.HEAD_FACE]];
}
export const gasPath = (V, shapes) => shapes.map((s) => K.d(V, s)).join("");
export const CAM_REACH = CAM_RMAX;
