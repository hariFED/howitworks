// Truth first: a beta-type Stirling demonstrator with a rhombic drive, and its gas. Pure, no DOM.
// The geometry, the dimensions, the readout, the gas shading and the P–V chart all read this.
//
// Kinematics. Two equal spur gears counter-rotate about (±E, 0). Each carries a crank pin at radius
// R_CRANK. Four rods of length ROD_L join the pins to an upper yoke (the power piston) and a lower
// yoke (the displacer), whose rod pins sit ±YOKE_A from the axis. The angle phi is the left gear's
// angle, counter-clockwise from +u; by symmetry the right gear sits at 180° − phi.
//
// Gas (Schmidt analysis). Three isothermal spaces: expansion (hot, Th) above the displacer,
// compression (cold, Tc) between displacer and piston, and the annular gap regenerator round the
// displacer at the log-mean temperature. One fixed mass of air, sealed in at 20 °C and 1 atm, so
// p = mR / (Ve/Th + Vr/Tr + Vc/Tc). Work per cycle is the loop integral of p dV, with V the total.

export const P_ATM = 1.01325; // bar
export const T_AMB = 293.15; // K

// Cylinder (mm)
export const BORE = 40;
export const DISP_D = 38; // displacer: radial gap 1 mm is the regenerator
export const ROD_D = 5; // displacer rod, through the piston
export const AREA = (Math.PI / 4) * BORE ** 2; // mm²
export const AREA_ROD = (Math.PI / 4) * ROD_D ** 2;

// Rhombic drive (mm)
export const E = 20; // gear pitch radius = half the centre distance (module 1, z 40)
export const R_CRANK = 9;
export const YOKE_A = 9;
export const ROD_L = 34;
export const LP = 46; // upper yoke centre to the piston's underside
export const PISTON_H = 28;
export const DISP_L = 80;
export const CLEAR = 2; // least gap at either end of the displacer's travel

const C = E - YOKE_A;
export const S = (phi) => Math.sqrt(ROD_L ** 2 - (C - R_CRANK * Math.cos(phi)) ** 2);
const S_MAX = Math.sqrt(ROD_L ** 2 - (C - R_CRANK) ** 2);
export const LD = LP + PISTON_H + 2 * S_MAX + CLEAR; // lower yoke centre to the displacer's underside

export const pinL = (phi) => [-E + R_CRANK * Math.cos(phi), R_CRANK * Math.sin(phi)];
export const pinR = (phi) => [E - R_CRANK * Math.cos(phi), R_CRANK * Math.sin(phi)];
export const yokeP = (phi) => R_CRANK * Math.sin(phi) + S(phi);
export const yokeD = (phi) => R_CRANK * Math.sin(phi) - S(phi);
export const pistonTop = (phi) => yokeP(phi) + LP + PISTON_H;
export const dispBottom = (phi) => yokeD(phi) + LD;
export const dispTop = (phi) => dispBottom(phi) + DISP_L;

// Extremes by sampling (they are not at round angles in a rhombic drive)
function range(f) {
  let lo = Infinity;
  let hi = -Infinity;
  let at = [0, 0];
  for (let i = 0; i < 3600; i++) {
    const phi = (i / 3600) * 2 * Math.PI;
    const v = f(phi);
    if (v < lo) { lo = v; at[0] = phi; }
    if (v > hi) { hi = v; at[1] = phi; }
  }
  return { lo, hi, at };
}
export const PISTON = range(yokeP);
export const DISP = range(yokeD);
export const STROKE_P = PISTON.hi - PISTON.lo;
export const STROKE_D = DISP.hi - DISP.lo;
export const CAP_TOP = range(dispTop).hi + CLEAR; // the hot cap's inner crown

// Volumes (cm³)
const mm3 = 1 / 1000;
export const V_REG = Math.PI * ((BORE / 2) ** 2 - (DISP_D / 2) ** 2) * DISP_L * mm3;
export const vHot = (phi) => AREA * (CAP_TOP - dispTop(phi)) * mm3;
export const vCold = (phi) => (AREA - AREA_ROD) * (dispBottom(phi) - pistonTop(phi)) * mm3;
export const vTotal = (phi) => vHot(phi) + vCold(phi) + V_REG;

const vols = range(vTotal);
export const V_MIN = vols.lo;
export const V_MAX = vols.hi;
export const SWEPT = V_MAX - V_MIN;
export const V_MEAN = (V_MIN + V_MAX) / 2;
export const MR = (P_ATM * V_MEAN) / T_AMB; // bar·cm³/K, fixed: sealed in cold at mid-stroke

export const tReg = (th, tc) => (Math.abs(th - tc) < 0.01 ? (th + tc) / 2 : (th - tc) / Math.log(th / tc));
export const pressure = (phi, th, tc) => MR / (vHot(phi) / th + V_REG / tReg(th, tc) + vCold(phi) / tc);

// Phase: the angle by which the hot volume leads the cold volume (first harmonics).
function harmonic(f) {
  let a = 0;
  let b = 0;
  const n = 720;
  for (let i = 0; i < n; i++) {
    const phi = (i / n) * 2 * Math.PI;
    a += f(phi) * Math.cos(phi);
    b += f(phi) * Math.sin(phi);
  }
  return Math.atan2(b, a);
}
const PHASE = ((((harmonic(vCold) - harmonic(vHot)) * 180) / Math.PI) % 360 + 360) % 360;

// One cycle's energy (J): heat taken in by the hot space Qh = ∮p dVe, rejected by the cold space
// Qc = −∮p dVc, and the work W = Qh − Qc = ∮p dV. dir is the sense in which phi runs.
function loop(th, tc, dir) {
  let qh = 0;
  let qc = 0;
  const n = 720;
  for (let i = 0; i < n; i++) {
    const a = (dir * i * 2 * Math.PI) / n;
    const b = (dir * (i + 1) * 2 * Math.PI) / n;
    const p = 0.5 * (pressure(a, th, tc) + pressure(b, th, tc));
    qh += p * (vHot(b) - vHot(a));
    qc -= p * (vCold(b) - vCold(a));
  }
  return { qh: qh * 0.1, qc: qc * 0.1, w: (qh - qc) * 0.1 }; // bar·cm³ → J
}
export const DIR = loop(700, 330, 1).w > 0 ? 1 : -1;
export const cycle = (th, tc) => loop(th, tc, DIR);
export const work = (th, tc) => cycle(th, tc).w; // J per cycle, indicated
export const LEAD = DIR > 0 ? PHASE : 360 - PHASE; // degrees by which the hot volume leads the cold

// Running: the flywheel takes the mean indicated torque W/2π against friction T0 + B·ω.
export const INERTIA = 0.0012; // kg·m², Ø110 cast-iron flywheel and the gears
export const T_FRICTION = 0.03; // N·m, seals and bearings
export const B_FRICTION = 0.00178; // N·m per rad/s
export const TC = 330; // K, cooler fins in still air
export const TH_MAX = 760; // K, the cap at full flame
export const TH_MIN = TC; // flame out, the cap at the cooler's temperature
export const MOTION = 1 / 20; // the sheet draws the motion at 1/20 of engine speed

export const torque = (th, tc) => work(th, tc) / (2 * Math.PI);
export function accel(omega, th, tc) {
  const drive = torque(th, tc);
  const drag = (omega > 0.01 ? T_FRICTION : Math.min(T_FRICTION, Math.abs(drive))) + B_FRICTION * omega;
  return (drive - drag) / INERTIA;
}
export const rpm = (omega) => (omega * 60) / (2 * Math.PI);
// The temperature difference at which the engine just turns (mean torque = static friction).
export function stallTh(tc = TC) {
  let lo = tc + 1;
  let hi = TH_MAX;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (torque(m, tc) > T_FRICTION) hi = m;
    else lo = m;
  }
  return hi;
}
export const steadyOmega = (th, tc = TC) => Math.max(0, (torque(th, tc) - T_FRICTION) / B_FRICTION);

// The burner's setting (0..1) sets the cap temperature it holds against the losses.
export const burnerTh = (b) => TH_MIN + (TH_MAX - TH_MIN) * Math.max(0, Math.min(1, b)) ** 0.8;
export const HEAT_RATE = 0.5; // 1/s, the cap's thermal follow on the (sped-up) sheet clock
