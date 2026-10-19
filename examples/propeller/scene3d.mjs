// The propeller's solids for its 3D view (propeller-3d.html), in the sheet's world mm: x = u = −s (the
// nose points to −x, s forward from the crankshaft flange's front face), y = v (blade 1 up), z toward
// the viewer. The cut z = 0 is the sheet's section A-A, the plane of both blades' pitch axes. Pure
// data, built with kit/solid3d.mjs from model.mjs and the sheet's profiles (parts.mjs).
//
// Everything turns about the x axis with the crankshaft; live3d.js sets rot [−θ, 0, 0] on every part
// (anticlockwise seen from ahead). Each blade is lofted by a warp: a prism of the normalised Clark Y
// section, moved at every radius to its own chord, thickness and blade angle, so the cut and the
// surface are the true blade. It is split at the stations B–E, so their outlines show on the blade and
// their sections open up when it is exploded. NTS simplifications (the sheet is the authority): the
// spinner screws are drawn by their heads only, two a lip; the bolt heads are plain hexagons; the
// safety wire runs round the bolt circle between each pair; the hub boss is a plain cylinder.

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const rad = Math.PI / 180;
const BC = M.FLANGE.bolt;
const X = (s) => -s; // sheet s → world x
const toLathe = (pts) => pts.map(([s, r]) => [r, X(s)]); // (s, r) → lathe [r, x]
// bolt k sits at θ = 60k° from blade 1 (+y) toward +z
export const BOLTS = Array.from({ length: 6 }, (_, k) => {
  const a = k * 60 * rad;
  return { y: BC * Math.cos(a), z: BC * Math.sin(a), a };
});
const holes = (r, n = 32) => BOLTS.map((b) => S.circle(b.z, b.y, r, n)); // shape [z, y] for extrusions along x

// ---------------------------------------------------------------- the blade loft
// the section normalised: ξ by the chord, η by the thickness
const NORM = (() => {
  const r = M.R_SHANK;
  const c = M.chord(r);
  const t = M.thickness(r);
  return M.sectionLoop(r).map(([xi, eta]) => [xi / c, eta / t]);
})();
export const R_ROOT = 74; // the shank starts inside the hub boss
export const R_END = 948;
export const CUTS = [R_ROOT, M.R_SHANK, ...M.STATIONS.map((x) => x * M.R), R_END];
// blade 1: a reference point (ξn, r, ηn) → the true point
export function bladeAt(xn, r, en) {
  const rr = Math.max(M.R_SHANK, r);
  const [[t, zf]] = M.placeSection([[xn * M.chord(rr), en * M.thickness(rr)]], rr);
  return [X(M.BLADE_S + zf), r, t];
}
const warp1 = (x, y, z) => bladeAt(x, y, z);
// blade 2 is blade 1 turned half a revolution about the shaft: (x, y, z) → (x, −y, −z)
const warp2 = (x, y, z) => {
  const [a, b, c] = bladeAt(x, -y, -z);
  return [a, -b, -c];
};
function bladePieces(sg) {
  const out = [];
  for (let i = 0; i < CUTS.length - 1; i++) {
    const r0 = CUTS[i];
    const r1 = CUTS[i + 1];
    const steps = i === 0 ? 1 : Math.max(4, Math.round((r1 - r0) / 22));
    const shape = sg > 0 ? NORM : NORM.map(([a, b]) => [a, -b]);
    out.push(S.extrude(shape, {
      along: "y",
      from: sg > 0 ? r0 : -r1,
      to: sg > 0 ? r1 : -r0,
      steps,
      warp: sg > 0 ? warp1 : warp2,
      // exploded, the pieces part at the stations along the blade
      explode: [0, sg * i * 34, 0],
      live: `b${sg > 0 ? 1 : 2}-${i}`,
    }));
  }
  return out;
}

// ---------------------------------------------------------------- the spinner
function arcBand(a0, a1, r0, r1, n = 40) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (a0 + ((a1 - a0) * i) / n) * rad;
    pts.push([r1 * Math.sin(a), r1 * Math.cos(a)]);
  }
  for (let i = n; i >= 0; i--) {
    const a = (a0 + ((a1 - a0) * i) / n) * rad;
    pts.push([r0 * Math.sin(a), r0 * Math.cos(a)]);
  }
  return pts;
}
// the cutout's half-angle: the shank's widest t where it passes the skin, and 4 mm clear
export const CUT_HALF = (() => {
  const [lo, hi] = M.projected(M.R_SHANK);
  return Math.asin((Math.max(-lo, hi) + 4) / M.SPIN_R) / rad;
})();
function spinnerSolids() {
  const ri = M.SPIN_R - M.SPIN_SKIN;
  const { outer, inner } = P.spinnerPts();
  const pick = (pts) => pts.filter((_, i) => i % 2 === 0 || i === pts.length - 1);
  const dome = [...toLathe(pick(outer)), ...toLathe(pick(inner)).reverse()];
  return [
    S.tube({ axis: "x", r0: ri, r1: M.SPIN_R, from: X(P.CUT0), to: X(M.HUB_S0) }),
    S.extrude(arcBand(CUT_HALF, 180 - CUT_HALF, ri, M.SPIN_R), { along: "x", from: X(P.CUT1), to: X(P.CUT0) }),
    S.extrude(arcBand(180 + CUT_HALF, 360 - CUT_HALF, ri, M.SPIN_R), { along: "x", from: X(P.CUT1), to: X(P.CUT0) }),
    S.lathe(dome, { axis: "x", smooth: 30, segments: 112 }),
  ];
}

// ---------------------------------------------------------------- the parts
export const FB_RING = 88; // the front bulkhead's flat ring stops here; its lathe takes over
export function parts() {
  const out = [];
  const T = M.SUPPORT_T;
  // 9 crankshaft: flange with the bushings' holes, nose, pilot
  out.push(S.part(9, "CRANKSHAFT FLANGE Ø165", [
    S.extrude(S.circle(0, 0, M.FLANGE.r, 96), { along: "x", from: 0, to: M.FLANGE.t, holes: holes(M.BUSH_D / 2 + 0.05, 40) }),
    S.cylinder({ axis: "x", r: P.CRANK.nose, from: M.FLANGE.t, to: 70 }),
    S.lathe([[0, X(M.FLANGE.pilotL)], [M.FLANGE.pilotR - 1.5, X(M.FLANGE.pilotL)], [M.FLANGE.pilotR, X(M.FLANGE.pilotL - 1.5)], [M.FLANGE.pilotR, 0], [0, 0]], { axis: "x" }),
  ], { hatch: "none", anchor: { cut: [7, 30, 0], out: { c: [7, 0, 0], r: M.FLANGE.r, axis: "x" } } }));
  // 8 drive bushings
  out.push(S.part(8, "DRIVE BUSHING Ø19.05", BOLTS.map((b) => S.tube({ axis: "x", at: [b.y, b.z], r0: 5.6, r1: M.BUSH_D / 2, from: X(P.BUSH.s1), to: X(P.BUSH.s0), segments: 36 })), {
    mat: "steel", angle: 60, explode: [-28, 0, 0], anchor: { cut: [X(5), BC + 7.5, 0], out: { c: [X(5), BC, 0], r: 9.5, axis: "x" } },
  }));
  // 10 ring gear support: plate with the holes, skirt with the V pulley and the gear's seat
  const sup = P.supportPts();
  const skirt = sup.outer.slice(2).concat([[T, P.SUP.skirt0]]).map(([s, r]) => [s, r]);
  out.push(S.part(10, "RING GEAR SUPPORT", [
    S.extrude(S.circle(0, 0, P.SUP.skirt0, 96), { along: "x", from: X(T), to: 0, holes: [S.circle(0, 0, 30.25, 64), ...holes(9.6, 40)] }),
    S.lathe(toLathe([[T, P.SUP.skirt0], ...skirt.slice(0, -1)]), { axis: "x" }),
  ], { mat: "alu", angle: 135, explode: [-50, 0, 0], anchor: { cut: [X(-36), 116, 0], out: { c: [X(-36), 0, 0], r: P.SUP.ring, axis: "x" } } }));
  // 11 starter ring gear, 149 teeth
  const m = P.GEAR.tip / (149 / 2 + 1);
  out.push(S.part(11, "STARTER RING GEAR 149 T", [
    S.extrude(S.gearOutline({ teeth: 149, module: m, steps: 2 }), { along: "x", from: X(P.GEAR.s1), to: X(P.GEAR.s0), holes: [S.circle(0, 0, P.SUP.ring + 0.3, 144)] }),
  ], { mat: "steel", angle: 45, explode: [-50, 0, 0], anchor: { cut: [X(-37), 132, 0], out: { c: [X(-37), 0, 0], r: P.GEAR.tip, axis: "x" } } }));
  // 14 alternator belt in the groove
  out.push(S.part(14, "ALTERNATOR V-BELT", [S.lathe(toLathe(P.BELT), { axis: "x" })], {
    mat: "rubber", explode: [60, 0, 0], anchor: { cut: [X(-20), 102, 0], out: { c: [X(-20), 0, 0], r: 106, axis: "x" } },
  }));
  // 4 rear bulkhead: disc and lip
  const ri = M.SPIN_R - M.SPIN_SKIN - M.BULK_R_T;
  out.push(S.part(4, "SPINNER REAR BULKHEAD", [
    S.extrude(S.circle(0, 0, ri, 144), { along: "x", from: X(M.HUB_S0), to: X(T), holes: [S.circle(0, 0, 30.25, 64), ...holes(9.6, 40)] }),
    S.tube({ axis: "x", r0: ri, r1: ri + M.BULK_R_T, from: X(P.RBK.lip), to: X(T) }),
  ], { hatch: "solid", explode: [-110, 0, 0], anchor: { cut: [X(11), 120, 0], out: { c: [X(11), 0, 0], r: ri, axis: "x" } } }));
  // 1 the propeller: hub boss (two extrusions, the bolt holes and the bushings' counterbores) and the blades
  out.push(S.part(1, "PROPELLER Ø1905", [
    S.extrude(S.circle(0, 0, M.R_HUB, 96), { along: "x", from: X(M.HUB_S1), to: X(M.HUB_S0 + 13), holes: [S.circle(0, 0, 30.25, 64), ...holes(5.7, 32)] }),
    S.extrude(S.circle(0, 0, M.R_HUB, 96), { along: "x", from: X(M.HUB_S0 + 13), to: X(M.HUB_S0), holes: [S.circle(0, 0, 30.25, 64), ...holes(9.6, 40)] }),
    ...bladePieces(1),
    ...bladePieces(-1),
  ], { mat: "alu", angle: 45, explode: [-200, 0, 0], anchor: { cut: [X(70), 42, 0], out: { c: [X(70), 0, 0], r: M.R_HUB, axis: "x" } } }));
  // 3 front bulkhead: flat ring under the crush plate, then the cone and lip as one lathe
  const fbPath = [[M.HUB_S1, FB_RING], [M.HUB_S1, P.FB.ring]];
  for (let s = P.FB.lip0; s <= P.FB.lip1 + 0.01; s += 4) fbPath.push([s, P.rSpin(s) - M.SPIN_SKIN]);
  out.push(S.part(3, "SPINNER FRONT BULKHEAD", [
    S.extrude(S.circle(0, 0, FB_RING, 96), { along: "x", from: X(M.HUB_S1 + M.BULK_F_T), to: X(M.HUB_S1), holes: [S.circle(0, 0, 30.25, 64), ...holes(5.7, 32)] }),
    S.lathe(toLathe(bandOf(fbPath, M.BULK_F_T)), { axis: "x", segments: 112 }),
  ], { hatch: "solid", explode: [-300, 0, 0], anchor: { cut: [X(114.8), 40, 0], out: { c: [X(140), 0, 0], r: 120, axis: "x" } } }));
  // 5 crush plate
  out.push(S.part(5, "CRUSH PLATE", [
    S.extrude(S.circle(0, 0, P.CP.r1, 96), { along: "x", from: X(P.CP.s1), to: X(P.CP.s0), holes: [S.circle(0, 0, P.CP.r0, 64), ...holes(5.7, 32)] }),
  ], { mat: "steel", angle: 135, explode: [-345, 0, 0], anchor: { cut: [X(118.8), 72, 0], out: { c: [X(118.8), 0, 0], r: P.CP.r1, axis: "x" } } }));
  // 7 washers, 6 bolts (shank and hexagon head), 15 safety wire
  out.push(S.part(7, "WASHER 7/16", BOLTS.map((b) => S.tube({ axis: "x", at: [b.y, b.z], r0: 5.6, r1: P.WASHER.ro, from: X(P.WASHER.s1), to: X(P.WASHER.s0), segments: 36 })), {
    hatch: "none", explode: [-390, 0, 0], anchor: { cut: [X(122.8), BC + 8.5, 0], out: { c: [X(122.8), BC, 0], r: 11, axis: "x" } },
  }));
  const B = P.BOLT;
  out.push(S.part(6, "BOLT 7/16-20", [
    ...BOLTS.map((b) => S.lathe([[0, X(B.tail)], [B.r - 0.6, X(B.tail)], [B.r, X(B.tail + 0.6)], [B.r, X(B.head0)], [0, X(B.head0)]], { axis: "x", at: [b.y, b.z], segments: 28 })),
    ...BOLTS.map((b) => S.extrude(S.polygon(6, (2 * B.af) / Math.sqrt(3) / 1, b.z, b.y, b.a + Math.PI / 6), { along: "x", from: X(B.head1), to: X(B.head0) })),
  ], { hatch: "none", explode: [-560, 0, 0], anchor: { cut: [X(127), BC + 4, 0], out: { c: [X(127), BC, 0], r: 9, axis: "x" } } }));
  const wireS = B.head0 + 3.8;
  const wa = (10.2 * 180) / Math.PI / BC; // degrees clear of each head
  out.push(S.part(15, "SAFETY WIRE", [0, 2, 4].map((k) => S.torus([X(wireS), 0, 0], BC, 0.8, { axis: "x", arc: [90 + k * 60 + wa, 150 + k * 60 - wa] })), {
    hatch: "solid", explode: [-560, 0, 0], anchor: { cut: [X(wireS), BC * Math.cos(270 * rad), BC * Math.sin(270 * rad)], out: { c: [X(wireS), 0, -BC], r: 0.8, axis: "x" } },
  }));
  // 2 spinner, 12 screw heads on it, 13 nutplates inside the lips
  out.push(S.part(2, "SPINNER DOME Ø320", spinnerSolids(), { hatch: "solid", explode: [-700, 0, 0], anchor: { cut: [X(P.S_TIP - 0.4), 0, 0], out: { c: [X(P.S_TIP), 0, 0], r: 0 } } }));
  const head = (c, sg) => {
    const b0 = c.rOut + (c.s > 100 ? 0.7 : 0.05);
    const pts = [[0, b0], [4, b0], [3.4, b0 + 1.6], [1.8, b0 + 2.4], [0, b0 + 2.4]];
    return S.lathe(pts.map(([r, h]) => [r, sg * h]), { axis: "y", at: [X(c.s), 0], segments: 24 });
  };
  out.push(S.part(12, "SPINNER SCREW No 8", P.SCREWS.flatMap((c) => [head(c, 1), head(c, -1)]), {
    hatch: "none", explode: [-700, 0, 0], anchor: { cut: [X(16), M.SPIN_R + 1.2, 0], out: { c: [X(16), M.SPIN_R + 1.2, 0], r: 0 } },
  }));
  const nut = (c, sg) => {
    const top = c.lipIn - (c.s > 100 ? 1.2 : 0.2);
    return S.box([X(c.s) - 3.8, sg > 0 ? top - 5.8 : -top, -4], [X(c.s) + 3.8, sg > 0 ? top : -(top - 5.8), 4], c.s > 100 ? { explode: [-190, 0, 0] } : {});
  };
  out.push(S.part(13, "ANCHOR NUTPLATE No 8", P.SCREWS.flatMap((c) => [nut(c, 1), nut(c, -1)]), {
    hatch: "none", explode: [-110, 0, 0], anchor: { cut: [X(16), P.SCREWS[0].lipIn - 3, 0], out: { c: [X(16), P.SCREWS[0].lipIn, 0], r: 0 } },
  }));
  return out;
}
// a band of thickness t to the right of a path in (s, r), for a lathe
function bandOf(path, t) {
  const n = path.length;
  const off = path.map((p, i) => {
    const a = path[Math.max(0, i - 1)];
    const b = path[Math.min(n - 1, i + 1)];
    const ds = b[0] - a[0];
    const dr = b[1] - a[1];
    const L = Math.hypot(ds, dr) || 1;
    return [p[0] + (dr / L) * t, p[1] - (ds / L) * t];
  });
  return [...path, ...off.reverse()];
}

// ---------------------------------------------------------------- the air the propeller moves
// One streamtube, ahead of the disc to just behind it, outside the spinner: stippled by the inflow the
// blades add (dense in the run-up, thin in cruise, gone when windmilling).
export function fluids() {
  // the slipstream just behind the disc: an annular tube from the blades back 240 mm, contracting a little
  const s0 = 22;
  const s1 = -240;
  const loop = [[175, X(s0)], [930, X(s0)], [905, X(-90)], [880, X(s1)], [175, X(s1)]];
  return [S.fluid("air", S.lathe(loop, { axis: "x", segments: 96 }))];
}

export const centres = () => [[[X(P.S_TIP + 40), 0, 0], [80, 0, 0]], [[X(M.BLADE_S), -M.R - 30, 0], [X(M.BLADE_S), M.R + 30, 0]]];
export const scene = () => ({ parts: parts(), fluids: fluids(), centres: centres() });
void K;
