// Truth first: the gyroscopic flight instruments of a generic four-seat, high-wing light aircraft and
// the vacuum system that spins two of them. Pure, no DOM. The sheet, its sections, the dial faces,
// the diagrams, the readouts and the 3D view all read this file.
//
// The aeroplane is the parent sheet's (examples/light-aircraft/model.mjs, imported, never retyped):
// its gravity, its knot, its cruise airspeed (the first row of its tour), its engine's rated rpm, its
// load factor in a turn and its 60° steep turn. The standard-rate turn below is flown at that cruise.
//
// The system (class figures for this aircraft, typical of the installed equipment):
//   An engine-driven dry (carbon-vane) vacuum pump draws air out of the instrument cases. Cabin air
//   comes in through one central filter, is accelerated through jets onto the buckets of the attitude
//   (AI) and heading (HI) gyro rotors, and leaves through the pump, which blows it overboard. A
//   spring-loaded regulator lets outside air into the pump's inlet so the suction stays at 5.0 inHg
//   (the suction gauge's green arc 4.5–5.5). The turn coordinator (TC) is electric, so a dead pump
//   leaves it running.
//
// Physics:
//   pump        free-air delivery Q = V_d·N·(p_in/p₀)·η_v − leak·s, V_d = 2·e·L·(πD − z·t)
//   gyro jets   ṁ = C_d·A·√(2ρs), jet speed v = √(2s/ρ); torque on the buckets T = η_b·ṁ·r·(v − ωr)·2
//   drag        bearing friction plus windage, T_d = T_b + c_w·ω²; I·dω/dt = T_jet − T_d
//   rigidity    H = I·ω; a torque τ turns the spin axis at Ω = τ/H, 90° on from the torque
//   drift       HI: τ_h/H (pivot friction, residual unbalance) plus the Earth's 15.04°/h·sin λ
//   erection    the AI's pendulous vanes unbalance its four exhaust jets toward the apparent vertical
//   TC          spring-restrained gimbal: J·δ̈ + c·δ̇ + k·δ = H·Ω_in, Ω_in = p·sin 30° + r·cos 30°
//   ball        it lies where the tube's normal is the apparent gravity: tan β = −f_y / f_z

import * as A from "../light-aircraft/model.mjs";

export const G = A.G;
export const KT = A.KT;
const rad = Math.PI / 180;
const deg = 180 / Math.PI;
export const RPM_PER_RAD = 60 / (2 * Math.PI);

// ---------------------------------------------------------------- the aeroplane (from the parent)
export const V_CRUISE = A.TOUR[0][1]; // kt: the parent's cruise
export const RPM_RATED = A.ENGINE.rpm; // 2700
export const RPM_CRUISE = 2400; // the cruise rpm the parent's propeller is drawn at (light-aircraft live.js)
export const RPM_IDLE = 1000; // taxi
export const STEEP = A.TOUR.find((r) => r[3] > 0); // the parent's steep turn: [t, kt, flap, bank]
export const LATITUDE = 50; // deg N, for the Earth-rate drift
export const STD_RATE = 3; // deg/s, a 360° turn in two minutes
export const turnRate = (phiDeg, vkt) => (Math.tan(phiDeg * rad) * G) / (vkt * KT) * deg; // deg/s, coordinated
export const bankFor = (rateDeg, vkt) => Math.atan((rateDeg * rad * vkt * KT) / G) * deg; // deg
export const BANK_STD = bankFor(STD_RATE, V_CRUISE); // ≈ 16.8° at 110 kt
export const loadFactor = A.loadFactor;

// ---------------------------------------------------------------- air
export const P0 = 101.325; // kPa
export const RHO = A.RHO; // kg/m³ at the filter (sea level)
export const INHG = 3.38639; // kPa per inHg
export const S_SET = 5.0 * INHG; // regulator setting, kPa
export const GREEN = [4.5, 5.5]; // inHg, the suction gauge's arc

// ---------------------------------------------------------------- the pump: dry rotary vane (mm)
export const PUMP = {
  Rb: 27, // liner bore radius
  Rr: 22.45, // rotor radius
  e: 4.5, // eccentricity, rotor centre to bore centre
  L: 40, // rotor length
  z: 6, // vanes
  t: 4, // vane thickness
  vane: 14, // vane length (radial)
  slot: 14.5, // slot depth in the rotor
  drive: 1.3, // pump rpm per engine rpm (accessory pad)
  etaV: 0.94, // volumetric efficiency at no suction
  leak: 0.55, // L/min of back-leak per kPa of suction
};
export const PUMP_VD = 2 * PUMP.e * PUMP.L * (Math.PI * 2 * PUMP.Rb - PUMP.z * PUMP.t) / 1000; // cm³ per rev
// the bore wall seen from the rotor centre along angle θ (rad, from the line of centres): distance
export function boreReach(th) {
  const { Rb, e } = PUMP;
  // bore centre at (+e, 0) from the rotor centre
  const c = Math.cos(th);
  return e * c + Math.sqrt(Rb * Rb - e * e * (1 - c * c));
}

// ---------------------------------------------------------------- the regulator (mm, N)
export const REG = { seat: 8, k: 0.15, lift: 2 }; // seat Ø, spring rate N/mm, lift to the stop
export const REG_AREA = (Math.PI * REG.seat ** 2) / 4; // mm²
export const REG_PRELOAD = S_SET * 1000 * REG_AREA * 1e-6; // N: cracks at S_SET
export const regLift = (s) => Math.max(0, Math.min(REG.lift, ((s - S_SET) * 1000 * REG_AREA * 1e-6) / REG.k));

// ---------------------------------------------------------------- the rotors (mm, half-profiles [r, s])
// Inertia and mass of a body of revolution from its half-profile, by Green's theorem.
export function massProps(loop, rho) {
  let a1 = 0;
  let a3 = 0;
  for (let i = 0; i < loop.length; i++) {
    const [r0, s0] = loop[i];
    const [r1, s1] = loop[(i + 1) % loop.length];
    const ds = s1 - s0;
    const p2 = Math.abs(r1 - r0) < 1e-9 ? r0 ** 2 : (r1 ** 3 - r0 ** 3) / (3 * (r1 - r0));
    const p4 = Math.abs(r1 - r0) < 1e-9 ? r0 ** 4 : (r1 ** 5 - r0 ** 5) / (5 * (r1 - r0));
    a1 += (ds * p2) / 2; // ∮ r²/2 ds = ∬ r dA
    a3 += (ds * p4) / 4; // ∮ r⁴/4 ds = ∬ r³ dA
  }
  const m = 2 * Math.PI * rho * Math.abs(a1) * 1e-9; // kg
  const I = 2 * Math.PI * rho * Math.abs(a3) * 1e-15; // kg·m²
  return { m, I };
}
const BRASS = 8500;
const STEEL = 7850;
// AI rotor: rim, web, hub and its own shaft ends, spinning about the vertical
export const AI_ROTOR = [[0, -13], [2, -13], [2, -8], [6, -8], [6, -3], [16, -3], [16, -10], [22, -10], [22, 10], [16, 10], [16, 3], [6, 3], [6, 8], [2, 8], [2, 13], [0, 13]];
// HI rotor: the same family, a little thinner, spinning about a horizontal axis
export const HI_ROTOR = [[0, -12], [2, -12], [2, -7], [6, -7], [6, -2.5], [15, -2.5], [15, -8], [21, -8], [21, 8], [15, 8], [15, 2.5], [6, 2.5], [6, 7], [2, 7], [2, 12], [0, 12]];
// TC rotor: the bell of an outside-rotor DC motor, on bearings on a fixed spindle (the stator sits inside the bell)
export const TC_ROTOR = [[2.05, -11], [4.5, -11], [4.5, -7], [17, -7], [17, 8], [14.5, 8], [14.5, -4.5], [4.5, -4.5], [4.5, -3], [2.05, -3]];
export const AI_MP = massProps(AI_ROTOR, BRASS);
export const HI_MP = massProps(HI_ROTOR, BRASS);
export const TC_MP = massProps(TC_ROTOR, STEEL);

// Each air-driven gyro: bucket radius rb (m), two jets of diameter dj (mm), the speed it runs at on
// 5.0 inHg; windage is set so that is its balance speed.
function airGyro({ mp, rb, dj, rpm, etaB = 0.3, Tb = 2e-5 }) {
  const A = 2 * Math.PI * (dj / 2) ** 2 * 1e-6; // m², both jets
  const g = { I: mp.I, m: mp.m, rb, A, etaB, Tb, rpm };
  const w = rpm / RPM_PER_RAD;
  g.cw = (jetTorque(g, S_SET, w) - Tb) / (w * w);
  g.H0 = g.I * w;
  return g;
}
export const CD = 0.8;
export function jetFlow(g, s) {
  // free-air L/min through the jets at suction s (kPa)
  const md = CD * g.A * Math.sqrt(2 * RHO * Math.max(0, s) * 1000);
  return (md / RHO) * 60000;
}
export function jetTorque(g, s, w) {
  if (s <= 0) return 0;
  const md = CD * g.A * Math.sqrt(2 * RHO * s * 1000); // kg/s
  const v = Math.sqrt((2 * s * 1000) / RHO); // m/s
  return 2 * g.etaB * md * g.rb * (v - w * g.rb);
}
export const dragTorque = (g, w) => (w > 0 ? g.Tb + g.cw * w * w : 0);
export const AI = airGyro({ mp: AI_MP, rb: 0.022, dj: 1.5, rpm: 21000 });
export const HI = airGyro({ mp: HI_MP, rb: 0.021, dj: 1.4, rpm: 18000 });
// TC: a 14 V DC motor, torque falling linearly to zero at its no-load speed
export const TC = { I: TC_MP.I, m: TC_MP.m, rpm: 9000, Ts: 6e-3, w0: 11000 / RPM_PER_RAD, Tb: 3e-5 };
TC.cw = (TC.Ts * (1 - TC.rpm / RPM_PER_RAD / TC.w0) - TC.Tb) / (TC.rpm / RPM_PER_RAD) ** 2;
TC.H0 = TC.I * (TC.rpm / RPM_PER_RAD);
export const tcTorque = (on, w) => (on ? TC.Ts * Math.max(0, 1 - w / TC.w0) : 0) - (w > 0 ? TC.Tb + TC.cw * w * w : 0);

// ---------------------------------------------------------------- the flow balance
export const pumpFlow = (rpmEngine, s) => Math.max(0, PUMP_VD * rpmEngine * PUMP.drive * 1e-3 * ((P0 - s) / P0) * PUMP.etaV - PUMP.leak * s); // L/min free air
export const instrFlow = (s) => jetFlow(AI, s) + jetFlow(HI, s);
export function regFlow(s) {
  const x = regLift(s); // mm
  if (x <= 0) return 0;
  const area = Math.PI * REG.seat * x * 1e-6; // m², the curtain round the seat
  return 0.6 * area * Math.sqrt((2 * s * 1000) / RHO) * 60000; // L/min
}
// steady suction for an engine speed: pump = instruments + regulator bleed (bisection)
const SUCTION_CACHE = new Map();
export function suctionFor(rpmEngine, { regulated = true, pump = true } = {}) {
  if (!pump || rpmEngine <= 0) return 0;
  const key = `${Math.round(rpmEngine * 4)}|${regulated}`;
  const hit = SUCTION_CACHE.get(key);
  if (hit !== undefined) return hit;
  const s = solveSuction(rpmEngine, regulated);
  if (SUCTION_CACHE.size < 20000) SUCTION_CACHE.set(key, s);
  return s;
}
function solveSuction(rpmEngine, regulated) {
  let lo = 0;
  let hi = 60;
  for (let i = 0; i < 50; i++) {
    const s = (lo + hi) / 2;
    const net = pumpFlow(rpmEngine, s) - instrFlow(s) - (regulated ? regFlow(s) : 0);
    if (net > 0) lo = s;
    else hi = s;
  }
  return (lo + hi) / 2;
}

// ---------------------------------------------------------------- disturbances, erection, the TC
export const EARTH = 15.041 * Math.sin(LATITUDE * rad); // deg/h, apparent drift at this latitude
// HI: pivot friction and residual unbalance about its horizontal axis: 2.5°/15 min at full speed
export const HI_TAU = ((2.5 / 900) * rad) * HI.H0; // N·m
// AI: residual unbalance about the pitch axis, 0.5°/min of roll wander at full speed
export const AI_TAU = ((0.5 / 60) * rad) * AI.H0;
// pendulous vanes: four exhaust slots below the rotor housing, half covered by vanes that hang
export const VANE = { len: 6, slotHalf: 0.6, arm: 0.018, slotArea: 1.6 }; // pivot to slot centre mm, slot half-width mm, arm m, slot area mm²
export const VANE_SAT = Math.asin(VANE.slotHalf / VANE.len) * deg; // tilt that opens a slot fully
export function erectTorque(s) {
  // all of the AI's air leaves through the four slots: the jet reaction of one slot's flow, at full unbalance
  const q = (jetFlow(AI, s) / 60000) / 4; // m³/s a slot
  const v = q / (VANE.slotArea * 1e-6);
  return RHO * q * v * VANE.arm;
}
export const ERECT_RATE = (erectTorque(S_SET) / AI.H0) * deg * 60; // deg/min at full speed, large tilt
export const RATE_CAP = 25; // deg/s: below a few % of H the rotor is no gyro, the gimbal just flops
export const REST = [18, -20]; // where a stopped AI rests on its stops, relative to the case (roll, pitch), deg
export const SAG = 6; // deg/s it sinks there at
// TC: gimbal axis canted up 30°; spring so that a standard-rate turn at the cruise deflects it 20°
export const CANT = 30;
export const TC_MARK = 20; // deg of gimbal (and symbol) at standard rate
export const TC_STOP = 40;
export const tcInput = (pDeg, rDeg) => pDeg * Math.sin(CANT * rad) + rDeg * Math.cos(CANT * rad); // deg/s
export const TC_IN_STD = tcInput(0, STD_RATE * Math.cos(BANK_STD * rad));
export const TC_K = (TC.H0 * TC_IN_STD * rad) / (TC_MARK * rad); // N·m/rad
export const TC_J = 2.4e-5; // kg·m², gimbal, rotor and stator about the gimbal axis
export const TC_WN = Math.sqrt(TC_K / TC_J);
export const TC_C = 2 * 0.7 * Math.sqrt(TC_K * TC_J); // damper, ζ = 0.7
// rudder: full pedal adds this much yaw rate to the turn the bank makes
export const RUDDER_RATE = 2.4; // deg/s
export const BALL_MAX = 17; // deg either way along the tube
export const TUBE_R = 45; // mm, the inclinometer's arc

// ---------------------------------------------------------------- state
export function system() {
  return {
    t: 0, // tour time
    real: 0, // real seconds simulated
    rpm: 0, // engine
    s: 0, // suction, kPa
    master: false,
    pumpOk: true,
    wAI: 0,
    wHI: 0,
    wTC: 0,
    tilt: [18, -20], // AI spin axis from the apparent vertical: roll, pitch (deg), resting on its stops
    hiErr: 47, // HI card minus the magnetic heading (deg), not yet set
    hdg: 270, // true (= magnetic, variation ignored) heading
    phi: 0, // bank, deg
    rud: 0, // rudder, -1…1
    delta: 0, // TC gimbal, deg
    ddelta: 0,
    ball: 0, // deg along the tube, + to the right
    warp: 1,
    lift: 0, // regulator lift, mm
    pumpAngle: 0, // rad, the rotor (shown)
    broken: false,
  };
}
export const H = (g, w) => g.I * w;
export const rigidity = (g, w) => Math.min(1, Math.max(0, (H(g, w) / g.H0 - 0.03) / 0.12)); // 0 dead … 1

// The aeroplane's own motion: heading rate, body rates and the specific force along the wings.
export function kinematics(phi, rud, vkt, dphi) {
  const psiDot = turnRate(phi, vkt) + RUDDER_RATE * rud; // deg/s
  const V = vkt * KT;
  const w = psiDot * rad;
  const fy = w * V * Math.cos(phi * rad) - G * Math.sin(phi * rad); // m/s², + toward the right wing
  const fz = w * V * Math.sin(phi * rad) + G * Math.cos(phi * rad);
  return {
    psiDot,
    p: dphi, // roll rate, deg/s
    r: psiDot * Math.cos(phi * rad), // yaw rate in the body, deg/s
    fy,
    fz,
    ballEq: Math.max(-BALL_MAX, Math.min(BALL_MAX, Math.atan2(-fy, fz) * deg)),
    apparent: Math.atan2(w * V, G) * deg, // roll of the apparent vertical from the true vertical
    n: Math.hypot(fy, fz) / G,
  };
}

// One step of everything, h real seconds, with the controls: rpm, master, pump, bank (and its rate), rudder.
export function step(st, h, { rpm, master, pumpOk, phi, dphi = 0, rud, vkt = V_CRUISE, ground = false }) {
  st.real += h;
  st.rpm = rpm;
  st.master = master;
  if (!pumpOk && st.pumpOk) st.broken = true;
  st.pumpOk = pumpOk;
  st.phi = phi;
  st.rud = rud;
  // suction follows its steady value through the lines' volume (τ 0.4 s)
  const sEq = suctionFor(rpm, { pump: pumpOk });
  st.s += (sEq - st.s) * Math.min(1, h / 0.4);
  st.lift = regLift(st.s);
  if (pumpOk) st.pumpAngle += ((rpm * PUMP.drive) / RPM_PER_RAD) * h;
  // rotors
  st.wAI = Math.max(0, st.wAI + ((jetTorque(AI, st.s, st.wAI) - dragTorque(AI, st.wAI)) / AI.I) * h);
  st.wHI = Math.max(0, st.wHI + ((jetTorque(HI, st.s, st.wHI) - dragTorque(HI, st.wHI)) / HI.I) * h);
  st.wTC = Math.max(0, st.wTC + (tcTorque(master, st.wTC) / TC.I) * h);
  const kin = ground ? kinematics(0, 0, 0.001, 0) : kinematics(phi, rud, vkt, dphi);
  if (ground) kin.psiDot = kin.r = kin.p = 0;
  st.hdg = (((st.hdg + kin.psiDot * h) % 360) + 360) % 360;
  // AI: while the rotor is a gyro, its spin axis only precesses: erection toward the apparent vertical
  // (the vanes hang along it) against the residual torque's wander, Ω = τ/H. A rotor too slow to be a
  // gyro is a pendulum on its gimbals: it rolls with the case and sinks onto its stops.
  const hAI = Math.max(1e-9, H(AI, st.wAI));
  const rho = rigidity(AI, st.wAI);
  const eT = erectTorque(st.s);
  for (let k = 0; k < 2; k++) {
    const err = st.tilt[k] - (k === 0 ? kin.apparent : 0);
    const sat = Math.max(-1, Math.min(1, err / VANE_SAT));
    let gyro = ((-eT * sat + (k === 0 ? AI_TAU : 0)) / hAI) * deg; // deg/s
    gyro = Math.max(-RATE_CAP, Math.min(RATE_CAP, gyro));
    const rest = k === 0 ? phi + REST[0] : REST[1];
    const pend = (k === 0 ? kin.p : 0) + Math.sign(rest - st.tilt[k]) * Math.min(Math.abs(rest - st.tilt[k]) / h, SAG);
    st.tilt[k] += (rho * gyro + (1 - rho) * pend) * h;
  }
  // gimbal stops: the case allows ±100° of roll and ±60° of pitch between gyro and case
  const rel = st.tilt[0] - phi;
  if (rel > 100) st.tilt[0] = phi + 100;
  if (rel < -100) st.tilt[0] = phi - 100;
  st.tilt[1] = Math.max(-60, Math.min(60, st.tilt[1]));
  // HI: drift = Earth rate + τ/H; a dead rotor turns with the case
  const hHI = Math.max(1e-6, H(HI, st.wHI));
  const rhoH = rigidity(HI, st.wHI);
  let drift = (EARTH / 3600 + (HI_TAU / hHI) * deg) * (st.wHI > 1 ? 1 : 0);
  drift = Math.max(-RATE_CAP, Math.min(RATE_CAP, drift));
  st.hiErr += (drift - (1 - rhoH) * kin.psiDot) * h;
  st.hiErr = ((((st.hiErr + 180) % 360) + 360) % 360) - 180;
  // TC: spring-restrained gyro on its canted gimbal (deflects with the turn: + right)
  const torque = H(TC, st.wTC) * tcInput(kin.p, kin.r) * rad; // N·m
  const acc = (torque - TC_K * st.delta * rad - TC_C * st.ddelta * rad) / TC_J; // rad/s²
  st.ddelta += acc * deg * h;
  st.delta += st.ddelta * h;
  if (Math.abs(st.delta) > TC_STOP) {
    st.delta = Math.sign(st.delta) * TC_STOP;
    st.ddelta = 0;
  }
  // ball: the damping fluid makes it a first-order lag (τ 0.25 s)
  st.ball += (kin.ballEq - st.ball) * Math.min(1, h / 0.25);
  st.kin = kin;
  return st;
}

// What each instrument shows.
export function shows(st) {
  const kin = st.kin ?? kinematics(0, 0, V_CRUISE, 0);
  return {
    suctionInHg: st.s / INHG,
    aiRel: st.phi - st.tilt[0], // bank the AI shows
    aiPitch: -st.tilt[1], // pitch the AI shows (aeroplane level)
    hiHdg: (((st.hdg + st.hiErr) % 360) + 360) % 360,
    compass: st.hdg,
    tcSymbol: st.delta, // deg, + right wing down
    tcRate: (st.delta / TC_MARK) * STD_RATE,
    ball: st.ball,
    psiDot: kin.psiDot,
    rpm: { ai: st.wAI * RPM_PER_RAD, hi: st.wHI * RPM_PER_RAD, tc: st.wTC * RPM_PER_RAD },
  };
}

// ---------------------------------------------------------------- the tour
// Start-up (time-warped ×30), a coordinated standard-rate turn, a skid and a slip, a vacuum pump
// failure (warped ×60), then a turn on the turn coordinator alone. Tour time t; real time runs
// `warp` times faster.
export const TOUR = 56;
export const PHASES = [
  [0, "ENGINE OFF"],
  [0.6, "MASTER ON"],
  [1.0, "START-UP"],
  [8.2, "HI SET"],
  [9.6, "CRUISE"],
  [11, "STD-RATE TURN"],
  [21, "SKID"],
  [27, "SLIP"],
  [33, "ROLL OUT"],
  [35, "PUMP FAILED"],
  [46.5, "TURN ON TC"],
  [54, "ROLL OUT"],
];
const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));
const ramp = (t, a, b) => ease((t - a) / (b - a));
export function tourAt(t) {
  const warp = t < 1 ? 1 : t < 9 ? 1 + 29 * ramp(t, 1, 1.6) * (1 - ramp(t, 8.6, 9.4)) : t < 35 ? 1 : t < 46 ? 1 + 59 * ramp(t, 35, 36) * (1 - ramp(t, 45.2, 46)) : 1;
  const rpm = t < 0.9 ? 0 : t < 4 ? RPM_IDLE : RPM_IDLE + (RPM_CRUISE - RPM_IDLE) * ramp(t, 4, 6);
  const S = BANK_STD;
  let phi = 0;
  let rud = 0;
  if (t >= 11 && t < 33) phi = S * ramp(t, 11, 12.6) * (1 - ramp(t, 19, 20.6)) + S * ramp(t, 21, 22.6) * (1 - ramp(t, 33, 34.6));
  if (t >= 33) phi = S * (1 - ramp(t, 33, 34.6));
  if (t >= 46.5) phi = -S * ramp(t, 46.5, 48.1) * (1 - ramp(t, 53.6, 55.2));
  if (t >= 22.6 && t < 33) rud = 0.75 * ramp(t, 22.6, 23.4) * (1 - ramp(t, 26.6, 27.4)) - 0.75 * ramp(t, 27.4, 28.2) * (1 - ramp(t, 32.2, 33));
  const knob = t >= 8.2 && t < 8.6; // the pilot pushes and turns the knob to match the compass
  return { warp, rpm, master: t >= 0.6, pumpOk: t < 35, phi, rud, ground: t < 9.6, knob };
}
export function phaseAt(t) {
  let p = PHASES[0][1];
  for (const [a, n] of PHASES) if (t >= a) p = n;
  return p;
}
// Advance the tour by dt tour-seconds (substepped so the model sees small real steps).
export function tourStep(st, dt) {
  const c0 = tourAt(st.t);
  const c1 = tourAt(st.t + dt);
  const dphi = (c1.phi - c0.phi) / dt;
  const realDt = dt * c0.warp;
  const n = Math.max(1, Math.ceil(realDt / 0.004));
  for (let i = 0; i < n; i++) step(st, realDt / n, { ...c0, dphi: dphi / c0.warp });
  if (c0.knob) st.hiErr *= Math.exp(-dt / 0.05);
  st.warp = c0.warp;
  st.t += dt;
  return st;
}
// The tour, sampled: [t, aiRpm, hiRpm, tcRpm, suction inHg, aiErr, hiErr]
export function tourTrace(dt = 1 / 120, every = 12) {
  const st = system();
  const out = [];
  let i = 0;
  while (st.t < TOUR) {
    if (i++ % every === 0) out.push([st.t, st.wAI * RPM_PER_RAD, st.wHI * RPM_PER_RAD, st.wTC * RPM_PER_RAD, st.s / INHG, st.tilt[0], st.hiErr]);
    tourStep(st, dt);
  }
  return out;
}
