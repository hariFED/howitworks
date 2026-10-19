// The airframe's solids for its 3D view (airframe-3d.html). Pure data, kit/solid3d.mjs.
//
// Frame as the aircraft's 3D cutaway (light-aircraft scene3d.mjs, inlined as LA): x = −FS (forward),
// y = WL, z = BL; the cut z = 0 is the fuselage centreline and removes the starboard half. Written in mm
// from geom.mjs (GE) and scaled to centimetres (UNIT) at the end. The wing's prisms are drawn on the
// root section and lofted by the aircraft's own wingWarp (taper about the hinge line, dihedral).
//
// The budget (≤ 60 parts, ≤ 250 draw calls) counts solids, not ribs: each row of ribs is ONE solid, a
// comb. Its outline in (z, s) is a tooth per rib on a thin base strip, swept chordwise along x with
// steps, and a warp lifts s from 0…1000 onto the aerofoil's depth at that chord station.

import * as K from "../../kit/draft.mjs";
import * as S from "../../kit/solid3d.mjs";
import * as M from "../light-aircraft/model.mjs";
import * as P from "../light-aircraft/parts.mjs";
import * as LA from "../light-aircraft/scene3d.mjs";
import * as GE from "./geom.mjs";
import * as ST from "./model.mjs";

export const UNIT = 0.1;
const C = M.CABIN;
const TP = M.TAILPLANE;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const xy = (pts) => pts.map(([fs, wl]) => [-fs, wl]);
const root = (pts) => xy(P.onSection(pts, 0));
const up = P.upAt;
const lo = P.loAt;
const STEPS = { steps: 24 };
const wingWarp = LA.wingWarp;
const d = 10 / M.ROOT_CHORD; // wing skin drawn 10 mm, a chord fraction
const AF = M.naca2412(40);
const between = (pts, a, b) => pts.filter(([x]) => x > a + 1e-6 && x < b - 1e-6);
const RX = M.HINGE_X - 0.004; // the rear spar at the root (the hinge line)
const FX = M.SPAR_X;

// ---------------------------------------------------------------- the wing's pieces in (ξ, η)
function sparI(x0, w, ft, wt) {
  const U = (x) => up(x) - d;
  const L = (x) => lo(x) + d;
  const a = x0 - w / 2;
  const b = x0 + w / 2;
  const w0 = x0 - wt / 2;
  const w1 = x0 + wt / 2;
  return [[a, U(a)], [b, U(b)], [b, U(b) - ft], [w1, U(w1) - ft], [w1, L(w1) + ft], [b, L(b) + ft], [b, L(b)], [a, L(a)], [a, L(a) + ft], [w0, L(w0) + ft], [w0, U(w0) - ft], [a, U(a) - ft]];
}
function channel(x0, w, t) {
  // web aft, flanges forward
  const U = (x) => up(x) - d;
  const L = (x) => lo(x) + d;
  const a = x0 - w;
  return [[a, U(a)], [x0, U(x0)], [x0, L(x0)], [a, L(a)], [a, L(a) + t], [x0 - t, L(x0 - t) + t], [x0 - t, U(x0 - t) - t], [a, U(a) - t]];
}
// the lower skin and the leading edge's wrap (the upper D-nose skin is cut away), a thin band
const LEW = 0.035;
function shell() {
  const outer = [[LEW, up(LEW)], ...between(AF.upper, 0, LEW).reverse(), [0, 0], ...between(AF.lower, 0, RX), [RX, lo(RX)]];
  const inner = [[RX, lo(RX) + d], ...between(AF.lower, 0.012, RX).reverse().map(([x, y]) => [x, y + d]), [d * 1.2, 0], ...between(AF.upper, 0.012, LEW).map(([x, y]) => [x, y - d]), [LEW, up(LEW) - d]];
  return [...outer, ...inner];
}
// a comb of ribs: teeth at the stations (z = −ws), 12 mm thick, on a base strip s 0…base
function comb(stations, half = 6, base = 70) {
  const zs = stations.map((w) => -w).sort((a, b) => a - b);
  const pts = [[zs[0] - half, 0]];
  zs.forEach((z, i) => {
    pts.push([z - half, 1000], [z + half, 1000]);
    if (i < zs.length - 1) pts.push([z + half, base], [zs[i + 1] - half, base]);
  });
  pts.push([zs[zs.length - 1] + half, 0]);
  return pts;
}
// the comb's warp: −x carries ξ·1000, y the depth fraction s; onto the root section, then the wing's loft
const ribWarp = ([x, y, z]) => {
  const xi = -x / 1000; // the sweep runs along −x, as ξ does in the world (x = −FS), so the comb is not mirrored
  const t = y / 1000;
  const eta = lo(xi) + d + t * (up(xi) - lo(xi) - 2 * d);
  return wingWarp([...root([[xi, eta]])[0], z]);
};

// ---------------------------------------------------------------- fuselage pieces
const sec = GE.sectionAt;
const ring = (fs, depth, w = 30) => S.extrude(GE.boxOutline(sec(fs), 1, 8), { along: "x", from: -(fs + w / 2), to: -(fs - w / 2), holes: [GE.boxOutline(sec(fs), depth, 8)], own: true });
const roofBand = (fs) => {
  const o = GE.boxOutline(sec(fs), 1, 8).filter(([, w]) => w > C.roof - C.rTop - 30);
  const i = GE.boxOutline(sec(fs), 60, 8).filter(([, w]) => w > C.roof - C.rTop - 30);
  return S.extrude([...o, ...i.reverse()], { along: "x", from: -(fs + 20), to: -(fs - 20), own: true });
};
// a member along the fuselage: a small square swept along x, carried by a warp onto its line
const member = (at, size, f0, f1) =>
  S.extrude(K.rect(-size / 2, -size / 2, size / 2, size / 2), {
    along: "x", from: -f1, to: -f0, steps: 30, own: true, smooth: false,
    warp: ([x, y, z]) => {
      const [, w, b] = at(-x);
      return [x, w + y, b + z];
    },
  });
const box = (fs0, fs1, wl0, wl1, bl0, bl1, o = {}) => S.box([-fs1, wl0, bl0], [-fs0, wl1, bl1], { own: true, ...o });

// ---------------------------------------------------------------- tailplane loft (as the aircraft's)
const tpLe = (bl) => lerp(TP.le, TP.tipLe, clamp(Math.abs(bl) / (TP.span / 2), 0, 1));
const tpTe = (bl) => lerp(TP.te, TP.tipTe, clamp(Math.abs(bl) / (TP.span / 2), 0, 1));
const tpK = (bl) => (tpTe(bl) - tpLe(bl)) / (TP.te - TP.le);
const stabWarp = ([x, y, z]) => {
  const fs = -x;
  const le = tpLe(z);
  return [-(le + ((fs - TP.le) * (TP.hinge - le)) / (TP.hinge - TP.le)), TP.wl + (y - TP.wl) * tpK(z), z];
};
const TH = 70; // the comb's nominal half depth before the warp
const tpRibWarp = ([x, y, z]) => {
  const fs = clamp(-x, TP.le + 1, GE.TP_AFT - 1);
  const [l, h] = GE.tpHalf(0, fs);
  const t = (y - (TP.wl - TH)) / (2 * TH);
  return stabWarp([x, l + 2 + t * (h - l - 4), z]);
};

// ---------------------------------------------------------------- strut (as the aircraft's)
const STRUT_SEC = [[50, 0], [34, 13], [8, 20], [-22, 17], [-46, 8], [-52, 0], [-46, -8], [-22, -17], [8, -20], [34, -13]];
function strut(s) {
  const A = [-GE.STRUT_LO.fs, GE.STRUT_LO.wl, s * (C.half + 26)];
  const B = [-GE.STRUT_HI.fs, GE.STRUT_HI.wl - 5, s * GE.STRUT_HI.bl];
  return S.extrude(STRUT_SEC, {
    along: "y", from: 0, to: 1000, own: true,
    warp: ([x, y, z]) => {
      const t = y / 1000;
      return [A[0] + (B[0] - A[0]) * t + x, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t + z];
    },
  });
}
export const strutAt = (t) => [-lerp(GE.STRUT_LO.fs, GE.STRUT_HI.fs, t), lerp(GE.STRUT_LO.wl, GE.STRUT_HI.wl - 5, t), -lerp(C.half + 26, GE.STRUT_HI.bl, t)];
// where the front spar's top is at a wing station (mm, port), for the overlay's stress colour
export const sparTopAt = (ws) => wingWarp([...root([[FX, up(FX)]])[0], -ws]);
export const liftBase = (ws) => wingWarp([...root([[0.3, up(0.3) + 0.02]])[0], -ws]);

// ---------------------------------------------------------------- the parts (mm)
function partsMM() {
  const W0 = 595; // the wing panel's root, at the cabin's side (the roof fittings)
  const at = (xi, eta, ws) => wingWarp([...root([[xi, eta]])[0], -ws]);
  const D = GE.DOOR;
  const fw = (() => {
    const f = GE.boxOutline(sec(0), 2, 8).filter(([, w]) => w < 1500);
    const k = f.findIndex((p, i) => i > 0 && p[0] < 0 && f[i - 1][0] > 0);
    return [...f.slice(0, k), [C.half - 2, 1500], [-(C.half - 2), 1500], ...f.slice(k)];
  })();
  const belly = (() => {
    const o = GE.boxOutline(sec(0), 0, 8).filter(([, w]) => w <= C.floor + C.rBottom + 1);
    const i = GE.boxOutline(sec(0), 8, 8).filter(([, w]) => w <= C.floor + C.rBottom + 1);
    // the outline runs from the bottom centre round to starboard, … , and back: reorder from port to starboard
    const k = o.findIndex(([b]) => b < 0);
    const oo = [...o.slice(k), ...o.slice(0, k)];
    const ki = i.findIndex(([b]) => b < 0);
    const ii = [...i.slice(ki), ...i.slice(0, ki)];
    return [...oo, ...ii.reverse()];
  })();
  const finIn = X_inset(GE.FIN, 45);
  const sparFS = GE.FIN_SPAR;
  return [
    // ---- wing (port panel open, the rest closed)
    S.part(1, "FRONT SPAR", [S.extrude(root(sparI(FX + 0.006, 0.03, 0.006, 0.003)), { along: "z", from: -M.TIP_WS + 30, to: -W0, ...STEPS, warp: wingWarp })], {
      hatch: "none", explode: [0, 900, 0], anchor: { cut: at(FX, up(FX) - 0.02, 2400), out: { c: at(FX, up(FX), 2400), r: 0 } },
    }),
    S.part(2, "REAR SPAR", [S.extrude(root(channel(RX, 0.02, 0.004)), { along: "z", from: -M.TIP_WS + 30, to: -W0, ...STEPS, warp: wingWarp })], {
      hatch: "none", explode: [0, 900, 0], anchor: { cut: at(RX, 0, 4200), out: { c: at(RX, up(RX), 4200), r: 0 } },
    }),
    S.part(3, "WING RIBS", [
      S.extrude(comb(GE.RIB_WS), { along: "x", from: -(RX - 0.022) * 1000, to: -(FX + 0.022) * 1000, steps: 16, warp: ribWarp, smooth: false }),
      S.extrude(comb(GE.RIB_WS), { along: "x", from: -(FX - 0.012) * 1000, to: -0.012 * 1000, steps: 12, warp: ribWarp, smooth: false, own: true }),
    ], { hatch: "none", explode: [0, 1300, 0], anchor: { cut: at(0.45, (up(0.45) + lo(0.45)) / 2, 1800), out: { c: at(0.45, up(0.45) - 0.02, 1800), r: 0 } } }),
    S.part(4, "WING SKIN", [
      S.extrude(root(shell()), { along: "z", from: -4200, to: -W0, ...STEPS, warp: wingWarp }),
      S.extrude(root(P.foilPart(0, M.HINGE_X)), { along: "z", from: -M.TIP_WS, to: -4200, own: true, ...STEPS, warp: wingWarp }),
      S.extrude(root(P.foilPart(0, M.HINGE_X)), { along: "z", from: -W0, to: W0, own: true, warp: wingWarp }),
      S.extrude(root(P.foilPart(0, M.HINGE_X)), { along: "z", from: W0, to: M.TIP_WS, own: true, ...STEPS, warp: wingWarp }),
    ], { hatch: "solid", explode: [0, 1700, 0], anchor: { cut: at(0.6, lo(0.6) + d / 2, 400), out: { c: at(0.3, up(0.3), 4800), r: 0 } } }),
    S.part(5, "STRUT FITTING, WING", [box(GE.STRUT_HI.fs - 40, GE.STRUT_HI.fs + 40, GE.STRUT_HI.wl - 55, sparTopAt(3000)[1] - 150, -3020, -2980)], {
      mat: "steel", angle: 135, explode: [0, 600, 0], anchor: { cut: [-GE.STRUT_HI.fs, GE.STRUT_HI.wl - 30, -2980], out: { c: [-GE.STRUT_HI.fs, GE.STRUT_HI.wl - 30, -3020], r: 0 } },
    }),
    S.part(6, "WING STRUT", [strut(-1), strut(1)], { hatch: "none", explode: [0, 300, -300], anchor: { cut: strutAt(0.45), out: { c: strutAt(0.45), r: 0 } } }),
    S.part(7, "STRUT FITTING, FUSELAGE", [-1, 1].map((s) => box(GE.STRUT_LO.fs - 50, GE.STRUT_LO.fs + 50, GE.STRUT_LO.wl - 45, GE.STRUT_LO.wl + 45, s < 0 ? -C.half - 30 : C.half, s < 0 ? -C.half : C.half + 30)), {
      mat: "steel", angle: 45, explode: [0, -200, -200], anchor: { cut: [-GE.STRUT_LO.fs, GE.STRUT_LO.wl, -C.half - 15], out: { c: [-GE.STRUT_LO.fs, GE.STRUT_LO.wl, -C.half - 30], r: 0 } },
    }),
    S.part(8, "WING ATTACH FITTINGS", GE.ROOF_FRAMES.flatMap((fs) => [-1, 1].map((s) => box(fs - 35, fs + 35, C.roof - 30, C.roof + 40, s < 0 ? -C.half + 8 : C.half - 60, s < 0 ? -C.half + 60 : C.half - 8))), {
      mat: "steel", angle: 45, explode: [0, 500, 0], anchor: { cut: [-GE.ROOF_FRAMES[0], C.roof + 10, -C.half + 34], out: { c: [-GE.ROOF_FRAMES[0], C.roof + 40, -C.half + 34], r: 0 } },
    }),
    // ---- fuselage
    S.part(9, "FIREWALL", [S.extrude(fw, { along: "x", from: -20, to: 0 })], { mat: "steel", angle: 135, explode: [600, 0, 0], anchor: { cut: [-10, 1100, 0], out: { c: [0, 1100, -300], r: 0 } } }),
    S.part(10, "FRAMES", [...GE.CABIN_FRAMES.map((fs) => ring(fs, 60)), ...GE.ROOF_FRAMES.map(roofBand), ...GE.CONE_FRAMES.map((fs) => ring(fs, 45))], {
      mat: "alu", angle: 45, explode: [0, 0, -500], anchor: { cut: [-4200, sec(4200).top - 25, 0], out: { c: [-4200, (sec(4200).top + sec(4200).bot) / 2, -sec(4200).a + 25], r: 0 } },
    }),
    S.part(11, "LONGERONS", GE.LONGERONS.map((l) => member((fs) => GE.longeronAt(l, fs, 16), 26, 0, 6490)), {
      mat: "alu", angle: 135, explode: [0, 0, -900], anchor: { cut: (() => { const q = GE.longeronAt(GE.LONGERONS[2], 3300, 16); return [-q[0], q[1], q[2]]; })(), out: { c: (() => { const q = GE.longeronAt(GE.LONGERONS[2], 3300, 16); return [-q[0], q[1], q[2]]; })(), r: 0 } },
    }),
    S.part(12, "STRINGERS", GE.STRINGERS.map((s) => member((fs) => GE.stringerAt(s, fs, 12), 16, C.fs1, 6490)), {
      mat: "alu", angle: 45, explode: [0, 0, -1200], anchor: { cut: (() => { const q = GE.stringerAt(GE.STRINGERS[2], 4500, 12); return [-q[0], q[1], q[2]]; })(), out: { c: (() => { const q = GE.stringerAt(GE.STRINGERS[0], 4500, 12); return [-q[0], q[1], q[2]]; })(), r: 0 } },
    }),
    S.part(13, "FUSELAGE SKIN", [S.extrude(belly, { along: "x", from: -C.fs1, to: 0 })], { hatch: "solid", explode: [0, -500, 0], anchor: { cut: [-1900, C.floor + 4, 0], out: { c: [-1900, C.floor, -200], r: 0 } } }),
    S.part(14, "DOOR FRAME", [S.extrude(xy([[D.fs0 - D.w, D.wl0 - D.w], [D.fs1 + D.w, D.wl0 - D.w], [D.fs1 + D.w, D.wl1 + D.w], [D.fs0 - D.w, D.wl1 + D.w]]), {
      along: "z", from: -C.half - 4, to: -C.half + 18, holes: [xy([[D.fs0, D.wl0], [D.fs1, D.wl0], [D.fs1, D.wl1], [D.fs0, D.wl1]])],
    })], { mat: "alu", angle: 135, explode: [0, 0, -700], anchor: { cut: [-(D.fs1 + 20), 1400, -C.half], out: { c: [-(D.fs1 + 20), 1400, -C.half - 4], r: 0 } } }),
    // ---- empennage
    S.part(15, "TAILPLANE SPARS", [GE.TP_FRONT, GE.TP_REAR].map((fs, k) => {
      const [l, h] = GE.tpHalf(0, fs);
      return S.extrude([[-fs - 7, l + 2], [-fs + 7, l + 2], [-fs + 7, h - 2], [-fs - 7, h - 2]], { along: "z", from: -TP.span / 2 + 20, to: TP.span / 2 - 20, ...STEPS, warp: stabWarp, own: k > 0, smooth: false });
    }), { hatch: "none", explode: [-400, 300, 0], anchor: { cut: [-GE.TP_FRONT, TP.wl, -900], out: { c: [-GE.TP_FRONT, TP.wl + 20, -900], r: 0 } } }),
    S.part(16, "TAILPLANE RIBS", [S.extrude(comb([...GE.TP_RIBS, ...GE.TP_RIBS.map((b) => -b)], 5, 30).map(([z, s]) => [z, TP.wl - TH + (2 * TH * s) / 1000]), { along: "x", from: -(GE.TP_AFT - 3), to: -(TP.le + 6), steps: 16, warp: tpRibWarp, smooth: false })], {
      hatch: "none", explode: [-400, 600, 0], anchor: { cut: [-6550, TP.wl, -1140], out: { c: [-6550, TP.wl + 30, -1140], r: 0 } },
    }),
    S.part(17, "FIN", [
      S.extrude(xy(GE.FIN), { along: "z", from: -12, to: 12, holes: [xy(finIn)] }),
      S.box([-(sparFS + 8), GE.finFoot(sparFS), -16], [-(sparFS - 8), 2680, 16], { own: true }),
      ...GE.FIN_RIBS.map((wl) => S.box([-(GE.FIN_TE - 40), wl - 6, -10], [-(GE.finLeAt(wl) + 40), wl + 6, 10], { own: true })),
    ], { mat: "alu", angle: 135, explode: [-500, 500, 0], anchor: { cut: [-(sparFS - 200), 2400, 0], out: { c: [-(sparFS - 200), 2400, -12], r: 0 } } }),
  ];
}
// a polygon inset (convex: the fin's side profile)
function X_inset(pts, dd) {
  const n = pts.length;
  const area = pts.reduce((s, [x0, y0], i) => { const [x1, y1] = pts[(i + 1) % n]; return s + x0 * y1 - x1 * y0; }, 0);
  const ccw = area > 0 ? 1 : -1;
  const lines = pts.map((a, i) => {
    const b = pts[(i + 1) % n];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const nx = (-(b[1] - a[1]) / l) * ccw;
    const ny = ((b[0] - a[0]) / l) * ccw;
    return [[a[0] + nx * dd, a[1] + ny * dd], [b[0] + nx * dd, b[1] + ny * dd]];
  });
  return lines.map((L1, i) => {
    const L0 = lines[(i - 1 + n) % n];
    const [p, q] = L0;
    const [r, s] = L1;
    const d1 = [q[0] - p[0], q[1] - p[1]];
    const d2 = [s[0] - r[0], s[1] - r[1]];
    const den = d1[0] * d2[1] - d1[1] * d2[0];
    const t = ((r[0] - p[0]) * d2[1] - (r[1] - p[1]) * d2[0]) / den;
    return [p[0] + d1[0] * t, p[1] + d1[1] * t];
  });
}

// ---------------------------------------------------------------- scale to scene units (as the aircraft's)
const sc = (v) => v * UNIT;
const sp = (p) => p.map(sc);
const sl = (loop) => loop.map(sp);
function scaleSolid(s) {
  const o = { ...s };
  if (o.kind === "lathe") Object.assign(o, { loop: sl(o.loop), at: sp(o.at) });
  if (o.kind === "extrude") Object.assign(o, { shape: sl(o.shape), holes: (o.holes ?? []).map(sl), from: sc(o.from), to: sc(o.to), bevel: sc(o.bevel ?? 0), conform: o.conform ? { x: sc(o.conform.x), r: sc(o.conform.r) } : null });
  if (o.kind === "box") Object.assign(o, { min: sp(o.min), max: sp(o.max) });
  if (o.pivot) o.pivot = sp(o.pivot);
  if (Array.isArray(o.explode)) o.explode = sp(o.explode);
  if (s.warp) o.warp = (x, y, z) => sp(s.warp([x / UNIT, y / UNIT, z / UNIT]));
  return o;
}
function scalePart(p) {
  const a = p.anchor;
  return {
    ...p,
    pivot: p.pivot ? sp(p.pivot) : p.pivot,
    explode: Array.isArray(p.explode) ? sp(p.explode) : p.explode,
    anchor: a ? { ...a, cut: a.cut ? sp(a.cut) : a.cut, out: a.out ? { ...a.out, c: sp(a.out.c), r: sc(a.out.r ?? 0) } : a.out } : a,
    solids: p.solids.map(scaleSolid),
  };
}
export const parts = () => partsMM().map(scalePart);
export const scene = () => ({ parts: parts(), fluids: [], centres: [] });
export const s3 = sp;
void ST;
