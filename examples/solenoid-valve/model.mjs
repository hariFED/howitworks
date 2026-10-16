// Truth first: a 2/2-way normally closed pilot-operated (servo-assisted) solenoid valve, G1/2.
// Pure, no imports, no DOM. The geometry, the dimensions, the readout and both diagrams read this.
//
// Three coupled models, stepped together:
//  1. Coil.      d(lambda)/dt = V - R*i. The flux linkage lambda = N*phi; the current needed for a
//                flux phi is N*i = phi*(R0 + Rgap(g)) + l_fe*H(B), so the inductance falls as the
//                air gap g opens. When the plunger moves, the back-EMF dips the current.
//  2. Plunger.   m*a = F_mag - F_spring - (pC - p2)*A_pilot - c*v. F_mag = phi^2 / (2*mu0*A).
//  3. Diaphragm. Water is stiff, so the diaphragm moves only as fast as water leaves the chamber
//                above it: A_d * dz/dt = Q_pilot - Q_bleed. While it moves, the chamber pressure pC
//                is whatever balances the forces on it. The pilot (Ø1.6) drains the chamber faster
//                than the bleed (Ø0.8) refills it, so it lifts; it rises until it nearly shuts the
//                pilot against the plunger, which is why it follows the plunger (servo).
// Pressures are gauge (above atmosphere) in Pa inside; the sheet shows bar.

export const MU0 = 4e-7 * Math.PI;
export const RHO = 998; // water, kg/m³
export const G = 9.81;

// ---------------------------------------------------------------- geometry (mm)
export const PORT_V = 14; // port axis height above the body's underside
export const SEAT_TOP = 34; // the main seat's lip
export const SEAT_R = 6.5; // main orifice Ø13 (DN13)
export const SEAT_OR = 8.5; // seat lip outside
export const SEAT_EFF = 7.0; // effective sealing radius on the lip
export const DIA_EFF = 13.25; // diaphragm effective radius (free span 2.5 to 15, convolution 12 to 15)
export const WEB = 1.5; // diaphragm thickness
export const PILOT_D = 1.6; // pilot orifice in the sleeve
export const PILOT_SEAL_R = 1.15; // mean radius of the pilot lip the seal lands on
export const BLEED_D = 0.8; // bleed orifice through the diaphragm
export const BLEED_U = 10.5; // bleed hole radius on the diaphragm
export const PLUNGER_R = 5.6; // Ø11.2
export const TUBE_RI = 6.0; // armature tube Ø13×0.5
export const TUBE_RO = 6.5;
export const POLE_FACE = 83; // the pole piece's face, the top of the air gap
export const STROKE = 3.2; // plunger stroke, mm (gap closed, plunger on the pole)
export const G_RES = 0.1; // residual magnetic gap when pulled in (Cr plating), mm
export const SEAL_LOW = 37.6; // pilot-seal face when shut, closed valve
export const PLUNGER_TOP = POLE_FACE - STROKE; // plunger top when shut

// ---------------------------------------------------------------- coil
export const V_SUPPLY = 24; // V DC
export const TURNS = 2700;
export const WIRE_D = 0.28; // mm, Cu grade 2 enamel
const WIND_RI = 7.6;
const WIND_RO = 16;
export const WIND = { ri: WIND_RI, ro: WIND_RO, v0: 57, v1: 93 };
const MLT = Math.PI * (WIND_RI + WIND_RO); // mean length of turn, mm
export const R_COIL = (1.72e-8 * TURNS * MLT * 1e-3) / ((Math.PI / 4) * (WIRE_D * 1e-3) ** 2); // Ω at 20 °C
export const I_RATED = V_SUPPLY / R_COIL;
export const POWER = V_SUPPLY * I_RATED;
const A_POLE = Math.PI * (PLUNGER_R * 1e-3) ** 2; // m²
// Fixed reluctance: the flux crosses the tube wall and the clearance radially at the 3 mm yoke plate.
const RADIAL = (TUBE_RO - PLUNGER_R) * 1e-3;
const R_FIXED = RADIAL / (MU0 * 2 * Math.PI * ((TUBE_RO + PLUNGER_R) / 2) * 1e-3 * 3e-3);
const L_FE = 0.12; // iron path, m
const B_SAT = 1.55; // T, 1.4105 ferritic stainless
const H0 = B_SAT / (MU0 * 1800); // H(B) = H0*atanh(B/Bsat): μr ≈ 1800 at low B, saturating at Bsat
export const V_DIODE = 0.8; // freewheel diode in the plug
export const gapOf = (x) => STROKE - x + G_RES; // magnetic gap, mm, for plunger lift x mm
const rGap = (gmm) => (gmm * 1e-3) / (MU0 * A_POLE);
const ironH = (B) => H0 * Math.atanh(Math.min(0.9995, Math.abs(B) / B_SAT)) * Math.sign(B);
export const currentOf = (lambda, gmm) => {
  const phi = lambda / TURNS;
  return (phi * (R_FIXED + rGap(gmm)) + L_FE * ironH(phi / A_POLE)) / TURNS;
};
export const forceOfPhi = (phi) => (phi * phi) / (2 * MU0 * A_POLE); // N
// Steady flux for a current at a gap: solve N*i = phi*R + l*H(phi/A) by bisection.
export function fluxAt(i, gmm) {
  let lo = 0;
  let hi = B_SAT * A_POLE * 0.9995;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (currentOf(mid * TURNS, gmm) < i) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
export const pullAt = (i, gmm) => forceOfPhi(fluxAt(i, gmm)); // magnet pull, N
export const inductance = (gmm) => (TURNS * TURNS) / (R_FIXED + rGap(gmm)); // small-signal, H
export const TAU_OPEN = inductance(gapOf(0)) / R_COIL;
export const TAU_SHUT = inductance(gapOf(STROKE)) / R_COIL;

// ---------------------------------------------------------------- plunger and its spring
export const PLUNGER_MASS = 0.021; // kg (Ø11.2 × 42, 1.4105, with the spring bore)
const SPRING_D = 3.5; // mean coil diameter, mm
const SPRING_WIRE = 0.4;
export const SPRING_TURNS = 8;
export const SPRING_RATE = (70000 * SPRING_WIRE ** 4) / (8 * SPRING_D ** 3 * SPRING_TURNS); // N/mm (G = 70 GPa)
export const SPRING_SHUT = 14.4; // installed length with the valve shut, mm
export const SPRING_PRELOAD = 2.5; // N
export const springForce = (x) => SPRING_PRELOAD + SPRING_RATE * x;
const DAMP = 1.2; // N·s/m, water in the armature tube
const A_PILOT = Math.PI * (PILOT_SEAL_R * 1e-3) ** 2;
export const pilotLoad = (dpPa) => Math.max(0, dpPa) * A_PILOT; // N holding the seal on the lip

// ---------------------------------------------------------------- water
const CD = 0.62;
const A_D = Math.PI * (DIA_EFF * 1e-3) ** 2;
const A_S = Math.PI * (SEAT_EFF * 1e-3) ** 2;
const A_PORT = Math.PI * (SEAT_R * 1e-3) ** 2;
const A_PILOT_HOLE = (Math.PI / 4) * (PILOT_D * 1e-3) ** 2;
const A_BLEED = (Math.PI / 4) * (BLEED_D * 1e-3) ** 2;
export const CDA_DOWN = 25e-6; // what the valve feeds: 12 m of 22×1 copper and an open tap, as one orifice, m²
export const PIPE_L = 12; // m, the supply line that would hammer
export const PIPE_ID = 20; // mm
export const WAVE = 1250; // m/s, pressure wave speed in water-filled copper
export const P_SUPPLY = 3e5; // Pa gauge, mains
export const bar = (pa) => pa / 1e5;

const orifice = (cda, dp) => cda * Math.sign(dp) * Math.sqrt((2 * Math.abs(dp)) / RHO);
export const valveArea = (z) => CD * Math.min(Math.PI * 2 * SEAT_R * 1e-3 * Math.max(0, z) * 1e-3, A_PORT);
const pilotArea = (gap) => CD * Math.min(Math.PI * PILOT_D * 1e-3 * Math.max(0, gap) * 1e-3, A_PILOT_HOLE);
const bleedArea = CD * A_BLEED;

// Main flow through the seat and on through the downstream line; p2 is the outlet pressure.
export function mainFlow(z, p1) {
  const av = valveArea(z);
  if (av <= 0) return { q: 0, p2: 0 };
  const q = Math.sqrt(((2 * p1) / RHO) / (1 / av ** 2 + 1 / CDA_DOWN ** 2));
  return { q, p2: (RHO / 2) * (q / CDA_DOWN) ** 2 };
}
export const lpm = (q) => q * 60000;
export const Q_FULL = mainFlow(STROKE, P_SUPPLY).q;
export const V_PIPE = Q_FULL / (Math.PI * (PIPE_ID * 1e-3 / 2) ** 2);
export const JOUKOWSKY = RHO * WAVE * V_PIPE; // Pa, for an instant shut-off
// Michaud: a valve that closes in Tc > 2L/a lets the wave come back and cancel; the surge falls as 2·L·v/Tc.
export const surge = (tc) => (tc <= (2 * PIPE_L) / WAVE ? JOUKOWSKY : (2 * RHO * PIPE_L * V_PIPE) / tc);

// ---------------------------------------------------------------- state and step
export function valve(p1 = P_SUPPLY) {
  return { t: 0, on: false, lam: 0, i: 0, x: 0, v: 0, z: 0, pc: p1, p1, p2: 0, q: 0, f: 0, seated: true, pilot: 0, onAt: -1, offAt: -1, shutAt: -1, tc: 0 };
}

export function setCoil(s, on) {
  if (on === s.on) return;
  s.on = on;
  if (on) s.onAt = s.t;
  else {
    s.offAt = s.t;
    s.shutAt = -1;
  }
}

// Advance h seconds (keep h ≤ 1e-4 s).
export function step(s, h) {
  const g = gapOf(s.x);
  // coil
  s.i = currentOf(s.lam, g);
  let dl = (s.on ? V_SUPPLY : 0) - R_COIL * s.i;
  if (!s.on && s.i > 0) dl -= V_DIODE; // freewheeling through the plug's diode
  s.lam = Math.max(0, s.lam + dl * h);
  s.i = currentOf(s.lam, g);
  s.f = forceOfPhi(s.lam / TURNS);

  // water: main flow and outlet pressure follow the diaphragm
  const { q, p2 } = mainFlow(s.z, s.p1);
  s.q = q;
  s.p2 = p2;
  const gap = s.x - s.z; // pilot opening, mm
  s.pilot = gap;
  const ap = pilotArea(gap);
  const dpPilot = s.pc - p2;
  // pressure on the seal falls off as the pilot opens past a quarter of its diameter
  const fPress = gap < 0.02 ? pilotLoad(dpPilot) : pilotLoad(dpPilot) * Math.max(0, 1 - gap / (PILOT_D / 4));

  // plunger
  const fNet = s.f - springForce(s.x) - PLUNGER_MASS * G - fPress;
  const resting = s.x <= s.z + 1e-6;
  let load = 0; // what the plunger presses down on the diaphragm with, N
  if (resting && fNet <= 0) {
    load = -fNet;
    s.v = 0;
  } else {
    s.v += ((fNet - DAMP * s.v) / PLUNGER_MASS) * h;
    s.x += s.v * 1000 * h;
    if (s.x >= STROKE) {
      s.x = STROKE;
      s.v = Math.min(0, s.v);
    }
  }

  // diaphragm: force balance gives the chamber pressure while it moves
  const pEq = (s.p1 * (A_D - A_S) + p2 * A_S - load) / A_D;
  const pss = (s.p1 * bleedArea ** 2 + p2 * ap ** 2) / (bleedArea ** 2 + ap ** 2);
  const net = (pc) => orifice(ap, pc - p2) - orifice(bleedArea, s.p1 - pc); // m³/s out of the chamber
  if (s.z <= 0 && pss >= pEq) {
    s.seated = true;
    s.pc += (pss - s.pc) * Math.min(1, 300 * h); // the chamber's own compliance (rubber, trapped air)
  } else {
    s.seated = false;
    s.pc = pEq;
    s.z += (net(pEq) / A_D) * 1000 * h;
    if (s.z <= 0) {
      s.z = 0;
      s.seated = true;
    }
  }
  if (s.z > s.x) s.z = s.x; // it cannot pass the plunger: the pilot shuts
  if (s.x < s.z) {
    s.x = s.z;
    s.v = Math.max(0, s.v);
  }
  if (resting && fNet <= 0) s.x = s.z; // riding down on the diaphragm
  if (!s.on && s.offAt >= 0 && s.shutAt < 0 && s.z <= 0) {
    s.shutAt = s.t;
    s.tc = s.t - s.offAt;
  }
  s.t += h;
  return s;
}

export function advance(s, dt) {
  const n = Math.max(1, Math.ceil(dt / 5e-5));
  for (let k = 0; k < n; k++) step(s, dt / n);
  return s;
}

// The tour's switching programme, in model seconds.
export const TOUR = { on: 0.06, off: 0.5, end: 1.4 };

// A whole programme, sampled, for the notes (closing time, surge) and to size the chart.
export function simulate(p1 = P_SUPPLY, dt = 1e-3) {
  const s = valve(p1);
  const out = [];
  for (let t = 0; t < TOUR.end; t += dt) {
    setCoil(s, t >= TOUR.on && t < TOUR.off);
    advance(s, dt);
    out.push({ t: s.t, i: s.i, x: s.x, z: s.z, q: s.q, pc: s.pc, p2: s.p2, f: s.f });
  }
  return { s, out };
}

// Maximum operating pressure differential: the magnet at full gap must beat spring, weight and the pilot.
export const MOPD = (pullAt(I_RATED, gapOf(0)) - springForce(0) - PLUNGER_MASS * G) / A_PILOT;
// Flow factor of the open valve: Kv = Q[m³/h] / sqrt(Δp[bar]).
export const KV = (() => {
  const { q, p2 } = mainFlow(STROKE, P_SUPPLY);
  return (q * 3600) / Math.sqrt(bar(P_SUPPLY - p2));
})();
