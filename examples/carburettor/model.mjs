// Truth first: a 26 mm fixed-jet float-bowl carburettor on a 250 cm³ four-stroke single.
// Pure, no imports, no DOM. The geometry, the dimensions, the readout and both diagrams read this.
//
// Air: the engine is a pump. At throttle angle θ it turns at a road-load speed N(θ) and swallows
// η·V·N/2 of manifold air; the butterfly is a compressible orifice in series with it, and the
// manifold pressure is whatever makes the two flows equal.
// Bernoulli: the throat of the venturi runs faster than the bore, so its static pressure falls by
// ½ρv². The float bowl is vented to the atmosphere, so that depression is what lifts the fuel.
// Fuel: each circuit is a small network solved for the pressure in its well: a fuel jet (fuel must
// first rise from the bowl level to the well), an air bleed jet, and an outlet into low pressure.
// The main circuit discharges at the throat; the pilot circuit downstream of the plate past the
// mixture screw, and through the progression port once the plate's edge has swept past it.
// Float: the needle opens in proportion to how far the level has fallen; the bowl level integrates
// inflow minus what the jets draw. A lower level means more lift, so a leaner mixture.

export const P0 = 101325; // Pa, ambient
export const T0 = 293; // K
export const R_AIR = 287;
export const RHO_A = P0 / (R_AIR * T0); // kg/m³, about 1.20
export const RHO_F = 740; // kg/m³, petrol
export const G = 9.81;
export const STOICH = 14.7;

// ---------------------------------------------------------------- geometry the physics reads (mm)
export const BORE = 26;
export const THROAT = 20;
export const THROAT_U = -2; // the nozzle stands in the middle of the throat
export const NOZZLE_TIP = -8; // v of the nozzle's spill edge (the throat wall is at -10)
export const SPINDLE_U = 28; // throttle spindle centre, on the bore axis
export const CHOKE_U = -44; // choke spindle centre
export const PHI_SEAL = 6; // plate angle from the bore's cross-plane at which it seals, deg
export const PHI_IDLE = 9.4; // the throttle stop holds it here
export const PHI_WOT = 90;
export const PLATE_R = BORE / 2 / Math.cos((PHI_SEAL * Math.PI) / 180); // the plate is cut oval to seal at 6°
export const PROG_U = 25.4; // first progression port centre, in the bore floor, just ahead of the closed edge
export const PROG_D = 0.65;
export const PROGS = [[PROG_U, PROG_D], [24.35, 0.9]]; // [centre u, Ø]: two ports the edge sweeps in turn
export const IDLE_U = 31.5; // idle port, over the mixture screw
export const BOWL_FACE = -26; // the body's underside, the bowl's top
export const LEVEL_SET = -32; // float level with the needle just seated
export const BLEED_V = -26; // top row of emulsion-tube bleed holes: the main well
export const PILOT_V = -18; // the pilot passage, where pilot air meets pilot fuel
export const SEAT_D = 1.5; // needle seat orifice
export const NEEDLE_LIFT_MAX = 1.0;
export const PIVOT = [-40, -29]; // float hinge pin
export const NEEDLE_U = -34; // float needle axis
export const FLOAT_C = -19.5; // u of the float's centre of buoyancy
export const LEVER = (NEEDLE_U - PIVOT[0]) / (FLOAT_C - PIVOT[0]); // needle travel per mm of float travel
export const BOWL_AREA = 60 * 44; // mm², the bowl's free surface (60 long × 44 deep)
export const TANK_HEAD = 400; // mm of fuel above the seat (gravity tank)

// Jets: diameters in mm, and discharge coefficients.
export const JETS = {
  main: 1.35, // #135
  mainAir: 0.7,
  nozzle: 2.6,
  pilot: 0.35, // #35
  pilotAir: 1.6,
  idlePort: 0.8,
};
export const CD = { jet: 0.72, air: 0.75, nozzle: 0.8, throttle: 0.82, venturi: 0.97, choke: 0.75, seat: 0.7 };
export const SCREW_PITCH = 0.5; // M5×0.5 mixture screw
export const SCREW_TAPER = 10; // half-angle of its point, deg
export const SCREW_TURNS = 1.0; // factory setting, turns out from lightly seated

// Engine
export const DISP = 250e-6; // m³
export const ETA_V = 0.85;
export const N_IDLE = 1400;
export const N_MAX = 9000;

const area = (dmm) => (Math.PI / 4) * (dmm * 1e-3) ** 2; // m²
const rad = (deg) => (deg * Math.PI) / 180;

// ---------------------------------------------------------------- throttle and choke
// Throttle opening from the stop: θ = 0 at idle, 80.6° wide open. phi is from the cross-plane.
export const THETA_MAX = PHI_WOT - PHI_IDLE;
export const phiOf = (theta) => PHI_IDLE + theta;
// Open area of a butterfly in a round bore: π/4·D²·(1 − cos φ / cos φs), less the spindle's shadow.
export function throttleArea(theta) {
  const phi = rad(phiOf(theta));
  const a = (Math.PI / 4) * BORE ** 2 * (1 - Math.cos(phi) / Math.cos(rad(PHI_SEAL)));
  const full = (Math.PI / 4) * BORE ** 2;
  const spindle = 5 * BORE * (a / full); // the Ø5 spindle shades the gap in proportion as it opens
  return Math.max(0.2, a - spindle) * 1e-6;
}
// The choke: c = 0 open (edge-on), 1 shut (10° off the cross-plane, air passes its relief hole).
export const CHOKE_SHUT = 10;
export const chokePhi = (c) => 90 - (90 - CHOKE_SHUT) * c;
export const CHOKE_HOLE = 6.5; // two Ø6.5 relief holes in the plate
export function chokeArea(c) {
  const phi = rad(chokePhi(c));
  const bore = (Math.PI / 4) * BORE ** 2;
  const gap = bore * (1 - Math.cos(phi) / Math.cos(rad(CHOKE_SHUT)));
  const hole = 2 * (Math.PI / 4) * CHOKE_HOLE ** 2;
  return Math.min(gap + hole, bore - 0.8 * BORE * Math.sin(phi)) * 1e-6; // never more than the bore less the plate's edge
}

// The plate sits off-centre on its spindle against a light spring, so past CHOKE_RELIEF the air
// blows it partly open: the drop across it levels off instead of growing with the flow squared.
export const CHOKE_RELIEF = 400; // Pa
function chokeDrop(m, cdA) {
  // Borda–Carnot: the jet through the choke loses (v_jet − v_bore)²/2 as it spreads into the bore
  const dv = m / (RHO_A * cdA) - m / (RHO_A * (Math.PI / 4) * (BORE * 1e-3) ** 2);
  const raw = 0.5 * RHO_A * Math.max(0, dv) ** 2;
  return raw / Math.sqrt(1 + (raw / CHOKE_RELIEF) ** 2);
}

export const rpm = (theta) => N_IDLE + (N_MAX - N_IDLE) * Math.pow(Math.min(1, theta / THETA_MAX), 0.85);

// Compressible flow through an orifice from p1 to p2 (kg/s), choking below 0.528.
function orificeFlow(cdA, p1, p2) {
  const k = 1.4;
  const r = Math.max(p2 / p1, 0.5283);
  if (r >= 1) return 0;
  const psi = Math.sqrt(((2 * k) / (k - 1)) * (r ** (2 / k) - r ** ((k + 1) / k)));
  return (cdA * p1 * psi) / Math.sqrt(R_AIR * T0);
}

// Incompressible orifice flow (kg/s) for a pressure drop dp across it.
const jet = (cdA, rho, dp) => (dp > 0 ? cdA * Math.sqrt(2 * rho * dp) : 0);

// ---------------------------------------------------------------- fuel circuits
// A well fed by a fuel jet (fuel must first rise `lift` mm from the bowl level) and an air bleed
// (whose inlet sits at depression airDp), discharging through outlets [[cdA, depression]].
// Solved for the well's depression below the atmosphere.
function wellNode(fuelA, airA, outlets, lift, airDp = 0) {
  const head = RHO_F * G * lift * 1e-3;
  const flows = (dw) => {
    const mf = jet(fuelA, RHO_F, dw - head);
    const ma = jet(airA, RHO_A, dw - airDp);
    const rhoMix = mf + ma > 0 ? (mf + ma) / (mf / RHO_F + ma / RHO_A) : RHO_A;
    let out = 0;
    for (const [a, dp] of outlets) out += jet(a, rhoMix, dp - dw);
    return { mf, ma, out };
  };
  const maxDp = Math.max(0, ...outlets.map(([, dp]) => dp));
  let lo = 0;
  let hi = maxDp;
  for (let i = 0; i < 36; i++) {
    const mid = (lo + hi) / 2;
    const f = flows(mid);
    if (f.mf + f.ma > f.out) hi = mid;
    else lo = mid;
  }
  const dw = (lo + hi) / 2;
  return { dw, ...flows(dw) };
}

// The idle mixture screw: a 10° taper lifted off the Ø0.8 idle port. Turns out from lightly seated.
export const screwLift = (turns) => Math.max(0, turns) * SCREW_PITCH;
export function screwArea(turns) {
  const gap = screwLift(turns) * Math.sin(rad(SCREW_TAPER));
  return (Math.min(Math.PI * JETS.idlePort * gap, (Math.PI / 4) * JETS.idlePort ** 2) + 0.004) * 1e-6;
}

// How much of the progression port lies downstream of the plate's lower edge (0..1).
export const plateEdgeU = (theta) => SPINDLE_U - PLATE_R * Math.sin(rad(phiOf(theta)));
export function progressionOpen(theta, [u, d] = PROGS[0]) {
  const e = plateEdgeU(theta);
  const r = d / 2;
  return Math.min(1, Math.max(0, (u + r - e) / (2 * r)));
}

// ---------------------------------------------------------------- the state at one instant
// theta: throttle from the stop, deg. choke: 0..1. level: bowl level (v, mm). turns: mixture screw.
export function solve(theta, { choke = 0, level = LEVEL_SET, turns = SCREW_TURNS } = {}) {
  const N = rpm(theta);
  const aTh = CD.throttle * throttleArea(theta);
  const aChoke = CD.choke * chokeArea(choke);
  const aThroat = CD.venturi * area(THROAT);
  const aBore = area(BORE);
  let pilotAir = 0;
  let r;
  for (let pass = 0; pass < 3; pass++) {
    // manifold pressure: the throttle's flow (falling with pm) against the engine's (rising)
    const at = (pm) => {
      const mEng = (ETA_V * (pm / (R_AIR * T0)) * DISP * N) / 120;
      const mTh = Math.max(0, mEng - pilotAir);
      const dpChoke = chokeDrop(mTh, aChoke);
      return { mEng, mTh, dpChoke, cap: orificeFlow(aTh, P0 - dpChoke, pm) };
    };
    let lo = 0.1 * P0;
    let hi = P0;
    for (let i = 0; i < 36; i++) {
      const mid = (lo + hi) / 2;
      const s = at(mid);
      if (s.cap > s.mTh) lo = mid;
      else hi = mid;
    }
    const pm = (lo + hi) / 2;
    const { mEng, mTh, dpChoke } = at(pm);
    const vThroat = mTh / (RHO_A * aThroat);
    const vBore = mTh / (RHO_A * aBore);
    const dpVenturi = 0.5 * RHO_A * vThroat ** 2; // Bernoulli, from still air
    const dpThroat = dpChoke + dpVenturi; // depression at the nozzle, below the vented bowl
    const dpUp = dpChoke + 0.5 * RHO_A * vBore ** 2; // above the plate, after the diffuser
    const dpMan = P0 - pm;
    const main = wellNode(CD.jet * area(JETS.main), CD.air * area(JETS.mainAir), [[CD.nozzle * area(JETS.nozzle), dpThroat]], BLEED_V - level);
    const prog = progressionOpen(theta);
    const pilot = wellNode(
      CD.jet * area(JETS.pilot),
      CD.air * area(JETS.pilotAir),
      [
        [CD.jet * screwArea(turns), dpMan],
        ...PROGS.map((pg) => [CD.jet * area(pg[1]), dpUp + (dpMan - dpUp) * progressionOpen(theta, pg)]),
      ],
      PILOT_V - level,
      dpUp // the pilot air jet opens into the bore just above the plate
    );
    pilotAir = pilot.ma;
    r = { theta, N, pm, mEng, mTh, dpChoke, dpVenturi, dpThroat, dpUp, dpMan, vThroat, main, pilot, prog };
  }
  r.fuel = r.main.mf + r.pilot.mf;
  r.afr = r.fuel > 1e-7 ? r.mEng / r.fuel : Infinity;
  r.afrMain = r.main.mf > 1e-7 ? r.mEng / r.main.mf : Infinity;
  r.fuelVol = r.fuel / RHO_F; // m³/s
  return r;
}

// Fuel standing in the emulsion tube when the main circuit is not flowing: the depression lifts it.
export const standingLift = (dp) => (dp / (RHO_F * G)) * 1000; // mm above the bowl level
export const mainThreshold = (level) => RHO_F * G * (BLEED_V - level) * 1e-3; // Pa

// ---------------------------------------------------------------- the float bowl
export const needleLift = (level) => Math.min(NEEDLE_LIFT_MAX, Math.max(0, (LEVEL_SET - level) * LEVER));
export function inflow(level) {
  const lift = needleLift(level);
  const curtain = Math.PI * SEAT_D * lift * Math.sin(Math.PI / 4); // a 90° cone off a sharp seat
  const a = Math.min(curtain, (Math.PI / 4) * SEAT_D ** 2) * 1e-6;
  const dp = RHO_F * G * (TANK_HEAD + (BOWL_FACE - level)) * 1e-3;
  return CD.seat * a * Math.sqrt((2 * dp) / RHO_F); // m³/s
}
// Advance the level over dt (s) with the jets drawing fuelVol (m³/s).
export function stepLevel(level, fuelVol, dt) {
  const net = inflow(level) - fuelVol;
  return level + ((net * 1e9) / BOWL_AREA) * dt; // mm
}
// The level the bowl settles to for a steady draw.
export function steadyLevel(fuelVol) {
  let lo = LEVEL_SET - 8;
  let hi = LEVEL_SET;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (inflow(mid) > fuelVol) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
