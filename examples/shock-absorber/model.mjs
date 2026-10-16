// Truth first: the monotube shock absorber's dimensions, its gas, its valving and the quarter car
// it sits in. Pure, no imports, no DOM. Geometry, dimensions, readout and charts all read this.
//
// Conventions. World mm, the damper's axis vertical at u = 0, v up, the lower eye centre at v = 0.
// c is the damper's compression in mm: 0 fully extended, STROKE fully compressed.
// v is the damper's velocity in m/s, positive in rebound (extending), as on a damper dyno.
// Damper force F is positive in rebound (it resists extension). Pressures in bar absolute.

export const P_ATM = 1.01325;
export const G = 9.81;

// ---------------------------------------------------------------- tube, rod, piston (mm)
export const BORE = 46;
export const TUBE_OD = 50;
export const ROD_D = 14;
export const TENON_D = 10; // M10×1 piston post
export const A_BORE = Math.PI * (BORE / 2) ** 2; // mm²
export const A_ROD = Math.PI * (ROD_D / 2) ** 2;
export const A_ANN = A_BORE - A_ROD; // the annulus above the piston
export const STROKE = 150;

// Fixed heights (v, mm)
export const EYE_R = 20; // eye ring outside radius
export const CAP_BOT = 20; // base cap underside, on the eye ring
export const TUBE_BOT = 30;
export const FLOOR = 44; // gas chamber floor, the top of the base cap
export const FP_H = 20; // floating piston height
export const FP_BOT0 = 110; // floating piston underside at c = 0
export const FP_POCKET = { r: 16, h: 6 }; // the cup under the floating piston, open to the gas
export const GUIDE_BOT = 340;
export const GUIDE_TOP = 370;
export const TUBE_TOP = 376;

// The piston assembly, as heights s above the nut's underside (mm)
export const NUT_H = 8.4; // ISO 8673 M10×1
export const WASHER_H = 2;
export const SHIM_T = 0.3;
export const REB_SHIMS = [20, 24, 28, 31, 34]; // diameters, from the washer up to the piston
export const COMP_SHIMS = [34, 30, 26, 20]; // from the piston up to the washer
export const S_REB = NUT_H + WASHER_H; // 10.4, bottom of the rebound stack
export const S_PB = S_REB + REB_SHIMS.length * SHIM_T; // piston underside
export const PISTON_H = 12;
export const S_PT = S_PB + PISTON_H; // piston top
export const S_PM = S_PB + PISTON_H / 2; // piston mid-plane, SECTION A-A
export const S_SHOULDER = S_PT + COMP_SHIMS.length * SHIM_T + WASHER_H; // rod shoulder
export const S_STOP = 46; // rebound stop ring underside
export const S_BUFFER_TOP = 61; // rebound buffer top: meets the guide at full extension
export const NUT0 = GUIDE_BOT - S_BUFFER_TOP; // nut underside at c = 0

// The upper eye and what hangs from it, at c = 0
export const PLATE_TOP0 = 570; // dust shield's closed end, under the eye ring
export const EYE_TOP0 = PLATE_TOP0 + EYE_R; // upper eye centre, c = 0
export const SHIELD_BOT0 = 430;
export const BUMPER_BOT0 = TUBE_TOP + STROKE; // the bump stop meets the tube at full compression
export const LENGTH0 = EYE_TOP0; // eye to eye, extended

export const nutV = (c) => NUT0 - c;
export const eyeV = (c) => EYE_TOP0 - c;
export const length = (c) => LENGTH0 - c;

// ---------------------------------------------------------------- gas: nitrogen behind the floating piston
// The rod entering the tube displaces oil; oil is incompressible, so the floating piston moves down
// by the rod's volume over the bore and the gas takes it. Polytropic, n = 1.2 for a fast stroke.
export const P_GAS0 = 25; // bar abs at full extension, 20 °C
export const N_POLY = 1.2;
export const FP_RATIO = A_ROD / A_BORE;
const mm3 = 1 / 1000;
const POCKET_V = Math.PI * FP_POCKET.r ** 2 * FP_POCKET.h;
const FILL_V = Math.PI * 2 ** 2 * (FLOOR - 23 + 25);
export const V_GAS0 = (A_BORE * (FP_BOT0 - FLOOR) + POCKET_V + FILL_V) * mm3; // cm³
export const fpV = (c) => FP_BOT0 - c * FP_RATIO;
export const gasVolume = (c) => V_GAS0 - A_ROD * c * mm3;
export const pGas = (c) => P_GAS0 * (V_GAS0 / gasVolume(c)) ** N_POLY;
// Gas force on the rod, pushing it out: (p − p_atm)·A_rod. bar·mm² × 0.1 = N.
export const gasForce = (c) => (pGas(c) - P_ATM) * A_ROD * 0.1;

// ---------------------------------------------------------------- valving: digressive force–velocity
// Low speed: oil passes the bleed and the stiff first shims barely lift, so force rises steeply.
// Past the knee the shim stack lifts and the slope drops: F = c_hi·v + (c_lo − c_hi)·v_k·tanh(v / v_k).
export const REBOUND = { lo: 4200, hi: 1300, knee: 0.08 }; // N·s/m, N·s/m, m/s
export const COMPRESSION = { lo: 1900, hi: 600, knee: 0.08 };
export const C_BYPASS = 140; // N·s/m left with the valving bypassed: seal and band friction, viscous
export function damperForce(v, on = true) {
  if (!on) return C_BYPASS * v;
  const k = v >= 0 ? REBOUND : COMPRESSION;
  const a = Math.abs(v);
  return Math.sign(v) * (k.hi * a + (k.lo - k.hi) * k.knee * Math.tanh(a / k.knee));
}
// Pressure drop across the piston (bar): the force over the annulus.
export const deltaP = (F) => (Math.abs(F) / A_ANN) * 10;
// The shims crack open at half the knee speed and reach full lift at 1 m/s.
export const LIFT_MAX = 0.45; // mm at the stack's rim
export function shimLift(v, on = true) {
  if (!on || v === 0) return 0;
  const crack = deltaP(damperForce(0.5 * Math.sign(v) * (v > 0 ? REBOUND : COMPRESSION).knee));
  const full = deltaP(damperForce(Math.sign(v)));
  const dp = deltaP(damperForce(v));
  return LIFT_MAX * Math.min(1, Math.max(0, (dp - crack) / (full - crack)));
}
// Oil pressures either side of the piston (bar abs). The compression chamber below always sits
// at gas pressure; the rebound chamber above rises in rebound and falls in compression. The gas
// charge is what keeps it above zero, so the oil never cavitates (de Carbon, 1953).
export function pressures(c, v, on = true) {
  const pg = pGas(c);
  const dp = deltaP(damperForce(v, on));
  return { gas: pg, below: pg, above: v >= 0 ? pg + dp : pg - dp, dp };
}
// Oil through the piston, cm³/s: the annulus sweeps it.
export const flow = (v) => A_ANN * v; // mm²·m/s = cm³/s

// ---------------------------------------------------------------- the quarter car
export const MS = 350; // kg, a quarter of the body
export const MU = 40; // kg, wheel, hub, brake, half the links
export const KS = 26000; // N/m, the coil spring at the wheel
export const KT = 220000; // N/m, the tyre
export const CT = 200; // N·s/m, the tyre's own damping
export const C0 = 85; // mm, static compression at ride height
export const SPEED = 4.5; // m/s, about 16 km/h
export const fBody = Math.sqrt(KS / MS) / (2 * Math.PI); // Hz
export const fWheel = Math.sqrt((KS + KT) / MU) / (2 * Math.PI);
export const cCrit = 2 * Math.sqrt(KS * MS);

// Road: a speed hump on a lightly rough surface. Roughness is periodic over CYCLE s of driving
// so the tour loops without a seam.
export const CYCLE = 12; // s
export const HUMP = { h: 0.06, len: 0.9 }; // m
const LAP = SPEED * CYCLE;
const ROUGH = [
  [0.003, 47, 0.3],
  [0.002, 71, 1.9],
  [0.0015, 109, 4.1],
  [0.001, 163, 2.6],
];
export function road(X, humps) {
  let z = 0;
  for (const [a, k, ph] of ROUGH) z += a * Math.sin((2 * Math.PI * k * X) / LAP + ph);
  for (const x0 of humps) {
    const s = (X - x0) / HUMP.len;
    if (s > 0 && s < 1) z += HUMP.h * 0.5 * (1 - Math.cos(2 * Math.PI * s));
  }
  return z;
}

export function car() {
  return { zs: 0, vs: 0, zu: 0, vu: 0, X: 0, zr: 0, humps: [], on: true, c: C0, v: 0, F: 0 };
}

// Advance the quarter car by h seconds (semi-implicit Euler; call at 1 kHz or more).
export function stepCar(s, h) {
  const zr0 = s.zr;
  s.X += SPEED * h;
  s.zr = road(s.X, s.humps);
  const vr = (s.zr - zr0) / h;
  const c = C0 + (s.zu - s.zs) * 1000;
  const v = s.vs - s.vu; // rebound positive
  const F = damperForce(v, s.on);
  let fs = KS * (s.zu - s.zs) + gasForce(c) - gasForce(C0); // pushes body up, wheel down
  if (c > STROKE - 2) fs += 4e5 * ((c - STROKE + 2) / 1000) ** 1 * 1; // bump stop, stiff
  if (c < 2) fs -= 4e5 * ((2 - c) / 1000);
  const ft = Math.max(-(MS + MU) * G, KT * (s.zr - s.zu) + CT * (vr - s.vu)); // tyre leaves the road
  const as = (fs - F) / MS;
  const au = (ft - fs + F) / MU;
  s.vs += as * h;
  s.vu += au * h;
  s.zs += s.vs * h;
  s.zu += s.vu * h;
  s.c = C0 + (s.zu - s.zs) * 1000;
  s.v = s.vs - s.vu;
  s.F = damperForce(s.v, s.on);
  return s;
}

// Put a held damper back into the car: the body at rest, the wheel where the stroke says.
export function placeCar(s, c) {
  s.zs = 0;
  s.vs = 0;
  s.zu = (c - C0) / 1000;
  s.vu = 0;
  s.c = c;
  s.v = 0;
}
