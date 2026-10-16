// Truth first: an external gear pump, group 2, 8 cm³/rev. Pure, no imports, no DOM.
// The gear geometry, the sections, the oil pockets, the readout and the chart all read this.
//
// Gears: two identical spur gear-shafts, z = 12, m = 3, α = 20°, both profile-shifted x = +0.3
// (12 teeth would undercut at x = 0). The shift opens the working pressure angle and the
// centre distance; the tips are cut back for 0.25·m root clearance.
// Displacement (both gears, per rev): V = 2π·b·(ra² − rw² − pb²/12), pb the base pitch.
// Flow: Q = V·n·ηv. The leakage across tips and faces is laminar, so it grows with pressure and
// hardly at all with speed; the clearances also open a little under load: QL = C·p·(1 + p/pc).
// Torque: T = V·p/(20π·ηhm) + T0 (V in cm³, p in bar, T in N·m).

const rad = Math.PI / 180;
export const inv = (a) => Math.tan(a) - a;

export const Z = 12;
export const MOD = 3;
export const ALPHA = 20 * rad;
export const XSHIFT = 0.3;
export const B = 11.6; // face width, mm

export const R = (MOD * Z) / 2; // reference radius
export const RB = R * Math.cos(ALPHA); // base radius
export const RF = R - MOD * (1.25 - XSHIFT); // root radius
export const PB = Math.PI * MOD * Math.cos(ALPHA); // base pitch

// Working pressure angle: inv αw = inv α + 2·tan α·(x1 + x2)/(z1 + z2), solved by Newton.
function solveInv(target) {
  let a = 0.4;
  for (let i = 0; i < 30; i++) a -= (inv(a) - target) / Math.tan(a) ** 2;
  return a;
}
export const ALPHA_W = solveInv(inv(ALPHA) + (2 * Math.tan(ALPHA) * (2 * XSHIFT)) / (2 * Z));
export const A = (MOD * Z * Math.cos(ALPHA)) / Math.cos(ALPHA_W); // centre distance
export const RW = A / 2; // working pitch radius
export const RA = A - RF - 0.25 * MOD; // tip radius, cut back for root clearance
export const BORE_R = RA + 0.08; // housing bore, radial tip clearance 0.08
export const EPS = (2 * Math.sqrt(RA ** 2 - RB ** 2) - A * Math.sin(ALPHA_W)) / PB; // contact ratio

// Tooth half-angle at radius ρ (rad), measured from the tooth's centre line.
const S_REF = MOD * (Math.PI / 2 + 2 * XSHIFT * Math.tan(ALPHA)); // tooth thickness on the reference circle
export const PSI = S_REF / (2 * R);
export function halfAngle(rho) {
  if (rho <= RB) return PSI + inv(ALPHA);
  return PSI + inv(ALPHA) - inv(Math.acos(RB / rho));
}
export const TIP_HALF = halfAngle(RA);
export const PITCH = (2 * Math.PI) / Z;

// Displacement and batches
export const V_DISP = (2 * Math.PI * B * (RA ** 2 - RW ** 2 - PB ** 2 / 12)) / 1000; // cm³/rev
export const BATCH = V_DISP / (2 * Z); // what one tooth space delivers, cm³

// Fluid and losses (ISO VG 46 at 50 °C)
export const C_LEAK = 0.00266; // L/min per bar
export const P_C = 400; // bar, clearances opening under load
export const ETA_HM = 0.9;
export const T0 = 0.3; // N·m, seal and bearing drag
export const P_MAX = 280; // bar, chart range
export const P_RATED = 250;
export const N_RATED = 1500;
export const N_MIN = 500;
export const N_MAX = 3000;

export const qTheory = (n) => (V_DISP * n) / 1000; // L/min
export const qLeak = (p) => C_LEAK * p * (1 + p / P_C);
export const flow = (n, p) => Math.max(0, qTheory(n) - qLeak(p));
export const etaV = (n, p) => (qTheory(n) > 0 ? flow(n, p) / qTheory(n) : 0);
export const torque = (p) => (V_DISP * p) / (20 * Math.PI * ETA_HM) + T0; // N·m
export const powerIn = (n, p) => (torque(p) * 2 * Math.PI * n) / 60 / 1000; // kW
export const powerOut = (n, p) => (flow(n, p) * p) / 600; // kW

// Ports (mm). Inlet at the bottom (−v), outlet at the top (+v), both on u = 0.
export const HOUSING = { u: 61, v: 40, r: 4 };
export const INLET = { drill: 8, minor: 9.315, major: 10.478, depth: 14, thread: "G1/2" };
export const OUTLET = { drill: 6, minor: 7.475, major: 8.33, depth: 12, thread: "G3/8" };
export const BOLT = { u: 49, v: 26, hole: 4.5, d: 8 };

// Where a port's drilling meets the bore of the left gear, as a polar angle about its centre.
const edge = (rp, sign) => {
  const du = RW - rp;
  return Math.atan2(sign * Math.sqrt(BORE_R ** 2 - du ** 2), du);
};
export const IN_EDGE = edge(INLET.drill, -1); // ≈ −60°
export const OUT_EDGE = edge(OUTLET.drill, 1) - 2 * Math.PI; // ≈ −305°: the left gear turns clockwise
export const SEAL_ARC = IN_EDGE - OUT_EDGE;

// Pressure in a tooth space of the left gear whose centre sits at polar angle g (rad, about its
// centre, unwrapped so it falls between the inlet and one turn on). The space is filling while it
// is open to the inlet, carried at inlet pressure, and compressed over the last two pitches as the
// tip clearance leaks outlet oil back into it.
export function space(g, pOut) {
  const T = 2 * Math.PI;
  const x = (((IN_EDGE - g) % T) + T) % T; // how far the space centre has travelled past the inlet edge
  const half = PITCH / 2 - TIP_HALF; // from the space centre to either tip
  if (x >= T + IN_EDGE) return { state: "fill", p: 0 }; // past the mesh, opening to the inlet
  if (x + half > SEAL_ARC) return { state: "deliver", p: pOut }; // its leading tip has reached the outlet
  if (x < half) return { state: "fill", p: 0 }; // its trailing tip has not yet left the inlet
  const f = x / SEAL_ARC;
  const k = Math.min(1, Math.max(0, (f - 0.62) / 0.38));
  return { state: "sealed", p: pOut * k * k * (3 - 2 * k) };
}

// The radius of a gear's outline along polar angle a (rad, in the gear's own frame, a tooth centred
// at 0): tip, flank or root. Used where the axial section cuts the gear.
export function outlineRadius(a) {
  let d = Math.abs((((a % PITCH) + PITCH * 1.5) % PITCH) - PITCH / 2);
  if (d <= TIP_HALF) return RA;
  if (d >= halfAngle(RB)) return RF;
  let lo = RB;
  let hi = RA;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (halfAngle(mid) > d) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// Visual speed: the drawing turns 30°/s at 1500 rpm, 1/300 of real speed.
export const SLOWDOWN = 300;
export const degPerSec = (n) => (n * 6) / SLOWDOWN;
