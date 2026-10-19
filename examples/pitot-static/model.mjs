// Truth first: the pitot-static system of a generic four-seat high-wing light aircraft (the parent,
// BP-022 light-aircraft). A heated pitot head under the left wing senses total pressure; two flush
// static ports on the tail cone, cross-connected, sense static pressure; lines with drain traps carry
// both to the panel, where an alternate static valve can switch the static side to the cabin. Three
// instruments read them: the airspeed indicator (pitot minus static), the altimeter (static against a
// sealed aneroid) and the vertical speed indicator (static against its own case, which leaks to static
// through a calibrated capillary). Pure, no DOM: the sheet, the readouts, the diagrams and the 3D view
// read this file. The only import is the parent's model, so the two pages share one aeroplane.
//
// Frames (mm), the parent's: FS aft of the firewall's front face, WL up from the ground at rest,
// BL from the centre line, + to starboard; WS the wing station along the span.
// Physics (SI inside: m, Pa, kg, s; feet, knots, hPa and ft/min at the edges):
//   ISA troposphere, shifted to the day's sea-level pressure QNH: T = T0 − L·h, p = QNH·(T/T0)^(g/RL).
//   Pitot: total pressure p + q_c, q_c = p[(1 + 0.2M²)^3.5 − 1] (subsonic, isentropic); q = ½ρV².
//   ASI: calibrated at sea level ISA, CAS = a0·√(5[(q_c/p0 + 1)^(2/7) − 1]); TAS = CAS·√(ρ0/ρ) nearly.
//   Altimeter: the ISA pressure–height law inverted against the Kollsman setting.
//   Pneumatics: each volume (pitot side, static side, VSI case) fills and empties through its holes:
//   sharp-edged orifices (ṁ = Cd·A·√(2ρΔp)) at the ram hole, the drain hole, the ports and the alternate
//   valve, and a laminar capillary (Hagen–Poiseuille) into the VSI case, so the case lags static as a
//   first-order RC system, τ = 8μLV/(πr⁴p). Isothermal volumes: dp/dt = RT·ṁ/V.

import * as A from "../light-aircraft/model.mjs";

// ---------------------------------------------------------------- constants (the parent's where it has them)
export const G = A.G; // 9.80665
export const KT = A.KT; // m/s per knot
export const RHO0 = A.RHO; // 1.225 kg/m³, ISA sea level
export const P0 = 101325; // Pa
export const T0 = 288.15; // K
export const LAPSE = 0.0065; // K/m
export const R_AIR = 287.05287; // J/(kg·K)
export const GAMMA = 1.4;
export const EXP = G / (R_AIR * LAPSE); // 5.2559
export const A0 = Math.sqrt(GAMMA * R_AIR * T0); // 340.3 m/s
export const FT = 0.3048;
export const FPM = FT / 60; // m/s per ft/min
export const HPA = 100;
export const MU0 = 1.7894e-5; // Pa·s at T0 (Sutherland)
export const mu = (T) => (1.458e-6 * T ** 1.5) / (T + 110.4);
// sanity: the parent's ρ0 is the ISA one
export const RHO_CHECK = P0 / (R_AIR * T0); // 1.2250

// ---------------------------------------------------------------- the atmosphere
// h in metres above mean sea level; qnh in Pa (the day's sea-level pressure; ISA temperatures)
export function isa(h, qnh = P0) {
  const T = T0 - LAPSE * h;
  const p = qnh * (T / T0) ** EXP;
  const rho = p / (R_AIR * T);
  return { T, p, rho, a: Math.sqrt(GAMMA * R_AIR * T), mu: mu(T), sigma: rho / RHO0 };
}
// the height (m) at which the ISA puts pressure p above the reference pressure ref
export const heightOf = (p, ref = P0) => (T0 / LAPSE) * (1 - (p / ref) ** (1 / EXP));
export const ft = (m) => m / FT;

// ---------------------------------------------------------------- airspeeds
export const dynamic = (vTas, rho) => 0.5 * rho * vTas * vTas; // q, Pa
export function impact(vTas, h, qnh = P0) {
  const s = isa(h, qnh);
  const M = vTas / s.a;
  return s.p * ((1 + 0.2 * M * M) ** 3.5 - 1); // q_c, Pa
}
export const qcOfCas = (vc) => P0 * ((1 + 0.2 * (vc / A0) ** 2) ** 3.5 - 1);
export const casOfQc = (qc) => (qc <= 0 ? 0 : A0 * Math.sqrt(5 * ((qc / P0 + 1) ** (2 / 7) - 1)));
export function tasOfCas(vc, h, qnh = P0) {
  const s = isa(h, qnh);
  const qc = qcOfCas(vc);
  const M = Math.sqrt(5 * ((qc / s.p + 1) ** (2 / 7) - 1));
  return M * s.a;
}
// knots in, knots out
export const tasKt = (iasKt, hFt, qnh = P0) => tasOfCas(iasKt * KT, hFt * FT, qnh) / KT;

// The parent's airspeeds (knots CAS), its dial and its arcs.
export const V_CRUISE = A.TOUR[0][1]; // 110 kt, the parent tour's cruise
export const V_SPEEDS = A.V_SPEEDS; // vfe 85, vno 129, vne 163
export const VS0 = A.stallSpeed(30); // flaps 30, MTOW
export const VS1 = A.stallSpeed(0); // clean
export const VY = 74; // kt, best rate of climb, class figure
export const CLIMB_FPM = 700; // at VY, sea level, MTOW (class figure)

// ---------------------------------------------------------------- the airframe (the parent's frames)
// The pitot head: the parent's (light-aircraft parts.mjs PITOT and its 3D view): a Ø24 tube under the
// port wing at WS 3800 from FS 560 back to FS 1100, its mast at FS 1005–1035 up to the wing.
export const PITOT = { ws: 3800, fs0: 560, fs1: 1060, r: 12, aft: 1100, mast: [1005, 1035] };
const AF = A.naca2412(48);
// the wing's lower surface WL at (FS, WS), from the parent's section placement
export function wingLowAt(fs, ws) {
  const c = A.chordAt(ws);
  const le = A.leAt(ws);
  const wl = A.WL_LE + A.dihedralRise(ws);
  let best = null;
  for (let i = 1; i < AF.lower.length; i++) {
    const a = A.toWing(AF.lower[i - 1], c, le, wl);
    const b = A.toWing(AF.lower[i], c, le, wl);
    if ((a[0] - fs) * (b[0] - fs) <= 0 && a[0] !== b[0]) best = a[1] + ((b[1] - a[1]) * (fs - a[0])) / (b[0] - a[0]);
  }
  return best ?? wl;
}
export const PITOT_WL = wingLowAt(1000, PITOT.ws) - 90; // the tube's axis, the parent's 3D placement
export const MAST_TOP_WL = wingLowAt((PITOT.mast[0] + PITOT.mast[1]) / 2, PITOT.ws);

// The static ports: one each side of the tail cone at FS 3000, on its horizontal centre line.
export const PORT_FS = 3000;
export const PORT_R = A.coneR(PORT_FS); // the cone's radius there
export const PORT_WL = A.TAILCONE.axis;
// The panel: the parent's six-pack (light-aircraft scene3d.mjs SIX): BL, WL of each instrument's axis
export const PANEL = { fs: 300, t: 32, wl0: 1250, wl1: 1758 }; // the panel plate, FS 300–332
export const INST = { asi: [-470, 1652], alt: [-270, 1652], vsi: [-270, 1553] };

// The lines as routes (FS, BL, WL): pitot from the mast top inboard in the wing, down the left windscreen
// post to its trap below the panel and up to the ASI; static from each port to the tee at the cone's
// bottom, forward along the left side wall to its trap, up to the alternate static valve and the panel.
export const TRAP_P = [250, -540, 1330]; // the pitot line's low point, below the panel
export const TRAP_S = [420, -520, 790]; // the static line's low point, on the side wall
export const ALT_VALVE = [262, -400, 1400]; // under the panel's lower edge, knob through the panel
export const TEE = [PORT_FS, 0, A.TAILCONE.axis - PORT_R + 34];
export const ROUTE = {
  pitot: [
    [1020, -PITOT.ws, MAST_TOP_WL], [1020, -PITOT.ws, MAST_TOP_WL + 40], [1060, -3300, MAST_TOP_WL + 25],
    [1060, -650, wingLowAt(1060, 650) + 40], [260, -575, A.CABIN.roof - 60], [180, -560, 1800], [TRAP_P[0], TRAP_P[1], TRAP_P[2] + 40],
    TRAP_P, [TRAP_P[0], TRAP_P[1], TRAP_P[2] + 40], [150, -480, 1470], [150, INST.asi[0], INST.asi[1]],
  ],
  portL: [[PORT_FS, -PORT_R + 20, PORT_WL], [PORT_FS, -PORT_R * 0.75, PORT_WL - PORT_R * 0.55], [PORT_FS, -60, TEE[2] + 6], [TEE[0], TEE[1] - 20, TEE[2]]],
  portR: [[PORT_FS, PORT_R - 20, PORT_WL], [PORT_FS, PORT_R * 0.75, PORT_WL - PORT_R * 0.55], [PORT_FS, 60, TEE[2] + 6], [TEE[0], TEE[1] + 20, TEE[2]]],
  static: [TEE, [2450, -300, 800], [1500, -540, 800], [TRAP_S[0], TRAP_S[1], TRAP_S[2] + 30], TRAP_S, [TRAP_S[0], TRAP_S[1], TRAP_S[2] + 30], [300, -480, 1100], [ALT_VALVE[0], ALT_VALVE[1], ALT_VALVE[2] - 30], ALT_VALVE],
  manifold: [ALT_VALVE, [200, -380, 1470], [150, -300, 1500], [150, INST.alt[0], INST.alt[1]]],
  vsiTee: [[150, -300, 1500], [150, INST.vsi[0], INST.vsi[1]]],
  asiStatic: [[200, -380, 1470], [150, -440, 1610], [150, INST.asi[0] + 20, INST.asi[1] - 20]],
};
const len3 = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1], p[2] - pts[i][2]), 0);
export const LEN = Object.fromEntries(Object.entries(ROUTE).map(([k, v]) => [k, len3(v)])); // mm

// ---------------------------------------------------------------- the lines and the volumes
export const LINE = { od: 6.35, wall: 0.89 }; // 1/4 in 5052-O tube; its bore
export const LINE_ID = LINE.od - 2 * LINE.wall; // 4.57 mm
const tubeV = (L) => (Math.PI * (LINE_ID / 2) ** 2 * L) / 1e9; // mm → m³
// The pitot head's insides (the sheet's section): chamber Ø8×31, pressure tube Ø2 bore × 470
export const HEAD = { len: 540, ram: 3.2, drain: 0.8, chamber: [3, 34, 4], tube: 1.0 };
export const V_HEAD = (Math.PI * (HEAD.chamber[2] ** 2 * (HEAD.chamber[1] - HEAD.chamber[0]) + HEAD.tube ** 2 * 470 + 3 ** 2 * 90)) / 1e9;
export const V_TRAP = 14e-6; // each drain trap's bowl, 14 cm³
export const V_CAPSULE = 6e-6; // the ASI's diaphragm capsule, inside
export const V_PITOT = V_HEAD + tubeV(LEN.pitot) + V_TRAP + V_CAPSULE;
export const V_CASE = { asi: 310e-6, alt: 330e-6, vsi: 300e-6 }; // free air inside each case
export const V_STATIC = tubeV(LEN.portL + LEN.portR + LEN.static + LEN.manifold + LEN.vsiTee + LEN.asiStatic) + V_TRAP + V_CASE.asi + V_CASE.alt + 5e-6;

// The holes: sharp-edged orifices, discharge coefficient CD.
export const CD = 0.62;
export const PORT_HOLE = 2.4; // mm, each flush port's hole
export const ALT_HOLE = 3.2; // the alternate valve's cabin opening
const area = (dmm) => (Math.PI * (dmm / 2000) ** 2);
export const AREA = { ram: area(HEAD.ram), drain: area(HEAD.drain), port: area(PORT_HOLE), alt: area(ALT_HOLE) };
// mass flow through an orifice per pascal (secant, so a volume relaxes stably at any step)
const orificeG = (A_, rho, dp) => CD * A_ * Math.sqrt((2 * rho) / (Math.abs(dp) + 2));

// The VSI's calibrated leak: a capillary Ø0.25 × 10 mm between the static side and the case.
export const CAP = { d: 0.25, len: 10 }; // mm
const CAP_R = CAP.d / 2000;
const CAP_L = CAP.len / 1000;
// laminar mass flow per pascal: ρ·πr⁴/(8μL)
const capG = (rho, muT) => (rho * Math.PI * CAP_R ** 4) / (8 * muT * CAP_L);
// the case's time constant τ = 8μLV/(πr⁴p) (isothermal): grows as 1/p with height
export const tauVsi = (p, T) => (8 * mu(T) * CAP_L * V_CASE.vsi) / (Math.PI * CAP_R ** 4 * p);
export const TAU0 = tauVsi(P0, T0); // s, at sea level
// The VSI is calibrated at sea level: Δp across the leak = ρ·g·τ·w in a steady climb w, and ρτ =
// 8μLV/(πr⁴RT) does not depend on p, so the reading holds with height; only μ/T drifts (cold air
// reads a few per cent high without the case's bimetal compensator, which is left out here).
export const VSI_K = 1 / (RHO0 * G * TAU0); // (m/s) per Pa

// The cabin, the alternate source: lower than ambient by a share of q (the airflow round the fuselage
// and the cabin vents draw it down); class handbooks give about +4 kt and +40 ft on the alternate.
export const CP_CABIN = -0.08;
export const RHO_WATER = 998;

// ---------------------------------------------------------------- instruments: the dials (the parent's ASI)
// The airspeed dial is the parent's VIEW C (light-aircraft parts.mjs ASI): 30 kt near twelve o'clock
// clockwise to 170 kt at 330°, r 40; below 30 kt the pointer leaves its stop at 5°, Δp being tiny there.
export const ASI = { r: 40, v0: 30, v1: 170, a0: 15, a1: 330, stop: 5 };
export function asiDeg(v) {
  // clockwise from twelve o'clock
  if (v >= ASI.v0) return ASI.a0 + ((Math.min(ASI.v1 + 8, v) - ASI.v0) / (ASI.v1 - ASI.v0)) * (ASI.a1 - ASI.a0);
  return ASI.stop + (ASI.a0 - ASI.stop) * (Math.max(0, v) / ASI.v0) ** 2;
}
// The VSI's dial: zero at nine o'clock, up clockwise; ±1000 ft/min over ±90°, compressed to ±2000 at ±170°.
export function vsiDeg(fpm) {
  const a = Math.abs(fpm);
  const d = a <= 1000 ? (a / 1000) * 90 : 90 + (Math.min(2100, a) - 1000) * 0.08;
  return Math.sign(fpm) * d;
}
// The altimeter: three pointers, 1000 ft, 10 000 ft and 100 000 ft a turn; the Kollsman window in hPa.
export const BARO = { min: 950, max: 1050 };

// ---------------------------------------------------------------- mechanisms (instrument frame, mm)
// Each instrument is a 3⅛ in case, axis x from the back face (0) to the panel (108), y up, z to the
// pilot's right. The movement: the capsule's centre stud pushes the rocking shaft's crank near dead
// centre (so the shaft turns about as the square root of the stud's travel: airspeed from Δp), a second
// crank on the same shaft lifts the sector's tail, the sector turns the pinion on the pointer's shaft
// and a hairspring on that shaft takes up the backlash.
export const MOV = {
  asi: { cap: 1.6, pMax: qcOfCas(175 * KT), N: 7.0, rt: 10, l2: 12, l1: 2.5 }, // capsule travel at pMax
  alt: { cap: 3.0, N: 12 * 10, rt: 9, l2: 12, l1: 3, hMax: 20000 }, // two stages: 12:1 then 10:1
  vsi: { cap: 0.6, pMax: 700, N: 7.0, rt: 10, l2: 12, l1: 2.5 },
};
// the sector's turn (deg) for a pointer turn (deg); the rocking shaft's for a sector turn
export const sectorFor = (m, pointerDeg) => pointerDeg / m.N;
export const rockFor = (m, sectorDeg) => (Math.asin(Math.max(-1, Math.min(1, (m.rt * Math.sin((sectorDeg * Math.PI) / 180)) / m.l2))) * 180) / Math.PI;

// ---------------------------------------------------------------- the system's state
export function system(h = 2000 * FT, ias = V_CRUISE) {
  const air = isa(h);
  const s = {
    t: 0, // tour time (display seconds)
    ft: 0, // flight time
    h, // true altitude, m
    w: 0, // true vertical speed, m/s
    ias, // the aeroplane's real CAS, kt
    qnh: P0,
    set: P0, // the Kollsman setting, Pa
    pPit: air.p + impact(tasOfCas(ias * KT, h), h),
    pSt: air.p,
    pVc: air.p,
    ram: false, // the ram hole blocked (ice)
    drain: false, // the drain hole blocked
    ports: false, // both static ports blocked
    alt: false, // the alternate static valve open
    heat: true, // pitot heat on
    melt: 0, // ice melting under the heat, s
    valve: 0, // the alternate valve's spool, 0 normal … 1 alternate
  };
  return s;
}

// What the aeroplane really does and what each hole sees.
export function truth(s) {
  const air = isa(s.h, s.qnh);
  const vt = tasOfCas(s.ias * KT, s.h, s.qnh);
  const qc = impact(vt, s.h, s.qnh);
  const q = dynamic(vt, air.rho);
  return { air, vt, tas: vt / KT, qc, q, pTot: air.p + qc, pCab: air.p + CP_CABIN * q };
}

// One step of flight time dt: the volumes relax towards what their open holes see.
export function stepPneumatics(s, dt) {
  const tr = truth(s);
  const RT = R_AIR * tr.air.T;
  const rho = tr.air.rho;
  // pitot side: the ram hole to total pressure, the drain hole to the local static under the head
  {
    let g = 0;
    let gp = 0;
    if (!s.ram) {
      const k = orificeG(AREA.ram, rho, tr.pTot - s.pPit);
      g += k;
      gp += k * tr.pTot;
    }
    if (!s.drain) {
      const k = orificeG(AREA.drain, rho, tr.air.p - s.pPit);
      g += k;
      gp += k * tr.air.p;
    }
    if (g > 0) {
      const eq = gp / g;
      s.pPit = eq + (s.pPit - eq) * Math.exp((-dt * RT * g) / V_PITOT);
    }
  }
  // static side: the two ports (cross-connected, so they average) or the cabin through the valve
  {
    let g = 0;
    let gp = 0;
    const open = 1 - s.valve; // the spool: normal shuts the cabin, alternate shuts the ports
    if (!s.ports && open > 0.02) {
      const k = 2 * orificeG(AREA.port, rho, tr.air.p - s.pSt) * Math.min(1, open * 1.5);
      g += k;
      gp += k * tr.air.p;
    }
    if (s.valve > 0.02) {
      const k = orificeG(AREA.alt, rho, tr.pCab - s.pSt) * Math.min(1, s.valve * 1.5);
      g += k;
      gp += k * tr.pCab;
    }
    // the VSI case's leak also takes or gives a little air
    const kc = capG(rho, tr.air.mu);
    g += kc;
    gp += kc * s.pVc;
    const eq = gp / g;
    s.pSt = eq + (s.pSt - eq) * Math.exp((-dt * RT * g) / V_STATIC);
  }
  // the VSI case through its capillary
  {
    const kc = capG(rho, tr.air.mu);
    s.pVc = s.pSt + (s.pVc - s.pSt) * Math.exp((-dt * RT * kc) / V_CASE.vsi);
  }
  return tr;
}

// What the instruments show.
export function indications(s) {
  const dpAsi = s.pPit - s.pSt;
  const ias = casOfQc(Math.max(0, dpAsi)) / KT;
  const hInd = ft(heightOf(s.pSt, s.set));
  const dpVsi = s.pVc - s.pSt;
  const vsi = (dpVsi * VSI_K) / FPM;
  return { dpAsi, ias, hInd, hPress: ft(heightOf(s.pSt, P0)), dpVsi, vsi };
}

// the mechanisms' angles (deg) from the indications
export function pointers(ind, setPa) {
  const asi = asiDeg(ind.ias);
  const h = ind.hInd;
  const alt = { h1000: (h / 1000) * 360, h10k: (h / 10000) * 360, h100k: (h / 100000) * 360 };
  // the altimeter's mechanism turns with the pressure altitude; its cradle turns with the setting
  const pa = ind.hPress;
  const cradle = ((((h - pa) / 1000) * 360) / 11) || 0;
  const vsi = vsiDeg(ind.vsi);
  return { asi, alt, pa, cradle, set: setPa / HPA, vsi };
}

// ---------------------------------------------------------------- flying: an autopilot of sorts
// Height target and climb/descent rates; the airspeed is held. Flight time dt.
export function fly(s, dt, { iasCmd, hCmd, up = CLIMB_FPM, down = 600, vsCmd = null }) {
  s.ias += (iasCmd - s.ias) * (1 - Math.exp(-dt / 3.5));
  let want = vsCmd != null ? vsCmd * FPM : Math.max(-down * FPM, Math.min(up * FPM, (hCmd - s.h) / 25));
  s.w += (want - s.w) * (1 - Math.exp(-dt / 2.5));
  s.h += s.w * dt;
  s.ft += dt;
}

// Ice on the ram hole and drain melts after a few seconds of heat.
function heatStep(s, dt) {
  if (s.heat && (s.ram || s.drain)) {
    s.melt += dt;
    if (s.melt > 3) {
      s.ram = false;
      s.drain = false;
      s.melt = 0;
    }
  } else s.melt = 0;
}

// The valve's spool moves in a quarter of a second.
function valveStep(s, dt) {
  const want = s.alt ? 1 : 0;
  const k = dt / 0.25;
  s.valve = want > s.valve ? Math.min(want, s.valve + k) : Math.max(want, s.valve - k);
}

// Advance flight time dt with the controls c.
export function stepSystem(s, dt, c) {
  fly(s, dt, c);
  heatStep(s, dt);
  valveStep(s, dt);
  return stepPneumatics(s, dt);
}

// ---------------------------------------------------------------- the tour
// Climb, cruise, then the four failures a student meets, then descend home and go round again.
// Times are the tour's (display) seconds; WARP is how many seconds of flight each one plays.
export const H_LOW = 2000;
export const H_HIGH = 6500;
export const T = {
  climb: 4, // pitch up to VY, 700 ft/min
  level: 20, // level off at 6500 ft, accelerate to cruise
  ice: 26.5, // ram hole iced, drain open: the ASI unwinds to zero
  heat: 30.5, // pitot heat on: the ice melts
  both: 34.5, // ram and drain both iced: the ASI turns altimeter
  climb2: 36, // a cruise climb of 400 ft
  clear: 43, // heat on, ice gone
  ports: 46.5, // both static ports iced over, then a descent
  alt: 53, // alternate static open
  home: 66, // 2000 ft: ports clear, alternate shut
};
export const TOUR = 72;
const sm = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));
const ramp = (t, a, b) => (t - a) / (b - a);
// a warp of `top` between a and b, eased up over `up` seconds and down over `dn`
const hump = (t, a, b, top, up = 2.5, dn = 2.5) => (top - 1) * sm(ramp(t, a, a + up)) * (1 - sm(ramp(t, b - dn, b)));
export function warpAt(t) {
  return 1 + hump(t, T.climb + 3.5, T.level - 0.5, 60, 3, 3) + hump(t, T.level + 1, T.ice - 0.5, 3, 1, 1) + hump(t, T.climb2 + 0.5, T.clear, 5, 1.5, 2) + hump(t, T.ports + 1.5, T.alt - 0.5, 4, 1.5, 1.5) + hump(t, T.alt + 2, T.home - 1.5, 70, 3, 3) + hump(t, T.home + 1.5, TOUR, 6, 1, 1.5);
}
export function tourCtl(t) {
  const c = { iasCmd: V_CRUISE, hCmd: H_LOW * FT, up: CLIMB_FPM, down: 700 };
  if (t >= T.climb && t < TOUR - 0.01) {
    c.iasCmd = VY;
    c.hCmd = H_HIGH * FT;
  }
  if (t >= T.level) c.iasCmd = V_CRUISE;
  if (t >= T.climb2) {
    c.hCmd = (H_HIGH + 400) * FT;
    c.up = 500;
  }
  if (t >= T.ports + 1.5) c.hCmd = H_LOW * FT;
  return c;
}
export function tourFlags(t) {
  return {
    ice: t >= T.ice && t < T.both ? "ram" : t >= T.both ? "both" : "", // the ice arrives at each edge
    heat: !((t >= T.ice && t < T.heat) || (t >= T.both && t < T.clear)),
    ports: t >= T.ports && t < T.home,
    alt: t >= T.alt && t < T.home,
  };
}
export function tourStart() {
  const s = system(H_LOW * FT, V_CRUISE);
  s.ice0 = "";
  return s;
}
// one tour step of display time dt: the warp sets the flight time it plays
export function tourStep(s, dt) {
  const t = s.t + dt;
  const w = warpAt(t);
  const f = tourFlags(t);
  // the schedule brings the ice; the heat melts it (the model's own timing, not the schedule's)
  if (f.ice !== s.ice0) {
    if (f.ice) s.ram = true;
    if (f.ice === "both") s.drain = true;
    s.ice0 = f.ice;
  }
  s.heat = f.heat;
  s.ports = f.ports;
  s.alt = f.alt;
  const tr = stepSystem(s, dt * w, tourCtl(t));
  s.t = t;
  s.warp = w;
  return tr;
}
export function phase(s, t = s.t) {
  if (s.alt) return "ALTERNATE STATIC";
  if (s.ports) return "PORTS BLOCKED";
  if (s.ram && s.drain) return "RAM + DRAIN BLOCKED";
  if (s.ram) return "RAM BLOCKED";
  if (s.drain) return "DRAIN BLOCKED";
  if (s.w > 1.2) return "CLIMB";
  if (s.w < -1.2) return "DESCENT";
  return "CRUISE";
}
// the whole tour, sampled: [t, ft, hTrue, hInd, iasTrue, iasInd, vsTrue, vsInd]
export function tourTrace(dt = 1 / 240, every = 12) {
  const s = tourStart();
  const out = [];
  let i = 0;
  while (s.t < TOUR) {
    tourStep(s, dt);
    if (i++ % every === 0) {
      const ind = indications(s);
      out.push([s.t, s.ft, ft(s.h), ind.hInd, s.ias, ind.ias, s.w / FPM, ind.vsi]);
    }
  }
  return out;
}
