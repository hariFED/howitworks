// The main gear's parts, in world mm. Front section A-A on the leg's mid-plane, looking aft at the LEFT
// main gear: (u, v), u outboard from the aircraft's centre line, v up from the runway at the static
// load (the fuselage frame). The tip assembly (axle, wheel, brake, tyre) is drawn in the axle's own
// frame (s, r): s along the axle, outboard; r up; origin on the axle centre, level at the static load.
// The master cylinder is drawn in its own frame (m, q): m along its bore, forward (toward the
// firewall, left on the sheet), q up. Removed sections E-E and F-F: (z, y), z fore-and-aft, y across
// the leg. Each function draws one part into a view and returns SVG, so the main view and the
// details draw the same geometry at their own scale.

import * as K from "../../kit/draft.mjs";
import * as M from "./model.mjs";

export const part = (id, inner, extra = "") => `<g data-part="${id}"${extra}>${inner}</g>`;
const rad = Math.PI / 180;
const mirrorR = (pts) => pts.map(([s, r]) => [s, -r]).reverse();
const cutBoth = (V, pts, o) => K.cut(V, pts, o) + K.cut(V, mirrorR(pts), o);
const disc = (V, c, r, cls = "solid") => `<path class="${cls}" d="${K.d(V, K.circle(c[0], c[1], r, 24))}"/>`;
export function cutHoles(V, outer, holes, { mat = "steel", angle = 45 } = {}) {
  const dd = K.d(V, outer) + holes.map((h) => K.d(V, h)).join("");
  if (mat === "solid") return `<path class="solid" fill-rule="evenodd" d="${dd}"/>`;
  return `<path class="paper" fill-rule="evenodd" d="${dd}"/><path fill="url(#h-${mat}-${angle})" fill-rule="evenodd" d="${dd}"/><path class="vis" d="${dd}"/>`;
}
// a strip of half-width w either side of a polyline (a tube, a hose, a skin)
export function strip(pts, w0, w1 = w0) {
  const L = [];
  const R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const n = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
    L.push([pts[i][0] + n[0] * w0, pts[i][1] + n[1] * w0]);
    R.push([pts[i][0] - n[0] * w1, pts[i][1] - n[1] * w1]);
  }
  return [...L, ...R.reverse()];
}
const bez = (a, b, c, d, n = 16) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const k = [(1 - t) ** 3, 3 * t * (1 - t) ** 2, 3 * t * t * (1 - t), t ** 3];
    return [k[0] * a[0] + k[1] * b[0] + k[2] * c[0] + k[3] * d[0], k[0] * a[1] + k[1] * b[1] + k[2] * c[1] + k[3] * d[1]];
  });

// ================================================================ the fuselage (u, v)
export const BELLY = 585; // belly skin, inside face
export const FLOOR = 790; // cabin floor, underside
export const SIDE = 560; // fuselage side, inside face
export const CORNER_U = 380; // where the flat belly turns up into the side
export const CORNER_R = SIDE - CORNER_U;
const SKIN_T = 2;
// the belly and side skin as a centre line, with a slot where the leg passes out
function skinLine(a0, a1) {
  const c = [CORNER_U, BELLY + CORNER_R];
  return K.arc(c[0], c[1], CORNER_R + SKIN_T / 2, a0, a1, 18);
}
export const SLOT = [-77, -58]; // the arc's angles (deg) between which the leg passes out
export function skinStrips() {
  const v = BELLY - SKIN_T / 2;
  const belly = [[0, v], [CORNER_U, v]];
  const lo = [...belly, ...skinLine(-90, SLOT[0]).slice(1)];
  const hi = [...skinLine(SLOT[1], 0), [SIDE + SKIN_T / 2, 860]];
  return [strip(lo, SKIN_T / 2), strip(hi, SKIN_T / 2)];
}
export function skin(V) {
  return part(9, skinStrips().map((s) => K.cut(V, s, { mat: "solid" })).join("")) + K.breakLine(V, [SIDE - 6, 860], [SIDE + 8, 860]);
}
// 8 CABIN FLOOR on the bulkheads, with the seats' rails on it (extrusions cut across)
export const RAILS = [150, 400];
export function floor(V) {
  const rail = (u) => [[u - 10, FLOOR + 1.8], [u + 10, FLOOR + 1.8], [u + 10, FLOOR + 4.5], [u + 2, FLOOR + 4.5], [u + 2, FLOOR + 18], [u + 7, FLOOR + 18], [u + 7, FLOOR + 22], [u - 7, FLOOR + 22], [u - 7, FLOOR + 18], [u - 2, FLOOR + 18], [u - 2, FLOOR + 4.5], [u - 10, FLOOR + 4.5]];
  return part(8, K.cut(V, K.rect(0, FLOOR, SIDE, FLOOR + 1.8), { mat: "solid" }) + RAILS.map((u) => K.cut(V, rail(u), { mat: "alu", angle: 45 })).join(""));
}
// 7 GEAR BOX BULKHEAD, beyond the plane: web with flanges, a lightening hole and the leg's cut-out
export function bulkhead(V) {
  const c = [CORNER_U, BELLY + CORNER_R];
  const out = [[0, BELLY], [CORNER_U, BELLY], ...K.arc(c[0], c[1], CORNER_R, -90, 0, 14).slice(1), [SIDE, FLOOR], [0, FLOOR]];
  const hole = K.rrect(30, 640, 120, 740, 22);
  const fl = [[[0, BELLY + 14], [CORNER_U, BELLY + 14]], [[0, FLOOR - 14], [SIDE - 14, FLOOR - 14]], [[SIDE - 14, FLOOR - 14], [SIDE - 14, BELLY + CORNER_R]]];
  return part(7, `<path class="paper" fill-rule="evenodd" d="${K.d(V, out)}${K.d(V, hole)}"/><path class="vis" d="${K.d(V, out)}${K.d(V, hole)}"/>` + K.lines(V, fl, "thin"));
}

// ================================================================ the leg (u, v), deflected under F
const leg = (x, y) => M.legPoint(x, y);
export const LEG_END_IN = -M.A_IN - 25; // the leg's inner end, past the bolt
// the faces of the leg under the load F: [upper, lower] point lists from the inner end to the tip
export function legFaces(F) {
  const ax = M.legAxis(F);
  const up = [];
  const lo = [];
  const at = (i) => {
    const [u, v, sl] = ax[i];
    const a = -M.THETA * rad + sl;
    const n = [-Math.sin(a), Math.cos(a)];
    const h = M.thick(M.XS[i]) / 2;
    return { p: [u, v], n, t: [Math.cos(a), Math.sin(a)], h };
  };
  const first = at(0);
  const ext = 25;
  const p0 = [first.p[0] - first.t[0] * ext, first.p[1] - first.t[1] * ext];
  up.push([p0[0] + first.n[0] * first.h, p0[1] + first.n[1] * first.h]);
  lo.push([p0[0] - first.n[0] * first.h, p0[1] - first.n[1] * first.h]);
  for (let i = 0; i < ax.length; i++) {
    const s = at(i);
    up.push([s.p[0] + s.n[0] * s.h, s.p[1] + s.n[1] * s.h]);
    lo.push([s.p[0] - s.n[0] * s.h, s.p[1] - s.n[1] * s.h]);
  }
  return [up, lo];
}
export function legOutline(F) {
  const [up, lo] = legFaces(F);
  return [...up, ...lo.reverse()];
}
// the point on the leg's axis, across it by y, at x, under F (interpolated between stations)
export function legAt(F, x, y = 0) {
  const ax = M.legAxis(F);
  const xs = M.XS;
  let i = 0;
  while (i < xs.length - 2 && xs[i + 1] < x) i++;
  const f = Math.max(0, Math.min(1, (x - xs[i]) / (xs[i + 1] - xs[i])));
  const u = ax[i][0] + (ax[i + 1][0] - ax[i][0]) * f;
  const v = ax[i][1] + (ax[i + 1][1] - ax[i][1]) * f;
  const sl = ax[i][2] + (ax[i + 1][2] - ax[i][2]) * f;
  const a = -M.THETA * rad + sl;
  const ext = x < xs[0] ? x - xs[0] : 0;
  return [u + Math.cos(a) * ext - Math.sin(a) * y, v + Math.sin(a) * ext + Math.cos(a) * y, a];
}
// 1 MAIN GEAR LEG: a tapered flat bar, cut lengthwise on its mid-plane
export function legPart(V, F) {
  return part(1, K.cut(V, legOutline(F), { mat: "steel", angle: 45 }));
}
export function legPhantom(V) {
  return K.line(V, legOutline(0), "phan", true);
}
// 25 BRAKE LINE along the leg's upper face, from inside the gear box to near the tip
export const HOSE_D = 120; // the union where the rigid line meets the hose, this far back from the tip
export const LINE_X = [70, M.L - HOSE_D];
export const LINE_R = 2.38; // Ø4.76
export function lineOnLeg(F) {
  const pts = [];
  for (let k = 0; k <= 24; k++) {
    const x = LINE_X[0] + ((LINE_X[1] - LINE_X[0]) * k) / 24;
    const p = legAt(F, x, M.thick(x) / 2 + LINE_R + 0.3);
    pts.push([p[0], p[1]]);
  }
  return pts;
}
export function brakeLine(V, F) {
  const pts = lineOnLeg(F);
  // inside the gear box it rises from the leg to the union on the bulkhead
  const a = pts[0];
  const riser = bez([UNION[0], UNION[1] - 6], [UNION[0], UNION[1] - 30], [a[0] - 24, a[1] + 14], a, 10);
  return part(25, K.body(V, strip([...riser, ...pts.slice(1)], LINE_R)) + K.body(V, K.rrect(UNION[0] - 6, UNION[1] - 6, UNION[0] + 6, UNION[1] + 8, 1.5)) + K.body(V, K.rect(UNION[0] - LINE_R, UNION[1] + 8, UNION[0] + LINE_R, UNION[1] + 40)) + K.breakLine(V, [UNION[0] - 6, UNION[1] + 40], [UNION[0] + 6, UNION[1] + 40]));
}
export const UNION = [450, 712]; // the bulkhead union where the rigid line leaves the cabin

// ================================================================ the attachment (u, v)
// 2 SADDLE FORGING above the leg at the fuselage's lower corner; 3 its CAP below the leg; 4 the cap
// bolts (fore and aft of the leg, beyond the plane: hidden). The saddle presses the leg down; the
// inboard fitting holds the leg's inner end up: together they hold the leg's bending moment.
// the saddle: a clamp block on the leg (in the leg's frame, x −40…40, y up to SAD_Y) and a flange
// from it up to the fuselage's lower corner, where it bolts to the bulkheads
export const SAD = { x0: -40, x1: 40, top: 712 };
export const SAD_Y = 42;
export function saddlePts() {
  const h0 = M.H0 / 2;
  const a = leg(SAD.x0, h0);
  const b = leg(SAD.x1, h0);
  const c = leg(SAD.x1, SAD_Y);
  const d = leg(SAD.x0, SAD_Y);
  return [a, b, c, [c[0], SAD.top - 8], [c[0] - 8, SAD.top], [d[0] - 26, SAD.top], [d[0] - 26, d[1]], d];
}
export function saddle(V) {
  return part(2, K.cut(V, saddlePts(), { mat: "alu", angle: 135 }));
}
export const CAP = { x0: -36, x1: 36, t: 12 };
export function capPts() {
  const h0 = M.H0 / 2;
  return [leg(CAP.x0, -h0), leg(CAP.x0, -h0 - CAP.t + 3), leg(CAP.x0 + 4, -h0 - CAP.t), leg(CAP.x1 - 4, -h0 - CAP.t), leg(CAP.x1, -h0 - CAP.t + 3), leg(CAP.x1, -h0)];
}
export function cap(V) {
  return part(3, K.cut(V, capPts(), { mat: "steel", angle: 45 }));
}
// the cap bolts beyond the plane, hidden: two dashed lines each, perpendicular to the leg
export function capBoltsHidden(V) {
  const h0 = M.H0 / 2;
  const ln = [];
  for (const dx of [-5.55, 5.55]) ln.push([leg(dx, -h0 - CAP.t - 8), leg(dx, h0 + 34)]);
  return part(4, K.lines(V, ln, "hid"));
}
// 5 INBOARD FITTING under the leg's inner end, bolted to the bulkhead; 6 the bolt through both
export const FIT = { x0: -226, x1: -174, depth: 35 };
export function fittingPts() {
  const h0 = M.H0 / 2;
  return [leg(FIT.x0, -h0 - FIT.depth), leg(FIT.x1, -h0 - FIT.depth), leg(FIT.x1, -h0), leg(FIT.x0, -h0)];
}
export function fitting(V) {
  return part(5, K.cut(V, fittingPts(), { mat: "steel", angle: 135 }));
}
// the bolt AN8 (Ø12.7) through the leg's inner end and the fitting, perpendicular to the leg
export function inboardBolt(V) {
  const x = -M.A_IN;
  const h0 = M.H0 / 2;
  const yb = -h0 - FIT.depth; // the fitting's underside
  const sh = [leg(x - 6.35, yb - 1.5), leg(x + 6.35, yb - 1.5), leg(x + 6.35, h0), leg(x - 6.35, h0)];
  const head = [leg(x - 10, h0), leg(x + 10, h0), leg(x + 10, h0 + 8), leg(x - 10, h0 + 8)];
  const nut = [leg(x - 11, yb - 13), leg(x + 11, yb - 13), leg(x + 11, yb - 1.5), leg(x - 11, yb - 1.5)];
  return part(6, K.body(V, sh) + K.body(V, head) + K.body(V, nut) + K.lines(V, [[leg(x - 11, yb - 7), leg(x + 11, yb - 7)]], "thin"));
}

// ================================================================ the tip assembly (s, r), axle frame
// The leg's static faces near the tip, in the axle frame.
const PSI_S = -M.THETA * rad + M.tipSlope(M.F_STATIC); // the tip's direction at the static load
const TS = [Math.cos(PSI_S), Math.sin(PSI_S)];
const NS = [-Math.sin(PSI_S), Math.cos(PSI_S)];
export const TIP_AXIS = [M.TIP_LOWER[0] + (M.H1 / 2) * NS[0], M.TIP_LOWER[1] + (M.H1 / 2) * NS[1]];
// a point d back from the tip along the leg, y across it, in the axle frame (static)
export const tipPt = (d, y) => [TIP_AXIS[0] - d * TS[0] + y * NS[0], TIP_AXIS[1] - d * TS[1] + y * NS[1]];
const hAt = (d) => M.thick(M.L - d) / 2;
// the leg's end in the axle frame (Detail B draws it there: it rides with the wheel)
export function legTip(V, dMax = 160) {
  const up = [];
  const lo = [];
  for (let k = 0; k <= 8; k++) {
    const d = (dMax * k) / 8;
    up.push(tipPt(d, hAt(d)));
    lo.push(tipPt(d, -hAt(d)));
  }
  return part(1, K.cut(V, [...up.reverse(), ...lo], { mat: "steel", angle: 45 }));
}
export function lineOnTip(V, dMax = 200) {
  const pts = [];
  for (let k = 0; k <= 8; k++) {
    const d = HOSE_D + ((dMax - HOSE_D) * k) / 8;
    pts.push(tipPt(d, hAt(d) + LINE_R + 0.3));
  }
  return part(25, K.body(V, strip(pts, LINE_R)));
}
// 10 AXLE: forged with its mounting block; hollow spindle; with the spacer to the inner bearing
export const SP_R = 15.875; // Ø31.75 spindle
export const BLOCK = { s0: -192, s1: -126, bot: -30 };
const blockTop = (s) => {
  // the leg's lower face less the 2 mm shim, extended to the block's outboard face
  const d = (TIP_AXIS[0] - s) / TS[0];
  return tipPt(d, -hAt(Math.max(0, d)) - 2)[1];
};
export function axlePts() {
  const top = [];
  for (let k = 0; k <= 6; k++) {
    const s = BLOCK.s0 + ((BLOCK.s1 - BLOCK.s0) * k) / 6;
    top.push([s, blockTop(s)]);
  }
  return [
    [BLOCK.s0, BLOCK.bot], [BLOCK.s1, BLOCK.bot], [BLOCK.s1, -SP_R], [62, -SP_R], [62, -12.7], [86, -12.7], [86, -7], [-160, -7],
    [-160, 7], [86, 7], [86, 12.7], [62, 12.7], [62, SP_R], [BLOCK.s1, SP_R], ...top.reverse(),
  ];
}
export function axle(V) {
  const o = { mat: "steel", angle: 135 };
  const spacer = K.rect(-120, SP_R + 0.05, -66, 22);
  const threads = [[[62, 11.6], [86, 11.6]], [[62, -11.6], [86, -11.6]]];
  return part(10, K.cut(V, axlePts(), o) + K.cut(V, spacer, { mat: "steel", angle: 45 }) + K.cut(V, mirrorR(spacer), { mat: "steel", angle: 45 }) + K.lines(V, threads, "thin"));
}
// 11 AXLE BOLTS (beyond the plane, hidden) and the tapered shim under the leg
export function shimPts() {
  const sh = [];
  for (let k = 0; k <= 6; k++) sh.push(tipPt(6 + (48 * k) / 6, -hAt(6 + (48 * k) / 6)));
  for (let k = 6; k >= 0; k--) sh.push(tipPt(6 + (48 * k) / 6, -hAt(6 + (48 * k) / 6) - 1.4 - (0.8 * k) / 6));
  return sh;
}
export function axleBolts(V, hidden = true) {
  let s = K.cut(V, shimPts(), { mat: "solid" });
  if (hidden) {
    const ln = [];
    for (const d of [16, 44]) for (const dy of [-4.76, 4.76]) ln.push([tipPt(d + dy, hAt(d) + 8), tipPt(d + dy, -hAt(d) - 2 - 30)]);
    s += K.lines(V, ln, "hid");
  }
  return part(11, s);
}
// 12 TORQUE PLATE: keyed on the axle, clamped between the block and the spacer; it carries the caliper
export const TP = { s0: -126, s1: -120, top: 122, bot: -42 };
export function torquePlate(V) {
  const o = { mat: "steel", angle: 45 };
  return part(12, K.cut(V, K.rect(TP.s0, SP_R + 0.05, TP.s1, TP.top), o) + K.cut(V, K.rect(TP.s0, TP.bot, TP.s1, -SP_R - 0.05), o));
}
// 15 TAPERED ROLLER BEARINGS (cone, cup and a roller each side), 16 GREASE SEALS, 17 AXLE NUT
export function bearings(V) {
  let out = "";
  for (const sg of [-1, 1]) {
    const f = (pts) => pts.map(([s, r]) => [sg * s, r]);
    const cone = f([[41, SP_R + 0.05], [60, SP_R + 0.05], [60, 21], [56, 23.5], [43, 21.6], [41, 21.6]]);
    const cup = f([[42, 29.55], [59, 29.55], [59, 26.6], [43, 24.6], [42, 24.6]]);
    const roller = f([[44, 22.3], [55, 23.6], [55.4, 26.3], [44.4, 24.4]]);
    for (const rs of [1, -1]) {
      const g = (pts) => (rs > 0 ? pts : mirrorR(pts));
      out += K.cut(V, g(cone), { mat: "steel", angle: 135 }) + K.cut(V, g(cup), { mat: "steel", angle: 45 }) + K.body(V, g(roller));
    }
  }
  return part(15, out);
}
export function seals(V) {
  const a = K.rect(-66, SP_R + 0.05, -60.1, 29.55);
  const b = K.rect(60.1, 21, 66, 29.55);
  return part(16, cutBoth(V, a, { mat: "rubber", angle: 45 }) + cutBoth(V, b, { mat: "rubber", angle: 45 }));
}
export function axleNut(V) {
  const n = K.rect(60.1, 12.75, 72, 20.5);
  return part(17, K.body(V, n) + K.body(V, mirrorR(n)) + K.lines(V, [[[66, 12.75], [66, 20.5]], [[66, -12.75], [66, -20.5]]], "thin") + K.body(V, K.rect(78, -1.2, 81, 13.5)));
}
// 13 WHEEL: two cast halves split at s = 0, tied by four bolts (the top and bottom ones lie in the
// plane); the inner half's lugs carry the disc on those bolts
export const RIM = 76.2; // the 6 in bead seat
export function wheelHalf(withLug) {
  const lug = withLug ? [[-24, 62], [-86, 62], [-86, 48], [-24, 48]] : [];
  return [
    [0, 26], [0, 40], [-14, 40], [-14, withLug ? 48 : 40], ...(withLug ? [[0, 48], [0, 62], [-14, 62]] : []), [-14, 70], [0, 70], [0, RIM], [-51, RIM], [-51, 88.5], [-53.5, 92], [-57, 92], [-57, 70],
    [-24, 70], ...lug, [-24, 40], [-66, 40], [-66, 29.55], [-42, 29.55], [-42, 26],
  ];
}
export function wheel(V) {
  const o = { mat: "alu", angle: 45 };
  const inUp = wheelHalf(true);
  const outUp = wheelHalf(false).map(([s, r]) => [-s, r]).reverse();
  const outBoss = K.rect(0, 48, 14, 62);
  const o2 = { mat: "alu", angle: 135 };
  return part(13, K.cut(V, inUp, o) + K.cut(V, mirrorR(inUp), o) + K.cut(V, outUp, o2) + K.cut(V, mirrorR(outUp), o2) + K.cut(V, outBoss, o2) + K.cut(V, mirrorR(outBoss), o2) + K.line(V, [[0, 26], [0, RIM]], "vis") + K.line(V, [[0, -26], [0, -RIM]], "vis"));
}
// 14 WHEEL TIE BOLTS (two of the four lie in the plane), through disc, lug, both halves; cut lengthwise
export function tieBolt(V) {
  const one = (f) => K.body(V, f(K.rect(-92.35, 51.03, 24, 58.97))) + K.body(V, f(K.rect(-99.3, 49, -92.4, 61))) + K.body(V, f(K.rect(24, 49, 30, 61))) + K.lines(V, [f([[-96, 49], [-96, 61]])], "thin");
  return part(14, one((p) => p) + one(mirrorR));
}
// 18 TYRE AND TUBE: the tyre's section, the tube inside it, the air
function shell(a, b, cv, from, n = 30) {
  const pts = [];
  const t0 = Math.acos(Math.max(-1, Math.min(1, (from - cv) / b)));
  for (let i = 0; i <= n; i++) {
    const t = -t0 + (2 * t0 * i) / n;
    pts.push([a * Math.sin(t), cv + b * Math.cos(t)]);
  }
  return pts;
}
export const TYRE_CV = 140;
export function tyrePts(n = 30) {
  const W = M.TYRE_W / 2;
  const outer = shell(W, M.TYRE_R - TYRE_CV, TYRE_CV, 100, n);
  const inner = shell(W - 9, M.TYRE_R - TYRE_CV - 10, TYRE_CV, 102, n);
  return [[-51, RIM], [-51, 88.5], [-55, 93.5], [-63, 98], ...outer, [63, 98], [55, 93.5], [51, 88.5], [51, RIM], [44, RIM], [44, 85], ...inner.slice().reverse(), [-44, 85], [-44, RIM]];
}
export function tubePts(n = 30) {
  const W = M.TYRE_W / 2;
  const a = shell(W - 9.3, M.TYRE_R - TYRE_CV - 10.3, TYRE_CV, 102.5, n);
  const b = shell(W - 11.3, M.TYRE_R - TYRE_CV - 12.3, TYRE_CV, 104, n);
  return { outer: [...a, [43.6, 85.4], [43.6, RIM + 0.3], [-43.6, RIM + 0.3], [-43.6, 85.4]], inner: [...b, [41.6, 86], [41.6, RIM + 2.3], [-41.6, RIM + 2.3], [-41.6, 86]] };
}
export function tyre(V) {
  const t = tubePts();
  const one = (f) => `<path class="tint air" d="${K.d(V, f(t.inner))}"/>` + K.cut(V, f(tyrePts()), { mat: "rubber", angle: 45 }) + cutHoles(V, f(t.outer), [f(t.inner)], { mat: "solid" });
  return part(18, one((p) => p) + one(mirrorR));
}
export function tyrePhantom(V) {
  const W = M.TYRE_W / 2;
  const o = shell(W, M.TYRE_R - TYRE_CV, TYRE_CV, 100, 24);
  return K.line(V, [[-55, 93.5], ...o, [55, 93.5]], "phan") + K.line(V, mirrorR([[-55, 93.5], ...o, [55, 93.5]]), "phan");
}
// 19 BRAKE DISC Ø190.5×6.35 on the wheel's lug
export const DISC = { s0: -92.35, s1: -86, r0: 45, r1: M.DISC_OD / 2 };
export function brakeDisc(V) {
  const o = { mat: "steel", angle: 135 };
  return part(19, K.cut(V, K.rect(DISC.s0, DISC.r0, DISC.s1, DISC.r1), o) + K.cut(V, K.rect(DISC.s0, -DISC.r1, DISC.s1, -DISC.r0), o));
}
// The caliper, at the top: 20 CYLINDER (housing), 21 PISTON with its O-ring, 22 PRESSURE PLATE AND
// LINING, 23 BACK PLATE AND LINING, 24 ANCHOR BOLT (beyond, seen between the linings' plates).
// c: the clamp's take-up, 0 at rest to 1 with the gap closed (the piston moves out, the housing back).
export const CAL = { s0: -119, s1: -100.5, r0: 50, r1: 118, bore0: -116, rb0: 78 - M.CAL_BORE / 2, rb1: 78 + M.CAL_BORE / 2 };
const half = M.PAD_GAP / 2;
export function housing(V) {
  const C = CAL;
  const pts = [[C.s0, C.r0], [C.s1, C.r0], [C.s1, C.rb0], [C.bore0, C.rb0], [C.bore0, C.rb1], [C.s1, C.rb1], [C.s1, C.r1], [-106, C.r1], [-106, 126], [-113, 126], [-113, C.r1], [C.s0, C.r1]];
  const port = K.rect(-111, C.rb1, -108, C.r1 + 8);
  return part(20, K.cut(V, pts, { mat: "alu", angle: 45 }) + `<path class="paper" d="${K.d(V, port)}"/>` + K.lines(V, [[[-111, C.rb1], [-111, C.r1 + 8]], [[-108, C.rb1], [-108, C.r1 + 8]]], "vis"));
}
// the piston's half-profile [r, s] about its own axis (r from the bore's centre line), with its O-ring groove
export const PISTON_R = M.CAL_BORE / 2 - 0.05;
export const PISTON_LOOP = [[0, -114.5], [PISTON_R, -114.5], [PISTON_R, -110], [PISTON_R - 2.4, -110], [PISTON_R - 2.4, -106], [PISTON_R, -106], [PISTON_R, CAL.s1], [0, CAL.s1]];
export function piston(V, c = 0) {
  const ds = half * c;
  const cy = (CAL.rb0 + CAL.rb1) / 2;
  const up = PISTON_LOOP.map(([r, s]) => [s + ds, cy + r]);
  const lo = PISTON_LOOP.map(([r, s]) => [s + ds, cy - r]).reverse();
  const ring = (sg) => K.cut(V, K.circle(-108 + ds, cy + sg * (PISTON_R - 1.25), 1.15, 12), { mat: "solid" });
  return part(21, K.cut(V, [...up.slice(1, -1), ...lo.slice(1, -1)], { mat: "alu", angle: 135 }) + ring(1) + ring(-1));
}
export function pressurePlate(V, c = 0) {
  const ds = half * c;
  return part(22, K.cut(V, K.rect(CAL.s1 + ds, 62, -97 + ds, 96), { mat: "steel", angle: 45 }) + K.cut(V, K.rect(-97 + ds, 64, DISC.s0 - half + ds, 92), { mat: "plastic", angle: 60 }));
}
export function backPlate(V, c = 0) {
  const ds = -half * c;
  return part(23, K.cut(V, K.rect(DISC.s1 + half + ds, 64, -81.75 + ds, 92), { mat: "plastic", angle: 30 }) + K.cut(V, K.rect(-81.75 + ds, 62, -78.25 + ds, 112), { mat: "steel", angle: 135 }));
}
export function anchorBolt(V) {
  return part(24, K.body(V, K.rect(CAL.s1, 96.2, -81.8, 104.8)));
}
// the fluid in the caliper: behind the piston and up the port
export const calFluid = (c = 0) => [K.rect(CAL.bore0, CAL.rb0 + 0.6, -114.5 + half * c, CAL.rb1 - 0.6), K.rect(-110.8, CAL.rb1 - 0.6, -108.2, CAL.r1 + 8)];
// 25 BRAKE HOSE from the line on the leg to the caliper's inlet
export function hosePts() {
  const a = tipPt(HOSE_D, hAt(HOSE_D) + LINE_R + 0.3);
  const b = [-109.5, 128];
  return bez(a, [a[0] + TS[0] * 26, a[1] + TS[1] * 26 + 26], [b[0], b[1] + 26], b, 18);
}
// the union where the rigid line ends: a hex across the line
export function unionPts() {
  const y0 = hAt(HOSE_D) + LINE_R + 0.3;
  return [tipPt(HOSE_D + 6, y0 - 5), tipPt(HOSE_D - 6, y0 - 5), tipPt(HOSE_D - 6, y0 + 5), tipPt(HOSE_D + 6, y0 + 5)];
}
export function hose(V) {
  return part(25, K.body(V, strip(hosePts(), 4)) + K.body(V, unionPts()) + K.body(V, K.rect(-113.5, 126, -105.5, 134)));
}

// everything of the tip assembly, in the axle frame at rest
export function tipAssembly(V, { c = 0, tip = true } = {}) {
  return (
    (tip ? legTip(V) + lineOnTip(V) : "") +
    tyre(V) + anchorBolt(V) + axle(V) + torquePlate(V) + wheel(V) + bearings(V) + seals(V) + axleNut(V) + brakeDisc(V) + tieBolt(V) +
    housing(V) + `<g class="cal-move">${piston(V, c)}${pressurePlate(V, c)}${backPlate(V, c)}</g>` + hose(V) + axleBolts(V, tip)
  );
}

// ================================================================ removed sections (z, y)
// E-E through the saddle: the leg, the saddle with its cheeks, the cap and its two bolts, the
// gear box's two bulkhead webs either side
export function sectionE(V) {
  const b = M.B0 / 2;
  const h = M.H0 / 2;
  const sad = [[-70, -h], [-47, -h], [-47, h], [47, h], [47, -h], [70, -h], [70, SAD_Y], [45, SAD_Y], [45, 58], [-45, 58], [-45, SAD_Y], [-70, SAD_Y]];
  const capR = [[-70, -h - 12], [70, -h - 12], [70, -h], [-70, -h]];
  const bolt = (sg) => K.body(V, K.rect(sg * 56.5 - 5.55, -h - 12, sg * 56.5 + 5.55, SAD_Y)) + K.body(V, K.rect(sg * 56.5 - 9, SAD_Y, sg * 56.5 + 9, SAD_Y + 7)) + K.body(V, K.rect(sg * 56.5 - 9.5, -h - 23, sg * 56.5 + 9.5, -h - 12));
  const web = (sg) => K.cut(V, K.rect(sg * 71, -40, sg * 72.6, 70), { mat: "solid" });
  return (
    part(7, web(-1) + web(1)) +
    part(2, K.cut(V, sad, { mat: "alu", angle: 135 })) + K.breakLine(V, [-50, 58], [50, 58]) +
    part(1, K.cut(V, K.rrect(-b, -h, b, h, 3), { mat: "steel", angle: 45 })) +
    part(3, K.cut(V, capR, { mat: "steel", angle: 45 })) +
    part(4, bolt(1) + bolt(-1))
  );
}
// F-F halfway along the leg: the tapered bar and the brake line on it
export const XF = M.L / 2;
export function sectionF(V) {
  const b = M.breadth(XF) / 2;
  const h = M.thick(XF) / 2;
  return part(1, K.cut(V, K.rrect(-b, -h, b, h, 3), { mat: "steel", angle: 45 })) + part(25, K.body(V, K.circle(0, h + LINE_R + 0.3, LINE_R, 20)) + `<path class="vis" d="${K.d(V, K.circle(0, h + LINE_R + 0.3, 1.2, 12))}"/>`);
}

// ================================================================ the master cylinder (m, q)
// Side section on the cylinder's axis, nose left: m along the bore from the body's front face (0)
// back toward the pedal, q up. The eye at the front is pinned to the rudder bar's bracket; the toe
// pedal pushes the rod forward. x is the stroke (mm).
export const MC = {
  back: 78, // the rod gland's back face
  gland: 64, // the bore ends here; the gland and rod seal behind
  bore: M.MC_BORE / 2,
  od: 15,
  resLo: 15, // the reservoir's floor
  resHi: 40, // its roof
  res0: 22, // its front wall (inside)
  res1: 62, // its back wall (inside)
  head: 13, // piston length
  rest: 50, // the piston's front face (the cup's lip) at rest
  port: 48.8, // the compensating port (Ø0.8), covered once the cup has moved 1.6 mm
  level: 31, // the fluid's level in the reservoir
};
export const pistonFront = (x) => MC.rest - x;
export const rodEnd = (x) => MC.back + 30 - x; // the rod's clevis face
export const PEDAL = { hinge: [117, -52], pin: [117, 0], toe: [117, 78] };
export function mcBodyPts() {
  const B = MC;
  return [
    [B.back, 4.1], [B.back, B.od], [B.res1 + 3, B.od], [B.res1 + 3, B.resHi + 3], [B.res0 - 3, B.resHi + 3], [B.res0 - 3, B.od], [-6, B.od], [-6, 9], [-22, 9],
    ...K.arc(-22, 0, 9, 90, 270, 10).slice(1, -1), [-22, -9], [-6, -9], [-6, -B.od], [2, -B.od], [2, -B.od - 9], [11, -B.od - 9], [11, -B.od], [B.back, -B.od], [B.back, -4.1],
    [B.gland, -4.1], [B.gland, -B.bore], [0, -B.bore], [0, B.bore], [B.gland, B.bore], [B.gland, 4.1],
  ];
}
// 26 MASTER CYLINDER BODY with its reservoir, ports, outlet and filler plug
export function mcBody(V) {
  const B = MC;
  const o = { mat: "alu", angle: 45 };
  const resIn = K.rect(B.res0, B.resLo, B.res1, B.resHi);
  const drill = (m0, m1, q0, q1) => `<path class="paper" d="${K.d(V, K.rect(m0, q0 - 0.2, m1, q1 + 0.2))}"/>` + K.lines(V, [[[m0, q0], [m0, q1]], [[m1, q0], [m1, q1]]], "vis");
  return part(
    26,
    cutHoles(V, mcBodyPts(), [resIn, K.circle(-22, 0, 3.2, 16)], o) +
      drill(B.port - 0.4, B.port + 0.4, B.bore, B.resLo) +
      drill(5, 8, -B.od - 9, -B.bore) +
      K.lines(V, [[[B.gland + 2, 4.1], [B.back, 4.1]], [[B.gland + 2, -4.1], [B.back, -4.1]]], "vis") +
      cutHoles(V, [[38, B.resHi + 3], [50, B.resHi + 3], [50, B.resHi + 8], [53, B.resHi + 8], [53, B.resHi + 11], [35, B.resHi + 11], [35, B.resHi + 8], [38, B.resHi + 8]], [K.rect(43.4, B.resHi + 3, 44.6, B.resHi + 11.01)], { mat: "plastic", angle: 135 }) +
      K.cut(V, K.rect(38, B.resHi - 3, 50, B.resHi + 3), { mat: "plastic", angle: 135 }) +
      `<path class="paper" d="${K.d(V, K.rect(43.4, B.resHi - 3.2, 44.6, B.resHi + 11.2))}"/>` + K.lines(V, [[[43.4, B.resHi - 3], [43.4, B.resHi + 11]], [[44.6, B.resHi - 3], [44.6, B.resHi + 11]]], "thin") +
      K.cut(V, K.rect(B.gland + 5, B.bore + 0.6, B.gland + 7.4, 4.1 + 2.4), { mat: "solid" }) + K.cut(V, K.rect(B.gland + 5, -4.1 - 2.4, B.gland + 7.4, -B.bore - 0.6), { mat: "solid" })
  );
}
// 27 PISTON, CUP AND ROD at stroke x: the cup on the front, an O-ring at the back, the rod and clevis
export function mcPiston(V, x = 0) {
  const f = pistonFront(x);
  const B = MC;
  const e = rodEnd(x);
  const head = K.rect(f + 2.5, -B.bore + 0.05, f + B.head, B.bore - 0.05);
  const cup = [[f, -B.bore + 0.05], [f + 2.5, -B.bore + 0.05], [f + 2.5, B.bore - 0.05], [f, B.bore - 0.05], [f, B.bore - 1.4], [f + 1.1, B.bore - 1.4], [f + 1.1, -B.bore + 1.4], [f, -B.bore + 1.4]];
  const rod = [[f + B.head, -4], [e, -4], [e, 4], [f + B.head, 4]];
  const oRing = (q) => K.cut(V, K.circle(f + 9.5, q, 1.15, 12), { mat: "solid" });
  const clevis = [[e, -6], [e + 14, -6], [e + 14, 6], [e, 6]];
  return part(27, K.cut(V, head, { mat: "steel", angle: 135 }) + K.cut(V, cup, { mat: "rubber", angle: 45 }) + oRing(B.bore - 1.2) + oRing(-B.bore + 1.2) + K.body(V, rod) + K.body(V, clevis));
}
// 28 RETURN SPRING between the bore's front end and the piston's cup
export function mcSpring(V, x = 0) {
  return part(28, K.springSection(V, { from: 0.6, to: pistonFront(x) - 0.3, radius: 4.1, wire: 1.2, turns: 7, axis: "u", at: 0 }));
}
// the fluid: in the bore ahead of the cup and out of the outlet (line pressure), in the reservoir (open)
export const mcFluidHigh = (x = 0) => [K.rect(0.1, -MC.bore + 0.05, pistonFront(x) - 0.05, MC.bore - 0.05), K.rect(5.1, -MC.od - 9, 7.9, -MC.bore)];
export const mcFluidLow = () => [K.rect(MC.res0, MC.resLo, MC.res1, MC.level), K.rect(MC.port - 0.38, MC.bore, MC.port + 0.38, MC.resLo)];
// 29 TOE BRAKE PEDAL, hinged at its foot on the rudder pedal; a: its turn (rad), toe forward positive
export const pedalTurn = (x) => Math.asin(Math.min(1, x / (PEDAL.pin[1] - PEDAL.hinge[1])));
function pedalR(a) {
  const [hx, hy] = PEDAL.hinge;
  return ([m, q]) => {
    const dm = m - hx;
    const dq = q - hy;
    return [hx + dm * Math.cos(a) - dq * Math.sin(a), hy + dm * Math.sin(a) + dq * Math.cos(a)];
  };
}
export function pedalPts() {
  const [hx, hy] = PEDAL.hinge;
  return [[hx - 4, hy], [hx + 4, hy], [hx + 4, 8], [hx + 8, 14], [hx + 8, 66], [hx + 12, 74], [hx + 12, 88], [hx - 14, 88], [hx - 14, 80], [hx - 6, 70], [hx - 6, -8], [hx - 4, -12]];
}
export function pedal(V, a = 0) {
  const R = pedalR(a);
  const [hx, hy] = PEDAL.hinge;
  const lug = [[hx - 9, -6], [hx + 4, -6], [hx + 4, 6], [hx - 9, 6]];
  return part(29, K.cut(V, pedalPts().map(R), { mat: "alu", angle: 135 }) + K.body(V, lug.map(R)) + disc(V, R(PEDAL.pin), 2.6, "vis") + K.body(V, K.circle(hx, hy, 6, 20).map(R)) + disc(V, PEDAL.hinge, 2.4, "vis"));
}
// the rudder pedal it hangs on (an adjacent part, in phantom) and the bracket the eye pins to
export function rudderPedalPhantom(V) {
  const [hx, hy] = PEDAL.hinge;
  return K.line(V, [[hx - 10, hy + 6], [hx + 10, hy + 6], [hx + 14, hy - 40], [hx - 6, hy - 40]], "phan", true) + K.line(V, [[-38, -14], [-14, -14], [-14, 14], [-38, 14]], "phan", true);
}

// ================================================================ annotation that moves with the leg
// a cutting-plane line from a to b (world), thick ends, arrows in the viewing direction, its letters
export function planeMark(V, a, b, letter, [lx, ly]) {
  const [ax, ay] = V.p(a);
  const [bx, by] = V.p(b);
  const len = Math.hypot(bx - ax, by - ay);
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  const head = (x, y) => `M${K.r2(x + lx * 9)} ${K.r2(y + ly * 9)}L${K.r2(x + lx * 2 - ly * 1.8)} ${K.r2(y + ly * 2 + lx * 1.8)}L${K.r2(x + lx * 2 + ly * 1.8)} ${K.r2(y + ly * 2 - lx * 1.8)}Z`;
  const e1 = [ax + ux * 8, ay + uy * 8];
  const e2 = [bx - ux * 8, by - uy * 8];
  return (
    `<path class="ctr" d="M${K.r2(e1[0])} ${K.r2(e1[1])}L${K.r2(e2[0])} ${K.r2(e2[1])}"/>` +
    `<path class="vis" d="M${K.r2(ax)} ${K.r2(ay)}L${K.r2(e1[0])} ${K.r2(e1[1])}M${K.r2(bx)} ${K.r2(by)}L${K.r2(e2[0])} ${K.r2(e2[1])}"/>` +
    `<path class="thin" d="M${K.r2(ax)} ${K.r2(ay)}l${K.r2(lx * 4)} ${K.r2(ly * 4)}M${K.r2(bx)} ${K.r2(by)}l${K.r2(lx * 4)} ${K.r2(ly * 4)}"/>` +
    `<path class="head" d="${head(ax, ay)}${head(bx, by)}"/>` +
    `<text class="t t-lg" x="${K.r2(ax - ux * 10)}" y="${K.r2(ay - uy * 10 + 4)}" text-anchor="middle">${letter}</text>` +
    `<text class="t t-lg" x="${K.r2(bx + ux * 10)}" y="${K.r2(by + uy * 10 + 4)}" text-anchor="middle">${letter}</text>`
  );
}
export const LOOK = [M.COS, M.SIN]; // along the leg, outboard and down, on the sheet
export function planeF(V, F) {
  const a = legAt(F, XF, -34);
  const b = legAt(F, XF, 34);
  return planeMark(V, [a[0], a[1]], [b[0], b[1]], "F", LOOK);
}
// half the track, from the centre line to the tyre's centre plane at the runway (vg: the runway's
// height in the fuselage frame)
export function dimTrack(V, F, vg, y) {
  const ax = M.axleAt(F);
  const bottom = Math.min(vg, ax[1] - M.TYRE_R);
  return K.dim(V, [0, -64], [ax[0], bottom], { dir: "h", off: y - V.p([0, -64])[1], text: `${Math.round(ax[0])}`, id: "dim-t" });
}
// the axle's rise from its unloaded place (the phantom), beside the wheel
export function dimDefl(V, F, x) {
  const a = M.AXLE_REST;
  const b = M.axleAt(F);
  if (b[1] - a[1] < 3) return "";
  return K.dim(V, [a[0] + 30, a[1]], [b[0] + 92, b[1]], { dir: "v", off: x - V.p([a[0] + 30, 0])[0], text: `δ${Math.round(b[1] - a[1])}`, id: "dim-d" });
}
