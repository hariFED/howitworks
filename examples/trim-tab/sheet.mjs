// The trim tab's sheet: views, their moving pieces, the diagrams and the furniture. Pure: each function
// returns SVG for one solved state (model.mjs's solve), so the build draws the sheet and the page
// redraws the moving groups with the same code.
//   Section A-A  the port elevator at the actuator, BL −485, in the tailplane's frame, 1:2.5
//   Detail B     the actuator on its axis, in the elevator's frame, 1:1
//   Detail C     the piano hinge, 5:1
//   View D       the pedestal from the port side, side plate removed, 1:5
//   View E       the trim cable run from the port side, 1:25
//   Diagrams     hinge moments against elevator angle; stick force against airspeed; the screw's
//                inclined plane and friction cone; wheel turns against tab angle

import * as K from "../../kit/draft.mjs";
import * as A from "../light-aircraft/model.mjs";
import * as FC from "../flight-controls/model.mjs";
import * as X from "../flight-controls/extra.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";

const rad = Math.PI / 180;
const r2 = K.r2;
const fmt = K.fmt;
const PX = K.PX_PER_MM;

// ---------------------------------------------------------------- views
export const BOX = {
  B: { x: 40, y: 286, w: 712, h: 184 },
  C: { cx: 545, cy: 132, r: 66, wu: 286, wv: -3 },
};
export const VIEWS = {
  AA: { x: 105, y: 130, scale: 0.5 },
  B: { x: r2(44 - 8 * 2 * PX), y: 360, scale: 2 },
  C: { x: r2(BOX.C.cx - BOX.C.wu * 2 * PX), y: r2(BOX.C.cy + BOX.C.wv * 2 * PX), scale: 2 },
  D: { x: r2(640 - 240 * 0.2 * PX), y: r2(70 + 1045 * 0.2 * PX), scale: 0.2 },
  E: { x: 48, y: r2(660 + 1400 * 0.025 * PX), scale: 0.025 },
};
export const VA = K.view(VIEWS.AA);
export const VB = K.view(VIEWS.B);
export const VC = K.view(VIEWS.C);
export const VD = K.view(VIEWS.D);
export const VE = K.view(VIEWS.E);
const part = P.part;
// Section A-A turns the elevator (and everything in it) by δe about its hinge
const elevT = (de) => (pts) => X.rot(pts, [0, 0], -de);

// ---------------------------------------------------------------- SECTION A-A
function aaStatic() {
  // the tailplane forward of the hinge, phantom: its rear spar and skins
  const f = (u) => P.half(u);
  const L = [
    [[-70, f(-70)], [-48, f(-48)]],
    [[-70, -f(-70)], [-48, -f(-48)]],
    [[-48, f(-48) - 1], [-48, -f(-48) + 1]],
  ];
  return `<g data-role="phantom">${L.map((p) => K.line(VA, p, "phan")).join("")}</g>`;
}
export function aaMoving(sol) {
  const T = elevT(sol.de);
  return P.elevator(VA, T) + P.actuator(VA, sol, T, false) + P.hinge(VA, sol, T) + P.rodHornTab(VA, sol, T);
}
// the stick-free elevator and tab: where the elevator would float with the column let go
export function aaFloat(sol) {
  if (Math.abs(sol.float - sol.de) < 0.15 || sol.fail) return "";
  const T = elevT(sol.float);
  const el = T(P.elevOutline());
  const tb = T(P.tabRot(P.tabOutline(), sol.tab));
  return K.line(VA, el, "phan", true) + K.line(VA, tb, "phan", true);
}
// the two shares of the hinge moment, as curved arrows about the elevator's hinge: the elevator's own
// (thick) and the tab's (accent); scaled to 6 N·m
export function aaMoments(sol) {
  if (sol.v < 1) return "";
  const c = VA.p([0, 0]);
  return P.momentArrow(c, 24, sol.m.elev / 6, -150, "vis") + P.momentArrow(c, 32, sol.m.tab / 6, 150, "vis accent");
}
const AA_B = { 18: [166, 56], 11: [246, 56], 16: [356, 56], 17: [440, 56], 7: [121, 206], 14: [300, 206], 15: [396, 206] };
export function aaBalloons(sol) {
  const T = elevT(sol.de);
  const tt = (p) => T(P.tabRot(p, sol.tab));
  const e = P.rodEnds(sol);
  const at = {
    18: T([[60, P.half(60) - 0.4]])[0],
    11: T([[150, P.AXV + P.HOUS.rTube - 0.8]])[0],
    7: T([[P.DRUM.u0 + 4, P.AXV - P.DRUM.r + 3]])[0],
    14: T([[e.a[0] + (e.b[0] - e.a[0]) * 0.55, e.a[1] + (e.b[1] - e.a[1]) * 0.55]])[0],
    15: tt([[P.TAB_U + 3, -26]])[0],
    16: T([[P.TAB_U, 1.8]])[0],
    17: tt([[316, P.half(316) - 0.5]])[0],
  };
  return Object.entries(AA_B).map(([n, b]) => K.balloon(VA, at[n], b, n, { target: n })).join("");
}

// ---------------------------------------------------------------- DETAIL B: the actuator, 1:1
function bStatic() {
  // the elevator round the actuator: skins and the front spar (it does not move in its own frame)
  const el = P.elevator(VB);
  const slot = K.lines(VB, [[[P.SLOT[0], -P.half(P.SLOT[0])], [P.SLOT[0], -P.half(P.SLOT[0]) + P.SKIN]]], "vis");
  return el + slot + K.centerline(VB, [P.SCR.u0 - 4, P.AXV], [P.SCR.u1 + 4, P.AXV], 0);
}
export function bMoving(sol) {
  const e = P.rodEnds(sol);
  // the rod, clipped by the detail: its eye on the nut's pin and its run aft
  return P.actuator(VB, sol) + part(14, K.body(VB, P.rodShape(e.a, [e.a[0] + (e.b[0] - e.a[0]) * 0.6, e.a[1] + (e.b[1] - e.a[1]) * 0.6])) + `<circle class="vis" cx="${r2(VB.p(e.a)[0])}" cy="${r2(VB.p(e.a)[1])}" r="${r2(P.PIN_R * VB.k)}"/>`);
}
// the nut's travel from neutral, live
export function bDims(sol) {
  const c0 = P.nutC(0);
  const c = P.nutC(sol.nut);
  const y = 480;
  const dimOf = (a, b, text, id) => K.dim(VB, a, b, { dir: "h", off: y - VB.p(a)[1], text, id });
  let out = "";
  if (Math.abs(c - c0) > 3) out += dimOf([Math.min(c, c0), P.NUT.pinV], [Math.max(c, c0), P.NUT.pinV], `${fmt(Math.abs(c - c0), 1)}`, "dim-nut");
  return out;
}
const B_B = { 7: [72, 270], 5: [140, 270], 10: [238, 270], 11: [320, 270], 9: [470, 270], 8: [610, 270], 12: [712, 270], 18: [56, 496], 13: [570, 496], 14: [640, 496] };
export function bBalloons(sol) {
  const c = P.nutC(sol.nut);
  const st = P.strands(sol.screw);
  const at = {
    7: [P.DRUM.u0 + 3, P.AXV + 12],
    5: st.top,
    10: [(P.BRG.u0 + P.BRG.u1) / 2, P.AXV + P.BRG.ro - 1.2],
    11: [P.HOUS.boss + 12, P.AXV + P.HOUS.rTube - 1.4],
    8: [148, P.AXV + 1],
    9: [c + 4, P.AXV + P.NUT.r - 1.4],
    12: [(P.BUSH.u0 + P.BUSH.u1) / 2, P.AXV + P.BUSH.ro - 0.6],
    13: [(P.STOPS.a[0] + P.STOPS.a[1]) / 2, P.AXV - P.HOUS.rTube + 1.2],
    14: (() => {
      const e = P.rodEnds(sol);
      return [e.a[0] + (e.b[0] - e.a[0]) * 0.32, e.a[1] + (e.b[1] - e.a[1]) * 0.32];
    })(),
    18: [P.SPAR_U + 0.5, -24],
  };
  return Object.entries(B_B).map(([n, b]) => K.balloon(VB, at[n], b, n, { target: n })).join("");
}
function bStaticDims() {
  // the drum's diameter and the screw's, on the left and right
  return K.dim(VB, [P.DRUM.u0, P.AXV - P.DRUM.r], [P.DRUM.u0, P.AXV + P.DRUM.r], { dir: "v", off: -10, prefix: "Ø" }) + "";
}

// ---------------------------------------------------------------- DETAIL C: the piano hinge, 5:1
export function cMoving(sol) {
  return P.elevator(VC) + P.hinge(VC, sol) + P.rodHornTab(VC, sol) + P.rivets(VC, sol);
}
const C_B = { 18: [500, 214], 16: [530, 214], 17: [560, 214], 15: [590, 214] };
export function cBalloons(sol) {
  const tt = (p) => P.tabRot(p, sol.tab);
  const at = {
    18: [P.WEB_U - 0.5, 4],
    16: [P.TAB_U + 1.6, 0.9],
    17: tt([[292, P.half(292) - 0.5]])[0],
    15: tt([[P.TSPAR_U + 4, -P.half(P.TSPAR_U + 4) - 1.2]])[0],
  };
  return Object.entries(C_B).map(([n, b]) => K.balloon(VC, at[n], b, n, { target: n })).join("");
}

// ---------------------------------------------------------------- VIEW D: the pedestal, 1:5
const D_CABLE_END = 700; // FS where the strands leave the view
function strandsD() {
  // from the cockpit drum's top and bottom toward the first pulleys (BP-106's T1A and T1B)
  const T1 = FC.PULLEYS.T1A;
  const W = P.WHEEL;
  const R = M.TRIM_DRUM_R;
  const out = [];
  for (const s of [1, -1]) {
    const a = [W.fs, W.wl + s * R];
    const k = (T1[2] + s * (FC.PULLEY_D / 2) - a[1]) / (T1[0] - a[0]);
    out.push([a, [D_CABLE_END, a[1] + k * (D_CABLE_END - a[0])]]);
  }
  return out;
}
function dStatic() {
  const s = strandsD();
  const cables = part(5, s.map((p) => `<path class="cable" d="${K.d(VD, p, false)}"/>`).join(""));
  const floor = `<g data-role="phantom">${K.line(VD, [[200, A.CABIN.floor], [720, A.CABIN.floor]], "phan")}</g>`;
  const brk = s.map(([, b]) => K.breakLine(VD, [b[0] - 10, b[1] + 12], [b[0] - 10, b[1] - 12])).join("");
  return P.pedestal(VD) + P.cockpitDrum(VD) + cables + floor + brk + P.indicatorScale(VD);
}
export function dMoving(sol) {
  return P.trimWheel(VD, sol.turns) + P.indicator(VD, sol.ind);
}
function dEngraved() {
  const x = r2(VD.p([P.IND.fs, 0])[0]);
  const up = r2(VD.p([0, P.IND.wl1 + 13])[1]);
  const dn = r2(VD.p([0, P.IND.wl0 - 13])[1] + 6);
  return `<g data-role="engraved"><text class="t t-sm" x="${x}" y="${up}" text-anchor="middle">UP</text><text class="t t-sm" x="${x}" y="${dn}" text-anchor="middle">DN</text></g>`;
}
function dLabels() {
  const w = P.indWl(M.indicatorFor(M.TAKEOFF_TAB));
  const [x, y] = VD.p([P.PED.fs0, w]);
  return `<g data-role="label"><text class="t t-sm" x="${r2(x - 4)}" y="${r2(y + 2.7)}" text-anchor="end">T.O.</text></g>`;
}
const D_B = { 3: [656, 46], 1: [684, 46], 2: [712, 46], 4: [790, 46], 5: [836, 150] };
export function dBalloons(sol) {
  const W = P.WHEEL;
  const s = strandsD();
  const at = {
    1: [W.fs + (W.r - 6) * Math.cos(125 * rad), W.wl + (W.r - 6) * Math.sin(125 * rad)],
    2: [W.fs + M.TRIM_DRUM_R * Math.cos(-60 * rad), W.wl + M.TRIM_DRUM_R * Math.sin(-60 * rad)],
    3: [P.IND.fs + 2, P.indWl(sol.ind)],
    4: [P.PED.fs1 - 30, P.PED.wl1 - 10],
    5: [660, s[0][0][1] + ((s[0][1][1] - s[0][0][1]) * (660 - s[0][0][0])) / (s[0][1][0] - s[0][0][0])],
  };
  return Object.entries(D_B).map(([n, b]) => K.balloon(VD, at[n], b, n, { target: n })).join("");
}

// ---------------------------------------------------------------- VIEW E: the trim cable run, 1:25
const RUN = P.cableRun();
function eStatic() {
  const cab = part(5, RUN.map((r) => `<path class="cable" d="${K.d(VE, r.pts, false)}"/>`).join(""));
  const pulleys = [];
  for (const r of RUN) for (const w of r.wraps) pulleys.push(w.c);
  const pul = part(6, pulleys.map((c) => K.body(VE, K.circle(c[0], c[1], FC.PULLEY_D / 2, 16))).join(""));
  const W = P.WHEEL;
  const wheel = part(1, K.body(VE, K.circle(W.fs, W.wl, W.r, 36)) + `<path class="thin" d="${K.d(VE, K.circle(W.fs, W.wl, M.TRIM_DRUM_R, 12))}"/>`);
  const ped = part(4, K.body(VE, K.rect(P.PED.fs0, P.PED.wl0, P.PED.fs1, P.PED.wl1 - 60)));
  // the port elevator at BL −485, its tab and the actuator inside (too small to section: outlines)
  const T = (pts) => pts.map(([u, v]) => [TPh + u, A.TAILPLANE.wl + v]);
  const elev = part(18, K.body(VE, T(P.elevOutline())));
  const tab = part(17, K.body(VE, T(P.tabOutline())));
  const act = part(11, K.body(VE, T(K.rect(P.HOUS.u0, P.AXV - 12, P.HOUS.u1, P.AXV + 12))));
  return P.fuselage(VE) + ped + wheel + cab + pul + elev + tab + act;
}
const TPh = A.TAILPLANE.hinge;
const E_B = { 1: [70, 604], 11: [372, 604], 17: [412, 604], 4: [50, 716], 6: [124, 716], 5: [210, 716], 18: [392, 716] };
function eBalloons() {
  const W = P.WHEEL;
  const t1 = RUN[0].wraps[0].c;
  const mid = RUN[1].pts[Math.floor(RUN[1].pts.length / 2)];
  const at = {
    1: [W.fs, W.wl + W.r - 20],
    4: [P.PED.fs0 + 40, P.PED.wl0 + 40],
    5: (() => {
      // a point on the lower strand's long run
      let best = RUN[1].pts[0];
      for (const p of RUN[1].pts) if (Math.abs(p[0] - 3200) < Math.abs(best[0] - 3200)) best = p;
      return best;
    })(),
    6: [t1[0], t1[1] - FC.PULLEY_D / 2 + 8],
    11: [TPh + 110, A.TAILPLANE.wl + 4],
    17: [TPh + 315, A.TAILPLANE.wl + 1],
    18: [TPh + 40, A.TAILPLANE.wl - 25],
  };
  void mid;
  return Object.entries(E_B).map(([n, b]) => K.balloon(VE, at[n], b, n, { target: n })).join("");
}

// ---------------------------------------------------------------- DIAGRAM 1: hinge moment against δe
export const CH1 = { x0: 874, x1: 1010, y0: 50, y1: 160, e0: -8, e1: 6, h: 12 };
const h1x = (e) => r2(CH1.x0 + ((e - CH1.e0) / (CH1.e1 - CH1.e0)) * (CH1.x1 - CH1.x0));
const h1y = (h) => r2((CH1.y0 + CH1.y1) / 2 - (Math.max(-CH1.h, Math.min(CH1.h, h)) / CH1.h) * ((CH1.y1 - CH1.y0) / 2));
const hLine = (sol, dt) => {
  const pts = [];
  for (let e = CH1.e0; e <= CH1.e1 + 1e-9; e += 0.5) pts.push(`${h1x(e)},${h1y(M.moments(sol.v, e, dt, sol.alpha).net)}`);
  return pts.join(" ");
};
function chart1() {
  let grid = "";
  let labels = "";
  for (let h = -CH1.h; h <= CH1.h; h += 6) {
    grid += `M${CH1.x0} ${h1y(h)}H${CH1.x1}`;
    labels += `<text class="t t-sm" x="${CH1.x0 - 4}" y="${r2(h1y(h) + 2.7)}" text-anchor="end">${h}</text>`;
  }
  for (let e = -8; e <= 6; e += 2) {
    grid += `M${h1x(e)} ${CH1.y0}V${CH1.y1}`;
    if (e % 4 === 0 && e > CH1.e0) labels += `<text class="t t-sm" x="${h1x(e)}" y="${CH1.y1 + 10}" text-anchor="middle">${e}</text>`;
  }
  labels += `<text class="t t-sm t-mute" x="${(CH1.x0 + CH1.x1) / 2}" y="${CH1.y1 + 21}" text-anchor="middle">ELEVATOR δe, ° (TE DOWN +)</text>`;
  labels += `<text class="t t-sm t-mute" x="${CH1.x0 - 22}" y="${(CH1.y0 + CH1.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${CH1.x0 - 22} ${(CH1.y0 + CH1.y1) / 2})">HINGE MOMENT, N·m</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH1.x0}" y="${CH1.y0}" width="${CH1.x1 - CH1.x0}" height="${CH1.y1 - CH1.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/><path class="thin" d="M${CH1.x0} ${h1y(0)}H${CH1.x1}"/>` +
    `<g id="d1-dyn"></g>` +
    `<rect class="vis" x="${CH1.x0}" y="${CH1.y0}" width="${CH1.x1 - CH1.x0}" height="${CH1.y1 - CH1.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CH1.x0 + CH1.x1) / 2, 200, "DIAGRAM 1", "HINGE MOMENT · RING: FLOATS")
  );
}
export function chart1Dyn(sol) {
  if (sol.v < 1) return "";
  const fl = sol.float;
  return (
    `<polyline class="thin" points="${hLine(sol, 0)}"/>` +
    `<polyline class="vis accent" points="${hLine(sol, sol.tab)}"/>` +
    `<path class="hid" d="M${h1x(sol.de)} ${CH1.y0}V${CH1.y1}"/>` +
    `<circle class="accent-fill" cx="${h1x(sol.de)}" cy="${h1y(sol.m.net)}" r="3"/>` +
    (fl > CH1.e0 && fl < CH1.e1 ? `<circle class="vis" fill="none" cx="${h1x(fl)}" cy="${h1y(0)}" r="3.6"/>` : "")
  );
}

// ---------------------------------------------------------------- DIAGRAM 2: stick force against airspeed
export const CH2 = { x0: 1040, x1: 1164, y0: 50, y1: 160, v0: 50, v1: 140, f: 40 };
const f2x = (v) => r2(CH2.x0 + ((Math.min(CH2.v1, Math.max(CH2.v0, v)) - CH2.v0) / (CH2.v1 - CH2.v0)) * (CH2.x1 - CH2.x0));
const f2y = (f) => r2((CH2.y0 + CH2.y1) / 2 - (Math.max(-CH2.f, Math.min(CH2.f, f)) / CH2.f) * ((CH2.y1 - CH2.y0) / 2));
export function forceCurve(tab) {
  const pts = [];
  for (let v = CH2.v0; v <= CH2.v1 + 1e-9; v += 2.5) pts.push(`${f2x(v)},${f2y(M.forceAt(v, tab))}`);
  return pts.join(" ");
}
function chart2() {
  let grid = "";
  let labels = "";
  for (let f = -CH2.f; f <= CH2.f; f += 20) {
    grid += `M${CH2.x0} ${f2y(f)}H${CH2.x1}`;
    labels += `<text class="t t-sm" x="${CH2.x0 - 4}" y="${r2(f2y(f) + 2.7)}" text-anchor="end">${f}</text>`;
  }
  for (let v = 60; v <= CH2.v1; v += 20) {
    grid += `M${f2x(v)} ${CH2.y0}V${CH2.y1}`;
    labels += `<text class="t t-sm" x="${f2x(v)}" y="${CH2.y1 + 10}" text-anchor="middle">${v}</text>`;
  }
  labels += `<text class="t t-sm t-mute" x="${(CH2.x0 + CH2.x1) / 2}" y="${CH2.y1 + 21}" text-anchor="middle">AIRSPEED, kt</text>`;
  labels += `<text class="t t-sm t-mute" x="${CH2.x0 - 22}" y="${(CH2.y0 + CH2.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${CH2.x0 - 22} ${(CH2.y0 + CH2.y1) / 2})">PULL, N</text>`;
  const t110 = M.trimmed(M.V_CRUISE).tab;
  const t65 = M.trimmed(M.V_SLOW).tab;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH2.x0}" y="${CH2.y0}" width="${CH2.x1 - CH2.x0}" height="${CH2.y1 - CH2.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/><path class="thin" d="M${CH2.x0} ${f2y(0)}H${CH2.x1}"/>` +
    `<polyline class="thin" points="${forceCurve(t110)}"/><polyline class="thin" points="${forceCurve(t65)}"/>` +
    `<g id="d2-dyn"></g>` +
    `<rect class="vis" x="${CH2.x0}" y="${CH2.y0}" width="${CH2.x1 - CH2.x0}" height="${CH2.y1 - CH2.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CH2.x0 + CH2.x1) / 2, 200, "DIAGRAM 2", "STICK FORCE · THIN: TRIMMED")
  );
}
export function chart2Dyn(sol) {
  const F = Math.max(-CH2.f, Math.min(CH2.f, sol.F));
  return `<polyline class="vis accent" points="${forceCurve(sol.fail ? M.trimmed(M.V_CRUISE).tab : sol.tab)}"/>` + `<circle class="accent-fill" cx="${f2x(sol.v)}" cy="${f2y(F)}" r="3"/>`;
}

// ---------------------------------------------------------------- DIAGRAM 3: why the screw holds
// One turn of the thread unrolled: an incline of the lead over the pitch circumference, the true lead
// angle λ. The air load pushes the nut along the axis (straight down here); the thread can only push
// back within the friction angle φ of its normal. λ < φ: the load lies inside that cone, so friction
// alone holds it and the screw cannot be turned from the nut's side.
export const CH3 = { x0: 440, x1: 690, y0: 545, y1: 730, base: 690, cx: 560 };
const LAM = M.LEAD_ANGLE;
const PHI = M.FRICTION_ANGLE;
const incl = (x) => CH3.base - (x - CH3.x0 - 10) * Math.tan(LAM * rad);
const BLK = { w: 34, h: 14 };
// sheet direction at angle a (deg) from straight up, + to the right
const dirUp = (a) => [Math.sin(a * rad), -Math.cos(a * rad)];
function chart3() {
  const x0 = CH3.x0 + 10;
  const x1 = CH3.x1 - 16;
  const c = [CH3.cx, incl(CH3.cx)];
  // the block (the nut's flank) sitting on the incline: its base along the incline
  const along = [Math.cos(LAM * rad), -Math.sin(LAM * rad)];
  const up = dirUp(-LAM);
  const corner = (s, h) => [c[0] + (along[0] * s * BLK.w) / 2 + up[0] * h, c[1] + (along[1] * s * BLK.w) / 2 + up[1] * h];
  const blk = [corner(-1, 0), corner(1, 0), corner(1, BLK.h), corner(-1, BLK.h)];
  const blkD = `M${blk.map(([x, y]) => `${r2(x)} ${r2(y)}`).join("L")}Z`;
  const end = (a, L) => [c[0] + dirUp(a)[0] * L, c[1] + dirUp(a)[1] * L];
  const nL = 96;
  const nrm = end(-LAM, nL);
  const cone = [end(-LAM - PHI, nL), end(-LAM + PHI, nL)];
  const arcPts = (a0, a1, R) => {
    const out = [];
    for (let i = 0; i <= 10; i++) out.push(end(a0 + ((a1 - a0) * i) / 10, R));
    return out.map(([x, y]) => `${r2(x)} ${r2(y)}`).join("L");
  };
  const coneD = `M${r2(cone[0][0])} ${r2(cone[0][1])}L${r2(c[0])} ${r2(c[1])}L${r2(cone[1][0])} ${r2(cone[1][1])}`;
  const t = (x, y, str, anchor = "start", id = "") => `<text class="t t-sm" x="${r2(x)}" y="${r2(y)}" text-anchor="${anchor}"${id ? ` id="${id}"` : ""}>${str}</text>`;
  const ly = incl(x1);
  const pL = end(-LAM - PHI, 90);
  const pR = end(-LAM / 2, 72);
  return (
    `<g data-role="chart">` +
    `<path class="vis" d="M${x0} ${CH3.base}L${r2(x1)} ${r2(ly)}"/><path class="thin" d="M${x0} ${CH3.base}H${x1}M${x1} ${CH3.base}V${r2(ly)}"/>` +
    `<path class="paper" d="${blkD}"/><path class="vis" d="${blkD}"/>` +
    `<path class="ctr" d="M${r2(c[0])} ${r2(c[1])}L${r2(nrm[0])} ${r2(nrm[1])}"/>` +
    `<path class="thin" d="${coneD}"/>` +
    `<path class="thin" d="M${arcPts(-LAM - PHI, -LAM, 84)}"/>` +
    `<path class="thin" d="M${arcPts(-LAM, 0, 64)}"/>` +
    `<g id="d3-dyn"></g>` +
    t(CH3.x0, CH3.y0 + 8, `ONE TURN OF THE THREAD UNROLLED: A ${M.SCREW.lead} mm RISE`) +
    t(CH3.x0, CH3.y0 + 19, `OVER π·d₂ = ${fmt(Math.PI * M.DM, 1)} mm. THE LOAD LIES INSIDE THE`) +
    t(CH3.x0, CH3.y0 + 30, `FRICTION CONE: THE NUT CANNOT DRIVE THE SCREW.`) +
    t(pL[0] - 4, pL[1] + 3, `φ ${fmt(PHI, 1)}°`, "end") +
    t(pR[0] + 8, pR[1] + 10, `λ ${fmt(LAM, 1)}°`) +
    t(x1 + 4, (CH3.base + ly) / 2 + 3, `${M.SCREW.lead}`) +
    t(CH3.x0, CH3.base + 14, "", "start", "d3-F") +
    t(CH3.x0, CH3.base + 25, "", "start", "d3-T") +
    t(CH3.x0, CH3.base + 36, "", "start", "d3-B") +
    `</g>` +
    K.viewLabel((CH3.x0 + CH3.x1) / 2, 752, "DIAGRAM 3 · SELF-LOCKING", `λ ${fmt(LAM, 1)}° AGAINST φ ${fmt(PHI, 1)}° · ACCENT: THE AIR LOAD`)
  );
}
export function chart3Dyn(sol) {
  const c = [CH3.cx, incl(CH3.cx)];
  const F = sol.load.rod;
  const L = Math.min(56, 10 + Math.abs(F) * 4);
  // the air load along the screw's axis (straight down here) onto the block
  const top = [c[0], c[1] - BLK.h - 2 - L];
  return X.arrow({ p: (q) => q }, top, [0, 1], L, "vis accent");
}
export function chart3Text(sol) {
  const F = Math.abs(sol.load.rod);
  return {
    F: `AIR LOAD ON THE NUT ${fmt(F, 1)} N`,
    T: `TO WIND IT: ${fmt(sol.tq.drive * 1000, 1)} mN·m (η ${Math.round(100 * M.EFF)} %)`,
    B: `THE LOAD ALONE: ${fmt(sol.tq.back * 1000, 1)} mN·m: IT HOLDS`,
  };
}

// ---------------------------------------------------------------- DIAGRAM 4: wheel turns against tab angle
export const CH4 = { x0: 720, x1: 826, y0: 584, y1: 712, t0: -10, t1: 25, n0: -2, n1: 5 };
const w4x = (t) => r2(CH4.x0 + ((t - CH4.t0) / (CH4.t1 - CH4.t0)) * (CH4.x1 - CH4.x0));
const w4y = (n) => r2(CH4.y1 - ((Math.max(CH4.n0, Math.min(CH4.n1, n)) - CH4.n0) / (CH4.n1 - CH4.n0)) * (CH4.y1 - CH4.y0));
function chart4() {
  let grid = "";
  let labels = "";
  for (let n = CH4.n0; n <= CH4.n1; n += 1) {
    grid += `M${CH4.x0} ${w4y(n)}H${CH4.x1}`;
    if (n % 2 === 0) labels += `<text class="t t-sm" x="${CH4.x0 - 4}" y="${r2(w4y(n) + 2.7)}" text-anchor="end">${n}</text>`;
  }
  for (let t = -10; t <= 25; t += 5) {
    grid += `M${w4x(t)} ${CH4.y0}V${CH4.y1}`;
    if (t % 10 === 0 && t > CH4.t0) labels += `<text class="t t-sm" x="${w4x(t)}" y="${CH4.y1 + 10}" text-anchor="middle">${t}</text>`;
  }
  const pts = [];
  for (let t = M.TAB_LIMITS[0]; t <= M.TAB_LIMITS[1] + 1e-9; t += 1) pts.push(`${w4x(t)},${w4y(M.trimWheelTurns(t))}`);
  let marks = "";
  for (const v of [M.V_CRUISE, M.V_SLOW]) {
    const t = M.trimmed(v).tab;
    marks += `<circle class="dot" cx="${w4x(t)}" cy="${w4y(M.trimWheelTurns(t))}" r="1.8"/>`;
    marks += `<text class="t t-sm" x="${r2(w4x(t) + 4)}" y="${r2(w4y(M.trimWheelTurns(t)) + 9)}">${v}</text>`;
  }
  labels += `<text class="t t-sm t-mute" x="${(CH4.x0 + CH4.x1) / 2}" y="${CH4.y1 + 21}" text-anchor="middle">TAB δt, ° (TE DOWN +)</text>`;
  labels += `<text class="t t-sm t-mute" x="${CH4.x0 - 20}" y="${(CH4.y0 + CH4.y1) / 2}" text-anchor="middle" transform="rotate(-90 ${CH4.x0 - 20} ${(CH4.y0 + CH4.y1) / 2})">WHEEL TURNS</text>`;
  return (
    `<g data-role="chart"><rect class="paper" x="${CH4.x0}" y="${CH4.y0}" width="${CH4.x1 - CH4.x0}" height="${CH4.y1 - CH4.y0}"/>` +
    `<path class="thin grid-line" d="${grid}"/>` +
    `<polyline class="vis" points="${pts.join(" ")}"/>` +
    marks +
    `<circle id="d4-dot" class="accent-fill" cx="0" cy="0" r="3"/>` +
    `<rect class="vis" x="${CH4.x0}" y="${CH4.y0}" width="${CH4.x1 - CH4.x0}" height="${CH4.y1 - CH4.y0}"/>` +
    labels +
    `</g>` +
    K.viewLabel((CH4.x0 + CH4.x1) / 2, 752, "DIAGRAM 4", `${fmt(M.TRIM_TURNS[1] - M.TRIM_TURNS[0], 1)} TURNS STOP TO STOP`)
  );
}
export const d4 = (sol) => [w4x(sol.set), w4y(sol.turns)];

// ---------------------------------------------------------------- parts list, notes, title block
export const BOM = [
  ["1", "TRIM WHEEL Ø230, FINGER GRIPS", "PA6-GF30", "1"],
  ["2", "COCKPIT DRUM Ø60 AND SHAFT", "6061-T6 / 4130", "1"],
  ["3", "POSITION INDICATOR, GEARED", "PC / 2024-T3", "1"],
  ["4", "PEDESTAL, SIDE PLATES", "2024-T3", "1"],
  ["5", "TRIM CABLE Ø2.4 7×19", "CRES 302/304", "1 LOOP"],
  ["6", "PULLEY Ø76.2, SEALED BEARING", "PHENOLIC", "4"],
  ["7", "ACTUATOR DRUM Ø40, GROOVED", "6061-T6", "1"],
  ["8", "JACKSCREW Tr10×2", "4140 STEEL", "1"],
  ["9", "NUT WITH CLEVIS LUG", "C93200 BRONZE", "1"],
  ["10", "BALL BEARING 6000, 10×26×8", "52100", "1"],
  ["11", "ACTUATOR HOUSING, SLOTTED", "6061-T6", "1"],
  ["12", "AFT BUSH Ø9×Ø12×10", "SINTERED BRONZE", "1"],
  ["13", "STOP BLOCKS, NUT TRAVEL", "4130 STEEL", "2"],
  ["14", "PUSH-PULL ROD Ø4.8, ROD ENDS", "CRES 304", "1"],
  ["15", "TAB HORN, PLATE 3.2", "4130 STEEL", "1"],
  ["16", "PIANO HINGE, Ø1.6 WIRE", "2024-T3 / CRES", "1"],
  ["17", "TRIM TAB 76 × 430", "2024-T3", "1"],
  ["18", "ELEVATOR, PORT, AT BL −485", "2024-T3", "1"],
];
export const TB = { x: 850, w: 326, h: 140 };
TB.y = 824 - TB.h;
const rowH = 11;
export const bomTop = TB.y - (18 + BOM.length * rowH);
function bom() {
  return K.table(TB.x, bomTop, [
    { w: 26, align: "center", title: "ITEM" },
    { w: 168, title: "DESCRIPTION" },
    { w: 90, title: "MATERIAL" },
    { w: 42, align: "center", title: "QTY" },
  ], BOM, { rowH });
}
function notes() {
  const t110 = M.trimmed(M.V_CRUISE).tab;
  const t65 = M.trimmed(M.V_SLOW).tab;
  return K.notes(TB.x + 4, 244, "NOTES", [
    `TAB ${M.TAB_CHORD} × ${M.TAB_SPAN} = ${M.S_TAB.toFixed(3)} m², ${fmt(100 * M.TAB_SHARE, 1)} % OF THE ELEVATOR, AT ITS EDGE.`,
    `H = q·S·c·C_h; C_hα ${M.CH.a}, C_hδ ${M.CH.d}, C_hδt ${M.CH.t} PER rad (BP-106).`,
    `TRIMMED TAB ${fmt(t110, 1)}° AT ${M.V_CRUISE} kt, +${fmt(t65, 1)}° AT ${M.V_SLOW} kt: FLOATS WHERE HELD.`,
    `UNTRIMMED AT ${M.V_SLOW} kt THE PILOT PULLS ${fmt(M.forceAt(M.V_SLOW, t110), 1)} N; TRIMMED, NOTHING.`,
    `Tr${M.SCREW.d}×${M.SCREW.lead} SELF-LOCKING: λ ${fmt(M.LEAD_ANGLE, 1)}° < φ ${fmt(M.FRICTION_ANGLE, 1)}°, η ${Math.round(100 * M.EFF)} %. NO BACK-DRIVE.`,
    `STOPS: THE NUT'S LUG ON BLOCKS AT ${-M.TAB_LIMITS[0]}° UP AND ${M.TAB_LIMITS[1]}° DOWN.`,
    `A FREE TAB FLUTTERS: SAFETY BOTH ROD ENDS, CHECK FREE PLAY.`,
    `SECTION A-A IN THE TAILPLANE'S FRAME, DETAILS IN THE ELEVATOR'S.`,
  ]);
}
function title() {
  return K.titleBlock(TB.x, TB.y, TB.w, TB.h, [
    { x: 0, y: 0, w: 236, h: 32, label: "TITLE", value: "ELEVATOR TRIM TAB", size: "lg" },
    { x: 236, y: 0, w: 90, h: 32, label: "DWG NO", value: "BP-112", size: "lg" },
    { x: 0, y: 32, w: 60, h: 25, label: "SCALE", value: "AS SHOWN" },
    { x: 60, y: 32, w: 34, h: 25, label: "SIZE", value: "A2" },
    { x: 94, y: 32, w: 46, h: 25, label: "SHEET", value: "1 / 1" },
    { x: 140, y: 32, w: 86, h: 25, label: "DRAWN", value: "CLAUDE" },
    { x: 226, y: 32, w: 100, h: 25, label: "DATE", value: "2026-10-19" },
    { x: 0, y: 57, w: 110, h: 25, label: "MATERIAL", value: "SEE PARTS LIST" },
    { x: 110, y: 57, w: 96, h: 25, label: "GENERAL TOL.", value: "ISO 2768-m" },
    { x: 206, y: 57, w: 120, h: 25, label: "UNITS", value: "mm · N · kt · °" },
    { x: 0, y: 82, w: 326, h: 29, label: "LIVE · T G: TRIM · ← → AIRSPEED · F: ROD OFF", value: "", id: "readout", size: "sm" },
    { x: 0, y: 111, w: 326, h: 29, label: "LIVE · THE SCREW · SPACE: TOUR · S: SLOW", value: "", id: "readout2", size: "sm" },
  ]);
}

// ---------------------------------------------------------------- the whole sheet
export const defs = () =>
  `<clipPath id="clip-B"><rect x="${BOX.B.x}" y="${BOX.B.y}" width="${BOX.B.w}" height="${BOX.B.h}" rx="8"/></clipPath>` +
  `<clipPath id="clip-C"><circle cx="${BOX.C.cx}" cy="${BOX.C.cy}" r="${BOX.C.r}"/></clipPath>`;
const wrap = (id, inner = "") => `<g id="${id}">${inner}</g>`;
export function sheet(sol) {
  const B = BOX.B;
  const C = BOX.C;
  return (
    // Section A-A
    `<g data-geom="AA">${aaStatic()}${wrap("aa-mov", aaMoving(sol))}</g>` +
    `<g data-role="phantom" id="aa-float">${aaFloat(sol)}</g>` +
    `<g data-role="label" id="aa-mom">${aaMoments(sol)}</g>` +
    K.detailMark(VA, [100, -6], 50, "B", -60) +
    (() => {
      // Detail C's mark: its letter set clear above, where the elevator never rises to
      const [x, y] = VA.p([P.TAB_U, 0]);
      return `<g data-role="label"><circle class="thin mark" cx="${x}" cy="${y}" r="${r2(12 * VA.k)}"/><text class="t t-lg" x="412" y="96" text-anchor="middle">C</text></g>`;
    })() +
    wrap("aa-bal", aaBalloons(sol)) +
    K.viewLabel(260, 236, "SECTION A-A", "PORT ELEVATOR AT THE ACTUATOR, BL −485 · 1:2") +
    // Detail B
    `<g data-geom="B" clip-path="url(#clip-B)"><rect class="paper" x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}"/>${bStatic()}${wrap("b-mov", bMoving(sol))}</g>` +
    `<rect class="thin" x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}" rx="8"/>` +
    wrap("b-bal", bBalloons(sol)) +
    wrap("b-dim", bDims(sol)) +
    K.viewLabel(B.x + B.w / 2, 524, "DETAIL B", "THE ACTUATOR ON ITS AXIS, IN THE ELEVATOR'S FRAME · 2:1") +
    // Detail C
    `<g data-geom="C" clip-path="url(#clip-C)"><circle class="paper" cx="${C.cx}" cy="${C.cy}" r="${C.r}"/>${wrap("c-mov", cMoving(sol))}</g>` +
    `<circle class="thin" cx="${C.cx}" cy="${C.cy}" r="${C.r}"/>` +
    wrap("c-bal", cBalloons(sol)) +
    K.viewLabel(C.cx, 236, "DETAIL C", "PIANO HINGE · 2:1") +
    // View D
    `<g data-geom="D">${dStatic()}${wrap("d-mov", dMoving(sol))}</g>` +
    dEngraved() +
    wrap("d-bal", dBalloons(sol)) +
    K.viewLabel(735, 236, "VIEW D", "PEDESTAL, SIDE PLATE OFF · 1:5") +
    // View E
    `<g data-geom="E">${eStatic()}</g>` +
    eBalloons() +
    K.viewLabel(230, 752, "VIEW E", "THE TRIM CABLE RUN FROM PORT · 1:40") +
    // diagrams, notes, parts list, title block
    chart1() +
    chart2() +
    chart3() +
    chart4() +
    notes() +
    bom() +
    title()
  );
}
