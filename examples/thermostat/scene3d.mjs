// The wax thermostat's solids for its 3D view (thermostat-3d.html), in the same world mm as parts.mjs:
// u is x, v is y, the thermostat's axis is x = z = 0, the flange's top face is y = 0, and the sheet's
// cutting plane (SECTION A-A) is z = 0. Pure data built with kit/solid3d.mjs.
// Every profile is the 2D sheet's (parts.mjs exports the loops and key positions; model.mjs the
// pellet). The pellet assembly is built cold, valve shut, as on the sheet; live3d.js moves it down by
// the lift, rebuilds the sock and the wax, and scales the two springs.
//
// What the sheet draws only in section and the 3D view has to invent, kept plain:
//   - the housing is a turned body with an engine pad (left), a sensor boss (right) and two more bolt
//     lugs at ±120° from the cut bolt (the sheet's note 5: three bolts);
//   - the cover is a round flange with a squared duct running into the round Ø30 spigot, so that its
//     section at z = 0 is the sheet's (left wall, roof, spigot) without booleans;
//   - the bridge and the stirrup legs are 8 mm strips (View C), the stirrup's foot a ring the main
//     spring stands on.

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const TAU = Math.PI * 2;
const PV = P.SENSOR_V; // the sensor's axis height
export const SPIGOT_V = 22; // the spigot's axis height (the sheet's flow line and centre line)
export const BOLT_R = -P.BOLT_U; // 36: the bolt circle
export const BOLT_ANGLES = [180, 60, -60]; // degrees in plan (x, z); 180 is the cut bolt at x = -36
export const bolts = BOLT_ANGLES.map((a) => [BOLT_R * Math.cos((a * Math.PI) / 180), BOLT_R * Math.sin((a * Math.PI) / 180)]);
// The pellet internals explode up a parallel axis this far to the left (a jogged explosion line).
export const JOG = -112;

// springs: built at rest (valve shut) and scaled about their lower ends by live3d.js
export const MAIN_SPRING = { from: P.SPRING_SEAT, to: P.SEAT_V - 1.5, radius: 14, wire: 2, turns: 6 };
export const BP_SPRING = { from: P.BP_DISC + 1.5, to: -38, radius: 5.5, wire: 0.8, turns: 4 };
export const MAIN_LEN = MAIN_SPRING.to - MAIN_SPRING.from;
export const BP_LEN = BP_SPRING.to - BP_SPRING.from;
// a point of a coil on the cutting plane (z = 0) on +x, at coil quarter-turn k (odd), for a balloon
function coilPoint(sp, k) {
  const t = k / (4 * sp.turns);
  return [sp.radius, sp.from + sp.wire / 2 + t * (sp.to - sp.from - sp.wire), 0];
}

// ---------------------------------------------------------------- extrusions with holes (a kit workaround)

// THREE.ExtrudeGeometry corrects a hole's winding only when it reverses the outline. S.extrude along y or
// x mirrors the outline first, so a counter-clockwise outline keeps its holes as given, and a hole given
// counter-clockwise too comes out wound inside out: its walls are back faces and the cut paints them
// as a hatched face across the hole. Every hole here is given the winding that ends counter-clockwise.
const area = (pts) => pts.reduce((a, [x0, y0], i) => {
  const [x1, y1] = pts[(i + 1) % pts.length];
  return a + x0 * y1 - x1 * y0;
}, 0);
function extrude(shape, o) {
  const mirrored = o.along === "y" || o.along === "x";
  const holes = (o.holes ?? []).map((h) => (area(h) > 0 === mirrored ? h.slice().reverse() : h));
  return S.extrude(shape, { ...o, holes });
}

// ---------------------------------------------------------------- plan outlines (extrude along y: [x, z])

// A star-shaped outline round the axis as the furthest of several shapes in each direction.
function polar(fn, n = 720) {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * TAU;
    const r = fn(t);
    return [r * Math.cos(t), r * Math.sin(t)];
  });
}
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// A bolt lug: a strip of half-width a from the axis out to a round end centred d out, at angle phi.
function lugR(t, phi, d, a) {
  const D = wrap(t - phi);
  if (Math.cos(D) <= 0) return 0;
  const s = Math.abs(Math.sin(D));
  if (Math.abs(Math.tan(D)) <= a / d) return d * Math.cos(D) + Math.sqrt(Math.max(0, a * a - d * d * s * s));
  return a / s;
}
// The far side of the box x0 ≤ x ≤ x1, |z| ≤ Z, that holds the axis on its edge (x0 = 0 or x1 = 0).
function boxR(t, x0, x1, Z) {
  const c = Math.cos(t);
  const X = c > 0 ? x1 : -x0;
  if (Math.abs(c) < 1e-9 || X <= 0) return 0;
  const s = Math.abs(Math.sin(t));
  return Math.min(X / Math.abs(c), s > 1e-9 ? Z / s : Infinity);
}
// A lug alone, at angle phi: its inner end an arc on the body's radius R0 (so it touches the body and
// never overlaps it), its outer end round, of half-width a, centred d out.
function lugOutline(phi, R0, d, a) {
  const u = [Math.cos(phi), Math.sin(phi)];
  const p = [-u[1], u[0]];
  const at = (k, m) => [k * u[0] + m * p[0], k * u[1] + m * p[1]];
  const k0 = Math.sqrt(R0 * R0 - a * a);
  const end = Array.from({ length: 25 }, (_, i) => {
    const b = -Math.PI / 2 + (i / 24) * Math.PI;
    return at(d + a * Math.cos(b), a * Math.sin(b));
  });
  const beta = Math.asin(a / R0);
  const inner = Array.from({ length: 11 }, (_, i) => {
    const g = phi + beta - (2 * beta * i) / 10;
    return [R0 * Math.cos(g), R0 * Math.sin(g)];
  });
  return [at(k0, -a), ...end, at(k0, a), ...inner.slice(1, -1)];
}
const arcXZ = (r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => {
  const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
  return [r * Math.cos(a), r * Math.sin(a)];
});
const deg = (x) => (x * 180) / Math.PI;

// ---------------------------------------------------------------- the cover's pieces

const COVER = { ri: 26, ro: 29.5, flange: 32.7, duct: 15, ductIn: 12, end: 40, endTo: 43, roof: 34, top: 37, floor: 10, base: 8 };
function coverSolids() {
  const C = COVER;
  // flange plate (y 0..8): the round flange, three bolt lugs and the spigot's root, Ø52 hole
  const plate = polar((t) => Math.max(C.flange, ...BOLT_ANGLES.map((a) => lugR(t, (a * Math.PI) / 180, BOLT_R, 7)), boxR(t, 0, C.end, C.duct)));
  const holes = [S.circle(0, 0, C.ri, 120), ...bolts.map(([x, z]) => S.circle(x, z, 3.3, 28))];
  // the wall (y 8..34): a C, round on the left, its arms the duct's sides out to the end plate
  const ai = deg(Math.asin(C.ductIn / C.ri));
  const ao = deg(Math.asin(C.duct / C.ro));
  const xi = Math.sqrt(C.ri ** 2 - C.ductIn ** 2);
  const xo = Math.sqrt(C.ro ** 2 - C.duct ** 2);
  const wall = [
    [C.end, C.ductIn], [xi, C.ductIn], ...arcXZ(C.ri, ai, 360 - ai, 96).slice(1, -1), [xi, -C.ductIn], [C.end, -C.ductIn],
    [C.end, -C.duct], [xo, -C.duct], ...arcXZ(C.ro, 360 - ao, ao, 96).slice(1, -1), [xo, C.duct], [C.end, C.duct],
  ];
  // the duct's floor (y 8..10) between the wall's arms
  const floor = [[C.end, -C.ductIn], [C.end, C.ductIn], [xi, C.ductIn], ...arcXZ(C.ri, ai, -ai, 24).slice(1, -1), [xi, -C.ductIn]];
  // the roof (y 34..37) over the round part and the duct
  const roof = [[C.end, -C.duct], [C.end, C.duct], [xo, C.duct], ...arcXZ(C.ro, ao, 360 - ao, 120).slice(1, -1), [xo, -C.duct]];
  return [
    extrude(plate, { along: "y", from: 0, to: C.base, holes }),
    S.extrude(wall, { along: "y", from: C.base, to: C.roof }),
    S.extrude(floor, { along: "y", from: C.base, to: C.floor }),
    S.extrude(roof, { along: "y", from: C.roof, to: C.top }),
    // end plate where the squared duct becomes the round spigot (its section at z = 0 is the sheet's walls)
    extrude(K.rect(-C.duct, 7, C.duct, C.top), { along: "x", from: C.end, to: C.endTo, holes: [S.circle(0, SPIGOT_V, C.ductIn, 64)] }),
    // the gusset under it, the sheet's [40,4]-[43,7] chamfer
    S.extrude([[C.end, 4], [C.endTo, 7], [C.end, 7]], { along: "z", from: -6, to: 6 }),
    // the spigot with its hose bead
    S.lathe([[C.ductIn, C.endTo], [15, C.endTo], [15, 51], [16.2, 52.5], [16.2, 55], [15, 56], [C.ductIn, 56]], { axis: "x", at: SPIGOT_V }),
  ];
}

// ---------------------------------------------------------------- the housing's pieces

const PAD = { x: -43, z: 18 }; // the engine pad's plan: x ≥ -43, |z| ≤ 18
function housingSolids() {
  const R = 34; // the body's outside below the flange
  const body = [
    [P.PORT_R, P.BOTTOM], [31, P.BOTTOM], [R, -69], [R, -4], [P.CHAMBER_R, -4],
    [P.CHAMBER_R, P.FLOOR], [13.5, P.FLOOR], [13.5, -59.5], [13, P.BOSS_V], [P.PORT_R, P.BOSS_V],
  ];
  // the top flange (y -4..0): round Ø76, with the engine pad and the two other bolt lugs, in two
  // plates for the seal's counterbore (Ø58, 3 deep) and the chamber (Ø48)
  const flange = polar((t) => Math.max(38, lugR(t, (60 * Math.PI) / 180, BOLT_R, 7), lugR(t, (-60 * Math.PI) / 180, BOLT_R, 7), boxR(t, PAD.x, 0, PAD.z)));
  const boltHoles = bolts.map(([x, z]) => S.circle(x, z, 3.05, 28));
  // the engine pad below the flange, from the section's left outline; its inner face lands on the body
  const pad = [[-R, -4], [PAD.x, -4], [PAD.x, -27], [-45, -30], [-48, -30], [-48, -62], [-45, -62], [-43, -65], [-43, -69], [-40, P.BOTTOM], [-R, P.BOTTOM]];
  // the sensor boss on the right
  const boss = [[R, -36], [38, -38], [38, -58], [R, -62]];
  const [, ...extra] = bolts;
  return [
    S.lathe(body),
    extrude(flange, { along: "y", from: -3, to: 0, holes: [S.circle(0, 0, 29, 144), ...boltHoles] }),
    extrude(flange, { along: "y", from: -4, to: -3, holes: [S.circle(0, 0, P.CHAMBER_R, 144), ...boltHoles] }),
    S.extrude(pad, { along: "z", from: -PAD.z, to: PAD.z, conform: { x: -R, r: R } }),
    S.extrude(boss, { along: "z", from: -11, to: 11, conform: { x: R, r: R } }),
    ...extra.map(([x, z], i) => extrude(lugOutline((BOLT_ANGLES[i + 1] * Math.PI) / 180, R, BOLT_R, 7), { along: "y", from: -18, to: -4, holes: [S.circle(x, z, 3.05, 28)] })),
    // passages: the inlet from the head, the sensor's tapped hole, the cut bolt's tapped hole
    S.bore(S.lathe([[0, -48.01], [10, -48.01], [10, -23.95], [0, -23.95]], { axis: "x", at: -46 })),
    S.bore(S.lathe([[0, 23.95], [6, 23.95], [6, 38.01], [0, 38.01]], { axis: "x", at: PV })),
    S.bore(S.lathe([[0, -3.99], [3, -3.99], [3, -16], [2.5, -16], [2.5, -18], [0, -19.5]], { at: P.BOLT_U })),
    // where the inlet opens into the chamber
    S.disc([-21.9, -46, 0], 9.9, { normal: "x", role: "mouth" }),
  ];
}

// ---------------------------------------------------------------- the stirrup's foot

function stirrupFoot() {
  const w = 4;
  const R = 19.9;
  const X = 20.9;
  const a = deg(Math.asin(w / R));
  const xr = Math.sqrt(R * R - w * w);
  return [[X, -w], [X, w], [xr, w], ...arcXZ(R, a, 180 - a, 48).slice(1, -1), [-xr, w], [-X, w], [-X, -w], [-xr, -w], ...arcXZ(R, 180 + a, 360 - a, 48).slice(1, -1), [xr, -w]];
}

// ---------------------------------------------------------------- the wax: liquid round a shrinking solid core

// The sock's outer edge below its flange, from (3.5, -22) down to its tip on the axis (cup frame).
function sockEdge(L) {
  return P.sleeveLoop(L).slice(3, 13);
}
function edgeAt(edge, y) {
  if (y >= edge[0][1]) return edge[0][0];
  for (let i = 1; i < edge.length; i++) {
    const [r0, y0] = edge[i - 1];
    const [r1, y1] = edge[i];
    if (y >= y1) return y0 === y1 ? r1 : r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return 0;
}
// where the edge (decreasing r with y) has radius rs
function edgeY(edge, rs) {
  for (let i = 1; i < edge.length; i++) {
    const [r0, y0] = edge[i - 1];
    const [r1, y1] = edge[i];
    if (r1 <= rs && r0 >= rs) return r0 === r1 ? y0 : y0 + ((y1 - y0) * (rs - r0)) / (r1 - r0);
  }
  return edge[edge.length - 1][1];
}
const W_IN = M.CUP.ri;
const W_FLOOR = M.CUP.floor;
const W_TOP = M.WAX_TOP;
// { liquid, core }: closed half-profiles in the cup frame (null when that phase is absent)
export function wax(L, f) {
  const edge = sockEdge(L);
  const whole = [[0, W_FLOOR], [W_IN, W_FLOOR], [W_IN, W_TOP], ...edge];
  const s = Math.sqrt(Math.max(0, 1 - f));
  const rs = W_IN * s;
  const bottom = W_FLOOR + 6 * (1 - s); // as the sheet's waxCore
  if (rs > W_IN - 0.35) return { liquid: null, core: whole };
  if (rs < 0.35) return { liquid: whole, core: null };
  const ytop = rs >= edge[0][0] ? W_TOP : Math.min(W_TOP, edgeY(edge, rs));
  if (ytop < bottom + 0.3) return { liquid: whole, core: null };
  const between = edge.filter(([, y]) => y < ytop && y > bottom);
  const gb = edgeAt(edge, bottom);
  const core = [[rs, bottom], [rs, ytop], [Math.min(rs, edgeAt(edge, ytop)), ytop], ...between, [gb, bottom]];
  const above = edge.filter(([, y]) => y > ytop);
  const below = edge.filter(([, y]) => y < bottom);
  const liquid = [[W_IN, W_FLOOR], [W_IN, W_TOP], ...(ytop < W_TOP ? above : []), [rs, ytop], [rs, bottom], [gb, bottom], ...below];
  if (liquid[liquid.length - 1][0] > 0 || liquid[liquid.length - 1][1] > W_FLOOR) liquid.push([0, W_FLOOR]);
  return { liquid: dedupe(liquid), core: dedupe(core) };
}
function dedupe(loop) {
  return loop.filter((p, i) => {
    const q = loop[(i + loop.length - 1) % loop.length];
    return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-4;
  });
}

// ---------------------------------------------------------------- parts

const up = (dy) => [0, dy, 0];
const jog = (dy) => ({ to: [JOG, dy, 0] });
const FRAME = 66; // the thermostat's frame (flange, bridge, pin, stirrup, jiggle valve) lifts this far

export function parts() {
  const hex = (x, z) => S.polygon(6, 5 / Math.cos(Math.PI / 6), x, z, Math.PI / 6);
  const w0 = wax(0, 0);
  const spMain = { axis: "y", at: 0, ...MAIN_SPRING };
  const spByp = { axis: "y", at: 0, ...BP_SPRING };
  return [
    S.part(1, "WATER OUTLET HOUSING", housingSolids(), { mat: "alu", angle: 45, anchor: { cut: [-38, -66, 0], out: { c: [-40, -50, 18] } } }),
    S.part(2, "THERMOSTAT COVER", coverSolids(), {
      mat: "plastic", angle: 135, explode: up(116), anchor: { cut: [-12, 35.5, 0], out: { c: [-12, 37, -8] } },
    }),
    S.part(3, "FLANGE SEAL Ø58×3", [S.lathe([[25.5, -3], [29, -3], [29, 0], [27, 0], [27, -1.5], [25.5, -1.5]])], {
      mat: "rubber", explode: up(14), anchor: { cut: [-27.6, -2.25, 0], out: { c: [0, -1.5, 0], r: 29, axis: "y" } },
    }),
    S.part(4, "HEX BOLT M6×25", bolts.flatMap(([x, z]) => [
      S.extrude(hex(x, z), { along: "y", from: 9.6, to: 13.6 }),
      S.lathe([[0, -15.4], [2.4, -15.4], [2.95, -14.85], [2.95, 9.6], [0, 9.6]], { at: [x, z] }),
    ]), { explode: up(156), anchor: { cut: [-36, 4, 0], out: { c: [-36, 11.6, 0], r: 5, axis: "y" } } }),
    S.part(5, "WASHER 6.4", bolts.map(([x, z]) => S.tube({ at: [x, z], r0: 3.25, r1: 6, from: 8, to: 9.6 })), {
      mat: "steel", angle: 45, explode: up(126), anchor: { cut: [-40.6, 8.8, 0], out: { c: [-36, 8.8, 0], r: 6, axis: "y" } },
    }),
    // ---- the thermostat's frame
    S.part(6, "FLANGE AND SEAT Ø54×1.5", [
      S.lathe([[17, P.SEAT_V], [18.2, P.SEAT_V], [18.2, -1.5], [27, -1.5], [27, 0], [17, 0]]),
      S.bore(S.cylinder({ at: [P.JIG_U, 0], r: M.JIGGLE.hole, from: -1.52, to: 0.02 })),
    ], { mat: "steel", angle: 45, explode: up(FRAME), anchor: { cut: [24, -0.75, 0], out: { c: [0, 0, 0], r: 25, axis: "y" } } }),
    S.part(7, "BRIDGE 8×1.5", [S.extrude(P.bridgePoly(), { along: "z", from: -4, to: 4 })], {
      mat: "steel", angle: 135, explode: up(FRAME), anchor: { cut: [16.5, 7.85, 0], out: { c: [16.5, 7.85, 4] } },
    }),
    S.part(8, "PIN Ø5", [S.lathe([...K.arc(0, M.PIN_END + M.PIN_D / 2, M.PIN_D / 2, -90, 0, 8), [2.5, 12], [2, 12.5], [0, 12.5]])], {
      explode: up(FRAME), anchor: { cut: [0, 6, 0], out: { c: [0, 6, 0], r: 2.5, axis: "y" } },
    }),
    S.part(15, "SPRING STIRRUP 8×1.5", [
      S.extrude(K.rect(19.4, P.SPRING_SEAT, 20.9, -1.5), { along: "z", from: -4, to: 4 }),
      S.extrude(K.rect(-20.9, P.SPRING_SEAT, -19.4, -1.5), { along: "z", from: -4, to: 4 }),
      extrude(stirrupFoot(), { along: "y", from: -44, to: P.SPRING_SEAT, holes: [S.circle(0, 0, 9.5, 64)] }),
    ], { mat: "steel", angle: 135, explode: up(FRAME), anchor: { cut: [20.15, -24, 0], out: { c: [20.15, -24, 4] } } }),
    S.part(19, "JIGGLE PIN Ø2.4", [S.lathe([[0, -4], [1.8, -4], [1.8, -3.2], [1.2, -3.2], [1.2, 0], [2, 0], [2, 0.8], [0, 0.8]], { at: [P.JIG_U, 0] })], {
      explode: up(FRAME), anchor: { cut: [P.JIG_U, -2.3, 0], out: { c: [P.JIG_U, 0.4, 0], r: 2, axis: "y" } },
    }),
    S.part(14, "MAIN SPRING Ø2, 6 TURNS", [S.helix({ ...spMain, pivot: [0, MAIN_SPRING.from, 0], live: "spring" })], {
      hatch: "solid", explode: up(FRAME), anchor: { cut: coilPoint(MAIN_SPRING, 9), out: { c: [0, -24, 0], r: 15, axis: "y" }, solid: 0 },
    }),
    // ---- the pellet assembly (moves down by the lift; explodes up the jogged axis)
    S.part(13, "VALVE DISC Ø37.6×1.5", [S.lathe(P.discLoop)], {
      mat: "steel", angle: 135, explode: jog(92), anchor: { cut: [12, -3.25, 0], out: { c: [0, -3.25, 0], r: 18.8, axis: "y" } },
    }),
    S.part(12, "PISTON GUIDE", [S.lathe(P.guideLoop)], {
      mat: "brass", angle: 45, explode: jog(81), anchor: { cut: [-3.8, -12, 0], out: { c: [0, -12, 0], r: 5, axis: "y" } },
    }),
    S.part(24, "BACK-UP RING 5×7×1.5", [S.lathe([[2.5, -21], [3.5, -21], [3.5, -19.5], [2.5, -19.5]])], {
      mat: "plastic", angle: 30, explode: jog(76), anchor: { cut: [-3, -20.25, 0], out: { c: [0, -20.25, 0], r: 3.5, axis: "y" } },
    }),
    S.part(9, "SLEEVE (SOCK DIAPHRAGM)", [S.lathe(P.sleeveLoop(0), { live: "sock" })], {
      mat: "rubber", explode: jog(71), anchor: { cut: [-5.5, -21.5, 0], out: { c: [0, -21.5, 0], r: 7.5, axis: "y" } },
    }),
    S.part(11, "WAX CHARGE", [
      S.lathe(w0.core, { live: "core", hatch: ["plastic", 60] }),
      S.lathe(w0.liquid ?? w0.core, { live: "liquid", hatch: ["foam", 45] }),
    ], { explode: jog(51), anchor: { cut: [-5.6, -33.5, 0], out: { c: [0, -30, 0], r: 7, axis: "y" } } }),
    S.part(10, "PELLET CUP Ø17", [S.lathe(P.cupLoop)], {
      mat: "brass", angle: 135, explode: jog(51), anchor: { cut: [7.75, -30, 0], out: { c: [0, -30, 0], r: 8.5, axis: "y" } },
    }),
    S.part(16, "BYPASS STEM Ø5", [S.lathe([[0, -37], [2.5, -37], [2.5, P.BP_DISC], [3.5, P.BP_DISC], [3.5, -52.6], [3, -53.1], [0, -53.1]])], {
      explode: jog(51), anchor: { cut: [0, -45, 0], out: { c: [0, -45, 0], r: 2.5, axis: "y" } },
    }),
    S.part(18, "BYPASS SPRING Ø0.8, 4 TURNS", [S.helix({ ...spByp, pivot: [0, BP_SPRING.from, 0], live: "spring" })], {
      hatch: "solid", explode: jog(28.5), anchor: { cut: coilPoint(BP_SPRING, 5), out: { c: [0, -45, 0], r: 5.9, axis: "y" }, solid: 0 },
    }),
    S.part(17, "BYPASS DISC Ø25×1.5", [S.lathe([[2.6, P.BP_DISC], [12.5, P.BP_DISC], [12.5, P.BP_DISC + 1.5], [2.6, P.BP_DISC + 1.5]])], {
      mat: "steel", angle: 45, explode: jog(22), anchor: { cut: [-9, P.BP_DISC + 0.75, 0], out: { c: [0, P.BP_DISC + 0.75, 0], r: 12.5, axis: "y" } },
    }),
    // ---- the sensor, its ring, the hose and its clip
    S.part(20, "COOLANT TEMP. SENSOR M12×1.5", [
      S.lathe([[2, 16.5], [3, 17.5], [3, 24], [5.9, 24], [5.9, 38], [5, 38], [5, 39.5], [1.8, 39.5], [1.8, 18.5], [0, 18.5], [0, 16.5]], { axis: "x", at: PV }),
      extrude(S.hexagon(17, 0, PV), { along: "x", from: 39.5, to: 44, holes: [S.circle(0, PV, 1.8, 24)] }),
      extrude(S.hexagon(17, 0, PV), { along: "x", from: 44, to: 46, holes: [S.circle(0, PV, 4.5, 32)] }),
      S.lathe([[0, 46], [7, 46], [7, 56], [5.5, 56], [5.5, 49], [0, 49]], { axis: "x", at: PV, hatch: ["plastic", 60], own: true }),
      S.lathe([[0, 18.6], [1, 18.6], [1.2, 18.9], [1.2, 20.4], [1, 20.7], [0, 20.7]], { axis: "x", at: PV, hatch: "solid", own: true }),
      ...[-0.6, 0.6].map((dv) => S.cylinder({ axis: "x", at: [PV + dv, 0], r: 0.35, from: 20.7, to: 44, hatch: "solid", own: true })),
      ...[-2.5, 2.5].map((dv) => S.box([49, PV + dv - 0.6, -0.6], [54.5, PV + dv + 0.6, 0.6], { hatch: "none", own: true })),
    ], { mat: "brass", angle: 135, explode: [50, 0, 0], anchor: { cut: [42, PV + 6.5, 0], out: { c: [42, PV, 0], r: 8.5, axis: "x" } } }),
    S.part(21, "SEALING RING A12×16", [S.lathe([[6, 38], [8, 38], [8, 39.5], [6, 39.5]], { axis: "x", at: PV })], {
      mat: "bronze", angle: 45, explode: [26, 0, 0], anchor: { cut: [38.75, PV - 7, 0], out: { c: [38.75, PV, 0], r: 8, axis: "x" } },
    }),
    S.part(22, "RADIATOR HOSE 30×4.5", [S.lathe([[15, 44.3], [15, 51], [16.2, 52.5], [16.2, 55], [15, 56], [15, P.HOSE_END], [19.5, P.HOSE_END], [19.5, 44.3], [15.8, 43.5]], { axis: "x", at: SPIGOT_V })], {
      mat: "rubber", explode: [44, 116, 0], anchor: { cut: [58.5, SPIGOT_V + 17.25, 0], out: { c: [58.5, SPIGOT_V, 0], r: 19.5, axis: "x" } },
    }),
    S.part(23, "HOSE CLIP 32-50", [S.tube({ axis: "x", at: SPIGOT_V, r0: 19.5, r1: 20.2, from: 45, to: 51 })], {
      hatch: "solid", explode: [76, 116, 0], anchor: { cut: [48, SPIGOT_V + 19.85, 0], out: { c: [48, SPIGOT_V, 0], r: 20.2, axis: "x" } },
    }),
  ];
}

// The coolant: engine side (chamber and inlet), radiator side (seat opening, cover, duct, spigot, hose)
// and the bypass port. Each is a volume of its own so live3d.js can tint them apart.
export function fluids() {
  const ax = (loop, axis, at) => S.lathe(loop, { axis, at });
  return [
    S.fluid("engine", ax([[0, P.BOSS_V + 0.03], [12.97, P.BOSS_V + 0.03], [13.47, -59.47], [13.47, P.FLOOR + 0.03], [23.97, P.FLOOR + 0.03], [23.97, -3.03], [25.47, -3.03], [25.47, -1.53], [18.23, -1.53], [18.23, P.SEAT_V - 0.03], [0, P.SEAT_V - 0.03]], "y", 0)),
    S.fluid("inlet", ax([[0, -48], [9.97, -48], [9.97, -23.6], [0, -23.6]], "x", -46)),
    S.fluid("bypass", ax([[0, P.BOTTOM], [P.PORT_R - 0.03, P.BOTTOM], [P.PORT_R - 0.03, P.BOSS_V + 0.03], [0, P.BOSS_V + 0.03]], "y", 0)),
    S.fluid("radiator", ax([[0, P.SEAT_V + 0.03], [16.97, P.SEAT_V + 0.03], [16.97, 0.03], [25.97, 0.03], [25.97, COVER.roof - 0.03], [0, COVER.roof - 0.03]], "y", 0)),
    S.fluid("duct", S.extrude(K.rect(20, COVER.floor + 0.03, COVER.end, COVER.roof - 0.03), { along: "z", from: -11.97, to: 11.97 })),
    S.fluid("spigot", ax([[0, COVER.end], [11.97, COVER.end], [11.97, 56], [14.97, 56], [14.97, P.HOSE_END], [0, P.HOSE_END]], "x", SPIGOT_V)),
  ];
}
export const ENGINE = ["engine", "inlet"];
export const RADIATOR = ["radiator", "duct", "spigot"];
export const BYPASS = ["bypass"];

// centre lines: the thermostat's axis, the cut bolt's, the sensor's, the spigot's, the jiggle pin's
export const centres = () => [
  [[0, P.BOTTOM - 5, 0], [0, 19, 0]],
  { line: [[P.BOLT_U, -22, 0], [P.BOLT_U, 16, 0]], part: 4 },
  { line: [[13, PV, 0], [59, PV, 0]], part: 20 },
  { line: [[38, SPIGOT_V, 0], [P.HOSE_END + 5, SPIGOT_V, 0]], part: 2 },
];

export const PELLET = [9, 10, 11, 12, 13, 16, 24];
export const scene = () => ({ parts: parts(), fluids: fluids(), centres: centres() });
