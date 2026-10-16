// The disc brake's parts, in world mm. Each function draws one part into a view and returns SVG,
// so the main views and the detail views draw the same geometry at their own scale.
//
// LEVER (plan section through the bore axis): u along the handlebar, outboard to the right; v
// forward, away from the rider. The master bore axis is u = 0, the bar axis v = 0.
// CALIPER (SECTION B-B through both piston axes): u along the wheel axle, outboard to the right;
// v radial, outward, from the piston axis (which sits R_EFF from the rotor centre). Rotor mid-plane u = 0.
// ROTOR (VIEW C, from outboard): x, y in the rotor plane, origin at the rotor centre.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;

// A cavity in a cut face: a thick edge, then paper over its inside, so overlapping holes read as
// one outline (the inner half of every edge is covered by the paper of the hole next to it).
// fills: closed polygons; edges: [points, closed] (open edges for holes that open to the outside).
export function cavity(V, fills, edges) {
  const ed = edges.map(([p, closed]) => K.d(V, p, closed)).join("");
  return `<path class="cav" d="${ed}"/>` + fills.map((p) => `<path class="paper" d="${K.d(V, p)}"/>`).join("");
}
const box = (u0, v0, u1, v1) => [K.rect(u0, v0, u1, v1), true];

// Clockwise rotation (world, v up) of a point about a centre: the lever pulling towards the bar.
export function rot([u, v], [cu, cv], th) {
  const x = u - cu;
  const y = v - cv;
  const c = Math.cos(th);
  const s = Math.sin(th);
  return [cu + x * c + y * s, cv - x * s + y * c];
}

// A strip of thickness t along an open polyline (sheet springs, too thin to hatch).
export function strip(pts, t) {
  const n = pts.length;
  const left = [];
  const right = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    let nx = -dy / l;
    let ny = dx / l;
    // mitre at inner vertices
    if (i > 0 && i < n - 1) {
      const d1 = [pts[i][0] - a[0], pts[i][1] - a[1]];
      const l1 = Math.hypot(...d1) || 1;
      const n1 = [-d1[1] / l1, d1[0] / l1];
      const cos = nx * n1[0] + ny * n1[1];
      const m = 1 / Math.max(0.5, cos);
      nx *= m;
      ny *= m;
    }
    left.push([pts[i][0] + (nx * t) / 2, pts[i][1] + (ny * t) / 2]);
    right.push([pts[i][0] - (nx * t) / 2, pts[i][1] - (ny * t) / 2]);
  }
  return [...left, ...right.reverse()];
}

// =================================================================== LEVER AND MASTER CYLINDER

const PV = 20.5; // hose port axis
const PISTON_REAR = M.PISTON_FRONT + M.PISTON_LEN;
export const BALL_V = PISTON_REAR + 0.5; // pushrod ball centre at rest
export const BARREL = [0, M.PIVOT[1]]; // barrel nut centre at rest, RP from the pivot
export const FINGER = [M.PIVOT[0] + M.RF, 65]; // the finger point, on the blade's front edge
export const BOOT_TOP = 54.5;

// The handlebar is an adjacent part: phantom lines.
export function bar(V) {
  return K.lines(V, [[[-44, 11.1], [2, 11.1]], [[-44, -11.1], [2, -11.1]]], "phan") + K.breakLine(V, [2, 11.1], [2, -11.1]);
}

export const bodyOutline = [
  [-30, 11.1], [-14.5, 11.1], [-13.5, 13], [27, 13], [29, 15], [29, 39], [10, 44], [8, 46], [7.5, 48],
  [-7.5, 48], [-8, 46], [-10, 44], [-30, 44], [-32, 42], [-32, 13], [-31, 11.1],
];
const lug = [[-30.5, 44], ...K.arc(M.PIVOT[0], M.PIVOT[1], 8.5, 180, 0, 16), [-13.5, 44]];

const boreFill = [
  [-5, M.BORE_END], [5, M.BORE_END], [5, 44.5], [5.7, 44.5], [5.7, 45.3], [5, 45.3], [5, 47.4], [5.6, 48], [5.6, 48.8],
  [-5.6, 48.8], [-5.6, 48], [-5, 47.4], [-5, 45.3], [-5.7, 45.3], [-5.7, 44.5], [-5, 44.5],
];
const boreEdge = [
  [5.6, 48], [5, 47.4], [5, 45.3], [5.7, 45.3], [5.7, 44.5], [5, 44.5], [5, M.BORE_END],
  [-5, M.BORE_END], [-5, 44.5], [-5.7, 44.5], [-5.7, 45.3], [-5, 45.3], [-5, 47.4], [-5.6, 48],
];
const resFill = [[29.6, 16], [28, 16], [28, 17], ...K.arc(10.5, 18.5, 1.5, 270, 180, 4), ...K.arc(10.5, 34.5, 1.5, 180, 90, 4), [28, 36], [28, 37], [29.6, 37]];
const resEdge = resFill.slice(0, -1).map((p, i) => (i === 0 ? [29, 16] : p)).concat([[29, 37]]);
const portBox = K.rect(4.6, M.PORT_V - M.PORT_D / 2, 9.4, M.PORT_V + M.PORT_D / 2);
const inletBox = K.rect(4.6, M.INLET_V - M.INLET_D / 2, 9.4, M.INLET_V + M.INLET_D / 2);
const outletBox = K.rect(-22, PV - 0.8, -4.4, PV + 0.8);

// The hose port, as (r, t): t is the depth from the port face, inward. Shared by both ends.
const PORT_T = { tap: 6.5, cone: 8, end: 10.2 };
const portLoop = [[4, -0.8], [4, PORT_T.tap], [2.5, PORT_T.cone], [2.5, PORT_T.end], [-2.5, PORT_T.end], [-2.5, PORT_T.cone], [-4, PORT_T.tap], [-4, -0.8]];
const masterPort = (r, t) => [-32 + t, PV + r];

export function body(V) {
  const port = portLoop.map(([r, t]) => masterPort(r, t));
  const portEdge = port.slice(0, -1).map((p, i) => (i === 0 ? masterPort(4, 0) : p)).concat([masterPort(-4, 0)]);
  return part(
    1,
    K.body(V, lug) +
      K.cut(V, bodyOutline, { mat: "alu", angle: 45 }) +
      cavity(
        V,
        [boreFill, resFill, portBox, inletBox, outletBox, port],
        [[boreEdge, false], [resEdge, false], [portBox, true], [inletBox, true], [outletBox, true], [portEdge, false]]
      )
  );
}

export function clampHalf(V) {
  const pts = [[-30, -11.1], [-14.5, -11.1], [-14.5, -13.6], [-16, -15.1], [-28.5, -15.1], [-30, -13.6]];
  return part(2, K.cut(V, pts, { mat: "alu", angle: 135 }));
}

// ---------------------------------------------------------------- reservoir

export function cap(V) {
  return part(13, K.cut(V, K.rect(29, 15, 32, 26.5), { mat: "plastic", angle: 135 }) + K.cut(V, K.rect(29, 27.5, 32, 38.5), { mat: "plastic", angle: 135 }));
}

export const bladderAir = [[29, 18.4], ...K.arc(19.8, 19.2, 0.8, 270, 180, 3), ...K.arc(19.8, 33.8, 0.8, 180, 90, 3), [29, 34.6]];
export function bladder(V) {
  const outer = [[29, 37], [28, 37], [28, 35.6], ...K.arc(19.6, 34, 1.6, 90, 180, 4), ...K.arc(19.6, 19, 1.6, 180, 270, 4), [28, 17.4], [28, 16], [29, 16]];
  const loop = [...outer, ...bladderAir];
  return part(14, `<path class="paper" d="${K.d(V, bladderAir)}"/>` + K.cut(V, loop, { mat: "rubber" }));
}

// ---------------------------------------------------------------- piston, seals, spring (drawn at rest)

export function piston(V) {
  const f = M.PISTON_FRONT;
  const r = PISTON_REAR;
  const sock = K.arc(0, BALL_V, 2.4, 180 + 12, 270, 6).map(([u, v]) => [Math.abs(u), v]).reverse();
  const loop = [
    [0, BALL_V - 2.4], [0, f], [4.9, f], [4.9, f + 0.8], [3.8, f + 0.8], [3.8, f + 3.5], [4.9, f + 3.5], [4.9, f + 11],
    [3.8, f + 11], [3.8, f + 13.3], [4.9, f + 13.3], [4.9, r], ...sock.slice(0, -1),
  ];
  return part(7, K.section(V, { ...K.revolve(loop), edges: [] }, { mat: "alu", angle: 135 }));
}

export function primaryCup(V) {
  const f = M.PISTON_FRONT;
  const lip = M.LIP;
  const loop = [[3.8, f + 3.5], [5, f + 3.5], [5, f + 2.5], [5, lip], [4.72, lip], [4.45, f + 2.1], [4.2, f + 2.1], [4.05, lip], [3.8, lip]];
  return part(8, K.section(V, { ...K.revolve(loop), edges: [] }, { mat: "rubber" }));
}

export function secondarySeal(V) {
  const f = M.PISTON_FRONT;
  const s = K.rrect(3.8, f + 11.05, 5, f + 13.25, 0.4);
  return part(9, K.cut(V, s, { mat: "rubber" }) + K.cut(V, K.flipU(s), { mat: "rubber" }));
}

export function spring(V, x) {
  return part(10, K.springSection(V, { from: M.BORE_END, to: M.PISTON_FRONT - x, radius: 3.4, wire: 0.6, turns: 5, axis: "v", at: 0 }));
}

export function circlip(V) {
  const r = K.rect(4, PISTON_REAR, 5.7, PISTON_REAR + 0.8);
  return part(11, K.cut(V, r, { mat: "solid" }) + K.cut(V, K.flipU(r), { mat: "solid" }));
}

// The dust boot: a rubber bellows from the bore mouth to the pushrod, squashed as the rod goes in.
export function boot(V, x) {
  const top = BOOT_TOP - x;
  const h = top - 49;
  const right = [
    [5.7, 48], [7.4, 48], [7.4, 49], [6.9, 49], [7.3, 49 + 0.45 * h], [3.5, top - 1.1], [3.2, top - 1.1], [3.2, top],
    [1.75, top], [1.75, top - 1.1], [2.6, top - 1.1], [6.4, 49 + 0.45 * h], [6.1, 49], [5.7, 49],
  ];
  return part(12, K.cut(V, right, { mat: "rubber" }) + K.cut(V, K.flipU(right), { mat: "rubber" }));
}

// ---------------------------------------------------------------- lever, barrel nut, pushrod (redrawn rotated)

const leverLoop = (() => {
  const [pu, pv] = M.PIVOT;
  const a0 = (Math.atan2(57.76 - 60, -2) * 180) / Math.PI; // where the slot meets the barrel hole
  return [
    [pu, pv - 7], [-16, 54.2], [-12, 56], [-2, 56], [-2, 57.76],
    ...K.arc(0, 60, 3, a0 + 360, -(a0 + 180), 14).slice(1, -1),
    [2, 57.76], [2, 56], [12, 56], [18, 57], [FINGER[0], 57], ...K.arc(FINGER[0], 61, 4, -90, 90, 8).slice(1, -1),
    FINGER, [14, 65], [4, 67], ...K.arc(pu, pv, 7, 90, 270, 14),
  ];
})();
export const leverPts = (th) => leverLoop.map((p) => rot(p, M.PIVOT, th));

export function lever(V, th) {
  return part(3, K.cut(V, leverPts(th), { mat: "alu", angle: 135 }));
}

export const barrelAt = (th) => rot(BARREL, M.PIVOT, th);
export function barrel(V, th) {
  return part(5, K.cut(V, K.circle(...barrelAt(th), 3, 28), { mat: "brass", angle: 135 }));
}

export function pivotPin(V) {
  return part(4, K.cut(V, K.circle(...M.PIVOT, 3, 28), { mat: "steel", angle: 45 }) + K.centerMark(V, M.PIVOT, 3, 3));
}

export function pushrod(V, th, x) {
  const ball = [0, BALL_V - x];
  const b = barrelAt(th);
  const dx = b[0] - ball[0];
  const dy = b[1] - ball[1];
  const l = Math.hypot(dx, dy);
  const ux = dx / l;
  const uy = dy / l;
  const at = (s, n) => [ball[0] + ux * s - uy * n, ball[1] + uy * s + ux * n];
  const r = 1.75;
  const s0 = Math.sqrt(2.4 ** 2 - r ** 2);
  const rod = [at(s0, -r), at(l + 3.4, -r), at(l + 3.9, -r + 0.5), at(l + 3.9, r - 0.5), at(l + 3.4, r), at(s0, r)];
  const thread = [[at(l - 5, -1.45), at(l + 3.6, -1.45)], [at(l - 5, 1.45), at(l + 3.6, 1.45)]];
  return part(6, K.body(V, K.circle(...ball, 2.4, 28)) + K.body(V, rod) + K.lines(V, thread, "thin"));
}

// The lever at full pull, in phantom lines (the extreme position).
export function phantomLever(V) {
  const i0 = leverLoop.findIndex(([u, v]) => u === -2 && v === 56);
  const i1 = leverLoop.findIndex(([u, v]) => u === 2 && v === 56);
  const outline = [...leverLoop.slice(0, i0 + 1), ...leverLoop.slice(i1)];
  return K.line(V, outline.map((p) => rot(p, M.PIVOT, M.THETA_MAX)), "phan", true);
}

// ---------------------------------------------------------------- hose fitting (both ends)

// Fitting parts as (r, t) loops, t the depth from the port face. toW maps (r, t) to world.
function fittingParts(V, toW, hoseFrom, ids = true) {
  const poly = (loop) => [loop.map(([r, t]) => toW(r, t)), loop.map(([r, t]) => toW(-r, t))];
  const nut = [[2.6, -6], [4.1, -6], [4.5, -5.6], [4.5, -0.4], [4.1, 0], [4.0, 0], [4.0, 4.4], [2.6, 4.4]];
  const olive = [[2.5, 4.4], [3.4, 4.4], [3.4, 7.1], [2.6, 7.9], [2.5, 7.9]];
  const hose = [[1.05, hoseFrom], [2.5, hoseFrom], [2.5, PORT_T.end], [1.05, PORT_T.end]];
  const barbs = [];
  for (let t = 3; t < 9.6; t += 1.6) barbs.push([1.05, t], [1.28, t + 1.2], [1.05, t + 1.21]);
  const insert = [[0.6, 2.6], [1.05, 2.6], ...barbs, [1.05, PORT_T.end], [0.6, PORT_T.end]];
  const thread = [[toW(3.6, 0.4), toW(3.6, 4.2)], [toW(-3.6, 0.4), toW(-3.6, 4.2)]];
  const [h1, h2] = poly(hose);
  const [i1, i2] = poly(insert);
  const [n1, n2] = poly(nut);
  const [o1, o2] = poly(olive);
  const g = (id, s) => (ids ? part(id, s) : s);
  return (
    g(19, K.cut(V, h1, { mat: "plastic", angle: 45 }) + K.cut(V, h2, { mat: "plastic", angle: 45 })) +
    g(18, K.cut(V, i1, { mat: "solid" }) + K.cut(V, i2, { mat: "solid" })) +
    g(17, K.cut(V, o1, { mat: "brass", angle: 135 }) + K.cut(V, o2, { mat: "brass", angle: 135 })) +
    g(16, K.body(V, n1) + K.body(V, n2) + K.lines(V, thread, "thin"))
  );
}

export const masterFitting = (V) => fittingParts(V, masterPort, -12);
export const HOSE_BREAK_U = -44;

// ---------------------------------------------------------------- oil, master side

export function chamberOil(x) {
  return [
    K.rect(-5, M.BORE_END, 5, M.PISTON_FRONT - x),
    outletBox,
    K.rect(-24, PV - 2.5, -21.6, PV + 2.5),
    K.rect(HOSE_BREAK_U, PV - 1.05, -21.7, PV + 1.05),
  ];
}
export const reservoirOil = [K.rect(9, 17, 28.6, 36), K.rect(4.9, M.PORT_V - M.PORT_D / 2, 9.2, M.PORT_V + M.PORT_D / 2), K.rect(4.9, M.INLET_V - M.INLET_D / 2, 9.2, M.INLET_V + M.INLET_D / 2)];

// One path for many shapes: give them all the same winding so overlaps never cancel.
const area = (pts) => pts.reduce((a, [u, v], i) => a + u * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * v, 0);
const ccw = (pts) => (area(pts) < 0 ? [...pts].reverse() : pts);
export const oilPath = (V, shapes) => shapes.map((s) => K.d(V, ccw(s))).join("");

// =================================================================== CALIPER, SECTION B-B

const RH = M.ROTOR_T / 2;
const FACE = 8.5; // the caliper halves' inner faces, either side of the slot
const TOP = 34;
export const PAD = { lining: RH + M.GAP, backing: RH + M.GAP + M.LINING, back: RH + M.GAP + M.LINING + M.BACKING };
const P_FACE = PAD.back; // piston face at rest
const P_REAR = P_FACE + 12;
const BORE_BOT = 19;
const PIN_V = 16;

// The outboard half; the inboard half is its mirror (flipU) with the hose port in its top.
const halfOutline = [[0, TOP], ...K.arc(23, TOP - 2, 2, 90, 0, 4), [25, -14], ...K.arc(23, -14, 2, 0, -90, 4), [10, -16], [FACE, -14.5], [FACE, 19.5], [0, 19.5]];

const groove = (s) => {
  // the bore with its rectangular square-seal groove and the counterbore behind
  const g = [
    [FACE - 0.4, 11], [10.3, 11], [10.3, 12.7], [12.3, 12.7], [12.3, 11], [BORE_BOT, 11], [BORE_BOT, 8], [21, 8],
    [21, -8], [BORE_BOT, -8], [BORE_BOT, -11], [12.3, -11], [12.3, -12.7], [10.3, -12.7], [10.3, -11], [FACE - 0.4, -11],
  ];
  return g.map(([u, v]) => [s * u, v]);
};

const calPort = (r, t) => [-14 + r, TOP - t];

export function caliperBodies(V) {
  const out = K.cut(V, halfOutline, { mat: "alu", angle: 135 });
  const inb = K.cut(V, K.flipU(halfOutline), { mat: "alu", angle: 45 });
  return [inb, out];
}

// All the caliper's holes, drawn once over both halves so the passages cross the split.
export function caliperHoles(V) {
  const fills = [];
  const edges = [];
  for (const s of [-1, 1]) {
    const g = groove(s);
    fills.push(g);
    edges.push([[[s * FACE, 11], ...g.slice(1, -1), [s * FACE, -11]], false]);
    const drill = K.rect(s > 0 ? 19.2 : -20.8, 7.5, s > 0 ? 20.8 : -19.2, 23.3);
    fills.push(drill);
    edges.push([drill, true]);
  }
  const cross = K.rect(-20.8, 21.7, 20.8, 23.3);
  const pocket = K.rect(0, 20.6, 0.9, 24.4);
  const pinOut = K.rect(FACE - 0.5, PIN_V - 1.6, 25.6, PIN_V + 1.6);
  const pinIn = K.rect(-16, PIN_V - 1.6, -FACE + 0.5, PIN_V + 1.6);
  const port = portLoop.map(([r, t]) => calPort(r, t));
  const portEdge = port.slice(0, -1).map((p, i) => (i === 0 ? calPort(4, 0) : p)).concat([calPort(-4, 0)]);
  const passage = K.rect(-14.8, 23, -13.2, TOP - PORT_T.end + 0.2);
  fills.push(cross, pocket, pinOut, pinIn, port, passage);
  edges.push(
    [cross, true],
    [pocket, true],
    [[[FACE, PIN_V + 1.6], [25, PIN_V + 1.6]], false],
    [[[FACE, PIN_V - 1.6], [25, PIN_V - 1.6]], false],
    [[[-FACE, PIN_V + 1.6], [-16, PIN_V + 1.6], [-16, PIN_V - 1.6], [-FACE, PIN_V - 1.6]], false],
    [portEdge, false],
    [passage, true]
  );
  return cavity(V, fills, edges);
}

export function caliper(V) {
  const [inb, out] = caliperBodies(V);
  // the holes belong to both halves; draw them in the outboard half's group after both bodies
  return part(20, inb) + part(21, out + caliperHoles(V));
}

export function rotor(V, bottom = -24) {
  return part(27, K.cut(V, K.rect(-RH, bottom, RH, 9.5), { mat: "steel", angle: 60 }));
}

export function oring(V) {
  return part(28, K.cut(V, K.rrect(0.05, 20.7, 0.85, 21.65, 0.35), { mat: "rubber" }) + K.cut(V, K.rrect(0.05, 23.35, 0.85, 24.3, 0.35), { mat: "rubber" }));
}

// Pistons, drawn at rest (outboard s = 1, inboard s = -1); the page moves them by y.
export function calPiston(V, s) {
  const loop = [[9, P_FACE], [11, P_FACE], [11, P_REAR], [0, P_REAR], [0, P_REAR - 3], [9, P_REAR - 3]];
  const rev = K.revolve(loop.map(([r, t]) => [r, t]), { axis: "u", at: 0 });
  const cuts = rev.cuts.map((c) => c.map(([u, v]) => [s * u, v]));
  return part(22, cuts.map((c) => K.cut(V, c, { mat: "plastic", angle: s > 0 ? 45 : 135 })).join(""));
}

// The square seal, sheared by d towards the rotor: its outer face stays in the groove, its bore
// face moves with the piston. Released, it springs back and pulls the piston with it.
export function sealShape(d, sign) {
  // the groove leaves 0.3 of room on the rotor side for the seal to roll into
  const a = 10.62;
  const b = 12.25;
  const r0 = 11;
  const r1 = 12.65;
  const m = (r0 + r1) / 2;
  return [
    [a - d, r0], [b - d, r0], [b - 0.75 * d, r0 + 0.4], [b - 0.3 * d, m], [b, r1], [a, r1], [a - 0.3 * d, m], [a - 0.75 * d, r0 + 0.4],
  ].map(([u, r]) => [u, sign * r]);
}
export const sealRest = (V) => K.line(V, sealShape(0, 1), "phan", true);
export function seal(V, s, d) {
  const up = sealShape(d, 1).map(([u, v]) => [s * u, v]);
  const dn = sealShape(d, -1).map(([u, v]) => [s * u, v]);
  return part(23, K.cut(V, up, { mat: "rubber" }) + K.cut(V, dn, { mat: "rubber" }));
}

export function pad(V, s) {
  const lin = K.rect(PAD.lining, -8, PAD.backing, 9);
  const back = [[PAD.backing, -10], [PAD.back, -10], [PAD.back, PIN_V - 1.6], [PAD.backing, PIN_V - 1.6]];
  const tab = K.rect(PAD.backing, PIN_V + 1.6, PAD.back, 18.6);
  const m = (pts) => pts.map(([u, v]) => [s * u, v]);
  const a = s > 0 ? [45, 135] : [135, 45];
  return part(
    24,
    K.cut(V, m(lin), { mat: "iron", angle: a[0] }) + K.cut(V, m(back), { mat: "steel", angle: a[1] }) + K.cut(V, m(tab), { mat: "steel", angle: a[1] })
  );
}

export function padSpring(V, yp) {
  const b = PAD.backing - yp - 0.25;
  const line = [[-b, 10.2], [-b, 12.5], [-2, 18.6], [2, 18.6], [b, 12.5], [b, 10.2]];
  return part(25, K.cut(V, strip(line, 0.4), { mat: "solid" }));
}

export function padPin(V) {
  const shank = [[-16, PIN_V - 1.5], [25, PIN_V - 1.5], [25, PIN_V + 1.5], [-16, PIN_V + 1.5]];
  const head = K.rrect(25, PIN_V - 2.5, 27.4, PIN_V + 2.5, 0.5);
  const thread = [[[-15.6, PIN_V - 1.2], [-10.5, PIN_V - 1.2]], [[-15.6, PIN_V + 1.2], [-10.5, PIN_V + 1.2]]];
  return part(26, K.body(V, shank) + K.body(V, head) + K.lines(V, thread, "thin") + K.line(V, K.rect(25.6, PIN_V - 1.1, 27.4, PIN_V + 1.1), "hid", true));
}

export const caliperFitting = (V, ids = false) => fittingParts(V, calPort, -12, ids);

export function caliperOil(y) {
  const out = [];
  for (const s of [-1, 1]) {
    const r = P_REAR - y;
    out.push(s > 0 ? K.rect(r, -11, BORE_BOT + 0.01, 11) : K.rect(-BORE_BOT - 0.01, -11, -r, 11));
    out.push(s > 0 ? K.rect(BORE_BOT, -8, 21, 8) : K.rect(-21, -8, -BORE_BOT, 8));
    out.push(s > 0 ? K.rect(19.2, 7.5, 20.8, 23.3) : K.rect(-20.8, 7.5, -19.2, 23.3));
  }
  out.push(K.rect(-20.8, 21.7, 20.8, 23.3), K.rect(-14.8, 23, -13.2, TOP - PORT_T.end + 0.1), K.rect(-16.5, TOP - PORT_T.end, -11.5, TOP - PORT_T.cone + 0.5));
  out.push(K.rect(-15.05, TOP - PORT_T.end - 0.05, -12.95, TOP + 12));
  return out;
}

export const CAL = { FACE, TOP, P_FACE, P_REAR, PIN_V, BORE_BOT };

// =================================================================== ROTOR, VIEW C (from outboard)

export function rotorFace(V) {
  const R = M.ROTOR_D / 2;
  let out = K.body(V, K.circle(0, 0, R, 120));
  out += K.line(V, K.circle(0, 0, 61, 96), "thin", true);
  // six swept arms between the band and the hub: the windows between them are holes
  const win = [];
  for (let i = 0; i < 6; i++) {
    const a = 90 + i * 60;
    const inner = K.arc(0, 0, 31, a + 12, a + 48, 8);
    const outer = K.arc(0, 0, 58, a + 62, a + 26, 10);
    win.push([...inner, ...outer]);
  }
  out += win.map((w) => `<path class="paper" d="${K.d(V, w)}"/><path class="vis" d="${K.d(V, w)}"/>`).join("");
  // drilled braking band, two staggered rows
  for (let i = 0; i < 48; i++) {
    const a = (((i >> 1) * 15 + (i % 2) * 7.5) * Math.PI) / 180;
    const r = i % 2 ? 75 : 67;
    out += `<path class="paper" d="${K.d(V, K.circle(r * Math.cos(a), r * Math.sin(a), 2.2, 12))}"/><path class="vis" d="${K.d(V, K.circle(r * Math.cos(a), r * Math.sin(a), 2.2, 12))}"/>`;
  }
  // hub bore and six bolt holes on Ø44
  out += `<path class="paper" d="${K.d(V, K.circle(0, 0, 17, 48))}"/>` + K.line(V, K.circle(0, 0, 17, 48), "vis", true);
  for (let i = 0; i < 6; i++) {
    const a = ((30 + i * 60) * Math.PI) / 180;
    out += `<path class="paper" d="${K.d(V, K.circle(22 * Math.cos(a), 22 * Math.sin(a), 2.75, 16))}"/>` + K.line(V, K.circle(22 * Math.cos(a), 22 * Math.sin(a), 2.75, 16), "vis", true);
  }
  out += K.line(V, K.circle(0, 0, 22, 72), "ctr", true);
  return part(27, out);
}

// The outboard caliper half seen from outboard, sitting over the rotor at 12 o'clock.
export function caliperFace(V) {
  const c = M.R_EFF;
  const shape = [
    ...K.arc(0, 0, c - 16, 66, 114, 10), // underside follows the rotor
    [-31, c - 4], [-31, c + 26], ...K.arc(-27, c + 30, 4, 180, 90, 4), ...K.arc(27, c + 30, 4, 90, 0, 4), [31, c - 4],
  ];
  return part(
    21,
    K.body(V, shape) +
      K.line(V, K.circle(0, c, 11, 40), "hid", true) +
      K.line(V, K.rrect(-21, c - 10, 21, c + 9, 4), "hid", true) +
      K.centerMark(V, [0, c], 11, 3)
  ) + part(26, K.body(V, K.circle(0, c + PIN_V, 2.5, 20)) + K.line(V, K.circle(0, c + PIN_V, 1.1, 6), "vis", true));
}

// =================================================================== SECTION A-A: the clamp (removed section at u = -20)
// p is v (forward, to the right), z is height. The bar is an adjacent part: phantom.
export const AA_U = -20;
const ringOut = 15.1;
const zEar = Math.sqrt(ringOut ** 2 - 7 ** 2);
export function clampSection(V) {
  const front = [
    [0.3, 21], [7, 21], [7, zEar], ...K.arc(0, 0, ringOut, (Math.atan2(zEar, 7) * 180) / Math.PI, (Math.atan2(9, Math.sqrt(ringOut ** 2 - 81)) * 180) / Math.PI, 4).slice(1),
    [42, 9], [44, 7], [44, -7], [42, -9],
    ...K.arc(0, 0, ringOut, -(Math.atan2(9, Math.sqrt(ringOut ** 2 - 81)) * 180) / Math.PI, -(Math.atan2(zEar, 7) * 180) / Math.PI, 4).slice(0, -1),
    [7, -zEar], [7, -21], [0.3, -21], [0.3, -11.1], ...K.arc(0, 0, 11.1, -88.5, 88.5, 24), [0.3, 11.1],
  ];
  const rear = [
    [-0.3, 21], [-7, 21], [-7, zEar], ...K.arc(0, 0, ringOut, 180 - (Math.atan2(zEar, 7) * 180) / Math.PI, 180 + (Math.atan2(zEar, 7) * 180) / Math.PI, 14).slice(1, -1),
    [-7, -zEar], [-7, -21], [-0.3, -21], [-0.3, -11.1], ...K.arc(0, 0, 11.1, 268.5, 91.5, 24), [-0.3, 11.1],
  ];
  const passage = K.circle(20.5, 0, 0.8, 16);
  const screw = (zc) => {
    const head = [[-12, zc - 4.25], [-7.3, zc - 4.25], [-7.3, zc + 4.25], [-12, zc + 4.25]];
    const shank = [[-7.3, zc - 2.5], [6.6, zc - 2.5], [7, zc - 2.1], [7, zc + 2.1], [6.6, zc + 2.5], [-7.3, zc + 2.5]];
    return (
      K.body(V, shank) + K.body(V, head) +
      K.lines(V, [[[0.6, zc - 2.05], [6.8, zc - 2.05]], [[0.6, zc + 2.05], [6.8, zc + 2.05]]], "thin") +
      K.line(V, K.rect(-12, zc - 2, -9.5, zc + 2), "hid", true)
    );
  };
  return (
    part(1, K.cut(V, front, { mat: "alu", angle: 45 }) + cavity(V, [passage], [[passage, true]])) +
    part(2, K.cut(V, rear, { mat: "alu", angle: 135 })) +
    part(29, screw(16.5) + screw(-16.5))
  );
}
export const aaOil = [K.circle(20.5, 0, 0.8, 16)];
