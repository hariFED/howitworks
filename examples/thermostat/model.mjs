// Truth first: a wax-pellet coolant thermostat (opening 88 °C) and the engine it regulates.
// Pure, no imports, no DOM. The geometry, the live dimension, the readout and the chart read this.
//
// Wax. The pellet holds a paraffin charge (with copper powder for conduction). Solid wax expands a
// little with temperature; melting adds about 12 % to its volume over the melting range. The wax
// cannot go anywhere but into the rubber sleeve, which squeezes the pin out: lift = ΔV / A_pin.
// The pin is held by the bridge, so it is the cup (with the valve disc) that moves, down, away from
// the seat, against the main spring.
// Hysteresis. Wax melts on the heating curve and freezes on a cooling curve 2 K lower
// (undercooling, plus seal friction), so the melt fraction only changes when it leaves the band
// between the two curves: the lift–temperature loop.
// Engine. One lumped heat capacity: C·dT/dt = Q_in − Q_rad − Q_loss. The water pump's flow splits
// between the bypass (back to the pump) and the radiator in proportion to the two paths' effective
// areas; the valve opens the radiator path and the bypass disc closes the bypass as the cup moves.

// ---------------------------------------------------------------- pellet (mm, cold)
export const PIN_D = 5;
export const PIN_A = Math.PI * (PIN_D / 2) ** 2; // mm²
export const CUP = { ro: 8.5, ri: 7, floor: -36 }; // the wax cavity, mm (cup frame, drawn cold)
export const WAX_TOP = -22; // the sleeve flange's underside
export const SLEEVE = { ro: 3.5, ri: PIN_D / 2, bottom: -32.5 }; // the rubber sock, cold
export const PIN_END = -31.5; // the pin's rounded end, cold, in the sock
const waxCavity = Math.PI * CUP.ri ** 2 * (WAX_TOP - CUP.floor);
const sleeveIn = Math.PI * SLEEVE.ro ** 2 * (WAX_TOP - SLEEVE.bottom);
export const V_WAX = waxCavity - sleeveIn; // mm³ of wax at 20 °C

export const ALPHA_S = 4.5e-4; // 1/K, volumetric, solid and liquid alike (simplified)
export const DV_MELT = 0.12; // volume gain on melting
export const MELT = [86, 101]; // °C, melting range on heating
export const HYST = 2; // K, the cooling curve sits this much lower
export const T_OPEN = 88; // °C, stamped on the flange: the pin starts to move
export const LIFT_MAX = 9.5; // mm, the cup's stop
export const BYPASS_GAP = 7; // mm, the bypass disc seats after this much lift

const smooth = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
export const meltUp = (T) => smooth((T - MELT[0]) / (MELT[1] - MELT[0]));
export const meltDown = (T) => meltUp(T + HYST);
export const waxVolume = (T, f) => V_WAX * (1 + ALPHA_S * (T - 20) + DV_MELT * f);
export const V_CRACK = waxVolume(T_OPEN, meltUp(T_OPEN)); // the sleeve is fully loaded here
export const liftOf = (T, f) => Math.min(LIFT_MAX, Math.max(0, (waxVolume(T, f) - V_CRACK) / PIN_A));
// The play between the two melting curves: f only moves when T leaves the band.
export const meltStep = (f, T) => Math.min(meltDown(T), Math.max(meltUp(T), f));

// Springs (N, mm)
export const SPRING = { preload: 55, rate: 7.5 };
export const springForce = (lift) => SPRING.preload + SPRING.rate * lift;
export const waxPressure = (lift) => springForce(lift) / PIN_A; // N/mm² = MPa

// ---------------------------------------------------------------- flow (mm², L/min)
export const SEAT_D = 34;
export const BYPASS_D = 20;
export const PUMP = 40; // L/min, water pump at cruise speed
export const JIGGLE = { hole: 1.6, pin: 1.2 }; // radii, mm
export const A_JIGGLE = Math.PI * (JIGGLE.hole ** 2 - JIGGLE.pin ** 2); // the annulus round the jiggle pin, always open
export const A_RAD = 60; // radiator, hoses and core, as one equivalent orifice
export const A_BYP = 1000; // bypass passage to the pump, as one equivalent orifice
const series = (a, b) => (a <= 0 || b <= 0 ? 0 : 1 / Math.sqrt(1 / (a * a) + 1 / (b * b)));
export const valveArea = (L) => Math.min(Math.PI * SEAT_D * L, (Math.PI * SEAT_D ** 2) / 4);
export const bypassArea = (L) => Math.PI * BYPASS_D * Math.max(0, BYPASS_GAP - L);
export function split(L) {
  const ar = series(valveArea(L) + A_JIGGLE, A_RAD);
  const ab = series(bypassArea(L), A_BYP);
  const frac = ar / (ar + ab);
  return { frac, rad: PUMP * frac, byp: PUMP * (1 - frac) };
}

// ---------------------------------------------------------------- engine (kW, kJ/K, °C)
export const T_AIR = 25;
export const C_ENGINE = 38; // kJ/K: 6.5 L of 50 % glycol plus the block's effective metal
export const RHO_C = 3.6; // kJ/(L·K), 50 % ethylene glycol
export const G_AIR = 0.9; // kW/K, radiator air side at road speed
export const G_LOSS = 0.025; // kW/K, block to under-bonnet air
export const TAU_PELLET = 10; // s, pellet lag behind the coolant
export const LOADS = { cruise: 18, hill: 34, coast: 7 }; // kW of heat into the coolant

// Radiator: the coolant stream (ṁ·c) and the air side (G) in series.
export function radiatorHeat(T, radFlow) {
  const cc = (radFlow / 60) * RHO_C;
  if (cc <= 0) return 0;
  return (T - T_AIR) / (1 / cc + 1 / G_AIR);
}

export function engine(T0 = 20) {
  return { T: T0, Tp: T0, f: meltUp(T0), lift: 0, qin: LOADS.cruise, qout: 0, rad: 0, byp: PUMP, frac: 0 };
}

// Advance the engine and thermostat by h seconds (simulated).
export function advance(s, h) {
  s.Tp += ((s.T - s.Tp) * h) / TAU_PELLET;
  s.f = meltStep(s.f, s.Tp);
  s.lift = liftOf(s.Tp, s.f);
  const fl = split(s.lift);
  s.rad = fl.rad;
  s.byp = fl.byp;
  s.frac = fl.frac;
  s.qout = radiatorHeat(s.T, s.rad);
  const qloss = G_LOSS * (s.T - T_AIR);
  s.T += ((s.qin - s.qout - qloss) * h) / C_ENGINE;
  return s;
}

// The two branches of the loop, for the chart: lift against pellet temperature.
export function branch(up, T0 = 70, T1 = 110, n = 160) {
  const out = [];
  let f = up ? meltUp(T0) : meltDown(T1);
  for (let i = 0; i <= n; i++) {
    const T = up ? T0 + ((T1 - T0) * i) / n : T1 - ((T1 - T0) * i) / n;
    f = meltStep(f, T);
    out.push([T, liftOf(T, f)]);
  }
  return out;
}
