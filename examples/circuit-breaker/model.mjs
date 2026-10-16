// Truth first: a B16 miniature circuit breaker (EN 60898-1, In = 16 A). Pure, no imports, no DOM.
// The geometry, the dimensions on the sheet, the readout, the trip curve and the states all read this.
//
// Thermal trip. The bimetal is heated by its own resistance: C·dΔT/dt = I²·R − ΔT/Rth. It bends
// as a cantilever with constant curvature, tip deflection f = a·ΔT·L²/s, and trips the latch when
// f reaches F_TRIP. From cold at a steady current the trip time is t = τ·ln(ΔTss / (ΔTss − ΔT_TRIP)),
// τ = Rth·C, which is the inverse-time I²t branch of the curve.
// Magnetic trip. The coil pulls its plunger with F = (N·I)²·μ0·A / (2·g²). When F beats the
// return spring's preload the plunger drives the striker into the trip lever: that is Im.

export const IN = 16; // rated current, A
export const CURVE = "B"; // magnetic band 3–5 × In

// ---------------------------------------------------------------- bimetal (TB 1577, DIN 1715)
export const BI_L = 20; // free length, mm (riveted at v = 7, tip at v = 27)
export const BI_W = 6; // width, across the section, mm
export const BI_S = 0.6; // thickness, mm
export const BI_RHO = 0.79e-6; // resistivity, Ω·m
export const BI_A = 14e-6; // specific thermal deflection, 1/K
export const BI_HEATED = 22; // current-carrying length, mm
export const R_BI = (BI_RHO * BI_HEATED * 1e-3) / (BI_W * 1e-3 * BI_S * 1e-3); // Ω
export const RTH = 40; // thermal resistance to the case, K/W
export const C_TH = 0.75; // heat capacity of strip, rivet and braid end, J/K
export const TAU = RTH * C_TH; // s

export const F_GAP = 0.3; // calibration screw gap: the tip touches the lever after this, mm
export const F_TRIP = 0.8; // tip travel that knocks the latch out, mm
export const F_RESET = 0.64; // the latch only holds a reset below this, mm
export const deflection = (dT) => (BI_A * dT * BI_L ** 2) / BI_S; // mm
export const DT_TRIP = (F_TRIP * BI_S) / (BI_A * BI_L ** 2); // K
export const DT_RESET = (F_RESET * BI_S) / (BI_A * BI_L ** 2); // K
export const dTss = (I) => RTH * R_BI * I * I; // steady temperature rise at I, K
export const I_CONV = Math.sqrt(DT_TRIP / (RTH * R_BI)); // the current that just trips, given forever, A

// Cold trip time at I, or Infinity below I_CONV.
export function thermalTime(I) {
  const ss = dTss(I);
  return ss <= DT_TRIP ? Infinity : TAU * Math.log(ss / (ss - DT_TRIP));
}
// How long I would take from cold to heat the strip as far as dT: the operating point's time.
export function equivalentTime(I, dT) {
  const ss = dTss(I);
  if (ss <= dT) return Infinity;
  return -TAU * Math.log(1 - dT / ss);
}
// Time left before a trip at I from dT.
export function timeToTrip(I, dT) {
  const ss = dTss(I);
  if (ss <= DT_TRIP) return Infinity;
  if (dT >= DT_TRIP) return 0;
  return TAU * Math.log((ss - dT) / (ss - DT_TRIP));
}
// Cooling with no current: time until the latch will hold a reset.
export const coolTime = (dT) => (dT <= DT_RESET ? 0 : TAU * Math.log(dT / DT_RESET));
// One step of the thermal model.
export function heat(dT, I, dt) {
  const ss = dTss(I);
  return ss + (dT - ss) * Math.exp(-dt / TAU);
}

// ---------------------------------------------------------------- solenoid
export const MU0 = 4e-7 * Math.PI;
export const COIL_N = 7; // turns of Ø1.8 wire
export const PLUNGER_D = 6; // mm
export const GAP_G = 3; // air gap at rest = plunger stroke, mm
export const SPRING_F0 = 0.4; // plunger return spring preload, N
export const PLUNGER_M = 0.85e-3; // plunger and striker, kg
const AREA = Math.PI * (PLUNGER_D / 2) ** 2 * 1e-6; // m²
export const magForce = (I) => ((COIL_N * I) ** 2 * MU0 * AREA) / (2 * (GAP_G * 1e-3) ** 2); // N
export const IM = Math.sqrt((2 * SPRING_F0 * (GAP_G * 1e-3) ** 2) / (MU0 * AREA)) / COIL_N; // A
export const T_BREAK = 0.004; // contact parting and arc in the splitter plates, s
// Magnetic trip time at I >= IM: the plunger's flight (constant net force) plus the break.
export function magneticTime(I) {
  const net = magForce(I) - SPRING_F0;
  if (net <= 0) return Infinity;
  return Math.sqrt((2 * GAP_G * 1e-3 * PLUNGER_M) / net) + T_BREAK;
}
export function tripTime(I) {
  return I >= IM ? Math.min(magneticTime(I), thermalTime(I)) : thermalTime(I);
}

// ---------------------------------------------------------------- the tour's loads
export const LOAD_NORMAL = 12; // A, 0.75 In
export const LOAD_OVER = 40; // A, 2.5 In
export const LOAD_FAULT = 480; // A, 30 In: a short circuit limited by the cable

// ---------------------------------------------------------------- mechanism geometry (world mm)
// u from the back of the case (the DIN rail) to the front, v up from the load end.
export const H = [56, 45]; // handle pivot
export const M = [36, 56]; // main pivot: contact arm and cradle
export const T = [28, 30]; // trip lever pivot
export const HANDLE_ON = 20; // handle angle, degrees, CCW from +u
export const HANDLE_OFF = -20;
export const CRANK_R = 5; // handle crank pin radius
export const CRANK_A0 = 100; // crank pin angle at handle angle 0
export const B0 = [42.5, 52.5]; // cradle link pin, closed
export const R_TOP = 22; // trip lever: pivot to latch face
export const R_BIM = 5; // pivot to calibration screw
export const R_STRIKE = 3; // pivot to striker
export const STRIKER_GAP = 2.47; // striker tip to lever at rest, mm
export const LEVER_MAX = 10; // trip lever stop, degrees


const rad = (d) => (d * Math.PI) / 180;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const crankPin = (h) => [H[0] + CRANK_R * Math.cos(rad(CRANK_A0 + h)), H[1] + CRANK_R * Math.sin(rad(CRANK_A0 + h))];
const RB = dist(B0, M);
const BETA0 = Math.atan2(B0[1] - M[1], B0[0] - M[0]);
export const LINK = dist(crankPin(HANDLE_ON), B0); // coupling link, pin to pin

// The four-bar handle → link → cradle: the cradle angle (degrees, CCW) for a handle angle.
export function cradleAngle(h) {
  const A = crankPin(h);
  const dx = A[0] - M[0];
  const dy = A[1] - M[1];
  const d = Math.hypot(dx, dy);
  const a = (RB * RB - LINK * LINK + d * d) / (2 * d);
  const k = Math.sqrt(Math.max(0, RB * RB - a * a));
  const px = M[0] + (a * dx) / d;
  const py = M[1] + (a * dy) / d;
  const sols = [
    [px + (k * dy) / d, py - (k * dx) / d],
    [px - (k * dy) / d, py + (k * dx) / d],
  ];
  let best = 0;
  let err = Infinity;
  for (const [x, y] of sols) {
    let c = ((Math.atan2(y - M[1], x - M[0]) - BETA0) * 180) / Math.PI;
    c = ((c + 540) % 360) - 180;
    if (Math.abs(c) < err) {
      err = Math.abs(c);
      best = c;
    }
  }
  return best;
}
export const ARM_OPEN = cradleAngle(HANDLE_OFF); // the contact arm's open angle: the cradle's at OFF

// Trip lever angle (degrees, CW positive) from the bimetal tip and the striker.
export function leverAngle(f, plunger) {
  const fromBi = (Math.max(0, f - F_GAP) / R_BIM) * (180 / Math.PI);
  const fromStriker = (Math.max(0, plunger - STRIKER_GAP) / R_STRIKE) * (180 / Math.PI);
  return Math.min(LEVER_MAX, Math.max(fromBi, fromStriker));
}
export const latchTravel = (lever) => R_TOP * Math.sin(rad(lever)); // mm at the pawl
export const LATCH_HOLD = latchTravel(leverAngle(F_TRIP, 0)); // the lever's latch-face travel that frees the pawl, mm
