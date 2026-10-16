// Truth first: the pressure cooker's dimensions, its water and its steam. Pure, no imports, no DOM.
// The geometry, the dimensions on the sheet, the readout and the saturation chart all read this.
//
// Water model. The water, the pot and the steam above it share one temperature T. The hob puts
// Q_HOB into the pot; the pot loses UA·(T − T_AMB) to the kitchen. Steam above the water is
// saturated, its pressure p_sat(T) from Antoine's equation. Until the lock pin rises, the lid
// vents through the pin's guide hole: the headspace sits at atmospheric pressure and the steam
// pushes the air out. Once the pin is up the lid is sealed and the pressure is p_air + p_sat(T).
// When that reaches the weight's set point the weight lifts, the steam vents and the water holds
// at the boiling point for that pressure: every extra joule from the hob leaves as steam.
// Pressures in kPa (absolute inside the model; the sheet shows gauge pressure in bar).

export const P_ATM = 101.325;
export const T_AMB = 20;
export const G = 9.81;
const R = 8.314; // J/(mol·K)
const M_H2O = 0.018015; // kg/mol

// Antoine for water, p in mmHg, T in °C (the 1–100 °C constants, within 0.5 % of the steam
// tables up to 130 °C, so one set covers the whole sheet).
export const ANTOINE = { A: 8.07131, B: 1730.63, C: 233.426 };
const MMHG = 0.133322; // kPa
export const psat = (T) => MMHG * 10 ** (ANTOINE.A - ANTOINE.B / (ANTOINE.C + T));
export const tsat = (p) => ANTOINE.B / (ANTOINE.A - Math.log10(p / MMHG)) - ANTOINE.C;
export const latent = (T) => (2501 - 2.36 * T) * 1000; // J/kg
export const rhoWater = (T) => 1000 - 0.00456 * (T - 4) ** 2; // kg/m³
export const rhoSteam = (T) => (psat(T) * 1000 * M_H2O) / (R * (T + 273.15)); // kg/m³, saturated

// ---------------------------------------------------------------- the pot (mm)
export const R_IN = 110; // pot bore Ø220
export const WALL = 1.0;
export const FLOOR = 7; // inside floor, above the underside of the capsule base
export const RIM = 168; // top of the pot's flange
export const CORNER = 12; // inside radius where the floor meets the wall
export const DISC_R = 90; // the aluminium heat disc inside the capsule
export const DISC_T = 5.4;
// Pot volume to the rim, less the corner fillet (a ring of section (1 − π/4)·r² at radius ≈ R_IN − r/4).
const cornerLoss = (1 - Math.PI / 4) * CORNER ** 2 * 2 * Math.PI * (R_IN - 0.22 * CORNER);
export const V_POT = (Math.PI * R_IN ** 2 * (RIM - FLOOR) - cornerLoss) / 1e6; // litres

// ---------------------------------------------------------------- the lid (mm)
export const LID_T = 1.2;
export const LID_CROWN = 190; // top of the flat crown, r < CROWN_R
export const CROWN_R = 34;
export const FLAT_R = 84; // the flat annulus outside this, at LID_FLAT
export const LID_FLAT = 174;
export const SKIRT_R = 104; // inner skirt that carries the gasket
export const SKIRT_BOT = 160;
export const LID_OUT = 122.2; // outer skirt
export const LUG_TOP = 158.2; // lid lug, top face
export const POT_LIP = 159; // pot lug, underside
export const LUG_CLEAR = POT_LIP - LUG_TOP; // the lid rises this far until its lugs bear on the pot's
export const LUGS = 6;
export function lidTop(r) {
  const a = Math.abs(r);
  if (a <= CROWN_R) return LID_CROWN;
  if (a >= FLAT_R) return LID_FLAT;
  const k = (a - CROWN_R) / (FLAT_R - CROWN_R);
  return LID_FLAT + ((LID_CROWN - LID_FLAT) / 2) * (1 + Math.cos(Math.PI * k));
}
// Headspace under the lid above the rim (the crown), by rings.
let crown = 0;
for (let r = 0.25; r < SKIRT_R; r += 0.5) crown += 2 * Math.PI * r * 0.5 * (lidTop(r) - LID_T - RIM);
export const V_CROWN = crown / 1e6; // litres
export const GASKET_R = R_IN; // the gasket seals on the bore: pressure acts on this circle
export const LID_AREA = Math.PI * GASKET_R ** 2; // mm²

// ---------------------------------------------------------------- the operating valve (mm)
export const ORIFICE_D = 3.0;
export const A_ORIFICE = Math.PI * (ORIFICE_D / 2) ** 2; // mm²
export const NOZZLE_TOP = 212;
export const WEIGHT_R = 10.5;
export const WEIGHT_BORE = 3.4;
export const WEIGHT_BOT = 200;
// The weight's half-profile [r, v]; its mass comes from its volume (Pappus) and brass density.
export const WEIGHT_PROFILE = [
  [0, NOZZLE_TOP], [WEIGHT_BORE, NOZZLE_TOP], [WEIGHT_BORE, WEIGHT_BOT], [WEIGHT_R - 0.8, WEIGHT_BOT], [WEIGHT_R, WEIGHT_BOT + 0.8],
  [WEIGHT_R, 218], [WEIGHT_R - 3, 222], [5, 222], [5, 228.2], [4.2, 229], [0, 229],
];
function revolvedVolume(loop) {
  let a = 0;
  let m = 0;
  for (let i = 0; i < loop.length; i++) {
    const [r0, v0] = loop[i];
    const [r1, v1] = loop[(i + 1) % loop.length];
    const c = r0 * v1 - r1 * v0;
    a += c;
    m += (r0 + r1) * c;
  }
  // Pappus: V = 2π · area · centroid radius = 2π · (m/6)
  return Math.abs((2 * Math.PI * m) / 6);
}
export const BRASS = 8.47e-3; // g/mm³, CuZn39Pb3
export const WEIGHT_G = revolvedVolume(WEIGHT_PROFILE) * BRASS; // grams
export const P_SET = ((WEIGHT_G / 1000) * G) / (A_ORIFICE * 1e-6) / 1000; // kPa gauge
export const T_SET = tsat(P_ATM + P_SET);

// ---------------------------------------------------------------- the lock pin and safety valve
export const PIN_TRAVEL = 4;
export const P_LIFT = 3.0; // kPa gauge: the pin rises (its weight and O-ring drag)
export const P_DROP = 1.5; // and falls again below this
export const P_SAFETY = 160; // kPa gauge, the spring-loaded safety valve
export const SAFETY_SEAT_D = 3;

// ---------------------------------------------------------------- heat
export const Q_HOB = 1800; // W into the pot (a 2 kW hob at 90 %)
export const UA = 4.0; // W/K, lid and walls to the kitchen
export const M_STEEL = 1.9; // kg, pot, lid and capsule
export const M_ALU = (Math.PI * DISC_R ** 2 * DISC_T * 2.7e-6); // kg, the heat disc
export const C_METAL = M_STEEL * 500 + M_ALU * 900; // J/K
export const C_WATER = 4200; // J/(kg·K)
export const WATER0 = 1.5; // kg, the fill
export const TIME_WARP = 50; // the tour runs the kitchen 50× faster

// ---------------------------------------------------------------- the valve's flow when lifted by hand
const CD = 0.62;
export const MANUAL_FULL = A_ORIFICE / (Math.PI * ORIFICE_D); // lift (mm) where the curtain equals the bore

export const heatCap = (s) => s.mw * C_WATER + C_METAL;
export const waterVolume = (s) => s.mw / rhoWater(s.T) * 1000; // litres
export const headVolume = (s) => V_POT + V_CROWN - waterVolume(s); // litres
export const waterLevel = (s) => FLOOR + (waterVolume(s) * 1e6 + cornerLoss) / (Math.PI * R_IN ** 2);

export function cooker(T = T_AMB) {
  const s = { T, mw: WATER0, nAir: 0, sealed: false, heat: true, p: P_ATM, vent: 0, safety: false, lift: 0, manual: 0, blocked: false, time: 0 };
  s.nAir = ((P_ATM - psat(T)) * headVolume(s)) / (R * (T + 273.15)); // kPa·L = J
  return s;
}

const pAir = (s) => (s.nAir * R * (s.T + 273.15)) / headVolume(s);

// Advance the cooker by dt seconds of kitchen time.
export function advance(s, dt) {
  s.time += dt;
  const C = heatCap(s);
  s.T += ((s.heat ? Q_HOB : 0) - UA * (s.T - T_AMB)) * dt / C;
  let vented = 0; // kg of steam out this step
  s.safety = false;
  if (!s.sealed) {
    // Open through the pin's guide hole: steam displaces air; when it cools, air comes back.
    const ps = psat(s.T);
    s.nAir = (Math.max(0, P_ATM - ps) * headVolume(s)) / (R * (s.T + 273.15));
    s.p = P_ATM + Math.min(P_LIFT, Math.max(0, ps - P_ATM));
    if (ps - P_ATM >= P_LIFT) s.sealed = true;
  }
  if (s.sealed) {
    let p = pAir(s) + psat(s.T);
    // The weight lifted by hand: the bore vents through the curtain under the weight.
    if (s.manual > 0.05 && p > P_ATM) {
      const area = Math.min(A_ORIFICE, Math.PI * ORIFICE_D * s.manual) * 1e-6;
      const rho = (p * 1000 * M_H2O) / (R * (s.T + 273.15));
      const dm = CD * area * Math.sqrt(2 * rho * (p - P_ATM) * 1000) * dt;
      s.T -= (dm * latent(s.T)) / C;
      vented += dm;
      p = pAir(s) + psat(s.T);
    }
    const pOpen = P_ATM + (s.blocked ? P_SAFETY : P_SET);
    if (p > pOpen) {
      // The valve lifts and holds the pressure: the water settles at that boiling point and the
      // heat above it leaves as steam.
      let Tq = tsat(pOpen - pAir(s));
      Tq = tsat(pOpen - (s.nAir * R * (Tq + 273.15)) / headVolume(s));
      const dm = (C * (s.T - Tq)) / latent(Tq);
      s.T = Tq;
      vented += dm;
      if (s.blocked) s.safety = true;
    }
    if (vented > 0) {
      // The air leaves with the steam in proportion to its share of the gas.
      const nSteam = vented / M_H2O;
      const share = pAir(s) / (pAir(s) + psat(s.T));
      s.nAir = Math.max(0, s.nAir - (nSteam * share) / Math.max(1e-6, 1 - share));
      s.mw -= vented;
    }
    s.p = pAir(s) + psat(s.T);
    if (s.p - P_ATM < P_DROP) s.sealed = false;
  }
  s.vent = vented / dt; // kg/s
  return s;
}

export const gauge = (s) => s.p - P_ATM; // kPa
export const lidForce = (pg) => Math.max(0, pg) * 1000 * LID_AREA * 1e-6; // N
export const ventFull = (Q_HOB - UA * (T_SET - T_AMB)) / latent(T_SET); // kg/s at full heat on the weight
