// Truth first: the hydraulic disc brake's dimensions and its oil. Pure, no imports, no DOM.
// The geometry, the dimensions on the sheet, the readout and the chart all read this.
//
// One input: the lever angle θ about its pivot. The pushrod sits RP from the pivot, so the master
// piston moves x = RP·sin θ. The stroke has three phases:
//   1. FREE: the primary cup has not yet passed the timing port, so the oil it pushes goes back
//      into the reservoir. No pressure.
//   2. GAP: the port is shut; the oil now leaves the master bore and pushes the two caliper
//      pistons out across the pad clearance. Only the square seals resist (a small pressure).
//   3. CONTACT: both pads touch the rotor. Further oil only strains the hose, the caliper and the
//      pads (the system compliance), so pressure and clamp force climb steeply.
// The square seals do not slide in the gap phase: they shear elastically, and on release they
// pull the pistons straight back by the same amount (rollback). That is what sets the clearance.
// Pressures in MPa (N/mm²), forces in N, lengths in mm.

// ---------------------------------------------------------------- lever (world mm, plan section)
export const PIVOT = [-22, 60]; // pivot pin centre; the bore axis is u = 0
export const RP = 22; // pivot to pushrod (the barrel nut)
export const RF = 80; // pivot to the finger point
export const LEVER_RATIO = RF / RP;

// ---------------------------------------------------------------- master cylinder
export const D_M = 10;
export const A_M = Math.PI * (D_M / 2) ** 2; // 78.5 mm²
export const BORE_END = 18; // closed end of the master bore
export const PISTON_FRONT = 29.5; // the piston's pressure face at rest
export const PISTON_LEN = 15;
export const LIP = PISTON_FRONT + 0.85; // the primary cup's sealing lip at rest
export const PORT_D = 0.7; // timing (compensating) port
export const PORT_V = LIP - 0.9; // the port sits just ahead of the lip
export const INLET_D = 1.6; // replenishing port, behind the primary cup
export const INLET_V = 34;
export const FREE = LIP - (PORT_V - PORT_D / 2); // lip travel until the port is shut

// ---------------------------------------------------------------- caliper
export const D_S = 22;
export const A_S = Math.PI * (D_S / 2) ** 2; // 380 mm², one piston each side
export const HYD_RATIO = A_S / A_M;
export const GAP = 0.25; // pad clearance each side at rest, set by seal rollback
export const ROTOR_T = 1.8;
export const ROTOR_D = 160;
export const R_EFF = 70.5; // piston axis from the rotor centre: the effective friction radius
export const LINING = 3.6;
export const BACKING = 1.7;
export const V_GAP = 2 * A_S * GAP; // oil needed to close both gaps, mm³
export const X_BITE = FREE + V_GAP / A_M; // master travel at pad contact

// ---------------------------------------------------------------- system
export const P_SEAL = 0.06; // MPa to shear the square seals and the pad spring
export const COMPLIANCE = 12; // mm³ per MPa after contact: hose 1 m, caliper, pads, oil
export const PAD_SHARE = 0.25; // share of that compliance in the pads, which lets the pistons creep
export const SPRING = { pre: 3, k: 0.6 }; // master return spring, N and N/mm
export const MU = 0.45; // resin pad on a stainless rotor
export const R_WHEEL = 370; // 29 × 2.4 tyre, rolling radius
export const MASS = 90; // rider and bike, kg
export const G = 9.81;

export const P_MAX = 5.0; // the tour squeezes to 50 bar
export const X_MAX = X_BITE + ((P_MAX - P_SEAL) * COMPLIANCE) / A_M;
export const THETA_MAX = Math.asin(X_MAX / RP);
export const S_FREE = RF * Math.asin(FREE / RP);
export const S_BITE = RF * Math.asin(X_BITE / RP);
export const S_MAX = RF * THETA_MAX;

export const masterX = (theta) => RP * Math.sin(theta);
export const thetaOf = (s) => s / RF; // finger travel (arc) to lever angle

// Everything at one lever angle. Quasi-static: the oil is incompressible apart from COMPLIANCE.
export function brake(theta) {
  const x = masterX(theta);
  let p = 0;
  let y = 0; // each caliper piston's travel towards the rotor
  let phase = "FREE";
  if (x > FREE && x <= X_BITE) {
    phase = "GAP";
    y = (A_M * (x - FREE)) / (2 * A_S);
    p = P_SEAL * Math.min(1, (x - FREE) / 0.15);
  } else if (x > X_BITE) {
    phase = "CONTACT";
    const v = A_M * (x - X_BITE);
    p = P_SEAL + v / COMPLIANCE;
    y = GAP + (PAD_SHARE * v) / (2 * A_S);
  }
  const clamp = phase === "CONTACT" ? (p - P_SEAL) * A_S : 0; // N, each pad on the rotor
  const torque = (2 * MU * clamp * R_EFF) / 1000; // N·m, two faces
  const decel = torque / (R_WHEEL / 1000) / MASS; // m/s²
  const finger = (p * A_M + SPRING.pre + SPRING.k * x) / LEVER_RATIO; // N at the finger point
  return { theta, x, p, y, phase, clamp, torque, decel, finger, s: RF * theta, portOpen: x < FREE };
}

// The clamp force against finger travel, for the chart.
export function curve(n = 160) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const s = (S_MAX * i) / n;
    out.push([s, brake(thetaOf(s)).clamp]);
  }
  return out;
}
