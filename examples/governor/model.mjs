// Truth first: a Porter governor on a mill engine, closing a double-beat throttle valve.
// Pure, no imports, no DOM. The geometry, the dimensions, the readout and both diagrams read this.
//
// Governor. Two balls of mass m on equal arms and links (length l, pivots at offset e from the
// axis) carry a central load M on the sleeve. With friction neglected the balance of each ball is
//     m·ω²·r = (m + M)·g·tan α,   r = e + l·sin α
// so a faster spindle swings the balls out, α grows and the sleeve rises 2·l·Δcos α.
// The sleeve moves a bell crank, the bell crank a link, the link the valve stem: a rising sleeve
// shuts the valve. The balls and sleeve lag their equilibrium with a time constant TAU_G
// (ball inertia and pin friction folded into one first-order lag).
//
// Engine. One first-order shaft:  J·dΩ/dt = T·f − LOAD − c·Ω,
// where f is the valve opening (curtain area of the two seats over the outlet bore, capped at 1).
// Closing the loop gives a proportional controller: more load needs more opening, more opening
// needs the sleeve lower, and the sleeve only sits lower at a lower speed. That is the droop.

const rad = (d) => (d * Math.PI) / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export const G = 9.81;

// ---------------------------------------------------------------- governor geometry (mm)
export const ARM = 150; // upper arm and lower link, pin to pin
export const OFFSET = 20; // arm and link pivots, out from the axis
export const ALPHA_MIN = 30; // deg, sleeve on the lower stop collar
export const ALPHA_MAX = 45; // deg, sleeve on the upper stop collar
export const VT = 550; // head pivots, above the drive-shaft axis
export const BALL_D = 75;
export const RHO_IRON = 7200; // kg/m³, grey iron

const mm3 = 1e-9;
const ringVol = (r1, r0, h) => Math.PI * (r1 * r1 - r0 * r0) * h;
export const BALL_M = RHO_IRON * (4 / 3) * Math.PI * (BALL_D / 2) ** 3 * mm3;

// The sleeve, as drawn, in mm relative to its link pivots (the "lug" height).
export const SLEEVE = { bore: 12.5, hubR: 29, bodyR: 65, neckR: 25, grooveR: 20, top: 10, bodyTop: -10, bodyBot: -70, bot: -116, grooveLo: -108, grooveHi: -92 };
const S = SLEEVE;
export const SLEEVE_M =
  RHO_IRON *
  mm3 *
  (ringVol(S.hubR, S.bore, S.top - S.bodyTop) +
    ringVol(S.bodyR, S.bore, S.bodyTop - S.bodyBot) +
    ringVol(S.neckR, S.bore, S.bodyBot - S.bot) -
    ringVol(S.neckR, S.grooveR, S.grooveHi - S.grooveLo));

export const RATIO = 30 / 20; // bevel wheel 30 teeth on the engine shaft, pinion 20 on the spindle

export const ballR = (a) => OFFSET + ARM * Math.sin(rad(a)); // mm from the axis
export const heightH = (a) => ARM * Math.cos(rad(a)); // ball plane below the head pivots
export const lug = (a) => VT - 2 * ARM * Math.cos(rad(a)); // the sleeve's link pivots
export const ballC = (a) => [ballR(a), VT - heightH(a)];
export const sleeveLift = (a) => lug(a) - lug(ALPHA_MIN);
export const LIFT_MAX = sleeveLift(ALPHA_MAX);

// ω² that holds the balls at α, rad²/s².
export function omega2(a) {
  return ((BALL_M + SLEEVE_M) * G * Math.tan(rad(a))) / (BALL_M * (ballR(a) / 1000));
}
export const spindleRpm = (a) => (Math.sqrt(omega2(a)) * 60) / (2 * Math.PI);
export const N_LO = spindleRpm(ALPHA_MIN); // spindle rpm at which the sleeve leaves the lower stop
export const N_HI = spindleRpm(ALPHA_MAX); // and reaches the upper one

// Equilibrium arm angle for a spindle speed, on the stops outside the band.
export function alphaEq(n) {
  if (n <= N_LO) return ALPHA_MIN;
  if (n >= N_HI) return ALPHA_MAX;
  let lo = ALPHA_MIN;
  let hi = ALPHA_MAX;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (spindleRpm(mid) < n) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// ---------------------------------------------------------------- linkage (mm)
// The swivel collar's pin rides with the sleeve; it slides in the slot of the bell crank's long arm.
export const PIN_C_U = 58;
export const PIN_C_DV = -100; // below the sleeve's link pivots
export const pinC = (a) => [PIN_C_U, lug(a) + PIN_C_DV];
export const F = [PIN_C_U + 130, (pinC(ALPHA_MIN)[1] + pinC(ALPHA_MAX)[1]) / 2]; // fulcrum, level with mid travel
export const ARM2 = 55; // short arm, to the valve link
export const ARM2_AT = 300; // deg, its direction when the long arm is level (a 120° bell crank)
export function crankTurn(a) {
  const [u, v] = pinC(a);
  return Math.atan2(v - F[1], u - F[0]) - Math.PI * Math.sign(v - F[1] || 1); // radians, + is anticlockwise
}
export const pinE = (psi) => [F[0] + ARM2 * Math.cos(rad(ARM2_AT) + psi), F[1] + ARM2 * Math.sin(rad(ARM2_AT) + psi)];
export const UV = F[0] + ARM2 * Math.cos(rad(ARM2_AT)); // valve axis, under the short arm at mid travel
export const PIN_G_SHUT = 110; // stem clevis pin with the valve on its seats
export const LINK = Math.hypot(pinE(crankTurn(ALPHA_MAX))[0] - UV, pinE(crankTurn(ALPHA_MAX))[1] - PIN_G_SHUT);
export function pinG(a) {
  const [eu, ev] = pinE(crankTurn(a));
  return [UV, ev - Math.sqrt(LINK * LINK - (eu - UV) ** 2)];
}
export const valveLift = (a) => Math.max(0, pinG(a)[1] - PIN_G_SHUT);
export const VALVE_LIFT_MAX = valveLift(ALPHA_MIN);

// ---------------------------------------------------------------- valve
export const SEAT_LO = 48; // lower seat bore
export const SEAT_HI = 56; // upper seat bore
export const OUTLET_D = 60;
export const PORT = (Math.PI / 4) * OUTLET_D ** 2; // mm²
export const CURTAIN = Math.PI * (SEAT_LO + SEAT_HI); // mm² per mm of lift, both seats
export const opening = (lift) => clamp((CURTAIN * lift) / PORT, 0, 1);
export const FULL_LIFT = PORT / CURTAIN; // lift at which the curtains equal the bore

// ---------------------------------------------------------------- engine
export const T_MAX = 2400; // N·m with the throttle wide open
export const J = 600; // kg·m², flywheel and shaft
export const C_F = 15; // N·m per rad/s, friction and windage
export const TAU_G = 0.35; // s, governor lag
export const LOAD_LIGHT = 600; // N·m
export const LOAD_HEAVY = 1300;
export const LOAD_MIN = 200;
export const LOAD_MAX = 1900;

export const toRpm = (w) => (w * 60) / (2 * Math.PI);
export const toRad = (n) => (n * 2 * Math.PI) / 60;

// Torque balance at an engine speed with the governor in equilibrium.
const surplus = (w, load) => T_MAX * opening(valveLift(alphaEq(RATIO * toRpm(w)))) - load - C_F * w;

// The operating point for a load: engine speed, arm angle, valve opening.
export function steady(load) {
  let lo = 1;
  let hi = 40;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (surplus(mid, load) > 0) lo = mid;
    else hi = mid;
  }
  const omega = (lo + hi) / 2;
  const alpha = alphaEq(RATIO * toRpm(omega));
  return { omega, alpha, f: opening(valveLift(alpha)) };
}

export const engine = (load = LOAD_LIGHT) => ({ ...steady(load), load });

// One step of the closed loop.
export function step(s, dt, load) {
  s.load = load;
  const want = alphaEq(RATIO * toRpm(s.omega));
  s.alpha += (want - s.alpha) * (1 - Math.exp(-dt / TAU_G));
  s.f = opening(valveLift(s.alpha));
  s.omega += (dt * (T_MAX * s.f - load - C_F * s.omega)) / J;
  return s;
}

// The sleeve lift the engine needs to carry a load at a speed (the engine's line on Diagram 1).
export function liftNeeded(load, w) {
  const f = (load + C_F * w) / T_MAX;
  if (f >= 1) return 0;
  let lo = ALPHA_MIN;
  let hi = ALPHA_MAX;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (opening(valveLift(mid)) > f) lo = mid;
    else hi = mid;
  }
  return sleeveLift((lo + hi) / 2);
}
