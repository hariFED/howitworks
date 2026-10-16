// Truth first: an open bevel-gear differential in a rear axle. Pure, no imports, no DOM.
// The geometry, the dimensions on the sheet, the readout, the plan view and the chart all read this.
//
// Kinematics. The crown wheel turns the carrier; the carrier carries the cross pin; the two spider
// gears on the pin drive the two side gears, which are splined to the half-shafts. Seen from the
// carrier, the spiders are idlers between two equal side gears, so the side gears turn equal and
// opposite amounts relative to it:  ωL − ωC = −(ωR − ωC),  that is  ωC = (ωL + ωR) / 2.
// The spiders spin on the pin only when ωL ≠ ωR:  ωS = (ωL − ωR) / 2 · zSide / zSpider.
//
// Torque. A spider is a balance beam: it pushes on both side gears with the same tooth force at the
// same radius, so the split is always equal, TL = TR = TC / 2 (friction ignored). The wheel with the
// least grip therefore sets the torque both wheels get.

// ---------------------------------------------------------------- gear set
export const Z_PINION = 10;
export const Z_CROWN = 39;
export const RATIO = Z_CROWN / Z_PINION; // 3.9 : 1 final drive
export const Z_SIDE = 16;
export const Z_SPIDER = 10;

// Spiral bevel crown wheel and pinion, intersecting axes. Pitch cones share their apex at the
// crossing of the axle and pinion axes (the world origin of the section).
export const CROWN_PCD = 224; // mm, heel pitch diameter ("8.8 in" class)
export const MODULE = CROWN_PCD / Z_CROWN; // heel transverse module, 5.74 mm
export const GAMMA_CROWN = Math.atan2(Z_CROWN, Z_PINION); // crown pitch angle, 75.6°
export const GAMMA_PINION = Math.PI / 2 - GAMMA_CROWN; // pinion pitch angle, 14.4°
export const CONE = CROWN_PCD / 2 / Math.sin(GAMMA_CROWN); // outer cone distance, 115.7 mm
export const FACE = 34; // face width, mm
export const PINION_PCD = Z_PINION * MODULE; // 57.4 mm

// Straight bevel differential gears, also with a common apex (the centre of the carrier).
export const DIFF_MODULE = 4.2;
export const SIDE_PCD = Z_SIDE * DIFF_MODULE; // 67.2 mm
export const SPIDER_PCD = Z_SPIDER * DIFF_MODULE; // 42 mm
export const GAMMA_SIDE = Math.atan2(Z_SIDE, Z_SPIDER); // 58°
export const GAMMA_SPIDER = Math.PI / 2 - GAMMA_SIDE; // 32°
export const DIFF_CONE = Math.hypot(SIDE_PCD / 2, SPIDER_PCD / 2); // 39.6 mm
export const DIFF_FACE = 13;

// ---------------------------------------------------------------- vehicle
export const TRACK = 1.55; // m, rear track
export const WHEELBASE = 2.75; // m
export const R_WHEEL = 0.317; // m, rolling radius of a 225/45 R17 tyre
export const WHEEL_LOAD = 3600; // N, static load on one rear wheel
export const MU_ROAD = 0.9;
export const MU_ICE = 0.1;
export const T_PINION = 180; // N·m, propeller-shaft torque in the tour

export const V_CRUISE = 20 / 3.6; // m/s, 20 km/h: a junction or car-park turn
export const R_TURN = 6; // m, turn radius at the centre of the rear axle
export const SLIP_ICE = (360 * 2 * Math.PI) / 60; // rad/s, the wheel on ice spins up to 360 rpm

export const rpm = (w) => (w * 60) / (2 * Math.PI);

// Wheel speeds from vehicle speed v (m/s) and path curvature κ = 1/R (1/m, + turning left), plus any
// spin of the right wheel on ice (rad/s). The inner wheel runs on the smaller circle.
export function wheels(v, kappa, slipR = 0) {
  const wL = (v * (1 - (kappa * TRACK) / 2)) / R_WHEEL;
  const wR = (v * (1 + (kappa * TRACK) / 2)) / R_WHEEL + slipR;
  return { wL, wR };
}

export const carrier = (wL, wR) => (wL + wR) / 2;
export const pinion = (wC) => wC * RATIO;
// Spider spin on the cross pin, relative to the carrier. Positive: the left side gear is gaining.
export const spider = (wL, wR) => ((wL - wR) / 2) * (Z_SIDE / Z_SPIDER);

// The torque each half-shaft gets, N·m. Equal split; capped by what the slipperiest wheel can resist.
export function torques(ice = false) {
  const crown = T_PINION * RATIO;
  const grip = (ice ? MU_ICE : MU_ROAD) * WHEEL_LOAD * R_WHEEL;
  const each = Math.min(crown / 2, grip);
  return { crown, each, grip };
}

// Ackermann steer angles of the front wheels for curvature κ (rad, + to the left).
export function steer(kappa) {
  if (Math.abs(kappa) < 1e-6) return { left: 0, right: 0 };
  const R = 1 / kappa;
  return { left: Math.atan(WHEELBASE / (R - TRACK / 2)), right: Math.atan(WHEELBASE / (R + TRACK / 2)) };
}

// ---------------------------------------------------------------- the tour
// A loop of keyframes: straight, a left turn, straight, a right turn, a stop, then the right wheel on
// ice (the car stands still, that wheel spins), and away again. Values ease between keyframes.
const KT = 1 / R_TURN;
export const TOUR = [
  // t, v, κ, slip
  [0, V_CRUISE, 0, 0],
  [2.5, V_CRUISE, 0, 0],
  [4, V_CRUISE, KT, 0],
  [7.5, V_CRUISE, KT, 0],
  [9, V_CRUISE, 0, 0],
  [10.5, V_CRUISE, 0, 0],
  [12, V_CRUISE, -KT, 0],
  [15.5, V_CRUISE, -KT, 0],
  [17, V_CRUISE, 0, 0],
  [18, V_CRUISE, 0, 0],
  [19.6, 0, 0, 0],
  [20.2, 0, 0, 0],
  [21.8, 0, 0, SLIP_ICE],
  [25.2, 0, 0, SLIP_ICE],
  [26.6, 0, 0, 0],
  [28, V_CRUISE, 0, 0],
];
export const CYCLE = 28;
export const ICE_FROM = 19.6;
export const ICE_TO = 26.6;

const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));

export function tour(t) {
  const tc = ((t % CYCLE) + CYCLE) % CYCLE;
  let i = 0;
  while (i < TOUR.length - 2 && TOUR[i + 1][0] <= tc) i++;
  const a = TOUR[i];
  const b = TOUR[i + 1];
  const k = ease((tc - a[0]) / (b[0] - a[0]));
  const ice = tc >= ICE_FROM && tc < ICE_TO;
  return { v: a[1] + (b[1] - a[1]) * k, kappa: a[2] + (b[2] - a[2]) * k, slip: a[3] + (b[3] - a[3]) * k, ice };
}
