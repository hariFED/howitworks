// Truth first: the 28 V DC electrical system of a four-seat high-wing light aircraft. A belt-driven
// alternator with a claw-pole rotor and a six-diode bridge, a switching voltage regulator, a 24 V
// lead-acid battery, a split BAT / ALT master switch, battery and starter contactors, a direct-drive
// starter whose inertia (Bendix) pinion screws into the ring gear, the main and avionics buses, a
// centre-zero ammeter in the battery lead, a low-voltage annunciator and a push-pull thermal breaker
// for every circuit. Pure, no DOM: the sheet, the diagrams, the readouts and the 3D view read this file.
//
// Shared figures are imported, not retyped, so the pages agree:
//   the aircraft (examples/light-aircraft/model.mjs, BP-022): rated rpm 2700;
//   the fuel system (examples/fuel-system/model.mjs, BP-105): idle 700 and cruise 2450 rpm;
//   the flaps (examples/wing-flaps/model.mjs, BP-107): the flap motor itself (28 V, 1.9 Ω, its load
//     current from the jackscrew's force) and its selector logic, run here as they run there.
// Two figures come from sheets whose models do not export them, and are retyped with their source:
//   the starter ring gear, 149 teeth, tip radius 142 mm, and the crank pulley groove at r ≈ 102 mm
//   (examples/propeller, parts 11 and 10/14); the shaft's inertia, 1.9 kg·m² (propeller model I_SHAFT).
//
// Electrical model (one node: the main bus; the battery contactor's load side sits on it through the
// ammeter shunt, whose 1 mΩ is neglected):
//   battery    E(SOC) − I·R(SOC) − Vp on discharge; charging, I = (V − E)/R_ch(SOC), R_ch rising as the
//              plates fill (charge acceptance); Vp a polarisation that follows I·Rp with τ 20 s;
//   alternator a three-phase EMF E = k·n·Φ(If) behind its reactance X = 2πf·L, rectified by a bridge:
//              I = (2.34·E − 2·Vd − V)/(3X/π + 2Rs) ≥ 0. E and X both grow with speed, so the current
//              tends to a limit however fast it turns: the alternator limits itself;
//   regulator  a switch in the field's ground lead, opened and closed so that the bus stays at 28.0 V:
//              its duty D sets the mean field voltage D·V, and If follows with τ = Lf/Rf;
//   loads      lamps and heaters as resistors, radios as constant power, the flap motor as BP-107's;
//   starter    a DC motor, I = (V − kω)/R, through the pinion to the ring gear (13.5:1) against the
//              engine's friction and its four compressions a revolution pair;
//   breakers   a thermal element: dθ/dt = ((I/It)² − θ)/τ, tripping at θ = 1, It = 1.25·In, so the
//              trip time is −τ·ln(1 − (It/I)²): inverse time, and I²t = τ·It² for large faults.
// The bus voltage is the one V at which the currents balance: Σ sources = Σ loads (bisection).

import * as A from "../light-aircraft/model.mjs";
import * as FS from "../fuel-system/model.mjs";
import * as WF from "../wing-flaps/model.mjs";

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const TAU = 2 * Math.PI;

// ---------------------------------------------------------------- engine and drives
export const RPM = { idle: FS.RPM.idle, cruise: FS.RPM.cruise, max: A.ENGINE.rpm, runup: 1700 };
export const PULLEY = { crank: 204, alt: 68 }; // pitch diameters, mm: the crank's from the propeller sheet
export const ALT_RATIO = PULLEY.crank / PULLEY.alt; // 3.0
export const RING = { teeth: 149, tipR: 142 }; // the propeller sheet's ring gear
export const MODULE = (2 * RING.tipR) / (RING.teeth + 2); // ≈ 1.88 mm
export const PINION = { teeth: 11, travel: 16, lead: 64 }; // the Bendix pinion screws 16 mm into mesh on a 64 mm lead
export const STARTER_RATIO = RING.teeth / PINION.teeth; // 13.5
export const CENTRES = (MODULE * (RING.teeth + PINION.teeth)) / 2; // ring to starter axis, mm
export const J_SHAFT = 1.9; // kg·m², propeller, spinner, flange and crank train (propeller sheet)
export const J_STARTER = 0.0025; // the starter's armature, pinion and drive
export const GEAR_EFF = 0.88;
// cold cranking: friction plus the compression of the cylinder coming up to TDC (two a revolution)
export const CRANK = { fric: 82, comp: 120 }; // N·m
export const crankLoad = (theta, w) => CRANK.fric + 0.05 * Math.abs(w) * 9.55 + CRANK.comp * Math.sin(2 * theta);
export const FIRE_AFTER = 4.5; // revolutions of cranking before the first cylinder fires
export const FIRE_RPM = 90;

// ---------------------------------------------------------------- the alternator (28 V, 60 A class)
export const ALT = {
  pairs: 7, // a claw-pole rotor: seven fingers on each half, fourteen poles
  slots: 42, // three phases in star, one slot a phase a pole
  k: 0.00708, // V rms a phase per rpm at full field
  L: 0.263e-3, // H a phase
  Rs: 0.05, // Ω a phase
  Vd: 0.9, // V a silicon diode on load
  Rf: 8.4, // Ω field, hot
  Lf: 0.6, // H
  Isat: 1.6, // A: the iron saturates past this
  rated: 60, // A, the nameplate
};
export const IF_FULL = 28 / ALT.Rf; // A
const phiN = (If) => Math.tanh(Math.max(0, If) / ALT.Isat) / Math.tanh(IF_FULL / ALT.Isat);
export const altEmf = (n, If) => ALT.k * n * phiN(If); // V rms a phase
export const altFreq = (n) => (ALT.pairs * n) / 60; // Hz
// DC output (A) into a bus at V, alternator at n rpm, field current If
export function altCurrent(n, If, V) {
  if (n < 1) return 0;
  const E = altEmf(n, If);
  const X = TAU * altFreq(n) * ALT.L;
  const Req = (3 * X) / Math.PI + 2 * ALT.Rs;
  return Math.max(0, (2.34 * E - 2 * ALT.Vd - V) / Req);
}
// speed at which the output starts at 28 V, full field (cut-in), and the self-limit at infinite speed
export const CUT_IN = (28 + 2 * ALT.Vd) / (2.34 * ALT.k); // alternator rpm
export const I_LIMIT = (2.34 * ALT.k) / (((3 * TAU * ALT.pairs) / 60 / Math.PI) * ALT.L);
export const TAU_F = ALT.Lf / ALT.Rf;

// ---------------------------------------------------------------- the regulator
export const REG = { set: 28.0, kp: 1.6, ki: 14, f: 2000 }; // V; duty per volt; per volt-second; Hz

// ---------------------------------------------------------------- the battery: 24 V, 13.6 Ah, 12 cells
export const BAT = { cells: 12, C: 13.6, R0: 0.022, Rp: 0.028, tauP: 20, kAcc: 0.02, peukert: 1.15 };
export const sg = (soc) => 1.11 + 0.175 * clamp(soc, 0, 1); // electrolyte specific gravity
export const cellOcv = (soc) => sg(soc) + 0.84; // V a cell (the rule of thumb OCV = SG + 0.84)
export const batEmf = (soc) => BAT.cells * cellOcv(soc);
export const batR = (soc) => BAT.R0 * (1 + 0.8 * (1 - clamp(soc, 0, 1)) ** 2);
export const batRch = (soc) => batR(soc) + BAT.kAcc / Math.max(0.02, 1.03 - clamp(soc, 0, 1));
export const R_CONTACTOR = 0.004; // Ω, contactor and the cable to the bus
// discharge current (+) or charge (−) at bus voltage V
export function batCurrent(soc, vp, V) {
  const E = batEmf(soc);
  const Ed = E - vp;
  if (V < Ed) return (Ed - V) / (batR(soc) + R_CONTACTOR);
  if (V > E) return -(V - E) / (batRch(soc) + R_CONTACTOR);
  return 0;
}
// Minutes left at a discharge current, to an empty battery (21 V on load), Peukert's law at the 1 h rate
export function endurance(soc, I) {
  if (!(I > 0.05)) return Infinity;
  const hours = (BAT.C / I) * (BAT.C / I) ** (BAT.peukert - 1) * clamp(soc, 0, 1);
  return hours * 60;
}

// ---------------------------------------------------------------- the starter
export const STARTER = { R: 0.05, k: 0.062 }; // Ω (armature, brushes, cable), V·s/rad
export const STALL_I = (soc) => batEmf(soc) / (batR(soc) + R_CONTACTOR + STARTER.R);

// ---------------------------------------------------------------- the circuits and their breakers
// Panel order, left to right. bus: where its breaker takes power from. load: what it feeds.
export const CB = [
  { id: "field", name: "ALT FLD", tag: "FLD", In: 5, bus: "main" },
  { id: "alt", name: "ALT", tag: "ALT", In: 60, bus: "main" },
  { id: "warn", name: "WARN", tag: "WARN", In: 5, bus: "main" },
  { id: "nav", name: "NAV LT", tag: "NAV", In: 5, bus: "main" },
  { id: "land", name: "LDG LT", tag: "LDG", In: 15, bus: "main" },
  { id: "pitot", name: "PITOT", tag: "PITOT", In: 10, bus: "main" },
  { id: "flap", name: "FLAP", tag: "FLAP", In: 10, bus: "main" }, // BP-107's breaker
  { id: "turn", name: "TURN", tag: "TURN", In: 5, bus: "main" },
  { id: "avn", name: "AVN BUS", tag: "AVN", In: 15, bus: "main" },
  { id: "com", name: "COM/NAV", tag: "COM", In: 5, bus: "avn" },
  { id: "xpdr", name: "XPDR", tag: "XPDR", In: 5, bus: "avn" },
];
export const CB_INDEX = Object.fromEntries(CB.map((c, i) => [c.id, i]));
export const BREAKER = { k: 1.25, tau: 18 }; // ultimate trip 125 % of rating; thermal time constant, s
export const tripTime = (ratio) => (ratio <= BREAKER.k ? Infinity : -BREAKER.tau * Math.log(1 - (BREAKER.k / ratio) ** 2));
export const I2T = (In) => BREAKER.tau * (BREAKER.k * In) ** 2; // A²s for large faults
// the loads: R in Ω (lamps, heaters), P in W (radios, below V_MIN they drop out), I in A (constant)
export const LOAD = {
  nav: { R: 28 / 2.8, name: "NAV LIGHTS 3 × 26 W" },
  land: { R: 28 ** 2 / 250, name: "LANDING LIGHT 250 W" },
  pitot: { R: 28 / 5.0, name: "PITOT HEAT 140 W" },
  turn: { I: 0.25, name: "TURN COORDINATOR" },
  warn: { I: 0.08, lamp: 0.17, name: "ANNUNCIATOR" },
  com: { P: 36, name: "COM/NAV" },
  xpdr: { P: 24, name: "TRANSPONDER" },
};
export const V_MIN = 18; // radios brown out below this
export const LV = { on: 24.5, off: 25.0, delay: 0.4 }; // low-voltage annunciator thresholds, V
export const SHORT_R = 1.6; // Ω: a chafed NAV LT wire to the airframe through its corrosion
export const FLAP_STALL = WF.MOTOR.V / WF.MOTOR.R; // A, a jammed flap motor

// ---------------------------------------------------------------- state
export function system() {
  return {
    t: 0,
    ft: 0, // flight clock (s): runs faster while the battery's slow processes are fast-forwarded
    sw: { bat: false, alt: false, avn: false, start: false, nav: false, land: false, pitot: false },
    flapSel: 0,
    fault: { belt: false, short: false },
    cb: CB.map(() => ({ th: 0, open: false, pulled: false })),
    soc: 0.88,
    vp: 0,
    eng: { rpm: 0, theta: 0, w: 0, run: false, revs: 0, throttle: 0 },
    st: { w: 0, pin: 0, cont: false }, // starter: motor rad/s, pinion 0 out … 1 in mesh, contactor
    batCont: false,
    altN: 0, // alternator rpm
    rot: 0, // the alternator rotor's angle (rad)
    If: 0,
    D: 0,
    integ: 0,
    V: 0,
    Ibat: 0,
    Ist: 0,
    Ialt: 0,
    Iamm: 0, // ammeter: + charging the battery
    I: {}, // each circuit's current
    Itot: 0,
    lv: false,
    lvT: 0,
    wf: WF.system(0, 0),
    peakI: 0,
    sag: 99,
  };
}

// circuit currents at bus voltage V (A), and which are live
function circuits(s, V) {
  const cbOK = (id) => !s.cb[CB_INDEX[id]].open && !s.cb[CB_INDEX[id]].pulled;
  const I = { field: 0, nav: 0, land: 0, pitot: 0, flap: 0, turn: 0, warn: 0, avn: 0, com: 0, xpdr: 0 };
  if (V <= 0.01) return I;
  if (s.sw.alt && cbOK("field")) I.field = s.If;
  if (cbOK("nav")) I.nav = (s.sw.nav ? V / LOAD.nav.R : 0) + (s.fault.short ? V / SHORT_R : 0);
  if (s.sw.land && cbOK("land")) I.land = V / LOAD.land.R;
  if (s.sw.pitot && cbOK("pitot")) I.pitot = V / LOAD.pitot.R;
  if (cbOK("flap")) I.flap = s.wf.I * (s.wf.w > 0 || s.wf.I > 0 ? 1 : 0);
  if (cbOK("turn")) I.turn = V > 10 ? LOAD.turn.I : 0;
  if (cbOK("warn")) I.warn = LOAD.warn.I + (s.lv ? LOAD.warn.lamp : 0);
  if (s.sw.avn && cbOK("avn")) {
    const cp = (P) => (V >= V_MIN ? P / V : 0);
    if (cbOK("com")) I.com = cp(LOAD.com.P);
    if (cbOK("xpdr")) I.xpdr = cp(LOAD.xpdr.P);
    I.avn = I.com + I.xpdr;
  }
  return I;
}
const busLoad = (I) => I.field + I.nav + I.land + I.pitot + I.flap + I.turn + I.warn + I.avn;

// Solve the bus: the voltage at which the sources' currents meet the loads'. Returns the parts.
export function solveBus(s) {
  const altOn = !s.cb[CB_INDEX.alt].open && !s.cb[CB_INDEX.alt].pulled;
  const net = (V) => {
    const Ib = s.batCont ? batCurrent(s.soc, s.vp, V) : 0;
    const Ia = altOn ? altCurrent(s.altN, s.If, V) : 0;
    const Is = s.st.cont ? (V - STARTER.k * s.st.w) / STARTER.R : 0;
    return Ib + Ia - busLoad(circuits(s, V)) - Is;
  };
  let lo = 0;
  let hi = 40;
  if (net(0.02) <= 0) return { V: 0, Ib: 0, Ia: 0, Is: 0, I: circuits(s, 0) };
  for (let i = 0; i < 50; i++) {
    const m = (lo + hi) / 2;
    if (net(m) > 0) lo = m;
    else hi = m;
  }
  const V = (lo + hi) / 2;
  return {
    V,
    Ib: s.batCont ? batCurrent(s.soc, s.vp, V) : 0,
    Ia: altOn ? altCurrent(s.altN, s.If, V) : 0,
    Is: s.st.cont ? (V - STARTER.k * s.st.w) / STARTER.R : 0,
    I: circuits(s, V),
  };
}

// ---------------------------------------------------------------- one step of h seconds
// ctl: { bat, alt, avn, start, nav, land, pitot, flapSel, throttle (target rpm when running),
//        belt (broken), short, pull: [bool…] } ; warp fast-forwards the battery's charge.
export function step(s, h, ctl, warp = 1) {
  s.t += h;
  s.ft += h * warp;
  s.sw = { bat: !!ctl.bat, alt: !!ctl.alt, avn: !!ctl.avn, start: !!ctl.start, nav: !!ctl.nav, land: !!ctl.land, pitot: !!ctl.pitot };
  s.fault.belt = !!ctl.belt;
  s.fault.short = !!ctl.short;
  if (ctl.pull) ctl.pull.forEach((p, i) => (s.cb[i].pulled = !!p));
  s.batCont = s.sw.bat;
  s.st.cont = s.sw.bat && s.sw.start; // the key's START position energises the contactor's coil
  // the flaps: BP-107's own state machine, its motor at what this bus gives it
  if (s.flapSel !== ctl.flapSel) s.flapSel = ctl.flapSel ?? s.flapSel;
  s.wf.sel = s.flapSel;
  const flapPowered = s.V > 18 && !s.cb[CB_INDEX.flap].open && !s.cb[CB_INDEX.flap].pulled;
  if (flapPowered) WF.step(s.wf, h);
  else s.wf.I = 0;

  // ---- the bus
  const b = solveBus(s);
  s.V = b.V;
  s.Ibat = b.Ib;
  s.Ialt = b.Ia;
  s.Ist = b.Is;
  s.I = b.I;
  s.Itot = busLoad(b.I);
  s.Iamm = -(b.Ib - b.Is); // the shunt sits between the contactor's starter tap and the bus
  // ---- the battery: charge (fast-forwarded), polarisation
  const dAh = (b.Ib * h * warp) / 3600;
  s.soc = clamp(s.soc - dAh / BAT.C, 0, 1);
  s.vp += (Math.max(0, b.Ib) * BAT.Rp - s.vp) * Math.min(1, (h * warp) / BAT.tauP);

  // ---- the starter and the engine
  const e = s.eng;
  const Tm = STARTER.k * b.Is; // motor torque
  // The Bendix: the armature turns inside the pinion, whose own inertia holds it back, so the pinion
  // screws along the helix into mesh within a quarter turn; once the engine runs and overruns it, it
  // is thrown back out (and a spring returns it when the motor stops).
  const overrun = e.run && e.w * STARTER_RATIO > s.st.w + 5;
  const wasMeshed = s.st.pin > 0.999;
  if (s.st.cont && !overrun && !wasMeshed) s.st.pin = clamp(s.st.pin + (s.st.w * h * PINION.lead) / (TAU * PINION.travel), 0, 1);
  else if (!s.st.cont || overrun) s.st.pin = clamp(s.st.pin - h * 9, 0, 1);
  const meshed = s.st.pin > 0.999;
  const Jeq = J_STARTER + J_SHAFT / STARTER_RATIO ** 2;
  if (meshed && !wasMeshed && !e.run) {
    // the pinion's teeth strike the ring gear's: one shared speed, momentum kept
    s.st.w = (J_STARTER * s.st.w + (J_SHAFT / STARTER_RATIO ** 2) * e.w * STARTER_RATIO) / Jeq;
  }
  if (meshed && !e.run) {
    // armature and shaft locked through the gears: one inertia
    const Tl = crankLoad(e.theta, e.w) / (STARTER_RATIO * GEAR_EFF);
    s.st.w = Math.max(0, s.st.w + ((Tm - Tl) / Jeq) * h);
    e.w = s.st.w / STARTER_RATIO;
  } else {
    s.st.w = Math.max(0, s.st.w + ((Tm - 0.08 - 0.0006 * s.st.w) / J_STARTER) * h);
    if (!e.run) e.w = Math.max(0, e.w - (60 / J_SHAFT) * h);
  }
  if (!e.run && e.revs > FIRE_AFTER && (e.w * 60) / TAU > FIRE_RPM) e.run = true;
  if (e.run) {
    const want = ctl.throttle ?? RPM.idle;
    e.rpm += (want - e.rpm) * Math.min(1, h * (want > e.rpm ? 1.6 : 1.0));
    e.w = (e.rpm * TAU) / 60;
  } else e.rpm = (e.w * 60) / TAU;
  if (ctl.stop) {
    e.run = false;
  }
  e.theta += e.w * h;
  e.revs += (e.w * h) / TAU;
  if (!e.run && e.w < 0.05) e.revs = 0;
  // ---- the alternator: driven by the belt; the regulator sets its field
  const wantN = s.fault.belt ? 0 : e.rpm * ALT_RATIO;
  s.altN += (wantN - s.altN) * Math.min(1, h * (s.fault.belt ? 1.2 : 20));
  s.rot += ((s.altN * TAU) / 60) * h;
  const fieldOn = s.sw.alt && !s.cb[CB_INDEX.field].open && !s.cb[CB_INDEX.field].pulled && s.V > 0.5;
  if (fieldOn) {
    const err = REG.set - s.V;
    s.integ = clamp(s.integ + err * REG.ki * h, -0.2, 1.2);
    s.D = clamp(REG.kp * err + s.integ, 0, 1);
  } else {
    s.D = 0;
    s.integ = 0;
  }
  const vf = fieldOn ? s.D * s.V : 0;
  s.If += ((vf - ALT.Rf * s.If) / ALT.Lf) * h;
  s.If = Math.max(0, s.If);
  // ---- the breakers
  const cbI = { field: b.I.field, alt: b.Ia, warn: b.I.warn, nav: b.I.nav, land: b.I.land, pitot: b.I.pitot, flap: b.I.flap, turn: b.I.turn, avn: b.I.avn, com: b.I.com, xpdr: b.I.xpdr };
  CB.forEach((c, i) => {
    const k = s.cb[i];
    const r = (cbI[c.id] ?? 0) / (BREAKER.k * c.In);
    k.th += (r * r - k.th) * Math.min(1, h / BREAKER.tau);
    if (k.th >= 1 && !k.open) k.open = true;
    k.I = cbI[c.id] ?? 0;
  });
  // ---- the low-voltage light, with its delay
  const low = s.V > 8 && s.V < (s.lv ? LV.off : LV.on);
  s.lvT = low ? s.lvT + h : 0;
  s.lv = low && s.lvT > LV.delay && !s.cb[CB_INDEX.warn].open && !s.cb[CB_INDEX.warn].pulled;
  s.peakI = Math.max(s.peakI, b.Ib);
  if (s.st.cont) s.sag = Math.min(s.sag, s.V);
  return s;
}
// reset a tripped breaker (push it in): it holds only once it has cooled below the trip point
export function resetBreaker(s, i) {
  const k = s.cb[i];
  if (k.open && k.th < 0.9) k.open = false;
  return !k.open;
}

// ---------------------------------------------------------------- the tour
//  0.0  all off. 0.8 BAT on: battery only, the turn coordinator and the annunciator run on it
//  3.0  key to START: the starter contactor closes, the pinion screws into the ring gear, inrush and
//       sag; the engine fires after about two turns; key released; idle
//  7.0  ALT on: the field is energised, the alternator comes online, the battery recharges (+)
//  8.0  run-up, then cruise; battery charge fast-forwarded
// 11.0  loads on: avionics, nav lights, landing light, pitot heat, flaps to 20° (BP-107's motor)
// 20.0  the alternator's belt breaks: output gone, the low-voltage light, the battery discharges,
//       the endurance left is computed; time fast-forwarded ×60
// 26.0  load shedding: ALT off, landing light, pitot heat and transponder off; endurance grows
// 31.0  a chafed NAV LT wire shorts to the airframe: its breaker heats and trips
// 40.0  loop
export const TOUR = 40;
export const T = { bat: 0.8, start: 3.0, alt: 7.0, runup: 8.0, cruise: 9.5, loads: 11.0, flapsUp: 17.5, belt: 20.0, shed: 26.0, short: 31.0 };
export function tourCtl(t, s) {
  const run = s ? s.eng.run : t > T.start + 2.5;
  const c = {
    bat: t >= T.bat,
    alt: t >= T.alt && t < T.shed,
    avn: t >= T.loads,
    start: t >= T.start && !run && t < T.start + 4,
    nav: t >= T.loads + 0.6,
    land: t >= T.loads + 1.2 && t < T.shed,
    pitot: t >= T.loads + 1.8 && t < T.shed,
    flapSel: t >= T.loads + 2.4 && t < T.flapsUp ? 20 : 0,
    throttle: t < T.runup ? RPM.idle : t < T.cruise ? RPM.runup : RPM.cruise,
    belt: t >= T.belt,
    short: t >= T.short,
    pull: CB.map((c) => c.id === "xpdr" && t >= T.shed + 1),
  };
  return c;
}
export function warpAt(t) {
  if (t < T.runup + 0.5) return 1;
  if (t < T.loads) return 40;
  if (t < T.belt) return 30;
  if (t < T.belt + 0.8) return 1;
  if (t < T.short) return 60;
  return 1;
}
export function tourStart() {
  const s = system();
  return s;
}
export function tourStep(s, h) {
  const t = s.t + h;
  step(s, h, tourCtl(t, s), warpAt(t));
  return s;
}
export function phase(s) {
  if (!s.sw.bat && s.V < 1) return "MASTER OFF";
  if (s.st.cont) return s.st.pin > 0.97 ? "CRANKING" : "PINION ENGAGING";
  if (!s.eng.run) return "BATTERY ONLY";
  if (s.cb.some((k) => k.open)) return "BREAKER TRIPPED";
  if (s.fault.short && !s.cb[CB_INDEX.nav].open) return "NAV LT SHORTED";
  if (!s.sw.alt && !s.fault.belt) return "RUNNING, ALT OFF";
  if (s.fault.belt && s.Iamm < -0.5) return s.sw.alt ? "ALTERNATOR FAILED" : "LOADS SHED";
  if (s.Ialt > 0.5 && s.Iamm > 0.3) return "CHARGING";
  if (s.Ialt > 0.5) return "ALTERNATOR ON LINE";
  return "BATTERY DISCHARGING";
}

// The whole tour sampled (for the diagrams): [t, V, Ibat (+ discharge), Ialt, Iamm, soc, ft]
export function tourTrace(dt = 1 / 480, every = 12) {
  const s = tourStart();
  const out = [];
  let i = 0;
  while (s.t < TOUR) {
    tourStep(s, dt);
    if (i++ % every === 0) out.push([s.t, s.V, s.Ibat, s.Ialt, s.Iamm, s.soc, s.ft]);
  }
  return out;
}
