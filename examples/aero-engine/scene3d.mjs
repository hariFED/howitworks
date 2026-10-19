// The flat-four's solids for its 3D view (aero-engine-3d.html). Pure data built with kit/solid3d.mjs
// from model.mjs and parts.mjs numbers.
//
// Built in the 2D sheet's own world mm (x = u across, + = right bank; y = v along the crank, + =
// forward; z up), then MIRRORED THROUGH THE PLAN'S SECTION PLANE (z → -z, see flipPart): the kit always
// keeps the half z < 0 behind the cut, and the half worth keeping is the top one, where the valve
// train lives (camshaft above the crank, pushrods, rockers, springs and valves above the cylinder
// axes: Section A-A). The section face itself is the sheet's plan section exactly (FRONT reads like
// the sheet); what lies behind it is the engine's top half seen from beneath. The sump, carburettor,
// intake pipes and lower plugs are in the half the cut removes: the page shows them with the cut off.
//
// One part per parts-list item. Three kinds of solids:
//   - kit solids, as everywhere (lathes, extrusions, bores);
//   - section skins: each casting carries a 2 mm plate of its own plan section (the sheet's outline)
//     straddling the plane. Its cut face is drawn 1 mm behind the plane, so the hatch hides whatever
//     sits inside the casting behind it (cam, tappets, valve stems, plug threads) instead of letting
//     an oblique view ray reach it. Windows in a skin (the rocker boxes) are holes;
//   - the valve train and the leaning plugs, on axes the kit's lathes can't take (tilted in the A-A
//     plane), are listed as PIECES (vtPieces) that live3d.js turns and poses itself; their parts carry
//     hidden stand-in boxes for the kit's framing, anchors and explode.
// live3d.js also turns every big lathe again with fewer segments, and while the section is open only
// the kept half of the bodies that never turn about their own axis (barrels, heads, pistons, rings):
// that half is all the cut ever shows.

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const rad = Math.PI / 180;
const HF = M.HEAD_FACE;
const BR = P.BR;
const R = M.CRANK_R;
const PA0 = M.pinA(0);
export const IDS = M.IDS;
export const sideOf = (k) => M.CYL[k].side;
export const vOf = (k) => M.CYL[k].v;
// a body of revolution on cylinder k's axis from a half-profile [r, a] (a outward from the crank axis)
const cyl = (k, loop, o = {}) => S.lathe(loop.map(([r, a]) => [r, sideOf(k) * a]), { axis: "x", at: [vOf(k), 0], ...o });
const out = (k, d) => [sideOf(k) * d, 0, 0];

// segments the page turns lathes with (live3d.js): every lathe on a cylinder axis takes N_CYL so the
// piston, rings, gas, barrel bore and head skirt stay parallel polygons
export const N_CYL = 40;
export const segOf = (r) => (r > 60 ? N_CYL : r > 25 ? 32 : r > 12 ? 20 : 12);

// ---------------------------------------------------------------- profiles, as the sheet draws them
const barrelLoop = () => P.barrelLoop(); // ten fins
const DOME = (() => {
  const tm = Math.asin(BR / M.SPHERE_R);
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = (tm * i) / 10;
    pts.push([M.SPHERE_R * Math.sin(t), M.SPHERE_A + M.SPHERE_R * Math.cos(t)]);
  }
  return pts; // apex first
})();
export const HEAD_R = 78;
export const HEAD_FIN_R = 98;
// the head turned about the cylinder axis: the plan section's outline (P.headPlanOutline), fins to the end
export function headLoop() {
  const L = [[P.BARREL_R, P.HEAD_IN], [HEAD_R, P.HEAD_IN]];
  for (let a = 238; a <= 398; a += 10) L.push([HEAD_R, a], [HEAD_FIN_R, a + 1], [HEAD_FIN_R, a + 4], [HEAD_R, a + 5]);
  L.push([HEAD_R, P.HEAD_END - 6], [72, P.HEAD_END], [0, P.HEAD_END], ...DOME, [P.BARREL_R, HF]);
  return L;
}
// built as two lathes: the chamber end (dome, the first eight fins) and the rocker end, turned all
// round but the wedge under the rocker box (GAP either side of straight up), which the box fills: so
// no turned surface runs through the box's cavity
export const HEAD_SPLIT = 314;
export const GAP = 31;
export function headLoopIn() {
  const L = [[P.BARREL_R, P.HEAD_IN], [HEAD_R, P.HEAD_IN]];
  for (let a = 238; a + 5 <= HEAD_SPLIT; a += 10) L.push([HEAD_R, a], [HEAD_FIN_R, a + 1], [HEAD_FIN_R, a + 4], [HEAD_R, a + 5]);
  L.push([HEAD_R, HEAD_SPLIT], [0, HEAD_SPLIT], ...DOME, [P.BARREL_R, HF]);
  return L;
}
export function headLoopOut() {
  const L = [[0, HEAD_SPLIT], [HEAD_R, HEAD_SPLIT]];
  for (let a = 318; a <= 398; a += 10) L.push([HEAD_R, a], [HEAD_FIN_R, a + 1], [HEAD_FIN_R, a + 4], [HEAD_R, a + 5]);
  L.push([HEAD_R, P.HEAD_END - 6], [72, P.HEAD_END], [0, P.HEAD_END]);
  return L;
}
// the head's plan section [a, c] (the lathe cut through its axis), for its skin
function headSection() {
  const L = headLoop();
  const i = L.findIndex(([r], j) => r === 0 && L[(j + 1) % L.length][0] === 0); // [0, HEAD_END], then [0, apex]
  const rot = [...L.slice(i + 1), ...L.slice(0, i + 1)]; // from [0, apex] round to [0, HEAD_END]
  const up = rot.map(([r, a]) => [a, r]);
  const down = rot.slice(1, -1).reverse().map(([r, a]) => [a, -r]);
  return [...up, ...down];
}
// the rocker box window: the box's cavity runs down through the plane here (a cutaway), so the
// section looks into it. In the cylinder frame [a, c], c across (v - v_k)
export const WIN = { a0: 326, a1: 400, c: 40 };
export const BOX = { a0: P.BOX.a0, a1: P.HEAD_END, z0: 30, top: P.BOX.top, half: 52 };
function pistonLoop() {
  return P.pistonHalf(PA0).map(([a, c]) => [c, a]); // ring grooves as on the sheet
}
const RINGS = [[7.6, 9.9], [14.1, 16.4], [21.1, 25.4]]; // down from the crown
function hull(points) {
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (const p of pts.slice().reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
const disc = (x, z, r, n = 24) => Array.from({ length: n }, (_, i) => [x + r * Math.cos((2 * Math.PI * i) / n), z + r * Math.sin((2 * Math.PI * i) / n)]);
const skin = (shape, holes = []) => ({ ...S.extrude(shape, { along: "z", from: -1, to: 1, holes }), skin: true });

// ---------------------------------------------------------------- explode (the crank and its shells stay)
// Cylinders come apart outward along their axes (rod, piston and rings, barrel, head); each head's
// valve train lifts out past its head, forward for the front pair and aft for the rear pair; the
// camshaft slides out aft; the accessories go aft; the sump and carburettor drop (with the cut off).
export const EX = { case: 40, rod: 40, piston: 70, ring: 95, barrel: 240, head: 310, acc: -70, gear: -40, mag: -170, pump: -150, sump: -260, carb: -420, pipe: -130 };
const FRONT = (k) => (vOf(k) > 0 ? 1 : -1);
// the valve train's explode for cylinder k, per part: [out along the cylinder, forward/aft]
export const VEX = { 11: [330, 150], 12: [330, 225], 13: [330, 300], 14: [150, 0], 15: [210, 260], 17: [330, 0], 18: [310, 390] };
export const vex = (id, k) => [sideOf(k) * VEX[id][0], FRONT(k) * VEX[id][1], 0];

// ---------------------------------------------------------------- the valve train (Section A-A, both valves)
// Each cylinder's A-A frame: a outward along its axis, z up, at y = v_k + off (inlet aft, exhaust
// forward, 64 apart). W(r, s) is the sheet's: along the valve axis s (8° above the cylinder axis) from
// the dome's centre, r across it.
const E = [Math.cos(P.VALVE_TILT), Math.sin(P.VALVE_TILT)];
const Nv = [-Math.sin(P.VALVE_TILT), Math.cos(P.VALVE_TILT)];
export const VALVE_AXIS = { o: P.CS, d: E, n: Nv };
export const VKEYS = { in: { off: -P.INLET_OFF, rv: M.VALVES.in.d / 2 }, ex: { off: P.INLET_OFF, rv: M.VALVES.ex.d / 2 } };
// the valve face sits on the dome: its axis is off the cylinder axis by `off`, so the face is drawn
// back to where the axis meets the dome's sphere
const FACE = Math.sqrt(M.SPHERE_R ** 2 - P.INLET_OFF ** 2) - 1;
function valveLoop(rv) {
  const s0 = FACE;
  const st = M.STEM_R;
  const pts = [[0, s0], [rv, s0], [rv, s0 + 1.6], [rv - 3, s0 + 4.4]];
  for (let i = 1; i <= 6; i++) {
    const t = i / 6;
    pts.push([st + (rv - 3 - st) * (1 - t) ** 2, s0 + 4.4 + 26 * t]);
  }
  pts.push([st, P.TIP - 0.8], [st - 0.8, P.TIP], [0, P.TIP]);
  return pts;
}
const RETAINER = [[7.2, P.TIP - 6], [20, P.TIP - 6], [20, P.TIP - 10], [14, P.TIP - 10], [9.5, P.TIP - 15], [7.2, P.TIP - 15]];
export const SPRINGS = P.SPRINGS; // outer and inner: wire, radius, turns
const PUSH_O = [P.SOCKET, P.CAM_C[1]];
const PUSH_D = P.PUSH_DIR;
const pushAt = (a) => (a - PUSH_O[0]) / PUSH_D[0]; // the distance along the pushrod line to a given a
function rockerShape() {
  // the sheet's lever (rocker()): valve tip to pushrod cup, with the boss round the shaft
  const tipEnd = [P.VALVE_TIP[0] - 2 * Nv[0], P.VALVE_TIP[1] - 2 * Nv[1]];
  const cupEnd = [P.CUP[0] + 6 * Nv[0], P.CUP[1] + 6 * Nv[1]];
  const w = 7;
  const side = (p, k) => [p[0] + k * w * E[0], p[1] + k * w * E[1]];
  return hull([side(tipEnd, -1), side(tipEnd, 1), side(cupEnd, 1), side(cupEnd, -1), ...disc(P.PIVOT[0], P.PIVOT[1], 12, 16)]);
}
// every piece of the valve train and the plugs, in its cylinder's A-A frame:
//   { id, k, key, y, kind: "lathe", loop [r, s], o [a, z], d [da, dz], seg } | { kind: "extrude", shape [a, z], y0, y1 }
//   | { kind: "helix", o, d, from, to, radius, wire, turns }; move: "valve" | "spring" | "rocker" | "tappet" | null
export function vtPieces() {
  const out = [];
  for (const k of IDS) {
    for (const [key, V] of Object.entries(VKEYS)) {
      const y = vOf(k) + V.off;
      const base = { k, key, y };
      out.push({ ...base, id: 11, kind: "lathe", loop: valveLoop(V.rv), o: P.CS, d: E, seg: 20, move: "valve" });
      out.push({ ...base, id: 12, kind: "lathe", loop: RETAINER, o: P.CS, d: E, seg: 16, move: "valve" });
      for (const sp of SPRINGS) out.push({ ...base, id: 12, kind: "helix", o: P.CS, d: E, from: P.FLOOR, to: P.TIP - 10, radius: sp.radius, wire: sp.wire, turns: sp.turns, move: "spring" });
      out.push({ ...base, id: 13, kind: "extrude", shape: rockerShape(), y0: y - 7, y1: y + 7, move: "rocker" });
      out.push({ ...base, id: 13, kind: "lathe", loop: [[0, -14], [6.5, -14], [6.5, 14], [0, 14]], o: [P.PIVOT[0], P.PIVOT[1]], d: null, axisY: true, seg: 12, move: null }); // rocker shaft
      const L = P.PUSH_LEN;
      out.push({ ...base, id: 14, kind: "lathe", loop: [[0, 0], [3.5, 0], [4.75, 2], [4.75, L - 2], [3.5, L], [0, L]], o: PUSH_O, d: PUSH_D, seg: 12, move: "tappet" });
      out.push({ ...base, id: 14, kind: "lathe", loop: [[9.6, pushAt(P.BOSS_END)], [11, pushAt(P.BOSS_END)], [11, pushAt(BOX.a0)], [9.6, pushAt(BOX.a0)]], o: PUSH_O, d: PUSH_D, seg: 16, move: null });
      out.push({ ...base, id: 15, kind: "lathe", loop: [[0, M.RB], [P.TAPPET_R, M.RB], [P.TAPPET_R, M.RB + P.TAPPET_L], [5.2, M.RB + P.TAPPET_L], [3, M.RB + P.TAPPET_L - 3.5], [0, M.RB + P.TAPPET_L - 4]], o: [0, P.CAM_C[1]], d: [1, 0], seg: 16, move: "tappet" });
    }
    // the plugs: top and bottom, each leaning 10° outboard of the vertical, tip on the dome (Detail C)
    for (const Pl of P.PLUGS) {
      const loop = [[0, -3.2], [1.4, -3.2], [1.4, -0.3], [9, -0.3], [9, 12.7], [12, 12.7], [12, 14.5], [12.8, 14.5], [12.8, 28], [9.5, 28], [9.5, 62], [7.5, 62], [7.5, 70], [0, 70]];
      out.push({ k, key: Pl.sg > 0 ? "top" : "bottom", y: vOf(k), id: 17, kind: "lathe", loop, o: Pl.tip, d: Pl.d, seg: 16, move: null });
    }
  }
  return out;
}
// the camshaft's lobes: cylinder k's `key` lobe points at its tappet (+x right bank, -x left) when its
// lift peaks; the shaft turns at half crank speed against the crank, CCW in (x, z) by phi/2
export const CAM_Z = P.CAM_C[1];
export const LOBE_W = 4;
export function lobeAngle(k, key) {
  const peak = M.CYL[k].offset + M.VALVES[key].centre; // crank angle of the lobe's peak
  return (sideOf(k) > 0 ? 0 : 180) - peak / 2;
}
function lobeOutline(k, key) {
  const t = lobeAngle(k, key) * rad;
  return M.camProfile(48).map(([x, z]) => [x * Math.cos(t) - z * Math.sin(t), CAM_Z + x * Math.sin(t) + z * Math.cos(t)]);
}

// ---------------------------------------------------------------- parts
function bounds(list) {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  const add = (p, r = 0) => p.forEach((v, i) => ((lo[i] = Math.min(lo[i], v - r)), (hi[i] = Math.max(hi[i], v + r))));
  for (const pc of list) {
    const s = sideOf(pc.k);
    const at = ([a, z], y = pc.y) => [s * a, y, z];
    if (pc.kind === "extrude") for (const [a, z] of pc.shape) (add(at([a, z], pc.y0)), add(at([a, z], pc.y1)));
    else if (pc.kind === "helix") for (const t of [pc.from, pc.to]) add(at([pc.o[0] + t * pc.d[0], pc.o[1] + t * pc.d[1]]), pc.radius + pc.wire);
    else {
      const rm = Math.max(...pc.loop.map(([r]) => r));
      if (pc.axisY) for (const [, sv] of pc.loop) add(at(pc.o, pc.y + sv), rm);
      else for (const [, sv] of pc.loop) add(at([pc.o[0] + sv * pc.d[0], pc.o[1] + sv * pc.d[1]]), rm);
    }
  }
  return [lo, hi];
}
// a hidden stand-in box per cylinder (or per group) for a part drawn from pieces
function standIns(id, groups) {
  return groups.map(({ list, explode }) => {
    const [lo, hi] = bounds(list);
    return S.box(lo, hi, { explode, standIn: true });
  });
}

export function parts() {
  const outP = [];
  const zBot = -95;

  // 1, 2 CRANKCASE HALVES: the A-A section swept along the crank, the plan's crank chambers (open to
  // the sump), the bearing channel and a half-round nose; the section skin is the plan's own outline
  const C = P.CASE;
  const CASE_AA = [[0, zBot], [150, zBot], [150, 95], [140, 100], [P.BOSS_END, 110], [P.BOSS_END, 140], [100, 152], [62, 165], [0, 165]];
  for (const side of [1, -1]) {
    const s = (pts) => (side > 0 ? pts : P.mirrorU(pts));
    const cyls = IDS.filter((k) => sideOf(k) === side).map(vOf).sort((a, b) => b - a);
    const front = P.chamber(P.MAINS.centre[1], P.MAINS.front[0], P.holeOf(cyls[0]));
    const rear = P.chamber(P.MAINS.rear[1], P.MAINS.centre[0], P.holeOf(cyls[1]));
    const channel = [[0, C.back - 0.5], [36, C.back - 0.5], [36, P.MAINS.rear[0]], [P.SHELL_R, P.MAINS.rear[0]], [P.SHELL_R, P.MAINS.front[1]], [C.bore, P.MAINS.front[1]], [C.bore, C.front + 0.5], [0, C.front + 0.5]];
    const ring = [...K.arc(0, 0, C.noseR, -90, 90, 16), ...K.arc(0, 0, C.bore, 90, -90, 16)].map(([x, z]) => [side * x, z]);
    // the material the plan cuts: three pieces between the chambers (see P.caseHalf)
    const split = (ch) => {
      const i0 = ch.findIndex(([x]) => x === C.out);
      return { low: ch.slice(1, i0 + 1), high: ch.slice(i0 + 1, -1) };
    };
    const F = split(front);
    const Rr = split(rear);
    const pieces = [
      [[36, C.back], [C.out, C.back], ...Rr.low.slice().reverse(), [P.SHELL_R, P.MAINS.rear[1]], [P.SHELL_R, P.MAINS.rear[0]], [36, P.MAINS.rear[0]]],
      [...F.low, ...Rr.high, [P.SHELL_R, P.MAINS.centre[0]], [P.SHELL_R, P.MAINS.centre[1]]],
      [...F.high, [P.SHELL_R, P.MAINS.front[0]], [P.SHELL_R, P.MAINS.front[1]], [C.bore, P.MAINS.front[1]], [C.bore, C.nose], [C.noseR, C.nose], [C.noseR, C.front], [C.out, C.front]],
    ];
    outP.push(
      S.part(side > 0 ? 1 : 2, side > 0 ? "CRANKCASE, RIGHT HALF" : "CRANKCASE, LEFT HALF", [
        S.extrude(s(CASE_AA).map(([x, z]) => [x, z]), { along: "y", from: C.back, to: C.front }),
        S.extrude(ring, { along: "y", from: C.front, to: C.nose }),
        ...pieces.map((pc) => skin(s(pc))),
        S.bore(S.extrude(s(front), { along: "z", from: zBot - 0.5, to: 90 })),
        S.bore(S.extrude(s(rear), { along: "z", from: zBot - 0.5, to: 90 })),
        S.bore(S.extrude(s(channel), { along: "z", from: -C.bore, to: C.bore })),
      ], {
        mat: "alu", angle: side > 0 ? 45 : 135, explode: [side * EX.case, 0, 0],
        anchor: { cut: [side * 145, side > 0 ? -190 : 210, 0], out: { c: [side * 150, side > 0 ? -190 : 210, 0], r: 0, axis: "x" } },
      }),
    );
  }

  // 3 MAIN BEARING SHELLS
  outP.push(
    S.part(3, "MAIN BEARING SHELL Ø60.3", Object.values(P.MAINS).map(([v0, v1]) => S.tube({ axis: "y", at: [0, 0], r0: P.MAIN_R, r1: P.SHELL_R, from: v0, to: v1 })), {
      hatch: "solid", anchor: { cut: [-31.8, 0, 0], out: { c: [0, 0, 0], r: P.SHELL_R, axis: "y" } },
    }),
  );

  // 4 CRANKSHAFT: three journal lathes (the front one carries the nose and the propeller flange, with
  // its six bushings), four pins and six webs, at crank angle 0; it turns about y
  const pin0 = (k) => M.crankPin(k, 0);
  const F = P.FLANGE;
  const crank = [
    S.lathe([[0, -250], [26, -250], [26, P.MAINS.rear[0]], [P.MAIN_R - 0.05, P.MAINS.rear[0]], [P.MAIN_R - 0.05, P.MAINS.rear[1]], [0, P.MAINS.rear[1]]], { axis: "y" }),
    S.cylinder({ axis: "y", at: [0, 0], r: P.MAIN_R - 0.05, from: P.MAINS.centre[0], to: P.MAINS.centre[1] }),
    S.lathe([[0, P.MAINS.front[0]], [P.MAIN_R - 0.05, P.MAINS.front[0]], [P.MAIN_R - 0.05, P.MAINS.front[1]], [P.NOSE_R, P.MAINS.front[1]], [P.NOSE_R, F.v0 - 6], [P.NOSE_R + 6, F.v0], [F.r, F.v0], [F.r, F.v1], [F.pilotR, F.v1], [F.pilotR, F.pilot], [0, F.pilot]], { axis: "y" }),
  ];
  for (let i = 0; i < 6; i++) {
    const t = (30 + 60 * i) * rad;
    crank.push(S.cylinder({ axis: "y", at: [F.bolt * Math.cos(t), F.bolt * Math.sin(t)], r: 7.5, from: F.v1 - 0.5, to: F.v1 + 14 }));
  }
  for (const k of IDS) {
    const [x, z] = pin0(k);
    crank.push(S.cylinder({ axis: "y", at: [x, z], r: P.PIN_CRANK_R, from: vOf(k) - 17, to: vOf(k) + 17 }));
  }
  for (const w of P.WEBS) {
    const pts = w.ends.flatMap((e) => (e === "main" ? disc(0, 0, 40) : disc(...pin0(e), 36)));
    crank.push(S.extrude(hull(pts), { along: "y", from: w.v[0], to: w.v[1] }));
  }
  outP.push(S.part(4, "CRANKSHAFT, 4 THROWS, FLANGE", crank, { hatch: "none", pivot: [0, 0, 0], anchor: { cut: [0, 307, 0], out: { c: [0, 307, 0], r: F.r, axis: "y" } } }));

  // 5 CONNECTING RODS: each the sheet's outline in its swing plane, swept ±16 along y; built at TDC
  const rods = IDS.map((k) => {
    const sd = sideOf(k);
    const Pc = pin0(k);
    const L = PA0 - R;
    const to = ([x, y]) => [Pc[0] + sd * y, Pc[1] + x];
    const outline = [...K.arc(0, 0, P.BIG_R, 68, -248, 28), [-9.5, L - 17], ...K.arc(0, L, P.SMALL_R, 245, -65, 18), [9.5, L - 17]].map(to);
    const holes = [K.circle(0, 0, P.PIN_CRANK_R + 0.2, 40), K.circle(0, L, P.PIN_R + 0.2, 32)].map((c) => c.map(to));
    return S.extrude(outline, { along: "y", from: vOf(k) - 16, to: vOf(k) + 16, holes, pivot: [Pc[0], vOf(k), Pc[1]], explode: out(k, EX.rod) });
  });
  outP.push(S.part(5, "CONNECTING ROD, H, 175 C/C", rods, { mat: "steel", angle: 135, anchor: { cut: [sideOf(3) * 150, vOf(3) + 8, 0], out: { c: [sideOf(3) * 150, vOf(3), 0], r: 16, axis: "y" }, solid: 2 } }));

  // 6 PISTONS (ring grooves), 7 RINGS, 8 PINS (the pin floats inside the skirt)
  const C0 = PA0 + M.COMP_H;
  outP.push(
    S.part(6, "PISTON Ø130.2", IDS.map((k) => cyl(k, pistonLoop(), { pivot: [0, 0, 0], explode: out(k, EX.piston), grp: k })), {
      mat: "alu", angle: 60, anchor: { cut: [sideOf(3) * (PA0 + 25), vOf(3) - 45, 0], out: { c: [sideOf(3) * (PA0 + 20), vOf(3), 0], r: 65, axis: "x" }, solid: 2 },
    }),
    S.part(7, "PISTON RING SET, 3 RINGS", IDS.flatMap((k) => RINGS.map(([d0, d1]) => cyl(k, [[60.3, C0 - d1], [BR - 0.05, C0 - d1], [BR - 0.05, C0 - d0], [60.3, C0 - d0]], { pivot: [0, 0, 0], explode: out(k, EX.ring), grp: k }))), {
      hatch: "solid", anchor: { cut: [sideOf(1) * (C0 - 15.3), vOf(1) + 62.7, 0], out: { c: [sideOf(1) * (C0 - 15.3), vOf(1), 0], r: BR, axis: "x" }, solid: 1 },
    }),
    S.part(8, "PISTON PIN Ø28, FLOATING", IDS.map((k) => S.cylinder({ axis: "y", at: [sideOf(k) * PA0, 0], r: P.PIN_R, from: vOf(k) - 60.3, to: vOf(k) + 60.3, pivot: [0, 0, 0], explode: out(k, EX.piston), grp: k })), {
      hatch: "none", anchor: { cut: [sideOf(3) * PA0, vOf(3) - 40, 0], out: { c: [sideOf(3) * PA0, vOf(3) - 40, 0], r: P.PIN_R, axis: "y" }, solid: 2 },
    }),
  );

  // 9 BARRELS (ten fins), 10 HEADS (seventeen fins, the dome, the rocker box and its window)
  outP.push(
    S.part(9, "CYLINDER BARREL Ø130.2, FINNED", IDS.map((k) => cyl(k, barrelLoop(), { explode: out(k, EX.barrel), grp: sideOf(k) })), {
      mat: "steel", angle: 45, anchor: { cut: [sideOf(4) * 200, vOf(4) - 80, 0], out: { c: [sideOf(4) * 200, vOf(4), 0], r: P.FIN_R, axis: "x" }, solid: 3 },
    }),
  );
  // [z, c] across the box (along x: the shape is [z, y])
  const ci = WIN.c;
  const zr = BOX.top - 8;
  const U = [[BOX.z0, -BOX.half], [BOX.z0, -ci], [zr, -ci], [zr, ci], [BOX.z0, ci], [BOX.z0, BOX.half], [BOX.top - 6, BOX.half], [BOX.top, BOX.half - 6], [BOX.top, -BOX.half + 6], [BOX.top - 6, -BOX.half]];
  const plate = [[BOX.z0, -ci], [zr, -ci], [zr, ci], [BOX.z0, ci]];
  const cavAA = [[WIN.a0, -2], [WIN.a1, -2], [WIN.a1, BOX.top - 8], [WIN.a0, BOX.top - 8]];
  const sec = headSection();
  const head = (k) => {
    const sd = sideOf(k);
    const v = vOf(k);
    const xs = (pts) => pts.map(([a, z]) => [sd * a, z]);
    const win = [[WIN.a0, -WIN.c], [WIN.a1, -WIN.c], [WIN.a1, WIN.c], [WIN.a0, WIN.c]];
    const plan = (pts) => pts.map(([a, c]) => [sd * a, v + c]);
    const o = { explode: out(k, EX.head), grp: sd };
    return [
      cyl(k, headLoopIn(), o),
      cyl(k, headLoopOut(), { ...o, gap: GAP }),
      // the rocker box: a channel open underneath (walls and roof) closed by two end plates, so no
      // face of it lies inside the cavity the window looks into
      S.extrude(U.map(([z, c]) => [z, v + c]), { along: "x", from: sd > 0 ? BOX.a0 : -BOX.a1, to: sd > 0 ? BOX.a1 : -BOX.a0, ...o }),
      ...[[BOX.a0, WIN.a0], [WIN.a1, BOX.a1]].map(([a0, a1]) => S.extrude(plate.map(([z, c]) => [z, v + c]), { along: "x", from: sd > 0 ? a0 : -a1, to: sd > 0 ? a1 : -a0, ...o })),
      { ...skin(plan(sec), [plan(win)]), ...o },
      S.bore(S.extrude(xs(cavAA), { along: "y", from: v - WIN.c, to: v + WIN.c, ...o })),
    ];
  };
  outP.push(
    S.part(10, "CYLINDER HEAD + ROCKER BOX", IDS.flatMap(head), {
      mat: "alu", angle: 135, anchor: { cut: [sideOf(2) * 300, vOf(2) + 70, 0], out: { c: [sideOf(2) * 300, vOf(2), 0], r: HEAD_FIN_R, axis: "x" }, solid: 4 },
    }),
  );

  // 11 VALVES, 12 SPRINGS + RETAINERS, 13 ROCKERS, 14 PUSHRODS + SHROUD TUBES, 15 TAPPETS, 17 PLUGS:
  // drawn from vtPieces by the page; here one hidden stand-in per cylinder (framing, anchors, explode)
  const VT = vtPieces();
  const per = (id, k, f = () => true) => VT.filter((p) => p.id === id && p.k === k && f(p));
  const group = (id, f) => IDS.map((k) => ({ list: per(id, k, f), explode: vex(id, k) }));
  const inl = (p) => p.key === "in";
  const vt = (id) => {
    const A = P.CS[0];
    return {
      11: { name: "VALVE, INLET Ø49 / EXHAUST Ø41", anchor: { cut: [A + 150, vOf(1) - 32, 20], solid: 0 }, mat: "steel", angle: 30 },
      12: { name: "VALVE SPRING PAIR + RETAINER", anchor: { cut: [A + 176, vOf(1) - 32 + 14, 17], solid: 0 }, hatch: "solid" },
      13: { name: "ROCKER ARM, RATIO 1.45", anchor: { cut: [P.PIVOT[0] - 6, vOf(1) - 32, P.PIVOT[1] - 14], solid: 0 }, mat: "steel", angle: 45 },
      14: { name: "PUSHROD Ø9.5 + SHROUD TUBE", anchor: { cut: [200, vOf(1) + 32, P.CAM_C[1] - 8], solid: 0 }, hatch: "solid" },
      15: { name: "HYDRAULIC TAPPET Ø21", anchor: { cut: [50, vOf(1) - 32, P.CAM_C[1]], solid: 0 }, mat: "steel", angle: 45 },
    }[id];
  };
  for (const id of [11, 12, 13, 14, 15]) {
    const d = vt(id);
    outP.push(S.part(id, d.name, standIns(id, group(id)), { ...(d.hatch ? { hatch: d.hatch } : { mat: d.mat, angle: d.angle }), anchor: { ...d.anchor, out: { c: d.anchor.cut, r: 0, axis: "box" } } }));
  }

  // 16 CAMSHAFT: above the crank, half crank speed; a lobe per valve
  const lobes = [];
  for (const k of IDS) for (const key of ["in", "ex"]) {
    const y = vOf(k) + VKEYS[key].off;
    lobes.push(S.extrude(lobeOutline(k, key), { along: "y", from: y - LOBE_W, to: y + LOBE_W }));
  }
  outP.push(
    S.part(16, "CAMSHAFT", [S.lathe([[0, -214], [14, -214], [14, 200], [0, 200]], { axis: "y", at: [0, CAM_Z] }), ...lobes], {
      mat: "iron", angle: 60, pivot: [0, 0, CAM_Z], explode: [0, -560, 0], anchor: { cut: [0, -150, CAM_Z], out: { c: [0, -150, CAM_Z], r: 14, axis: "y" } },
    }),
  );

  // 17 SPARK PLUGS (stand-ins: the top pair per bank, the bottom pair per bank)
  const plugs = [];
  for (const top of [true, false]) for (const sd of [1, -1]) {
    const ks = IDS.filter((k) => sideOf(k) === sd);
    plugs.push({ list: VT.filter((p) => p.id === 17 && ks.includes(p.k) && (p.key === "top") === top), explode: [sd * VEX[17][0], 0, 0] });
  }
  const plug1 = P.PLUGS[0];
  const pa = (s) => [plug1.tip[0] + s * plug1.d[0], plug1.tip[1] + s * plug1.d[1]];
  outP.push(S.part(17, "SPARK PLUG 18×1.5, SHIELDED", standIns(17, plugs), { hatch: "none", anchor: { cut: [pa(2)[0], vOf(1), pa(2)[1]], out: { c: [pa(50)[0], vOf(1), pa(50)[1]], r: 9.5, axis: "box" }, solid: 0 } }));

  // 18 ROCKER BOX COVERS: the sheet's cover section along the box
  const cover = (() => {
    const t = BOX.top;
    const a0 = BOX.a0;
    const a1 = BOX.a1 - 6;
    return [[a0, t], [a1, t], [a1, t + 7], [a1 - 7, t + 14], [a0 + 7, t + 14], [a0, t + 7]];
  })();
  outP.push(
    S.part(18, "ROCKER BOX COVER", IDS.map((k) => S.extrude(cover.map(([a, z]) => [sideOf(k) * a, z]), { along: "y", from: vOf(k) - BOX.half, to: vOf(k) + BOX.half, explode: vex(18, k), grp: k })), {
      mat: "alu", angle: 45, anchor: { cut: [sideOf(1) * 360, vOf(1) + 30, BOX.top + 10], out: { c: [sideOf(1) * 360, vOf(1), BOX.top + 14], r: 0, axis: "box" }, solid: 0 },
    }),
  );

  // 19 CRANK GEAR (turns with the crank), 20 MAGNETO DRIVE GEARS (1:1, the other way), 21 MAGNETOS,
  // 22 OIL PUMP, 23 ACCESSORY HOUSING
  const G = P.GEAR;
  const MG = P.MAG;
  const magLoop = [[0, MG.v0], [44, MG.v0], [44, MG.v0 - 6], [MG.r, MG.v0 - 6], [MG.r, -298], [MG.r + 3, -300], [MG.r + 3, -306], [MG.r, -308], [MG.r, -342], [MG.r - 8, -350], [24, -350], [24, -366], [18, MG.v1], [0, MG.v1]];
  outP.push(
    S.part(19, "CRANKSHAFT GEAR z24 m3", [S.gear({ teeth: G.z, module: G.m, along: "y", at: [0, 0], from: G.v0, to: G.v1, bore: 26.05 })], {
      mat: "steel", angle: 30, pivot: [0, 0, 0], explode: [0, EX.gear, 0], anchor: { cut: [-30, -237, 0], out: { c: [0, -237, 0], r: 39, axis: "y" } },
    }),
    S.part(20, "MAGNETO DRIVE GEAR z24 m3", [1, -1].map((sg) => S.gear({ teeth: G.z, module: G.m, along: "y", at: [sg * P.MAG_U, 0], from: G.v0, to: G.v1, phase: 180 / G.z, pivot: [sg * P.MAG_U, 0, 0], explode: [sg * 30, 0, 0] })), {
      mat: "steel", angle: 60, explode: [0, EX.gear, 0], anchor: { cut: [P.MAG_U + 30, -237, 0], out: { c: [P.MAG_U, -237, 0], r: 39, axis: "y" }, solid: 0 },
    }),
    S.part(21, "MAGNETO, 4-CYL, 1:1", [1, -1].flatMap((sg) => [
      S.lathe(magLoop, { axis: "y", at: [sg * P.MAG_U, 0], explode: [sg * 40, 0, 0], grp: sg }),
      S.box([sg * P.MAG_U - 13, -334, 30], [sg * P.MAG_U + 13, -312, MG.r + 12], { explode: [sg * 40, 0, 0], grp: sg }),
    ]), {
      hatch: "none", explode: [0, EX.mag, 0], anchor: { cut: [-P.MAG_U, -320, 0], out: { c: [-P.MAG_U, -320, 0], r: 38, axis: "y" }, solid: 2 },
    }),
    S.part(22, "OIL PUMP, GEAR TYPE", [S.extrude(S.rrectAt(0, 0, 27, 30, 5), { along: "y", from: P.PUMP.v1, to: P.PUMP.v0 })], {
      mat: "alu", angle: 45, explode: [0, EX.pump, 0], anchor: { cut: [0, -290, 0], out: { c: [0, -280, 0], r: 30, axis: "y" } },
    }),
    S.part(23, "ACCESSORY HOUSING", [
      S.extrude(S.rrectAt(0, 22.5, P.ACC.half, 117.5, 8), { along: "y", from: P.ACC.v1, to: P.ACC.v0 }),
      S.bore(S.extrude(S.rrectAt(0, 0, P.ACC.cavHalf, 60, 6), { along: "y", from: P.ACC.cav[1], to: P.ACC.v0 + 0.5 })),
    ], { mat: "alu", angle: 60, explode: [0, EX.acc, 0], anchor: { cut: [-135, -242, 0], out: { c: [-135, -242, 0], r: 117.5, axis: "z" } } }),
  );

  // 24 SUMP (its well a bore), 25 INTAKE PIPES (along x under the barrels, up into the heads),
  // 26 CARBURETTOR, 27 SEAL. 24 to 26 lie wholly in the half the section removes.
  const both = (half) => [...half.slice(0, -1), ...P.mirrorU(half).slice(0, -1)];
  const sumpOuter = both(P.sumpOuter());
  const sumpInner = both(P.sumpInner()).map(([x, z]) => [x, Math.min(z, -96)]);
  outP.push(
    S.part(24, "OIL SUMP + INDUCTION RISER", [
      S.extrude(sumpOuter, { along: "y", from: -200, to: 190 }),
      S.bore(S.extrude(sumpInner, { along: "y", from: -194, to: 184 })),
    ], { mat: "alu", angle: 135, explode: [0, 0, EX.sump], anchor: { cut: [122, -160, -150], out: { c: [122, -160, -150], r: 0, axis: "x" } } }),
  );
  const pipes = IDS.flatMap((k) => {
    const sd = sideOf(k);
    const y = vOf(k) - P.INLET_OFF;
    const x0 = sd * 122;
    const x1 = sd * (P.PORT_EXIT[0] - P.PIPE_R);
    return [
      S.tube({ axis: "x", at: [y, P.PIPE_Z], r0: P.PIPE_R - 2, r1: P.PIPE_R, from: Math.min(x0, x1), to: Math.max(x0, x1) }),
      S.lathe([[P.PIPE_R - 2, P.PIPE_Z - P.PIPE_R], [P.PIPE_R, P.PIPE_Z - P.PIPE_R], [P.PIPE_R, -HEAD_R], [P.PIPE_R - 2, -HEAD_R]], { axis: "z", at: [sd * P.PORT_EXIT[0], y] }),
    ];
  });
  outP.push(S.part(25, "INTAKE PIPE Ø38×2", pipes, { hatch: "solid", explode: [0, 0, EX.pipe], anchor: { cut: [sideOf(4) * 250, vOf(4) - P.INLET_OFF, P.PIPE_Z], out: { c: [sideOf(4) * 250, vOf(4) - P.INLET_OFF, P.PIPE_Z], r: P.PIPE_R, axis: "x" }, solid: 6 } }));
  outP.push(
    S.part(26, "CARBURETTOR, UPDRAFT, FLOAT", [S.lathe([[0, -222], [34, -222], [34, -262], [58, -262], [58, -304], [38, -304], [38, -322], [0, -322]], { axis: "z", at: [0, 0] })], {
      hatch: "none", explode: [0, 0, EX.carb], anchor: { cut: [0, 0, -280], out: { c: [0, 0, -280], r: 58, axis: "z" } },
    }),
    S.part(27, "CRANKSHAFT OIL SEAL Ø68", [S.tube({ axis: "y", at: [0, 0], r0: P.NOSE_R + 0.05, r1: C.bore - 0.05, from: P.SEAL.v0, to: P.SEAL.v1 })], {
      mat: "rubber", angle: 45, explode: [0, 60, 0], anchor: { cut: [40, 265, 0], out: { c: [0, 265, 0], r: 46, axis: "y" } },
    }),
  );
  return outP;
}
// the parts the section removes whole: drawn only with the cut off
export const BELOW = [24, 25, 26];

// ---------------------------------------------------------------- the gas in each cylinder, built at TDC
const IN = 0.03;
export function gasLoop() {
  const a0 = M.crownAtTDC - 1.2;
  return [[0, a0], [BR - IN, a0], [BR - IN, HF], ...DOME.slice().reverse().map(([r, a]) => [Math.max(0, r - IN), a - IN])];
}
export const GAS_FROM = M.crownAtTDC - 0.5;
export function fluids() {
  return IDS.map((k) => {
    const sd = sideOf(k);
    // right bank: the dome end is stretched back out as the gas moves in with the crown; left bank:
    // the crown end (s > from) is stretched in toward the crank
    const from = sd > 0 ? GAS_FROM : -GAS_FROM;
    return S.fluid(`g${k}`, cyl(k, gasLoop()), { stretch: { from } });
  });
}

export const centres = () => [
  [[0, -260, 0], [0, 340, 0]],
  ...IDS.map((k) => [[sideOf(k) * 100, vOf(k), 0], [sideOf(k) * 425, vOf(k), 0]]),
];

// ---------------------------------------------------------------- the mirror through the section plane
export const FZ = -1;
const fz = (p) => (p ? [p[0], p[1], FZ * p[2]] : p);
export function flipSolid(s) {
  const o = { ...s };
  if (s.pivot) o.pivot = fz(s.pivot);
  if (Array.isArray(s.explode)) o.explode = fz(s.explode);
  if (s.kind === "lathe") {
    if (s.axis === "z") o.loop = s.loop.map(([r, a]) => [r, FZ * a]);
    else o.at = [s.at[0], FZ * s.at[1]];
  } else if (s.kind === "extrude") {
    if (s.along === "z") {
      o.from = Math.min(FZ * s.from, FZ * s.to);
      o.to = Math.max(FZ * s.from, FZ * s.to);
    } else if (s.along === "y") {
      o.shape = s.shape.map(([a, b]) => [a, FZ * b]);
      o.holes = s.holes.map((h) => h.map(([a, b]) => [a, FZ * b]));
    } else {
      o.shape = s.shape.map(([a, b]) => [FZ * a, b]);
      o.holes = s.holes.map((h) => h.map(([a, b]) => [FZ * a, b]));
    }
  } else if (s.kind === "box") {
    o.min = [s.min[0], s.min[1], Math.min(FZ * s.min[2], FZ * s.max[2])];
    o.max = [s.max[0], s.max[1], Math.max(FZ * s.min[2], FZ * s.max[2])];
  }
  return o;
}
export function flipPart(p) {
  const o = { ...p, solids: p.solids.map(flipSolid) };
  if (p.pivot) o.pivot = fz(p.pivot);
  if (Array.isArray(p.explode)) o.explode = fz(p.explode);
  else if (p.explode?.to) o.explode = { to: fz(p.explode.to) };
  if (p.anchor) o.anchor = { ...p.anchor, ...(p.anchor.cut ? { cut: fz(p.anchor.cut) } : {}), ...(p.anchor.out ? { out: { ...p.anchor.out, c: fz(p.anchor.out.c) } } : {}) };
  return o;
}
export const scene = () => ({ parts: parts().map(flipPart), fluids: fluids().map(flipSolid), centres: centres() });
