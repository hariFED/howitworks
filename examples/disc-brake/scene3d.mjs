// The disc brake's solids for its 3D view (disc-brake-3d.html). Two assemblies in one scene, both cut
// on the scene's plane z = 0, as the sheet cuts them:
//   LEVER AND MASTER CYLINDER, in the plane of the lever: x = the sheet's u (along the bar), y = v
//     (forward), exactly the world mm of parts.mjs. The bar axis is y = 0, the bore axis x = 0.
//   CALIPER, SECTION B-B through both piston axes: x = CX + u (u along the axle, outboard +), y = CY + v
//     (v radial, outward), z tangential. The rotor lies in the plane x = CX, centre R_EFF below the
//     piston axis; it is drawn whole (live3d.js lifts the cutting plane off it), passing between the pads.
//   The hose runs in the cutting plane from the master's port down into the caliper's, so its oil shows.
// Pure data built with kit/solid3d.mjs. Profiles are the sheet's numbers: model.mjs constants, parts.mjs
// exports (leverPts, BALL_V, BARREL, FINGER, BOOT_TOP, PAD, CAL, sealShape, strip) and, where parts.mjs
// keeps a constant private, the same value retyped below under its parts.mjs name.
// Moving parts are built at rest (lever out, pistons back); live3d.js poses them from the model.

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

// ---------------------------------------------------------------- parts.mjs's private constants
const PV = 20.5; // hose port axis (master)
const PISTON_REAR = M.PISTON_FRONT + M.PISTON_LEN;
const PORT_T = { tap: 6.5, cone: 8, end: 10.2 }; // hose port depths from its face, both ends
const { FACE, TOP, P_FACE, P_REAR, PIN_V, BORE_BOT } = P.CAL;
const PAD = P.PAD;
const RH = M.ROTOR_T / 2;
const ringOut = 15.1; // clamp ring, section A-A
const zEar = Math.sqrt(ringOut ** 2 - 7 ** 2);

// ---------------------------------------------------------------- 3D-only choices
// The caliper's place in the scene: below and left of the lever, so the hose drops straight into it.
export const BEND_R = 28; // the hose's bend radius
export const CX = -44 - BEND_R + 14; // rotor mid-plane; the caliper's port axis is CX - 14
export const CY = -78; // piston axis
export const ROTOR_C = [CX, CY - M.R_EFF, 0];
const T = 2.95; // half thickness of the lever blade and the barrel nut (the clevis gap is ±3)
const BODY_Z = 9; // half thickness of the lever body (section A-A: the block is ±9)
const PULL = 30; // the lever group explodes up the bore axis past the piston stack

// ---------------------------------------------------------------- helpers
const area = (pts) => pts.reduce((a, [x0, y0], i) => {
  const [x1, y1] = pts[(i + 1) % pts.length];
  return a + x0 * y1 - x1 * y0;
}, 0);
// S.extrude along y or x mirrors the outline before THREE.ExtrudeGeometry sees it, and three fixes a
// hole's winding only when it reverses the outline: give every hole the winding that ends up
// counter-clockwise, or its walls come out inside out (kit issue, worked round here).
function extrude(shape, o) {
  const mirrored = o.along === "y" || o.along === "x";
  const holes = (o.holes ?? []).map((h) => (area(h) > 0 === mirrored ? h.slice().reverse() : h));
  return S.extrude(shape, { ...o, holes });
}
const cal = ([u, v]) => [CX + u, CY + v];
// caliper lathes: along x (the piston axis family) at radial height v, s = u; along y at u, s = v
const calX = (loop, v, o = {}) => S.lathe(loop.map(([r, u]) => [r, CX + u]), { axis: "x", at: [CY + v, 0], ...o });
const calY = (loop, u, o = {}) => S.lathe(loop.map(([r, v]) => [r, CY + v]), { axis: "y", at: [CX + u, 0], ...o });
const mirrorU = (loop) => loop.map(([r, u]) => [r, -u]);
// fittings at both ends, as (r, t) loops with t the depth from the port face, inward
const atMaster = (loop, o = {}) => S.lathe(loop.map(([r, t]) => [r, -32 + t]), { axis: "x", at: [PV, 0], ...o });
const atCaliper = (loop, o = {}) => calY(loop.map(([r, t]) => [r, TOP - t]), -14, o);

// The hose's centre line in the plane z = 0, from the master's port bottom to the caliper's.
export function hosePath(step = 3) {
  const pts = [];
  const x0 = -32 + PORT_T.end;
  const yEnd = CY + TOP - PORT_T.end;
  const c = [-44, PV - BEND_R];
  const line = (a, b) => {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let i = 0; i < n; i++) pts.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
  };
  line([x0, PV], [-44, PV]);
  const na = 24;
  for (let i = 0; i < na; i++) {
    const a = ((90 + (90 * i) / na) * Math.PI) / 180;
    pts.push([c[0] + BEND_R * Math.cos(a), c[1] + BEND_R * Math.sin(a)]);
  }
  line([c[0] - BEND_R, c[1]], [c[0] - BEND_R, yEnd]);
  pts.push([c[0] - BEND_R, yEnd]);
  return { pts, c, x0, yEnd };
}
// A band of half width w round a polyline, trimmed by `trim` at both ends (the ribbon's bevel grows it back).
function band(pts, w, trim = 0) {
  const n = pts.length;
  const dir = (i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  };
  const p = pts.map((q) => q.slice());
  const d0 = dir(0);
  const d1 = dir(n - 1);
  p[0] = [p[0][0] + d0[0] * trim, p[0][1] + d0[1] * trim];
  p[n - 1] = [p[n - 1][0] - d1[0] * trim, p[n - 1][1] - d1[1] * trim];
  const left = [];
  const right = [];
  p.forEach((q, i) => {
    const [dx, dy] = dir(i);
    left.push([q[0] - dy * w, q[1] + dx * w]);
    right.push([q[0] + dy * w, q[1] - dx * w]);
  });
  return [...left, ...right.reverse()];
}
const sector = (c, r0, r1, a0, a1, n = 24) => [...K.arc(c[0], c[1], r1, a0, a1, n), ...K.arc(c[0], c[1], r0, a1, a0, n)];

// ---------------------------------------------------------------- shapes from the sheet
const pistonLoop = (() => {
  const f = M.PISTON_FRONT;
  const r = PISTON_REAR;
  const sock = K.arc(0, P.BALL_V, 2.4, 192, 270, 6).map(([u, v]) => [Math.abs(u), v]);
  return [[0, P.BALL_V - 2.4], [0, f], [4.9, f], [4.9, f + 0.8], [3.8, f + 0.8], [3.8, f + 3.5], [4.9, f + 3.5], [4.9, f + 11], [3.8, f + 11], [3.8, f + 13.3], [4.9, f + 13.3], [4.9, r], ...sock.slice(0, -1)];
})();
const cupLoop = (() => {
  const f = M.PISTON_FRONT;
  const lip = M.LIP;
  return [[3.8, f + 3.5], [4.97, f + 3.5], [4.97, f + 2.5], [4.97, lip], [4.72, lip], [4.45, f + 2.1], [4.2, f + 2.1], [4.05, lip], [3.8, lip]];
})();
// the dust boot, squashed as the rod goes in (parts.mjs boot(), the right half)
export function bootLoop(x) {
  const top = P.BOOT_TOP - x;
  const h = top - 49;
  return [
    [5.7, 48], [7.4, 48], [7.4, 49], [6.9, 49], [7.3, 49 + 0.45 * h], [3.5, top - 1.1], [3.2, top - 1.1], [3.2, top],
    [1.75, top], [1.75, top - 1.1], [2.6, top - 1.1], [6.4, 49 + 0.45 * h], [6.1, 49], [5.7, 49],
  ];
}
export const SPRING = { from: M.BORE_END, to: M.PISTON_FRONT, radius: 3.4, wire: 0.6, turns: 5 };
export const SPRING_LEN = SPRING.to - SPRING.from;

// The square seal (parts.mjs sealShape, sheared by d) as a lathe loop round the piston axis, side s.
export const sealLoop = (d, s) => P.sealShape(d, 1).map(([u, r]) => [r, CX + s * u]);
// The pad spring (parts.mjs padSpring) as an outline in the plane, its legs on the backing plates.
export function padSpringShape(yp) {
  const b = PAD.backing - yp - 0.25;
  const line = [[-b, 10.2], [-b, 12.5], [-2, 18.6], [2, 18.6], [b, 12.5], [b, 10.2]];
  return P.strip(line, 0.4).map(cal);
}

// Section A-A of the clamp (parts.mjs clampSection), as [z, y] outlines for extrusions along the bar.
const deg = (a) => (a * 180) / Math.PI;
const aaFront = [
  [0.3, 21], [7, 21], [7, zEar], ...K.arc(0, 0, ringOut, deg(Math.atan2(zEar, 7)), deg(Math.atan2(9, Math.sqrt(ringOut ** 2 - 81))), 4).slice(1),
  [42, 9], [44, 7], [44, -7], [42, -9],
  ...K.arc(0, 0, ringOut, -deg(Math.atan2(9, Math.sqrt(ringOut ** 2 - 81))), -deg(Math.atan2(zEar, 7)), 4).slice(0, -1),
  [7, -zEar], [7, -21], [0.3, -21], [0.3, -11.1], ...K.arc(0, 0, 11.1, -88.5, 88.5, 24), [0.3, 11.1],
].map(([p, z]) => [z, p]);
const aaRear = [
  [-0.3, 21], [-7, 21], [-7, zEar], ...K.arc(0, 0, ringOut, 180 - deg(Math.atan2(zEar, 7)), 180 + deg(Math.atan2(zEar, 7)), 14).slice(1, -1),
  [-7, -zEar], [-7, -21], [-0.3, -21], [-0.3, -11.1], ...K.arc(0, 0, 11.1, 268.5, 91.5, 24), [-0.3, 11.1],
].map(([p, z]) => [z, p]);
const CLAMP = [-30, -14.5]; // the clamp's length along the bar
export const SCREW_X = (CLAMP[0] + CLAMP[1]) / 2;

// View C outlines of the caliper half and the rotor, as [z, y] (seen from outboard, the sheet's x is -z).
const c = M.R_EFF;
const viewC = [
  ...K.arc(0, 0, c - 16, 66, 114, 10), [-31, c - 4], [-31, c + 26], ...K.arc(-27, c + 30, 4, 180, 90, 4).slice(1), ...K.arc(27, c + 30, 4, 90, 0, 4).slice(1), [31, c - 4],
].map(([x, y]) => [-x, CY + y - c]);
const bridgeC = [[-31, 19.5], [31, 19.5], [31, 30], ...K.arc(27, 30, 4, 0, 90, 4).slice(1), ...K.arc(-27, 30, 4, 90, 180, 4).slice(1)].map(([z, v]) => [z, CY + v]);
function rotorShape() {
  const R = M.ROTOR_D / 2;
  const at = ([x, y]) => [-x, ROTOR_C[1] + y];
  const holes = [];
  for (let i = 0; i < 6; i++) {
    const a = 90 + i * 60;
    holes.push([...K.arc(0, 0, 31, a + 12, a + 48, 8), ...K.arc(0, 0, 58, a + 62, a + 26, 10)].map(at));
  }
  for (let i = 0; i < 48; i++) {
    const a = (((i >> 1) * 15 + (i % 2) * 7.5) * Math.PI) / 180;
    const r = i % 2 ? 75 : 67;
    holes.push(S.circle(r * Math.cos(a), r * Math.sin(a), 2.2, 12).map(at));
  }
  holes.push(S.circle(0, 0, 17, 48).map(at));
  for (let i = 0; i < 6; i++) {
    const a = ((30 + i * 60) * Math.PI) / 180;
    holes.push(S.circle(22 * Math.cos(a), 22 * Math.sin(a), 2.75, 16).map(at));
  }
  return { outline: S.circle(0, 0, R, 144).map(at), holes };
}

// a coil of a spring on the cutting plane (+x side), at quarter turn k (odd), for a balloon
const coil = (sp, k, x0 = 0) => [x0 + sp.radius, sp.from + sp.wire / 2 + (k / (4 * sp.turns)) * (sp.to - sp.from - sp.wire), 0];

// ---------------------------------------------------------------- the parts
export function parts() {
  const f = M.PISTON_FRONT;
  const { pts: hose } = hosePath();
  const rot = rotorShape();
  const backing = [[-21, -10], [21, -10], [21, 9], [4, 9], [4, 17.6], ...K.arc(2.5, 17.1, 1.5, 0, 90, 3).slice(0, -1), [2.5, 18.6], [-2.5, 18.6], ...K.arc(-2.5, 17.1, 1.5, 90, 180, 3).slice(1), [-4, 9], [-21, 9]].map(([z, v]) => [z, CY + v]);
  const lining = K.rrect(-19, -8, 19, 9, 3).map(([z, v]) => [z, CY + v]);
  const padHole = [S.circle(0, CY + PIN_V, 1.55, 24)];
  const pad = (s, k) => [
    extrude(lining, { along: "x", from: CX + s * (s > 0 ? PAD.lining : PAD.backing), to: CX + s * (s > 0 ? PAD.backing : PAD.lining), hatch: ["iron", s > 0 ? 45 : 135], explode: [s * 22, 0, 0], live: `lin${k}` }),
    extrude(backing, { along: "x", from: CX + s * (s > 0 ? PAD.backing : PAD.back), to: CX + s * (s > 0 ? PAD.back : PAD.backing), holes: padHole, hatch: ["steel", s > 0 ? 135 : 45], explode: [s * 22, 0, 0], live: `back${k}` }),
  ];
  const groove = [[0, FACE], [11, FACE], [11, 10.3], [12.7, 10.3], [12.7, 12.3], [11, 12.3], [11, BORE_BOT], [8, BORE_BOT], [8, 21], [0, 21]];
  const piston = [[9, P_FACE], [10.95, P_FACE], [10.95, P_REAR], [0, P_REAR], [0, P_REAR - 3], [9, P_REAR - 3]];
  const caliperHalf = (s) => [
    extrude(bridgeC, { along: "x", from: CX + Math.min(0, s * FACE), to: CX + Math.max(0, s * FACE) }),
    extrude(viewC, { along: "x", from: CX + Math.min(s * FACE, s * 25), to: CX + Math.max(s * FACE, s * 25) }),
    S.bore(calX(s > 0 ? groove : mirrorU(groove), 0)),
    S.bore(calY([[0, 8], [0.8, 8], [0.8, 21.7], [0, 21.7]], s * 20)),
    S.bore(calX(s > 0 ? [[0, 0.9], [0.8, 0.9], [0.8, 20.8], [0, 20.8]] : [[0, 0], [0.8, 0], [0.8, -20.8], [0, -20.8]], 22.5)),
    S.bore(calX(s > 0 ? [[0, FACE], [1.6, FACE], [1.6, 25], [0, 25]] : [[0, -16], [1.6, -16], [1.6, -FACE], [0, -FACE]], PIN_V)),
  ];
  const lug = [[-30.5, 44], ...K.arc(M.PIVOT[0], M.PIVOT[1], 8.5, 180, 0, 16), [-13.5, 44]];
  const pivotHole = [S.circle(M.PIVOT[0], M.PIVOT[1], 3.05, 40)];
  return [
    // ================================================================ lever and master cylinder
    S.part(1, "LEVER BODY", [
      // the clamp end: section A-A swept along the bar
      extrude(aaFront, { along: "x", from: CLAMP[0], to: CLAMP[1] }),
      // the port end beyond the clamp, and the block that carries the bore and the reservoir
      S.extrude([[-32, 13], [-31, 12.2], [-30, 12.2], [-30, 44], [-32, 42]], { along: "z", from: -BODY_Z, to: BODY_Z }),
      S.extrude([[-14.5, 12.2], [-13.5, 13], [27, 13], [29, 15], [29, 39], [10, 44], [8, 46], [7.5, 48], [-7.5, 48], [-8, 46], [-10, 44], [-14.5, 44]], { along: "z", from: -BODY_Z, to: BODY_Z }),
      // the clevis: two lugs either side of the blade
      S.extrude(lug, { along: "z", from: 3, to: 7, holes: pivotHole }),
      S.extrude(lug, { along: "z", from: -7, to: -3, holes: pivotHole }),
      // master bore with the circlip groove, reservoir pocket, timing and inlet ports, outlet, hose port
      S.bore(S.lathe([[0, M.BORE_END], [5, M.BORE_END], [5, 44.5], [5.7, 44.5], [5.7, 45.3], [5, 45.3], [5, 47.4], [5.6, 48], [0, 48]])),
      S.bore(extrude(K.rrect(-6.5, 17, 6.5, 36, 1.5), { along: "x", from: 9, to: 28 })),
      S.bore(extrude(K.rrect(-7.5, 16, 7.5, 37, 1.5), { along: "x", from: 28, to: 29 })),
      S.bore(S.lathe([[0, 5], [M.PORT_D / 2, 5], [M.PORT_D / 2, 9], [0, 9]], { axis: "x", at: [M.PORT_V, 0] })),
      S.bore(S.lathe([[0, 5], [M.INLET_D / 2, 5], [M.INLET_D / 2, 9], [0, 9]], { axis: "x", at: [M.INLET_V, 0] })),
      S.bore(S.lathe([[0, -32 + PORT_T.end], [0.8, -32 + PORT_T.end], [0.8, -5], [0, -5]], { axis: "x", at: [PV, 0] })),
      S.bore(atMaster([[0, 0], [4, 0], [4, PORT_T.tap], [2.55, PORT_T.cone], [2.55, PORT_T.end], [0, PORT_T.end]])),
    ], { mat: "alu", angle: 45, anchor: { cut: [-24, 30, 0], out: { c: [-24, 30, BODY_Z] } } }),
    S.part(2, "CLAMP HALF Ø22.2", [extrude(aaRear, { along: "x", from: CLAMP[0], to: CLAMP[1] })], {
      mat: "alu", angle: 135, explode: [0, -16, 0], anchor: { cut: [-22, -13.1, 0], out: { c: [-22, -7.5, 13.1] } },
    }),
    S.part(29, "CLAMP SCREW M5×16", [-16.5, 16.5].map((z) => S.lathe([[0, -12], [4.25, -12], [4.25, -7.3], [2.5, -7.3], [2.5, 6.6], [2.1, 7], [0, 7]], { at: [SCREW_X, z] })), {
      explode: [0, -32, 0], anchor: { out: { c: [SCREW_X, -9.6, -16.5], r: 4.25, axis: "y" } },
    }),
    S.part(3, "LEVER BLADE", [S.extrude(P.leverPts(0), { along: "z", from: -T, to: T, holes: pivotHole })], {
      mat: "alu", angle: 135, pivot: [...M.PIVOT, 0], explode: [0, 64 + PULL, 0], anchor: { cut: [36, 61, 0], out: { c: [36, 61, T] } },
    }),
    S.part(4, "PIVOT PIN Ø6", [S.cylinder({ axis: "z", at: M.PIVOT, r: 3, from: -BODY_Z, to: BODY_Z })], {
      mat: "steel", angle: 45, explode: [0, 64 + PULL, 26], anchor: { cut: [M.PIVOT[0] - 1.6, M.PIVOT[1] + 1.2, 0], out: { c: [...M.PIVOT, BODY_Z] } },
    }),
    S.part(5, "BARREL NUT M4", [
      S.cylinder({ axis: "z", at: P.BARREL, r: 2.95, from: -2.9, to: 2.9 }),
      S.bore(S.cylinder({ axis: "y", at: [0, 0], r: 1.8, from: 56.9, to: 63.1 })),
    ], { mat: "brass", angle: 135, pivot: [...P.BARREL, 0], explode: [0, 64 + PULL, 0], anchor: { cut: [-2.4, 60.4, 0], out: { c: [...P.BARREL, 2.9] } } }),
    S.part(6, "PUSHROD M4", [
      S.sphere([0, P.BALL_V, 0], 2.37),
      S.lathe([[0, P.BALL_V + 1.2], [1.72, P.BALL_V + 1.2], [1.72, P.BARREL[1] + 3.4], [1.22, P.BARREL[1] + 3.9], [0, P.BARREL[1] + 3.9]]),
    ], { pivot: [0, P.BALL_V, 0], explode: [0, 54 + PULL, 0], anchor: { cut: [0, 51.5, 0], out: { c: [0, 55, 0], r: 1.72, axis: "y" } } }),
    S.part(7, "MASTER PISTON Ø10", [S.lathe(pistonLoop)], {
      mat: "alu", angle: 135, explode: [0, 42, 0], anchor: { cut: [-2.9, 37, 0], out: { c: [0, 37, 0], r: 4.9, axis: "y" } },
    }),
    S.part(8, "PRIMARY CUP Ø10", [S.lathe(cupLoop)], {
      mat: "rubber", explode: [0, 34, 0], anchor: { cut: [-4.4, f + 2.9, 0], out: { c: [0, f + 2.9, 0], r: 4.97, axis: "y" } },
    }),
    S.part(9, "SECONDARY SEAL Ø10", [S.lathe(K.rrect(3.8, f + 11.05, 4.97, f + 13.25, 0.4))], {
      mat: "rubber", explode: [0, 56, 0], anchor: { cut: [4.4, f + 12.2, 0], out: { c: [0, f + 12.2, 0], r: 4.97, axis: "y" } },
    }),
    S.part(10, "RETURN SPRING", [S.helix({ axis: "y", at: 0, ...SPRING, pivot: [0, M.BORE_END, 0], live: "spring" })], {
      hatch: "solid", explode: [0, 20, 0], anchor: { cut: coil(SPRING, 9), out: { c: [0, 24, 0], r: 3.7, axis: "y" }, solid: 0 },
    }),
    S.part(11, "CIRCLIP 10", [S.tube({ r0: 4, r1: 5.67, from: PISTON_REAR, to: PISTON_REAR + 0.8 })], {
      hatch: "solid", explode: [0, 62, 0], anchor: { cut: [-4.9, PISTON_REAR + 0.4, 0], out: { c: [0, PISTON_REAR + 0.4, 0], r: 5.7, axis: "y" } },
    }),
    S.part(12, "DUST BOOT", [S.lathe(bootLoop(0), { live: "boot" })], {
      mat: "rubber", explode: [0, 68, 0], anchor: { cut: [-6.6, 48.5, 0], out: { c: [0, 48.5, 0], r: 7.4, axis: "y" } },
    }),
    S.part(13, "RESERVOIR CAP", [extrude(K.rrect(-BODY_Z, 15, BODY_Z, 38.5, 1.5), { along: "x", from: 29, to: 32, holes: [S.circle(0, 27, 0.5, 16)] })], {
      mat: "plastic", angle: 135, explode: [26, 0, 0], anchor: { cut: [30.5, 21, 0], out: { c: [32, 21, 4] } },
    }),
    S.part(14, "BLADDER", [
      extrude(K.rrect(-7.47, 16.03, 7.47, 36.97, 1.5), { along: "x", from: 28, to: 29, holes: [K.rrect(-5.1, 18.4, 5.1, 34.6, 0.8)] }),
      extrude(K.rrect(-6.1, 17.4, 6.1, 35.6, 1.6), { along: "x", from: 19, to: 28, holes: [K.rrect(-5.1, 18.4, 5.1, 34.6, 0.8)] }),
      extrude(K.rrect(-6.1, 17.4, 6.1, 35.6, 1.6), { along: "x", from: 18, to: 19 }),
    ], { mat: "rubber", explode: [16, 0, 0], anchor: { cut: [23.5, 35.1, 0], out: { c: [28.5, 36, 7.47] } } }),
    // ---- the hose and its fittings (items 16–18 at both ends, 19 the hose)
    S.part(16, "COMPRESSION NUT M8×0.75", [
      extrude(S.hexagon(9, 0, PV), { along: "x", from: -38, to: -32, holes: [S.circle(0, PV, 2.6, 32)] }),
      atMaster([[2.6, 0], [3.95, 0], [3.95, 4.4], [2.6, 4.4]]),
      extrude(S.polygon(6, 4.5 / Math.cos(Math.PI / 6), CX - 14, 0, Math.PI / 6), { along: "y", from: CY + TOP, to: CY + TOP + 6, holes: [S.circle(CX - 14, 0, 2.6, 32)] }),
      atCaliper([[2.6, 0], [3.95, 0], [3.95, 4.4], [2.6, 4.4]]),
    ], { anchor: { cut: [-35, PV + 3.6, 0], out: { c: [-35, PV, 0], r: 4.5, axis: "x" } } }),
    S.part(17, "OLIVE Ø5", [
      atMaster([[2.52, 4.4], [3.4, 4.4], [3.4, 7.1], [2.6, 7.9], [2.52, 7.9]]),
      atCaliper([[2.52, 4.4], [3.4, 4.4], [3.4, 7.1], [2.6, 7.9], [2.52, 7.9]]),
    ], { mat: "brass", angle: 135, anchor: { cut: [-32 + 5.6, PV - 3, 0], out: { c: [-26, PV, 0], r: 3.4, axis: "x" } } }),
    S.part(18, "HOSE INSERT Ø2.1", [
      atMaster([[0.6, 2.6], [1, 2.6], [1, PORT_T.end], [0.6, PORT_T.end]]),
      atCaliper([[0.6, 2.6], [1, 2.6], [1, PORT_T.end], [0.6, PORT_T.end]]),
    ], { hatch: "solid", anchor: { cut: [-27.5, PV + 0.8, 0], out: { c: [-27.5, PV, 0], r: 1, axis: "x" } } }),
    S.part(19, "HOSE Ø5×2.1", [
      // a ribbon round the centre line, its edges rounded by a bevel into a round hose; the bore is a
      // volume in three pieces butted end to end
      S.extrude(band(hose, 0.05, 2.45), { along: "z", from: -2.5, to: 2.5, bevel: 2.45 }),
      ...hoseBores(1.05).map((s) => S.bore(s)),
    ], { mat: "plastic", angle: 45, anchor: { cut: [-44 - BEND_R - 1.8, PV - BEND_R - 22, 0], out: { c: [-44 - BEND_R, PV - BEND_R - 22, 0], r: 2.5, axis: "y" } } }),
    // ---- the oil at atmospheric pressure: reservoir round the bladder, timing and inlet ports
    S.part(15, "MINERAL BRAKE OIL", [
      S.fluid("res", S.extrude([[9.03, 17.03], [28, 17.03], [28, 17.37], [17.97, 17.37], [17.97, 35.63], [28, 35.63], [28, 35.97], [9.03, 35.97]], { along: "z", from: -6.47, to: 6.47 })),
      S.fluid("port", S.lathe([[0, 5], [M.PORT_D / 2 - 0.03, 5], [M.PORT_D / 2 - 0.03, 9.03], [0, 9.03]], { axis: "x", at: [M.PORT_V, 0] })),
      S.fluid("inlet", S.lathe([[0, 5], [M.INLET_D / 2 - 0.03, 5], [M.INLET_D / 2 - 0.03, 9.03], [0, 9.03]], { axis: "x", at: [M.INLET_V, 0] })),
    ], { anchor: { cut: [13, 24, 0], out: { c: [13, 24, 0] } } }),
    // ================================================================ caliper, section B-B
    S.part(20, "CALIPER HALF, INBOARD", [
      ...caliperHalf(-1),
      S.bore(calY([[0, 23.3], [0.8, 23.3], [0.8, TOP - PORT_T.end], [0, TOP - PORT_T.end]], -14)),
      S.bore(atCaliper([[0, 0], [4, 0], [4, PORT_T.tap], [2.55, PORT_T.cone], [2.55, PORT_T.end], [0, PORT_T.end]])),
    ], { mat: "alu", angle: 45, explode: [-76, 0, 0], anchor: { cut: [...cal([-22, -10]), 0], out: { c: [...cal([-25, 0]), 0] } } }),
    S.part(21, "CALIPER HALF, OUTBOARD", [
      ...caliperHalf(1),
      S.bore(calX([[0, 0], [1.9, 0], [1.9, 0.9], [0, 0.9]], 22.5)),
    ], { mat: "alu", angle: 135, explode: [76, 0, 0], anchor: { cut: [...cal([22, -10]), 0], out: { c: [...cal([25, 0]), 0] } } }),
    S.part(22, "CALIPER PISTON Ø22", [
      calX(piston, 0, { hatch: ["plastic", 45], explode: [44, 0, 0], live: "o" }),
      calX(mirrorU(piston), 0, { hatch: ["plastic", 135], explode: [-44, 0, 0], live: "i" }),
    ], { anchor: { cut: [...cal([15.5, 10]), 0], out: { c: [...cal([P_REAR, 0]), 0] }, solid: 0 } }),
    S.part(23, "SQUARE SEAL Ø22", [
      S.lathe(sealLoop(0, 1), { axis: "x", at: [CY, 0], explode: [60, 0, 0], live: "o" }),
      S.lathe(sealLoop(0, -1), { axis: "x", at: [CY, 0], explode: [-60, 0, 0], live: "i" }),
    ], { mat: "rubber", anchor: { cut: [...cal([11.4, 11.8]), 0], out: { c: [...cal([11.4, 0]), 0], r: 12.65, axis: "x" }, solid: 0 } }),
    S.part(24, "PAD, RESIN ON STEEL", [...pad(1, "o"), ...pad(-1, "i")], {
      anchor: { cut: [...cal([-3, -4]), 0], out: { c: [...cal([-3, -4]), -19] }, solid: 2 },
    }),
    S.part(25, "PAD SPRING t0.4", [S.extrude(padSpringShape(0), { along: "z", from: -4, to: 4, live: "spring" })], {
      hatch: "solid", explode: [0, 22, 0], anchor: { cut: [...cal([0, 18.6]), 0], out: { c: [...cal([0, 18.8]), 0] } },
    }),
    S.part(26, "PAD PIN Ø3", [calX([[0, -16], [1.5, -16], [1.5, 25], [2.5, 25], [2.5, 27.4], [0, 27.4]], PIN_V)], {
      explode: [124, 0, 0], anchor: { cut: [...cal([20, PIN_V]), 0], out: { c: [...cal([26.2, PIN_V]), 0], r: 2.5, axis: "x" } },
    }),
    S.part(27, "ROTOR Ø160×1.8", [extrude(rot.outline, { along: "x", from: CX - RH, to: CX + RH, holes: rot.holes })], {
      mat: "steel", angle: 60, anchor: { cut: [CX + RH, ROTOR_C[1] + 54.9, 45], out: { c: [CX + RH, ROTOR_C[1] + 54.9, 45] } },
    }),
    S.part(28, "O-RING 3×1", [calX(K.rrect(0.85, 0.05, 1.8, 0.85, 0.35), 22.5)], {
      mat: "rubber", explode: [38, 0, 0], anchor: { cut: [...cal([0.45, 21.15]), 0], out: { c: [...cal([0.45, 22.5]), 0], r: 1.8, axis: "x" } },
    }),
  ];
}

// The hose's bore, or its oil, in three pieces butted end to end: the straight from the master's port,
// the bend, the drop into the caliper's port (each outline short enough for the kit's inside test).
export function hoseBores(w, z = w) {
  const { c, x0, yEnd } = hosePath();
  return [
    S.extrude([[-44, PV - w], [x0, PV - w], [x0, PV + w], [-44, PV + w]], { along: "z", from: -z, to: z }),
    S.extrude(sector(c, BEND_R - w, BEND_R + w, 90, 180), { along: "z", from: -z, to: z }),
    S.extrude([[c[0] - BEND_R - w, yEnd], [c[0] - BEND_R + w, yEnd], [c[0] - BEND_R + w, c[1]], [c[0] - BEND_R - w, c[1]]], { along: "z", from: -z, to: z }),
  ];
}

// The oil under pressure: master chamber (its top rides with the piston), outlet, hose, caliper
// passages and the two piston chambers.
export function fluids() {
  const hose = hoseBores(1.02, 1.02);
  const cham = [[0, P_REAR - 0.6], [10.97, P_REAR - 0.6], [10.97, BORE_BOT], [7.97, BORE_BOT], [7.97, 21], [0, 21]];
  return [
    S.fluid("chamber", S.lathe([[0, M.BORE_END + 0.03], [4.97, M.BORE_END + 0.03], [4.97, M.PISTON_FRONT], [0, M.PISTON_FRONT]]), { stretch: { from: M.BORE_END + 1 } }),
    S.fluid("outlet", S.lathe([[0, -32 + PORT_T.end], [0.77, -32 + PORT_T.end], [0.77, -5], [0, -5]], { axis: "x", at: [PV, 0] })),
    S.fluid("mInsert", atMaster([[0, 2.6], [0.57, 2.6], [0.57, PORT_T.end], [0, PORT_T.end]])),
    S.fluid("hose1", hose[0]),
    S.fluid("hose2", hose[1]),
    S.fluid("hose3", hose[2]),
    S.fluid("cInsert", atCaliper([[0, 2.6], [0.57, 2.6], [0.57, PORT_T.end], [0, PORT_T.end]])),
    S.fluid("cPass", calY([[0, 23.3], [0.77, 23.3], [0.77, TOP - PORT_T.end], [0, TOP - PORT_T.end]], -14)),
    S.fluid("cross", calX([[0, -20.8], [0.77, -20.8], [0.77, 20.8], [0, 20.8]], 22.5)),
    S.fluid("drillI", calY([[0, 8], [0.77, 8], [0.77, 21.7], [0, 21.7]], -20)),
    S.fluid("drillO", calY([[0, 8], [0.77, 8], [0.77, 21.7], [0, 21.7]], 20)),
    S.fluid("chamO", calX(cham, 0)),
    S.fluid("chamI", calX(mirrorU(cham), 0)),
  ];
}
export const PRESSED = ["chamber", "outlet", "mInsert", "hose1", "hose2", "hose3", "cInsert", "cPass", "cross", "drillI", "drillO", "chamO", "chamI"];

export const centres = () => [
  [[0, 14, 0], [0, 72, 0]], // master bore
  [[-48, PV, 0], [-2, PV, 0]], // outlet and hose port
  [[M.PIVOT[0], M.PIVOT[1], -12], [M.PIVOT[0], M.PIVOT[1], 12]], // pivot
  [[-36, 0, 0], [2, 0, 0]], // the handlebar's axis
  [[CX - 29, CY, 0], [CX + 31, CY, 0]], // the pistons' axis
  [[CX - 14, CY + 18, 0], [CX - 14, CY + 50, 0]], // the caliper's port
  [[CX - 12, ROTOR_C[1], 0], [CX + 12, ROTOR_C[1], 0]], // the wheel's axis
];

export const scene = () => ({ parts: parts(), fluids: fluids(), centres: centres() });
