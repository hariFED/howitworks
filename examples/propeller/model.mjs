// Truth first: the fixed-pitch, two-blade, forged-aluminium propeller of a four-seat light aircraft
// (class figures: Ø1905 mm (75 in), face pitch 1473 mm (58 in), on a 120 kW / 2700 rpm flat-four),
// its spinner and its bolting to the crankshaft flange. Pure, no imports, no DOM: the geometry, the
// dimensions, the readout and the diagrams all read this file.
//
// The aerodynamics is blade-element momentum theory (BEM), kept simple on purpose:
//   - each blade element meets a relative wind W made of the forward speed plus the axial inflow
//     (V + v_a) and the blade's own speed less the swirl (ωr − v_t): the velocity triangle;
//   - its angle of attack is the blade angle less the helix angle, α = β − φ;
//   - its lift comes from a thin-aerofoil slope (0.9 × 2π per radian) about a Clark-Y-like zero-lift
//     angle, capped at a stall c_l; drag is a profile polar plus a post-stall rise;
//   - the inflow comes from momentum theory annulus by annulus, with Prandtl's tip loss.
// No Reynolds or Mach effects, no blade bending, sea-level ISA air. The thrust and power it gives are
// within about 10 % of the class's published static rpm and cruise figures, which is what it is for:
// showing why the numbers move, not certifying them.
//
// Conventions. r is the radius from the propeller axis in mm, x = r/R. β, φ, α in degrees; β is
// measured from the plane of rotation to the blade's flat face (as propeller drawings give it).
// n in rev/s, ω in rad/s, V in m/s, thrust T in N, torque Q in N·m, power P in W.

export const RHO = 1.225; // kg/m³, ISA sea level
export const KT = 0.514444; // m/s per knot
export const rad = Math.PI / 180;

// ---------------------------------------------------------------- the propeller (mm)
export const D = 1905;
export const R = D / 2;
export const B = 2; // blades
export const PITCH = 1473; // face pitch, constant along the blade (a true helicoid face)
export const R_HUB = 85; // hub boss radius
export const R_SHANK = 160; // the round shank turns into the aerofoil from here
export const X_ROOT = 0.2; // the aerodynamic blade starts here (inboard: shank and spinner)
export const STATIONS = [0.3, 0.5, 0.75, 0.9]; // sections B-B, C-C, D-D, E-E
export const LETTERS = ["B", "C", "D", "E"];

// The blade's published-class layout: chord (mm) and thickness ratio at each x = r/R.
// The section is a Clark-Y-like flat-faced aerofoil; inboard it thickens into the round shank.
export const LAYOUT = [
  // x, chord, t/c
  [R_SHANK / R, 66, 0.95],
  [0.2, 88, 0.45],
  [0.25, 112, 0.28],
  [0.3, 128, 0.2],
  [0.4, 143, 0.15],
  [0.5, 150, 0.12],
  [0.6, 152, 0.1],
  [0.7, 148, 0.088],
  [0.75, 145, 0.08],
  [0.8, 140, 0.075],
  [0.9, 120, 0.065],
  [0.95, 98, 0.06],
];
function lerpTable(x, col) {
  const T = LAYOUT;
  if (x <= T[0][0]) return T[0][col];
  for (let i = 1; i < T.length; i++) {
    if (x <= T[i][0]) {
      const f = (x - T[i - 1][0]) / (T[i][0] - T[i - 1][0]);
      return T[i - 1][col] + f * (T[i][col] - T[i - 1][col]);
    }
  }
  return T[T.length - 1][col];
}
// chord (mm) at radius r (mm): the table, rounded off elliptically over the last 5 % to the tip
export function chord(r) {
  const x = r / R;
  if (x <= 0.95) return lerpTable(x, 1);
  const e = Math.min(1, (x - 0.95) / 0.05);
  return LAYOUT[LAYOUT.length - 1][1] * Math.sqrt(Math.max(0, 1 - e * e));
}
export const thickRatio = (r) => lerpTable(r / R, 2);
export const thickness = (r) => thickRatio(r) * chord(r);
// blade angle (degrees) at radius r: a constant face pitch, tan β = P / 2πr
export const beta = (r) => Math.atan(PITCH / (2 * Math.PI * r)) / rad;
// the pitch axis (where the sections are stacked) as a fraction of the chord from the leading edge
export const XI_AXIS = 0.4;

// Clark Y, 11.7 % thick, from its flat face: [ξ, upper, lower], chord 1.
const CLARK = [
  [0, 0.035, 0.035], [0.0125, 0.0545, 0.0165], [0.025, 0.065, 0.011], [0.05, 0.079, 0.0045], [0.075, 0.0885, 0.002],
  [0.1, 0.096, 0.001], [0.15, 0.1068, 0.0002], [0.2, 0.114, 0], [0.3, 0.117, 0], [0.4, 0.114, 0], [0.5, 0.1052, 0],
  [0.6, 0.0915, 0], [0.7, 0.0734, 0], [0.8, 0.0525, 0], [0.9, 0.0287, 0], [0.95, 0.0155, 0], [1, 0.0012, 0],
];
// The section at radius r as a closed loop of [ξ, η] in mm: ξ along the chord from the leading edge,
// η off the flat face (the face is aft, the cambered back faces forward). The root is the shank's circle.
export function sectionLoop(r) {
  const c = chord(r);
  const tc = thickRatio(r);
  const k = tc / 0.117;
  const up = CLARK.map(([x, u]) => [x * c, u * k * c]);
  const lo = CLARK.map(([x, , l]) => [x * c, l * k * c]);
  // upper from the trailing edge forward, then the lower from the leading edge back
  return [...up.reverse(), ...lo.slice(1, -1)];
}
// The section placed at its blade angle, in the propeller's frame: t along the plane of rotation
// (positive toward the trailing edge, i.e. against the rotation), z along the axis (forward +).
// The pitch axis (t = z = 0) sits at 40 % chord, half-way through the section there.
export function placeSection(loop, r) {
  const b = beta(r) * rad;
  const xa = XI_AXIS * chord(r);
  const ea = 0.5 * thickness(r) * (0.114 / 0.117);
  const cb = Math.cos(b);
  const sb = Math.sin(b);
  // face direction (LE→TE): (cos β, −sin β); normal toward the back (forward): (sin β, cos β)
  return loop.map(([xi, eta]) => [(xi - xa) * cb + (eta - ea) * sb, -(xi - xa) * sb + (eta - ea) * cb]);
}
export const sectionAt = (r) => placeSection(sectionLoop(r), r);
// The projected planform (looking aft): the section's extent along t at each radius
export function projected(r) {
  const p = sectionAt(r);
  let lo = Infinity;
  let hi = -Infinity;
  for (const [t] of p) {
    lo = Math.min(lo, t);
    hi = Math.max(hi, t);
  }
  return [lo, hi];
}

// ---------------------------------------------------------------- the aerofoil polar (2D)
export const A0 = 0.9 * 2 * Math.PI * rad; // lift slope per degree (thin aerofoil, less 10 %)
export const ALPHA_L0 = -4.6; // degrees, from the flat face: Clark Y is −3.6 thin; the thick, cambered prop sections more
export const CL_MAX = 1.25; // stall cap
export const CL_MIN = -0.75; // negative stall cap (the face stalls)
export const ALPHA_STALL = ALPHA_L0 + CL_MAX / A0; // ≈ 9.1° from the face
export const ALPHA_NSTALL = ALPHA_L0 + CL_MIN / A0;
export function polar(alpha) {
  let cl = A0 * (alpha - ALPHA_L0);
  let over = 0;
  if (cl > CL_MAX) {
    over = alpha - ALPHA_STALL;
    // past the stall the lift falls off a little and the drag climbs steeply
    cl = CL_MAX - 0.012 * over;
  } else if (cl < CL_MIN) {
    over = ALPHA_NSTALL - alpha;
    cl = CL_MIN + 0.012 * over;
  }
  const cd = 0.009 + 0.011 * (cl - 0.25) ** 2 + 0.025 * Math.min(30, over) + 1.2 * Math.sin(Math.min(90, over) * rad) ** 2;
  return { cl, cd, stalled: over > 0 };
}

// ---------------------------------------------------------------- blade-element momentum
// Solve one annulus at radius r (m) for forward speed V (m/s) and ω (rad/s). Returns the inflow,
// the velocity triangle and the element's loads per metre of radius (all blades).
const SIGMA_C = (r_m) => (B * chord(r_m * 1000)) / 1000 / (2 * Math.PI * r_m);
function tipLoss(r_m, phi) {
  const s = Math.max(1e-4, Math.sin(Math.abs(phi)));
  const f = (B / 2) * (R / 1000 - r_m) / (r_m * s);
  return Math.max(0.02, (2 / Math.PI) * Math.acos(Math.min(1, Math.exp(-f))));
}
export function element(r_m, V, omega, guess = null) {
  const c = chord(r_m * 1000) / 1000;
  const b = beta(r_m * 1000);
  const Ut = omega * r_m;
  let va = guess ? guess.va : 0.05 * Ut + 0.2 * V;
  let vt = guess ? guess.vt : 0;
  let out = null;
  for (let i = 0; i < 400; i++) {
    const Ua = V + va;
    const Ut2 = Math.max(1e-6, Ut - vt);
    const phi = Math.atan2(Ua, Ut2);
    const alpha = b - phi / rad;
    const { cl, cd, stalled } = polar(alpha);
    const W2 = Ua * Ua + Ut2 * Ut2;
    const Cn = cl * Math.cos(phi) - cd * Math.sin(phi);
    const Ct = cl * Math.sin(phi) + cd * Math.cos(phi);
    const dT = 0.5 * RHO * W2 * B * c * Cn; // N per m of radius
    const dQr = 0.5 * RHO * W2 * B * c * Ct; // N per m (torque / r)
    const F = tipLoss(r_m, phi);
    const m = 4 * Math.PI * r_m * RHO * F; // momentum: dT = m (V + va) va
    const disc = V * V + (4 * dT) / m;
    const vaNew = disc >= 0 ? (-V + Math.sqrt(disc)) / 2 : -V / 2; // past the windmill limit: hold
    const vtNew = dQr / (m * Math.max(0.5, V + vaNew));
    out = { phi: phi / rad, alpha, cl, cd, stalled, W: Math.sqrt(W2), Ua, Ut: Ut2, va, vt, dT, dQ: dQr * r_m, F };
    const k = i < 30 ? 0.25 : 0.12;
    const dv = Math.abs(vaNew - va) + Math.abs(vtNew - vt);
    va += k * (vaNew - va);
    vt += k * (vtNew - vt);
    if (dv < 1e-6 * (1 + Ut)) break;
  }
  return out;
}

// The whole propeller at V and n: thrust, torque, power and the coefficients, summed over N annuli
const N_ANN = 40;
const X_TIP = 0.995;
export function rotor(V, n) {
  const omega = 2 * Math.PI * n;
  const r0 = (X_ROOT * R) / 1000;
  const r1 = (X_TIP * R) / 1000;
  const dr = (r1 - r0) / N_ANN;
  let T = 0;
  let Q = 0;
  for (let i = 0; i < N_ANN; i++) {
    const r = r0 + (i + 0.5) * dr;
    const e = element(r, V, omega);
    T += e.dT * dr;
    Q += e.dQ * dr;
  }
  const Dm = D / 1000;
  const P = Q * omega;
  const CT = T / (RHO * n * n * Dm ** 4);
  const CP = P / (RHO * n ** 3 * Dm ** 5);
  const J = V / (n * Dm);
  const eta = CP > 1e-5 && CT > 0 ? (J * CT) / CP : 0;
  return { T, Q, P, CT, CP, J, eta };
}

// ---------------------------------------------------------------- the J table (built once)
// BEM without Reynolds or Mach effects depends on J = V/(nD) alone, so the coefficients and every
// station's angles are tabulated once against J; the page interpolates.
export const J_MAX = 1.3;
export const J_STEP = 0.01;
export const SPAN_X = Array.from({ length: 33 }, (_, i) => X_ROOT + ((0.99 - X_ROOT) * i) / 32);
function buildTable() {
  const n = 1; // rev/s (the table is dimensionless)
  const Dm = D / 1000;
  const rows = [];
  for (let i = 0; Math.round(i * J_STEP * 100) <= Math.round(J_MAX * 100); i++) {
    const J = i * J_STEP;
    const V = J * n * Dm;
    const r = rotor(V, n);
    const omega = 2 * Math.PI * n;
    const st = STATIONS.map((x) => element((x * R) / 1000, V, omega));
    const span = SPAN_X.map((x) => element((x * R) / 1000, V, omega));
    rows.push({
      J,
      CT: r.CT,
      CP: r.CP,
      eta: r.eta,
      // per station: inflow angles and velocities as fractions of the blade's own speed ωr
      st: st.map((e, k) => ({ phi: e.phi, alpha: e.alpha, cl: e.cl, stalled: e.stalled, ua: e.Ua / (omega * (STATIONS[k] * R) / 1000), ut: e.Ut / (omega * (STATIONS[k] * R) / 1000), dT: e.dT, dQ: e.dQ })),
      span: span.map((e) => ({ phi: e.phi, alpha: e.alpha })),
    });
  }
  return rows;
}
export const TABLE = buildTable();
export function atJ(J) {
  const x = Math.min(J_MAX, Math.max(0, J)) / J_STEP;
  const i = Math.min(TABLE.length - 2, Math.floor(x));
  const f = x - i;
  const a = TABLE[i];
  const b = TABLE[i + 1];
  const L = (p, q) => p + f * (q - p);
  return {
    J,
    CT: L(a.CT, b.CT),
    CP: L(a.CP, b.CP),
    eta: L(a.eta, b.eta),
    st: a.st.map((s, k) => {
      const t = b.st[k];
      return { phi: L(s.phi, t.phi), alpha: L(s.alpha, t.alpha), cl: L(s.cl, t.cl), stalled: f < 0.5 ? s.stalled : t.stalled, ua: L(s.ua, t.ua), ut: L(s.ut, t.ut), dT: L(s.dT, t.dT), dQ: L(s.dQ, t.dQ) };
    }),
    span: a.span.map((s, k) => ({ phi: L(s.phi, b.span[k].phi), alpha: L(s.alpha, b.span[k].alpha) })),
  };
}
// zero thrust and zero torque (the windmill point), read off the table
const firstBelow = (key) => {
  for (let i = 1; i < TABLE.length; i++) if (TABLE[i][key] <= 0) return TABLE[i - 1].J + (J_STEP * TABLE[i - 1][key]) / (TABLE[i - 1][key] - TABLE[i][key]);
  return J_MAX;
};
export const J_ZERO_T = firstBelow("CT");
export const J_ZERO_P = firstBelow("CP");
export const ETA_MAX = TABLE.reduce((m, r) => (r.eta > m.eta ? r : m), { eta: 0 });

// ---------------------------------------------------------------- the engine and the shaft
// A flat-four, 5.2 L, 120 kW at 2700 rpm, direct drive. Full throttle gives a flat indicated torque;
// a part-open throttle passes a fixed air flow, so it limits the indicated power instead (torque ∝ 1/ω).
// Friction and pumping take Q_F; at a closed throttle in a glide they exceed what the engine makes,
// so the air must turn the propeller: it windmills.
export const RPM_RATED = 2700;
export const Q_IND_FT = 500; // N·m, full-throttle indicated torque
export const qFriction = (rpm) => 45 + 0.01 * rpm; // N·m
export const THR_IDLE = 0.042; // fraction of rated indicated power the idle air flow allows
export function engineTorque(rpm, thr) {
  const w = Math.max(10, (rpm * 2 * Math.PI) / 60);
  const wR = (RPM_RATED * 2 * Math.PI) / 60;
  const qi = Math.min(Q_IND_FT, (Math.max(THR_IDLE, thr) * Q_IND_FT * wR) / w);
  return qi - qFriction(rpm);
}
export const I_SHAFT = 1.9; // kg·m², propeller (≈1.3), spinner, flange and crank train
export function propLoads(V, rpm) {
  const n = Math.max(1, rpm / 60);
  const Dm = D / 1000;
  const J = V / (n * Dm);
  const c = atJ(J);
  const T = c.CT * RHO * n * n * Dm ** 4;
  const P = c.CP * RHO * n ** 3 * Dm ** 5;
  const Q = P / (2 * Math.PI * n);
  return { ...c, n, T, P, Q };
}

// ---------------------------------------------------------------- the tour (26 s, loops)
//  0.0  idle on the ground          1.0  throttle opens       2.0  STATIC RUN-UP, full throttle
//  5.5  take-off roll and lift-off  9.0  CLIMB at 74 kt, full throttle
// 13.0  level off, throttle back    15.5 CRUISE at 110 kt     19.0 throttle closed, slowing
// 20.5  GLIDE at 65 kt, windmilling 24.5 landed, back to idle
export const TOUR = 26;
export const THR_CRUISE = 0.66;
const ramp = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const smooth = (x) => x * x * (3 - 2 * x);
const sm = (t, a, b) => smooth(ramp(t, a, b));
export function speedAt(t) {
  // knots
  const v = 65 * sm(t, 5.5, 9) + (74 - 65) * sm(t, 8.6, 9.6) + (110 - 74) * sm(t, 13, 15.5) - (110 - 65) * sm(t, 19, 20.6) - 65 * sm(t, 24.4, 25.3);
  return Math.max(0, v);
}
export function throttleAt(t) {
  return THR_IDLE + (1 - THR_IDLE) * sm(t, 1, 2) - (1 - THR_CRUISE) * sm(t, 13, 14.5) - (THR_CRUISE - THR_IDLE) * sm(t, 19, 19.8);
}
export function phaseName(t) {
  if (t < 1.4) return "IDLE";
  if (t < 5.5) return "RUN-UP";
  if (t < 9) return "TAKE-OFF";
  if (t < 13) return "CLIMB";
  if (t < 15.5) return "LEVEL OFF";
  if (t < 19) return "CRUISE";
  if (t < 20.6) return "CLOSING";
  if (t < 24.4) return "WINDMILLING";
  return "LANDED";
}

// the shaft: rpm settles where the engine's torque meets the propeller's
export function equilibriumRpm(V, thr) {
  let lo = 200;
  let hi = 4000;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (engineTorque(m, thr) - propLoads(V, m).Q > 0) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}
export function shaft() {
  const rpm = equilibriumRpm(0, THR_IDLE);
  return { t: 0, rpm, V: 0, thr: THR_IDLE, turn: 0, ...propLoads(0, rpm), Qe: engineTorque(rpm, THR_IDLE) };
}
// Advance by h seconds; V (m/s) and thr from the caller. turn: shaft revolutions so far.
export function stepShaft(s, h, V, thr) {
  s.t += h;
  s.V = V;
  s.thr = thr;
  const L = propLoads(V, s.rpm);
  const Qe = engineTorque(s.rpm, thr);
  const dw = ((Qe - L.Q) / I_SHAFT) * h;
  s.rpm = Math.max(150, s.rpm + (dw * 60) / (2 * Math.PI));
  s.turn += (s.rpm / 60) * h;
  Object.assign(s, propLoads(V, s.rpm));
  s.Qe = Qe;
  return s;
}
export function tourStep(s, h) {
  const t = s.t + h;
  return stepShaft(s, h, speedAt(t) * KT, throttleAt(t));
}
// The tour sampled once, for the diagram's trace
export function tourTrace(dt = 1 / 500, every = 10) {
  const s = shaft();
  const out = [];
  let i = 0;
  while (s.t < TOUR) {
    tourStep(s, dt);
    if (i++ % every === 0) out.push([s.t, s.rpm, s.J, s.T, s.eta, s.P]);
  }
  return out;
}

// ---------------------------------------------------------------- the hub and its bolting (mm)
// Axial stations s from the crankshaft flange's front face, forward +.
export const FLANGE = { r: 82.5, t: 14, pilotR: 30, pilotL: 30, bolt: 60.3 }; // as the engine sheet's
export const N_BOLTS = 6;
export const BOLT_D = 11.1; // 7/16 in
export const BUSH_D = 19.05; // 3/4 in drive bushing
export const BUSH_FWD = 25; // the bushings stand this far proud of the flange face
export const SUPPORT_T = 10; // starter ring gear support's plate
export const BULK_R_T = 2.0; // rear spinner bulkhead
export const HUB_S0 = SUPPORT_T + BULK_R_T; // 12: the hub's rear face
export const HUB_L = 102; // hub length along the axis (4.0 in)
export const HUB_S1 = HUB_S0 + HUB_L; // 114: front face
export const BLADE_S = HUB_S0 + HUB_L / 2 + 9; // the pitch axes cross the shaft axis here, 9 ahead of mid-hub so the shank sits centred
export const BULK_F_T = 1.6;
export const CRUSH_T = 6.4;
export const CRUSH_S1 = HUB_S1 + BULK_F_T + CRUSH_T; // 122
export const SPIN_R = 160; // spinner radius at its base
export const SPIN_TIP = 340; // spinner tip, s
export const SPIN_SKIN = 0.8; // 0.032 in
// Bolt torque: 7/16-20 into the bushings, 55–65 lbf·ft dry (class practice); preload ≈ T / (0.2 d)
export const BOLT_TORQUE = 81; // N·m, mid-range
export const BOLT_PRELOAD = BOLT_TORQUE / (0.2 * BOLT_D / 1000); // N
