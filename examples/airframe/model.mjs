// Truth first: how the light aircraft's strut-braced wing carries its lift into the cabin.
// Pure, no DOM. The aircraft's own figures (examples/light-aircraft/model.mjs, BP-022, and its strut
// geometry in parts.mjs) are imported, not copied; on the page they are inlined as M and P.
//
// Frames (mm) as BP-022: FS aft of the datum (firewall front face), WL above the ground, BL / WS out
// along the span. One wing is a beam on the front spar's line from the root fitting at the cabin roof
// (WS Y0, a pin: the fitting carries shear, not moment) to the tip, propped by the strut at WS YS.
//
// Loads. Lift is n·W, shared by the two wings and spread along the span by Schrenk's approximation
// (the mean of the planform's chord and an ellipse of the same area). Conservative: no inertia relief
// from the wing's own weight or its fuel, no tail load.
//   Strut reaction from statics, moments about the root pin:  R·(YS − Y0) = ∫ w(y)(y − Y0) dy.
//   The strut is a two-force member, so its tension is T = R·L / ΔWL; its inboard component pushes the
//   spar toward the cabin (compression P = T·ΔBL / L).
//   Shear V(y) = ∫_y^tip w − R·[y < YS];   moment M(y) = ∫_y^tip w·(η − y) dη − R·(YS − y)·[y < YS].
//   Spar-cap stress σ = M_f / (h·A): the front spar's share of the moment over its cap centroid depth
//   and one cap's area. Against 2024-T3: limit stress below F_ty, ultimate (×1.5) below F_tu.
// Gust: the CS-23 / FAR 23.341 formula, n = 1 + K_g·ρ0·U_de·V·a / (2 W/S), K_g = 0.88μ/(5.3 + μ).

import * as M from "../light-aircraft/model.mjs";
import * as P from "../light-aircraft/parts.mjs";

export const G = M.G;
export const W = M.W; // N, at MTOW
export const Y0 = M.CABIN.half; // root fitting, WS 590 (the cabin side, under the roof)
export const YS = P.STRUT.ws1; // strut fitting, WS 3000
export const YT = M.TIP_WS; // 5500
export const N_LIMIT = 3.8; // normal category, positive manoeuvre
export const N_NEG = -1.52; // −0.4 × 3.8
export const SF = 1.5; // ultimate factor
export const N_ULT = N_LIMIT * SF;

// ---------------------------------------------------------------- the strut (front view, BL and WL)
export const STRUT_LO = { bl: M.CABIN.half, wl: P.STRUT.wl0, fs: P.STRUT.fs0 }; // fuselage fitting
export const STRUT_HI = { bl: YS, wl: P.strutTopWL(), fs: P.STRUT.fs1 }; // wing fitting
const dBL = STRUT_HI.bl - STRUT_LO.bl;
const dWL = STRUT_HI.wl - STRUT_LO.wl;
const dFS = STRUT_HI.fs - STRUT_LO.fs;
export const STRUT_L = Math.hypot(dBL, dWL, dFS);
export const STRUT_ANGLE = (Math.atan2(dWL, dBL) * 180) / Math.PI; // to the horizontal, front view
// streamline tube: 6061-T6, an ellipse-ish section 100 × 40, wall 1.6
export const STRUT_TUBE = { chord: 100, thick: 40, wall: 1.6 };
export const STRUT_AREA = Math.PI * ((STRUT_TUBE.chord + STRUT_TUBE.thick) / 2 - STRUT_TUBE.wall) * STRUT_TUBE.wall; // perimeter × wall
export const F_TU_6061 = 290; // MPa
export const FITTING_BOLT = { d: 9.525, fsu: 655 }; // AN6 (3/8 in), steel, ultimate shear MPa; double shear
export const BOLT_ULT = 2 * ((Math.PI * FITTING_BOLT.d ** 2) / 4) * FITTING_BOLT.fsu; // N

// ---------------------------------------------------------------- spars
// Front spar at 22 % chord, rear spar on the hinge line. Caps are extruded angles, back to back.
export const SPAR_X = M.SPAR_X;
export const SKIN = 0.64; // mm, wing skin (0.025 in)
export const CAP = { w: 22, t: 3.2 }; // a front cap: two angles back to back, flange width, thickness
export const CAP_A = 2 * (CAP.w * CAP.t + (CAP.w - CAP.t) * CAP.t); // mm², two L 22 × 22 × 3.2 back to back
export const WEB_T = 1.6; // front spar web, 0.063 in
export const REAR_CAP_A = 160; // mm², the rear spar's caps
export const REAR_WEB_T = 1.0;
const AF = M.naca2412(40);
const thick = (xi) => M.surfaceAt(AF.upper, xi) - M.surfaceAt(AF.lower, xi);
export const rearX = (y) => (M.HINGE_FS - M.leAt(y)) / M.chordAt(y);
// the spar's overall depth (skin to skin) and its caps' centroid depth h, at a station
export const sparDepth = (y) => thick(SPAR_X) * M.chordAt(y) - 2 * SKIN;
export const capCentroid = (CAP.w * CAP.t * (CAP.t / 2) + (CAP.w - CAP.t) * CAP.t * (CAP.t + (CAP.w - CAP.t) / 2)) / (CAP.w * CAP.t + (CAP.w - CAP.t) * CAP.t); // mm, from the cap's outer face
export const hFront = (y) => sparDepth(y) - 2 * capCentroid;
export const hRear = (y) => thick(rearX(y)) * M.chordAt(y) - 2 * SKIN - 2 * 6;
// the front spar's share of the moment, by the caps' stiffness A·h²
export const frontShare = (y) => {
  const f = CAP_A * hFront(y) ** 2;
  const r = REAR_CAP_A * hRear(y) ** 2;
  return f / (f + r);
};

// ---------------------------------------------------------------- 2024-T3 extrusion allowables
export const F_TY = 290; // MPa, yield: limit stress below it
export const F_TU = 427; // MPa, ultimate: 1.5 × limit stress below it

// ---------------------------------------------------------------- span grid and the unit (1 g) loads
export const NY = 196;
export const YS_GRID = Array.from({ length: NY + 1 }, (_, i) => Y0 + ((YT - Y0) * i) / NY);
function integrate(f, a, b, n = 600) {
  let s = 0;
  for (let i = 0; i < n; i++) s += f(a + ((i + 0.5) * (b - a)) / n);
  return (s * (b - a)) / n;
}
const ell = (y) => Math.sqrt(Math.max(0, 1 - (y / YT) ** 2));
const ELL_A = integrate(ell, 0, YT);
const CH_A = integrate(M.chordAt, 0, YT);
// Schrenk shape over the half span, area 1: lift per mm = (n·W/2)·shape(y)
export const schrenk = (y) => 0.5 * (ell(y) / ELL_A + M.chordAt(y) / CH_A);
export const elliptic = (y) => ell(y) / ELL_A;
export const planform = (y) => M.chordAt(y) / CH_A;
// the share of the half-wing's lift carried outboard of the root fitting (the rest lands on the cabin roof)
export const OUTBOARD = integrate(schrenk, Y0, YT);

// 1 g: w(y) in N/mm, then the cantilever's shear and moment from the tip inward (exact on the grid
// by midpoint sums), the strut reaction, and the braced spar's shear and moment
const W1 = (y) => (W / 2) * schrenk(y);
function cantilever() {
  const V = new Array(NY + 1).fill(0);
  const Mm = new Array(NY + 1).fill(0);
  for (let i = NY - 1; i >= 0; i--) {
    const a = YS_GRID[i];
    const b = YS_GRID[i + 1];
    const q = integrate(W1, a, b, 8);
    V[i] = V[i + 1] + q;
    Mm[i] = Mm[i + 1] + V[i + 1] * (b - a) + q * ((b - a) / 2); // load on [a, b] acts near its middle
  }
  return { V, M: Mm };
}
const C1 = cantilever();
export const Q1 = C1.V[0]; // N, one wing's lift outboard of the root at 1 g
export const MO1 = C1.M[0]; // N·mm, its moment about the root pin
export const R1 = MO1 / (YS - Y0); // N, strut's vertical reaction at 1 g
export const ROOT1 = Q1 - R1; // N, root fitting's vertical reaction (up on the wing)
export const T1 = (R1 * STRUT_L) / dWL; // N, strut tension at 1 g
export const P1 = (T1 * dBL) / STRUT_L; // N, spar compression inboard of the strut at 1 g
const braced = YS_GRID.map((y, i) => ({
  V: C1.V[i] - (y < YS ? R1 : 0),
  M: C1.M[i] - (y < YS ? R1 * (YS - y) : 0),
}));
export const V1 = braced.map((b) => b.V);
export const M1 = braced.map((b) => b.M);
export const V1_FREE = C1.V;
export const M1_FREE = C1.M;
export const idxOf = (y) => Math.max(0, Math.min(NY, Math.round(((y - Y0) / (YT - Y0)) * NY)));

// σ at a station for 1 g (MPa): the bending stress M_f/(h·A) in the front spar's caps (+ moment, tip
// up: upper cap in compression), and inboard of the strut the strut's push P shared by all four caps
export const CAPS_A = 2 * CAP_A + 2 * REAR_CAP_A;
export const SIGMA1_BEND = YS_GRID.map((y, i) => (frontShare(y) * M1[i]) / (hFront(y) * CAP_A));
export const SIGMA1_AXIAL = YS_GRID.map((y) => (y < YS ? P1 / CAPS_A : 0));
// the worse cap: bending and the axial push add on the compression side
export const SIGMA1 = YS_GRID.map((y, i) => Math.sign(SIGMA1_BEND[i] || 1) * (Math.abs(SIGMA1_BEND[i]) + SIGMA1_AXIAL[i]));
export const SIGMA1_FREE = YS_GRID.map((y, i) => (frontShare(y) * M1_FREE[i]) / (hFront(y) * CAP_A));
const absMax = (arr) => arr.reduce((m, v, i) => (Math.abs(v) > Math.abs(m.v) ? { v, i } : m), { v: 0, i: 0 });
export const PEAK_M1 = absMax(M1); // the braced spar's largest moment at 1 g, and where
export const PEAK_S1 = absMax(SIGMA1);
export const PEAK_S1_FREE = absMax(SIGMA1_FREE);
export const PEAK_V1 = absMax(V1);

// ---------------------------------------------------------------- the state at a load factor n
export function loads(n) {
  const sMax = n * PEAK_S1.v;
  const lim = Math.abs(sMax);
  return {
    n,
    lift: n * W, // N, both wings
    R: n * R1, // strut's vertical reaction, N
    T: n * T1, // strut tension (negative: compression), N
    P: n * P1, // spar axial, N
    root: n * ROOT1,
    mMax: n * PEAK_M1.v, // N·mm
    mFree: n * M1_FREE[0],
    sigma: sMax, // MPa, the worst cap
    sigmaAt: YS_GRID[PEAK_S1.i],
    sigmaFree: n * PEAK_S1_FREE.v,
    rfLimit: lim > 0 ? F_TY / lim : Infinity, // reserve factor at the yield allowable
    rfUlt: lim > 0 ? F_TU / (SF * lim) : Infinity, // at the ultimate allowable (×1.5)
    strutStress: (n * T1) / STRUT_AREA, // MPa
  };
}
// ratio of a station's cap stress to the yield allowable at n (for the stress colour)
export const usage = (n, i) => Math.abs(n * SIGMA1[i]) / F_TY;

// ---------------------------------------------------------------- the gust at V_C
export const V_C = M.V_SPEEDS.vno; // kt, design cruise speed
export const U_DE = 15.24; // m/s, 50 ft/s at V_C
export const CLA = M.D.CLa; // per rad, the aircraft's lift slope (BP-022)
export const WS_LOAD = W / M.S; // Pa
export const MU_G = (2 * WS_LOAD) / (M.RHO * (M.MAC / 1000) * CLA * G);
export const K_G = (0.88 * MU_G) / (5.3 + MU_G);
export const DN_GUST = (K_G * M.RHO * U_DE * V_C * M.KT * CLA) / (2 * WS_LOAD);
export const N_GUST = 1 + DN_GUST;

// ---------------------------------------------------------------- the tour
// 1 g cruise, a 60° level turn (2 g), the limit pull-up (3.8 g), back to cruise, then a gust at V_C.
export const TOUR = [
  // t (s), n, phase
  [0, 1, "1 g CRUISE"],
  [3, 1, "1 g CRUISE"],
  [5, 2, "2 g LEVEL TURN, 60° BANK"],
  [8, 2, "2 g LEVEL TURN, 60° BANK"],
  [10, 1, "1 g CRUISE"],
  [12.5, N_LIMIT, "3.8 g LIMIT PULL-UP"],
  [15, N_LIMIT, "3.8 g LIMIT PULL-UP"],
  [17, 1, "1 g CRUISE"],
  [18.5, 1, "1 g CRUISE"],
];
export const GUST = { t0: 18.5, len: 1.6 }; // a 1 − cos gust, peak at the middle
export const TOUR_PERIOD = 23;
export function tourAt(t) {
  const tt = ((t % TOUR_PERIOD) + TOUR_PERIOD) % TOUR_PERIOD;
  if (tt >= GUST.t0 && tt <= GUST.t0 + GUST.len) {
    const k = (tt - GUST.t0) / GUST.len;
    return { n: 1 + (DN_GUST * (1 - Math.cos(2 * Math.PI * k))) / 2, phase: `GUST ${U_DE} m/s AT V_C` };
  }
  if (tt > GUST.t0 + GUST.len) return { n: 1, phase: "1 g CRUISE" };
  let i = 1;
  while (i < TOUR.length - 1 && TOUR[i][0] <= tt) i++;
  const a = TOUR[i - 1];
  const b = TOUR[i];
  const k = Math.min(1, Math.max(0, (tt - a[0]) / Math.max(1e-6, b[0] - a[0])));
  const e = 0.5 - 0.5 * Math.cos(Math.PI * k);
  return { n: a[1] + (b[1] - a[1]) * e, phase: b[1] > a[1] + 0.01 ? b[2] : a[1] > b[1] + 0.01 ? a[2] : a[2] };
}
// the phase's name for the readout: its target while easing toward it
export const phaseAt = (t) => tourAt(t).phase;
