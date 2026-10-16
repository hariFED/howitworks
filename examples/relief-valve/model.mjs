// Truth first: a DN25 spring-loaded safety relief valve on a compressed-air receiver.
// Pure, no imports, no DOM. The geometry, the dimensions, the readout and the charts read this.
//
// Forces on the disc (N; bar·mm² × 0.1 = N):
//   closing  F_s(h) = F0 + k·h                     the spring, preloaded by the adjusting screw
//   opening  F_p(p, h) = 0.1·p·A_seat·(1 + c_H·ψ(h) + c_R·h)
//            A_seat      inlet pressure on the seat circle
//            c_H·ψ(h)    the huddling chamber: once the disc has cracked open, gas fills the
//                        annulus between the seat and the holder's skirt and pushes on it too
//                        (ψ ramps 0 → 1 between H_A and H_B of lift)
//            c_R·h       reaction of the jet turned down by the skirt, growing with the flow
// The disc is overdamped: dh/dt = MU·(F_p − F_s), stopped at 0 and at full lift H_MAX.
// The equilibrium p_eq(h) = F_s / (0.1·A_eff) rises (simmer), falls (the pop: unstable), then
// rises again (relieving). So the valve opens at the top of the first rise and recloses at the
// bottom of the dip: the difference is the blowdown, the loop in Diagram 1.
//
// Flow: choked air through the smaller of the curtain π·d_seat·h and the nozzle throat A0.
// The receiver is isothermal: dp/dt = R·T/V · (ṁ_compressor − ṁ_valve).

export const P_ATM = 1.01325; // bar absolute

// Nozzle and disc (mm)
export const D0 = 23; // nozzle throat, the flow diameter d0
export const D_SEAT = 24; // seat contact diameter
export const D_HUD = 31; // huddling chamber, inside the holder's skirt
export const A0 = (Math.PI / 4) * D0 ** 2;
export const A_SEAT = (Math.PI / 4) * D_SEAT ** 2;
export const A_HUD = (Math.PI / 4) * D_HUD ** 2;
export const H_MAX = 6; // full lift: the holder strikes the guide (≥ d0/4 = 5.75, full-lift valve)
export const H_A = 0.45; // huddling chamber starts to fill
export const H_B = 1.1; // and is fully effective
export const ETA_H = 0.21; // mean huddling-chamber pressure over the annulus, share of p
export const C_H = ETA_H * (A_HUD / A_SEAT - 1);
export const C_R = 0.0215; // jet reaction, per mm of lift
export const MU = 0.9; // disc mobility, mm/(N·s): an overdamped disc

// Spring: EN 10270-2 oil-tempered wire, closed and ground ends
export const G = 78500; // N/mm²
export const WIRE = 6;
export const COIL_D = 46; // mean coil diameter
export const ACTIVE = 5;
export const K_SPRING = (G * WIRE ** 4) / (8 * COIL_D ** 3 * ACTIVE); // N/mm
export const L_SET = 110; // installed length at the nominal set pressure
export const P_SET_NOM = 10; // bar g

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
export const psi = (h) => smooth((h - H_A) / (H_B - H_A));
export const areaRatio = (h) => 1 + C_H * psi(h) + C_R * h;
export const springForce = (F0, h) => F0 + K_SPRING * h;
export const openingForce = (p, h) => 0.1 * p * A_SEAT * areaRatio(h);
export const pEq = (F0, h) => springForce(F0, h) / (0.1 * A_SEAT * areaRatio(h));

// Preload for a set pressure: the set pressure is the top of the simmer rise, at h = H_A.
export const preloadFor = (pSet) => pSet * 0.1 * A_SEAT * areaRatio(H_A) - K_SPRING * H_A;
export const F0_NOM = preloadFor(P_SET_NOM);
export const FREE_LENGTH = L_SET + F0_NOM / K_SPRING;
export const springLength = (F0, h) => FREE_LENGTH - F0 / K_SPRING - h;

// The valve's characteristic pressures for a preload (bar g)
export function characteristic(F0) {
  let open = 0;
  let close = Infinity;
  let hClose = 0;
  for (let h = 0; h <= H_B; h += 0.005) open = Math.max(open, pEq(F0, h));
  for (let h = H_A; h <= H_MAX; h += 0.005) {
    const p = pEq(F0, h);
    if (p < close) {
      close = p;
      hClose = h;
    }
  }
  return { set: open, start: pEq(F0, 0), reseat: close, hReseat: hClose, full: pEq(F0, H_MAX), blowdown: (open - close) / open };
}

// Flow (air, choked: p0 > 1.89 bar abs)
export const GAMMA = 1.4;
export const R_AIR = 287.05;
export const T0 = 293.15;
export const KD = 0.77; // certified derated coefficient of discharge
const CHOKE = Math.sqrt(GAMMA / (R_AIR * T0)) * (2 / (GAMMA + 1)) ** ((GAMMA + 1) / (2 * (GAMMA - 1)));
export const flowArea = (h) => Math.min(Math.PI * D_SEAT * Math.max(0, h), A0); // mm²
export const massFlow = (p, h) => KD * flowArea(h) * 1e-6 * (p + P_ATM) * 1e5 * CHOKE; // kg/s
export const H_THROAT = A0 / (Math.PI * D_SEAT); // the lift where the curtain equals the throat

// The receiver and its compressor
export const V_RX = 0.5; // m³, a 500 L receiver
export const M_COMP = 0.1; // kg/s, about 300 m³/h free air
export const dpdt = (mIn, mOut) => ((R_AIR * T0) / V_RX) * (mIn - mOut) * 1e-5; // bar/s
export const P_START = 9.3; // the tour starts here, below set

export function valve(p = P_START, F0 = F0_NOM) {
  return { p, h: 0, v: 0, F0, m: 0, comp: true, t: 0 };
}

// Advance by dt seconds. If hold is a number the vessel pressure is held there (a hand on it).
export function advance(s, dt, { hold = null, mIn = M_COMP } = {}) {
  const f = openingForce(s.p, s.h) - springForce(s.F0, s.h);
  let h = s.h + MU * f * dt;
  h = Math.min(H_MAX, Math.max(0, h));
  s.v = (h - s.h) / dt;
  s.h = h;
  s.m = massFlow(s.p, h);
  if (hold == null) s.p = Math.max(0, s.p + dpdt(s.comp ? mIn : 0, s.m) * dt);
  else s.p = hold;
  s.t += dt;
  return s;
}

export function state(s) {
  if (s.h < 0.004) return "SHUT";
  if (s.v > 4) return "POPPING";
  if (s.v < -4) return "RESEATING";
  if (s.h < H_A + 0.02) return "SIMMER";
  return "RELIEVING";
}
