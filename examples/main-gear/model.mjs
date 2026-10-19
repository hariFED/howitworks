// Truth first: the fixed main landing gear of a four-seat high-wing light aircraft. One tapered flat
// spring-steel leg per side, clamped in the fuselage's gear box between an inboard bolt and an
// outboard saddle; an axle bolted to its tip carrying a 6.00-6 wheel with a single-disc hydraulic
// brake; and the pilot's toe-brake master cylinders feeding the calipers through brake lines. Pure, no
// imports, no DOM: the geometry, the dimensions, the readout and the charts all read this file.
//
// Conventions. World mm. Front view looking aft at the LEFT main gear: u outboard (toward the left
// wing tip) from the aircraft's centre line, v up from the runway at the static load. The leg is a
// beam: x along its axis from the saddle (x = 0) toward the tip (x = L), y across it, up and outboard.
// Forces in N, pressures in bar, moments in N·mm unless marked.

export const G = 9.81;

// ---------------------------------------------------------------- the aircraft (class figures)
export const MTOW = 1100; // kg
export const MAIN_SHARE = 0.83; // the mains' share of the weight at mid CG (nose gear 17 %)
export const W_LEG = (MTOW * MAIN_SHARE * G) / 2; // N, the static vertical load on one main wheel
export const M_SPRUNG = (MTOW * MAIN_SHARE) / 2; // kg, the airframe mass one leg carries
export const M_UNSPRUNG = 16; // kg: wheel, tyre, brake, axle and a third of the leg
export const TRACK = 2540; // mm, between the tyres' centres at the static load

// ---------------------------------------------------------------- the leg: tapered flat spring
// AISI 6150 spring steel, quenched and tempered to HRC 46–50 (UTS ≈ 1600 MPa, yield ≈ 1400 MPa).
// It tapers in width (fore and aft, b) and thickness (in the bending plane, h) from the saddle to
// the tip, so that its bending stress σ = 6M / (b·h²) stays nearly even along its length.
export const E = 205000; // N/mm²
export const THETA = 30; // degrees below horizontal, unloaded
export const L = 880; // mm, saddle to tip along the axis
export const A_IN = 200; // mm, saddle to the inboard bolt (the leg's short arm inside the gear box)
export const B0 = 90; // mm, width at the saddle (and inboard of it)
export const B1 = 60; // at the tip
export const H0 = 30; // mm, thickness at the saddle (and inboard of it)
export const H1 = 18; // at the tip
export const breadth = (x) => (x <= 0 ? B0 : B0 + ((B1 - B0) * Math.min(x, L)) / L);
export const thick = (x) => (x <= 0 ? H0 : H0 + ((H1 - H0) * Math.min(x, L)) / L);
export const inertia = (x) => (breadth(x) * thick(x) ** 3) / 12; // mm⁴
export const SIGMA_YIELD = 1400; // MPa
const th = (THETA * Math.PI) / 180;
export const COS = Math.cos(th);
export const SIN = Math.sin(th);
export const TYRE_OD = 445; // 6.00-6, 4 ply
export const TYRE_R = TYRE_OD / 2;
export const TYRE_W = 160;
export const P_TYRE = 2.6; // bar, 38 psi
export const K_TYRE = 180000; // N/m, about 25 mm under the static load
export const C_TYRE = 1500; // N·s/m
export const F_STATIC = W_LEG;
export const R_STATIC = TYRE_R - ((F_STATIC + M_UNSPRUNG * G) / K_TYRE) * 1000; // mm, the axle's height at rest

// ---------------------------------------------------------------- the tip assembly (axle frame)
// The axle is forged with a mounting block that is bolted under the leg's tip through tapered shims.
// In the axle's own frame (s along the axle, outboard; r up; origin on the axle centre) the leg's tip
// sits inboard of the brake and above the axle. At the static load the shims hold the axle level
// (camber 0), so unloaded the wheel leans out at the top, and in a hard landing it leans in.
export const TIP_LOWER = [-140, 36]; // the leg's tip, lower corner, in the axle frame at the static load

// ---------------------------------------------------------------- beam theory
// The leg is a beam on two supports, the inboard bolt (x = −A_IN) and the saddle (x = 0), with the
// overhang to the tip loaded by the runway. A vertical ground force F at the tyre's contact point
// bends every section x ≥ 0 by M = F × (the horizontal distance from x to the contact point); inside
// the gear box the moment falls linearly to zero at the bolt. The curvature M / (E·I(x)), integrated
// twice with w = 0 at both supports, gives the deflection w(x) across the axis and its slope.
const N_IN = 10; // stations inside the gear box, bolt to saddle
const N_OUT = 48; // and along the overhang, saddle to tip
export const N_ST = N_IN + N_OUT;
export const XS = Array.from({ length: N_ST + 1 }, (_, i) => (i <= N_IN ? -A_IN + (A_IN * i) / N_IN : (L * (i - N_IN)) / N_OUT));
const X0 = XS.findIndex((x) => Math.abs(x) < 1e-6);
const rot = ([a, b], ang) => [a * Math.cos(ang) - b * Math.sin(ang), a * Math.sin(ang) + b * Math.cos(ang)];
function shapeFor(ofs) {
  const arm = (x) => (x >= 0 ? L * COS + ofs - x * COS : ((L * COS + ofs) * (x + A_IN)) / A_IN);
  const n = XS.length;
  const kap = XS.map((x) => arm(x) / (E * inertia(x)));
  const slope = new Array(n).fill(0);
  const w = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    const dx = XS[i] - XS[i - 1];
    slope[i] = slope[i - 1] + 0.5 * (kap[i] + kap[i - 1]) * dx;
    w[i] = w[i - 1] + 0.5 * (slope[i] + slope[i - 1]) * dx;
  }
  const c = -w[X0] / A_IN; // add c·(x + A_IN) so that w(0) = 0 too
  for (let i = 0; i < n; i++) {
    w[i] += c * (XS[i] + A_IN);
    slope[i] += c;
  }
  return { w, slope, arm };
}
// The axle's place relative to the tip depends on the tip's static slope, which depends on the
// axle's lever arm: a few rounds of fixed point settle it.
const SOLVED = (() => {
  let ofs = 0;
  let sh;
  let o;
  for (let k = 0; k < 8; k++) {
    sh = shapeFor(ofs);
    const phiS = sh.slope[N_ST] * F_STATIC;
    const psi = -(THETA * Math.PI) / 180 + phiS; // the leg's tip direction at the static load
    const nrm = [-Math.sin(psi), Math.cos(psi)];
    const tip = [TIP_LOWER[0] + (H1 / 2) * nrm[0], TIP_LOWER[1] + (H1 / 2) * nrm[1]]; // tip axis point
    // the axle centre seen from the tip, in the leg's own frame (x along, y across)
    o = rot([-tip[0], -tip[1]], -psi);
    ofs = o[0] * COS + o[1] * SIN; // its horizontal reach past the tip, unloaded
  }
  return { sh, o, ofs };
})();
export const AXLE_FROM_TIP = SOLVED.o; // [x, y] in the leg's frame
export const W1 = SOLVED.sh.w; // mm per N, across the axis, at XS[i]
export const SLOPE1 = SOLVED.sh.slope; // rad per N
export const W_TIP1 = W1[N_ST];
export const PHI1 = SLOPE1[N_ST];
export const tipSlope = (F) => F * PHI1; // rad, counter-clockwise looking aft
// world offset of the axle from the tip, unloaded, then turned by the tip's slope under load
const O_REST = [AXLE_FROM_TIP[0] * COS + AXLE_FROM_TIP[1] * SIN, -AXLE_FROM_TIP[0] * SIN + AXLE_FROM_TIP[1] * COS];
function axleRel(F) {
  const t = [L * COS + F * W_TIP1 * SIN, -L * SIN + F * W_TIP1 * COS];
  const o = rot(O_REST, tipSlope(F));
  return [t[0] + o[0], t[1] + o[1]];
}
// The saddle's place: the static axle sits at half the track, R_STATIC above the runway.
export const SADDLE = (() => {
  const a = axleRel(F_STATIC);
  return [TRACK / 2 - a[0], R_STATIC - a[1]];
})();
export const legPoint = (x, y = 0) => [SADDLE[0] + x * COS + y * SIN, SADDLE[1] - x * SIN + y * COS];
export const axleAt = (F) => {
  const a = axleRel(F);
  return [SADDLE[0] + a[0], SADDLE[1] + a[1]];
};
export const AXLE_REST = axleAt(0);
export const AXLE_STATIC = axleAt(F_STATIC);
// the vertical stiffness at the axle (linear for the dynamics: the rotation's second order is < 1 mm)
export const AXLE_DV1 = (AXLE_STATIC[1] - AXLE_REST[1]) / F_STATIC; // mm per N
export const K_LEG = 1 / AXLE_DV1; // N/mm
export const deflection = (F) => axleAt(F)[1] - AXLE_REST[1]; // mm, up, at the axle
export const spread = (F) => axleAt(F)[0] - AXLE_REST[0]; // mm, outboard, at the axle
export const halfTrack = (F) => axleAt(F)[0];
// the axle frame's rotation from level under F (rad, counter-clockwise looking aft), and the camber
export const axleTilt = (F) => tipSlope(F) - tipSlope(F_STATIC);
export const camber = (F) => (-axleTilt(F) * 180) / Math.PI; // degrees, + top outboard
// a point given in the axle frame (static pose), placed for the load F
export function fromAxle(F, [s, r]) {
  const a = axleAt(F);
  const q = rot([s, r], axleTilt(F));
  return [a[0] + q[0], a[1] + q[1]];
}
// The leg's deflected axis under F: [u, v, slope] at every station.
export function legAxis(F) {
  return XS.map((x, i) => {
    const w = F * W1[i];
    return [SADDLE[0] + x * COS + w * SIN, SADDLE[1] - x * SIN + w * COS, SLOPE1[i] * F];
  });
}
// Bending stress σ = M·c/I = 6M / (b·h²), MPa, at x under F, and the greatest along the leg.
export const sigmaAt = (x, F) => (6 * F * SOLVED.sh.arm(x)) / (breadth(x) * thick(x) ** 2);
export const SIGMA_MAX1 = Math.max(...XS.filter((x) => x >= 0).map((x) => sigmaAt(x, 1)));
export const sigmaMax = (F) => F * SIGMA_MAX1;
// The supports' reactions per newton of ground load: the bolt holds the leg's inner end down, the
// saddle carries the bolt's pull plus the load.
export const Q_BOLT1 = (L * COS + SOLVED.ofs) / A_IN;
export const S_SADDLE1 = Q_BOLT1 + 1;

// ---------------------------------------------------------------- landing: a two-mass bounce
// The airframe's share (M_SPRUNG) on the leg spring, the wheel (M_UNSPRUNG) on the tyre spring. A
// steel spring stores the landing and gives it back: the only damping is the tyre's, the friction
// in the fittings and the tyre scrubbing sideways as the track widens, lumped as ζ ≈ 0.15.
export const ZETA = 0.15;
export const C_LEG = 2 * ZETA * Math.sqrt(K_LEG * 1000 * M_SPRUNG); // N·s/m
export const V_SINK = 1.0; // m/s at touchdown
export const LIFT0 = 2 / 3; // wing lift at touchdown as a share of the weight, bleeding off
export const T_LIFT = 2.5; // s, the lift's time constant on the ground roll

// ---------------------------------------------------------------- the brakes
// Toe pedal: hinged at its foot on the rudder pedal; the toe pushes 130 mm up it, the master
// cylinder's rod is pinned 52 mm up, so the rod sees 2.5 × the toe force.
export const TOE_ARM = 130;
export const ROD_ARM = 52;
export const PEDAL_RATIO = TOE_ARM / ROD_ARM;
// Master cylinder: Ø12.7 bore. Pascal: the pressure is the rod force over the bore's area, and the
// same pressure acts everywhere in the closed line.
export const MC_BORE = 12.7;
export const A_MC = (Math.PI / 4) * MC_BORE ** 2; // mm²
export const MC_FREE = 1.6; // mm of stroke before the cup covers the compensating port
export const MC_STROKE = 24; // mm, full
export const F_SPRING0 = 35; // N, the return spring's preload on the rod
export const K_SPRING = 1.2; // N/mm
// Caliper: one Ø44.45 piston, floating on two anchor bolts, so the pad on each side of the disc is
// pressed with the same force.
export const CAL_BORE = 44.45;
export const A_CAL = (Math.PI / 4) * CAL_BORE ** 2; // mm²
export const PAD_GAP = 0.5; // mm, total running clearance (both linings)
export const V_GAP = A_CAL * PAD_GAP; // mm³ to close it
export const COMPLIANCE = 18; // mm³ per bar: hose, lines, seals and linings
export const MU_LINING = 0.4; // organic lining on a steel disc
export const R_EFF = 79; // mm, effective radius of the linings (r 64 to 92)
export const DISC_OD = 190.5;
export const DISC_T = 6.35;
export const R_ROLL = 0.207; // m, the tyre's loaded rolling radius
export const MU_TYRE = 0.7; // dry runway
export const TAU_LINE = 0.06; // s: the fluid's lag through 6 m of line
// Rod force from toe force (N), and the pressure it holds (bar): p = F / A_MC.
export const rodForce = (toe) => Math.max(0, toe * PEDAL_RATIO);
// the stroke at which the cup has covered the port and the linings touch the disc
export const X_TOUCH = MC_FREE + V_GAP / A_MC;
export function pressureFor(toe) {
  const spring = F_SPRING0 + K_SPRING * X_TOUCH;
  return Math.max(0, ((rodForce(toe) - spring) / A_MC) * 10);
}
// The master cylinder's stroke (mm) for a toe force and the line pressure: the piston first runs
// against its spring alone (the cup passes the port, the pistons take up the gap), then the fluid's
// compliance (hose, seals, linings) lets it creep on as the pressure builds.
export const mcStroke = (toe, p) => Math.min(X_TOUCH, Math.max(0, (rodForce(toe) - F_SPRING0) / K_SPRING)) + (COMPLIANCE * Math.max(0, p)) / A_MC;
// clamp force (N) on each lining, brake torque (N·m) and the force at the tyre (N)
export const clampForce = (p) => p * A_CAL * 0.1;
export const brakeTorque = (p) => (2 * MU_LINING * clampForce(p) * R_EFF) / 1000;
export const brakeForce = (p) => brakeTorque(p) / R_ROLL;
// the piston's travel (mm) toward the disc: it takes up the gap, then the linings squeeze a little
export const pistonTravel = (p) => (p > 0.01 ? PAD_GAP + 0.00035 * p * 10 : 0);

// ---------------------------------------------------------------- the airframe on the ground roll
export const ROLL_RES = 0.02; // rolling resistance, share of the wheel loads
export const CDA = 0.6; // m², drag area with flaps up, idle (½ρV²·CdA)
export const RHO = 1.225;
export const IZ = 1700; // kg·m², yaw inertia about the CG
export const C_YAW = 2600; // N·m·s/rad, the tyres' side forces resisting a yaw (lumped, NTS)

// ---------------------------------------------------------------- the tour (18 s, loops)
// 0.0  approach: gear hanging unloaded, legs straight, wheels leaning out; sinking at 1 m/s
// 1.2  main-wheel touchdown at 50 kt: the legs bend and spread, the track widens, the wheels lean in;
//      the airframe rides the springs and settles as the lift bleeds off
// 3.6  both toes press: the master cylinders build pressure, the calipers clamp, the aeroplane slows
// 9.8  taxi at a brisk walk, the pilot holding the speed with the throttle
// 10.4 left toe alone: the left wheel drags, the aeroplane turns left
// 13.6 right toe alone: it turns right
// 16.2 both toes: it stops; 18 loop
export const TOUR = 18;
export const T_TD = 1.2;
export const V_TD = 25.7; // m/s, 50 kt
export const TAXI = 4.0; // m/s
const ramp = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const smooth = (x) => x * x * (3 - 2 * x);
const pulse = (t, a, b, c, d) => smooth(ramp(t, a, b)) - smooth(ramp(t, c, d));
// toe forces (N) on the left and right brake pedals
export function toesAt(t) {
  const both = 240 * pulse(t, 3.6, 4.3, 9.3, 9.8) + 220 * pulse(t, 16.2, 16.6, 17.6, 17.95);
  const left = 150 * pulse(t, 10.4, 10.9, 12.3, 12.8);
  const right = 150 * pulse(t, 13.6, 14.1, 15.5, 16.0);
  // taxi creep: a light dab on each to hold walking pace
  return [both + left, both + right];
}
// propeller thrust (N): idle on the landing roll, then the pilot works the throttle to hold taxi speed
export const thrustAt = (t, V) => (t < 9.8 || t > 16.2 ? 200 : Math.min(1400, Math.max(150, 260 + 900 * (TAXI - V))));
// the ground in the airframe's frame: 0 at the static load; the approach starts this far above it
export const H_START = V_SINK * T_TD;

// hanging in the air the leg carries the wheel's weight: it bends down a little
export const D_HANG = (M_UNSPRUNG * G) / (K_LEG * 1000); // m
export function gear() {
  // z: the airframe's height (m) above its static ride height; zu: the axle's, relative to the airframe
  // rest (unloaded) position. Unloaded, the wheel hangs deflection(F_STATIC) lower than at static.
  const d0 = deflection(F_STATIC) / 1000 + (F_STATIC + M_UNSPRUNG * G) / K_TYRE + D_HANG;
  return {
    t: 0, air: true,
    z: H_START + d0, vz: -V_SINK, // airframe height above its static ride height (m)
    d: -D_HANG, vd: 0, // leg deflection at the axle (m), upward relative to the airframe
    F: 0, Ft: 0, // leg force and tyre force (N)
    V: V_TD, x: 0, yaw: 0, r: 0, // ground speed (m/s), distance (m), heading (rad), yaw rate (rad/s)
    toe: [0, 0], p: [0, 0], spin: 0, skid: [false, false], lift: LIFT0, decel: 0,
  };
}
// The tyre's squash (m) at the airframe height z and leg deflection d, both relative to static.
const D_STATIC = deflection(F_STATIC) / 1000;
const SQ_STATIC = (F_STATIC + M_UNSPRUNG * G) / K_TYRE;
export const tyreSquash = (z, d) => SQ_STATIC - z - (d - D_STATIC);

// Advance by h seconds (call at 2 kHz or more). drive: { toe: [l, r], thrust } override the tour's.
export function stepGear(s, h, drive = {}) {
  s.t += h;
  s.toe = drive.toe ?? s.toe;
  const thrust = drive.thrust ?? 250;
  // ---- vertical: airframe on the leg spring, wheel on the tyre
  s.lift = s.air ? LIFT0 : Math.max(0, s.lift - (s.lift / T_LIFT) * h);
  const Fleg = K_LEG * 1000 * s.d + C_LEG * s.vd;
  const sq = tyreSquash(s.z, s.d);
  const vsq = -(s.vz + s.vd);
  const Ft = sq > 0 ? Math.max(0, K_TYRE * sq + C_TYRE * vsq) : 0;
  // the wheel: tyre pushes up, leg pushes down; its height is z + (d − D_STATIC) + const
  const aw = (Ft - Fleg - M_UNSPRUNG * G) / M_UNSPRUNG; // the wheel's absolute acceleration
  // in the air the airframe keeps its flight path (a steady sink); on the ground it rides the leg
  const az = s.air ? 0 : (Fleg - M_SPRUNG * G * (1 - s.lift)) / M_SPRUNG;
  s.vz += az * h;
  s.z += s.vz * h;
  s.vd += (aw - az) * h;
  s.d += s.vd * h;
  if (s.air && Ft > 0) s.air = false;
  s.F = K_LEG * 1000 * s.d;
  s.Ft = Ft;
  // ---- brakes: the line pressure follows the master cylinders' with a short lag
  for (let i = 0; i < 2; i++) {
    const want = pressureFor(s.toe[i]);
    s.p[i] += ((want - s.p[i]) / TAU_LINE) * h;
    if (s.p[i] < 0) s.p[i] = 0;
  }
  // ---- the ground roll: brakes, rolling resistance, drag, thrust; yaw from the brake difference
  const N = Ft; // this wheel's load (both mains alike)
  const fb = s.p.map((p) => brakeForce(p));
  const limit = MU_TYRE * Math.max(N, 1);
  s.skid = fb.map((f) => f > limit && N > 50);
  const fx = fb.map((f) => (N > 50 ? Math.min(f, limit) : 0));
  if (s.V > 0) {
    const drag = 0.5 * RHO * s.V * s.V * CDA + ROLL_RES * 2 * N + fx[0] + fx[1];
    const a = (thrust - drag) / MTOW;
    s.decel = -a;
    s.V = Math.max(0, s.V + a * h);
    if (s.V === 0) s.decel = 0;
  }
  s.x += s.V * h;
  const moment = (fx[0] - fx[1]) * (TRACK / 2000); // left brake drags the left side: +yaw = left
  const yawK = s.V > 0.05 ? 1 : 0;
  s.r += ((moment * yawK - C_YAW * s.r) / IZ) * h;
  s.yaw += s.r * h;
  // the wheel spins with the ground speed unless it skids
  s.spin += (s.V / R_ROLL) * h;
  return s;
}

export function tourStep(s, h) {
  const t = s.t + h;
  stepGear(s, h, { toe: toesAt(t), thrust: thrustAt(t, s.V) });
  return s;
}

// A held leg: the airframe pinned, the load set by hand (N); the brakes still follow the toes.
export function holdGear(s, F, h, toes) {
  const d0 = s.d;
  s.d = Math.max(0, F) / (K_LEG * 1000);
  s.vd = (s.d - d0) / h;
  s.F = Math.max(0, F);
  s.air = false;
  s.Ft = s.F + M_UNSPRUNG * G;
  s.z = s.d - D_STATIC - (s.Ft / K_TYRE - SQ_STATIC);
  s.vz = 0;
  s.toe = toes;
  for (let i = 0; i < 2; i++) {
    const want = pressureFor(toes[i]);
    s.p[i] += ((want - s.p[i]) / TAU_LINE) * h;
  }
  return s;
}

export function phase(s) {
  if (s.air) return "APPROACH";
  if (s.t < T_TD + 2.4) return "TOUCHDOWN";
  if (s.skid[0] || s.skid[1]) return "SKID";
  if (s.p[0] > 1.5 && s.p[1] > 1.5) return s.V < 0.05 ? "STOPPED" : "BRAKING";
  if (s.p[0] > 1.5) return "TURNING LEFT";
  if (s.p[1] > 1.5) return "TURNING RIGHT";
  return s.V < 0.05 ? "STOPPED" : "ROLLING";
}

// The whole tour sampled, for the diagrams (computed once at build time).
export function tourTrace(dt = 1 / 2000, every = 40) {
  const s = gear();
  const out = [];
  let i = 0;
  while (s.t < TOUR) {
    tourStep(s, dt);
    if (i++ % every === 0) out.push([s.t, s.d * 1000, s.F, s.p[0], s.p[1], s.V, s.yaw]);
  }
  return out;
}
