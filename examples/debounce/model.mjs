// Truth first: an overhead door closer, rack and pinion, EN 1154 size 3. Pure, no imports, no DOM.
// The geometry, the dimensions, the readout, the plan view and the chart all read this.
//
// Kinematics. Plan view, hinge axis at the origin, the closed door pointing to -u, opening into +v.
// The pinion spindle rides on the door; the main arm (L1) and forearm (L2) tie it to a shoe on the
// frame head. Opening the door turns the spindle by φ relative to the body; the pinion drives the
// rack and the piston x = r·φ into the spring.
//
// Hydraulics. Closing, the spring drives the piston back and pushes oil out of the pressure chamber.
// The oil can only return to the spring side through two needle valves: SWEEP (its port is in the
// bore and the piston face covers it in the last ~15°) and LATCH (its port is never covered). Each
// is a sharp-edged orifice, Q = Cd·A·√(2p/ρ), and p = F_spring / A_piston, so the piston speed and
// the door speed follow from the spring and the valve settings. Opening, the ball check valve in
// the piston lets the oil back freely.
//
// The debounce. A push reopens the door and restarts the whole closing. The door latches only after
// a quiet spell as long as the closing time from where it was left.

const rad = Math.PI / 180;

// ---------------------------------------------------------------- linkage (plan, mm)
export const DOOR_W = 950; // leaf width, EN 1154 size 3: doors up to 950 mm
export const DOOR_T = 44;
export const SPINDLE_A = 215; // spindle from the hinge axis, along the leaf
export const SPINDLE_S = 32; // spindle from the leaf face (half the body depth)
export const L1 = 250; // main arm, spindle to elbow
export const L2 = 220; // forearm, elbow to shoe
export const SHOE = [-250, 10]; // forearm shoe on the frame head
export const THETA_MAX = 110; // door stop, degrees
export const PUSH_TO = 90; // a push opens the door this far

// ---------------------------------------------------------------- body, bore, piston (section, mm)
export const BORE = 40;
export const R_BORE = BORE / 2;
export const AREA = Math.PI * R_BORE ** 2; // mm², the pressure face of the piston
export const MODULE = 2.5;
export const Z = 10;
export const R_P = (MODULE * Z) / 2; // pinion pitch radius, 12.5 mm
export const SHIFT = 0.3; // profile shift: ten teeth would undercut without it
export const FACE_R = 62; // the piston's pressure face at x = 0 (door shut)
export const PLUG_R = 67; // inner face of the pressure-side end plug
export const PLUG_L = -160; // inner face of the spring-side end plug
export const HEAD_L = -32; // the piston's spring face at x = 0

// ---------------------------------------------------------------- spring
export const WIRE = 6; // EN 10270-1 SH
export const COIL_D = 31; // mean diameter
export const COILS = 14; // active
export const G = 79300; // N/mm²
export const K = (G * WIRE ** 4) / (8 * COIL_D ** 3 * COILS); // N/mm
export const PRELOAD = 35; // compression at x = 0, mm
export const springForce = (x) => K * (PRELOAD + x); // N
export const springLength = (x) => HEAD_L - x - PLUG_L;

// ---------------------------------------------------------------- oil and valves
export const RHO = 870; // kg/m³, ISO VG 15 hydraulic oil
export const CD = 0.62;
export const SEAT_D = 2.5; // needle seat, the end of the Ø2.5 drilling
export const NEEDLE_HALF = 8; // needle half-angle, degrees
export const PITCH = 0.5; // M5×0.5 regulating screws
export const PORT_D = 2.5;
export const SWEEP_U = 59.5; // sweep port centre: the piston face covers it near the end
export const LATCH_U = 64.5; // latch port centre: between the piston and the plug, never covered
export const SWEEP_SEAT = 56; // seat edges (where Ø3.5 steps to Ø2.5)
export const LATCH_SEAT = 60;
export const SWEEP_TURNS = 0.24; // screw 1 backed off from shut
export const LATCH_TURNS = 0.1; // screw 2

// The annular throat between a cone of half-angle α lifted h off a sharp seat of diameter d.
export function needleArea(h, d = SEAT_D, a = NEEDLE_HALF * rad) {
  if (h <= 0) return 0;
  const s = h * Math.sin(a);
  return Math.PI * s * (d - s * Math.cos(a));
}
export const lift = (turns) => turns * PITCH;

// The part of a port of radius r whose centre is c to the left of the piston face that the face
// leaves open (the circular segment on the pressure side).
export function portOpen(c, r = PORT_D / 2) {
  if (c >= r) return Math.PI * r * r;
  if (c <= -r) return 0;
  const k = -c;
  return r * r * Math.acos(k / r) - k * Math.sqrt(r * r - k * k);
}

export const faceU = (x) => FACE_R - x;

// Flow areas (mm²) at piston position x: the latch valve always, the sweep valve while its port is
// open, the port and needle in series.
export function areas(x, sweepTurns = SWEEP_TURNS, latchTurns = LATCH_TURNS) {
  const aS = needleArea(lift(sweepTurns));
  const aL = needleArea(lift(latchTurns));
  const port = portOpen(SWEEP_U - faceU(x));
  const sweep = port > 1e-9 && aS > 0 ? 1 / Math.sqrt(1 / aS ** 2 + 1 / port ** 2) : 0;
  return { sweep, latch: aL, total: sweep + aL, port };
}

export const pressure = (x) => springForce(x) / AREA; // N/mm² = MPa
// Oil flow out of the pressure chamber, mm³/s, per valve and in total.
export function flow(x, sweepTurns, latchTurns) {
  const a = areas(x, sweepTurns, latchTurns);
  const v = Math.sqrt((2 * pressure(x) * 1e6) / RHO) * 1000; // jet speed, mm/s
  return { sweep: CD * a.sweep * v, latch: CD * a.latch * v, total: CD * a.total * v, jet: v / 1000 };
}

// ---------------------------------------------------------------- linkage
function rawLink(theta, prevE) {
  const t = theta * rad;
  const d = [-Math.cos(t), Math.sin(t)];
  const n = [Math.sin(t), Math.cos(t)];
  const S = [SPINDLE_A * d[0] + SPINDLE_S * n[0], SPINDLE_A * d[1] + SPINDLE_S * n[1]];
  const dx = SHOE[0] - S[0];
  const dy = SHOE[1] - S[1];
  const D = Math.hypot(dx, dy);
  const a = (L1 * L1 - L2 * L2 + D * D) / (2 * D);
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const mx = S[0] + (a * dx) / D;
  const my = S[1] + (a * dy) / D;
  const E1 = [mx + (h * dy) / D, my - (h * dx) / D];
  const E2 = [mx - (h * dy) / D, my + (h * dx) / D];
  const near = (E) => (prevE ? Math.hypot(E[0] - prevE[0], E[1] - prevE[1]) : -E[1]);
  const E = near(E1) <= near(E2) ? E1 : E2;
  return { S, E, d, n, armDeg: Math.atan2(E[1] - S[1], E[0] - S[0]) / rad };
}

// Tabulate once (0.05° steps), following the elbow continuously from the shut door.
const STEP = 0.05;
const TABLE = (() => {
  const out = [];
  let prev = null;
  let last = null;
  for (let th = 0; th <= THETA_MAX + 1e-9; th += STEP) {
    const L = rawLink(th, prev);
    let rel = L.armDeg + th; // arm angle relative to the leaf (whose world angle is 180° − θ)
    if (last != null) {
      while (rel - last > 180) rel -= 360;
      while (rel - last < -180) rel += 360;
    }
    last = rel;
    prev = L.E;
    out.push(rel);
  }
  const r0 = out[0];
  return out.map((v) => v - r0);
})();

// Spindle rotation φ (degrees) for a door angle θ (degrees), and its slope dφ/dθ.
export function phi(theta) {
  const f = Math.min(TABLE.length - 1.001, Math.max(0, theta / STEP));
  const i = Math.floor(f);
  return TABLE[i] + (TABLE[i + 1] - TABLE[i]) * (f - i);
}
export function ratio(theta) {
  const t = Math.min(THETA_MAX - 0.1, Math.max(0.05, theta));
  return (phi(t + 0.05) - phi(t - 0.05)) / 0.1;
}
// The inverse: door angle for a spindle rotation.
export function thetaOf(phiDeg) {
  let lo = 0;
  let hi = THETA_MAX;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (phi(mid) < phiDeg) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
export const xOf = (theta) => R_P * phi(theta) * rad; // rack travel, mm
export const X_MAX = xOf(THETA_MAX);

// Elbow and spindle in plan for a door angle.
export function link(theta) {
  let prev = null;
  // follow the branch from shut in coarse steps so the elbow is the same one the table used
  for (let th = 0; th < theta; th += 5) prev = rawLink(th, prev).E;
  return rawLink(theta, prev);
}

// Closing moment at the door, N·m: spring force on the pinion pitch circle, through the linkage.
export const springTorque = (x) => (springForce(x) * R_P) / 1000;
export const doorMoment = (theta) => springTorque(xOf(theta)) * ratio(theta);

// Door speed while closing, deg/s (negative): piston speed from the oil flow, through r and dφ/dθ.
export function closingRate(theta, sweepTurns, latchTurns) {
  const x = xOf(theta);
  const v = flow(x, sweepTurns, latchTurns).total / AREA; // mm/s
  const dphi = v / R_P / rad; // deg/s at the spindle
  return -dphi / ratio(theta);
}

// Time to shut from θ with no further pushes (the debounce interval), s. Tabulated.
const CLOSE = (() => {
  const out = [0];
  let t = 0;
  const h = 0.05;
  for (let th = h; th <= THETA_MAX + 1e-9; th += h) {
    const mid = th - h / 2;
    t += h / -closingRate(Math.max(0.02, mid));
    out.push(t);
  }
  return out;
})();
export function closeTime(theta) {
  const f = Math.min(CLOSE.length - 1.001, Math.max(0, theta / 0.05));
  const i = Math.floor(f);
  return CLOSE[i] + (CLOSE[i + 1] - CLOSE[i]) * (f - i);
}
// The angle at which the piston face starts to cover the sweep port (the latch zone below it).
export const LATCH_ZONE = (() => {
  const xs = FACE_R - SWEEP_U + PORT_D / 2;
  return thetaOf((xs / R_P) / rad);
})();

// ---------------------------------------------------------------- the door, stepped in time
export function door() {
  return { theta: 0, x: 0, push: false, sinceStop: 0, latched: true, q: { sweep: 0, latch: 0, total: 0 }, p: 0, opening: 0 };
}

// Advance h seconds. want: the angle a hand holds the door at, or null when nobody touches it.
export function advance(s, h, want, rate = 260) {
  const before = s.theta;
  if (want != null && want > s.theta - 0.01) {
    // a hand opens the door (or holds it): the check valve lets the oil back, no damping
    s.theta = Math.min(want, s.theta + rate * h);
    if (want < s.theta) s.theta = want;
    s.q = { sweep: 0, latch: 0, total: 0, jet: 0 };
  } else if (s.theta > 0) {
    const r = closingRate(s.theta);
    s.theta = Math.max(0, s.theta + r * h);
    if (want != null) s.theta = Math.max(s.theta, want);
    s.q = flow(xOf(s.theta));
  } else {
    s.q = { sweep: 0, latch: 0, total: 0, jet: 0 };
  }
  s.theta = Math.min(THETA_MAX, s.theta);
  s.x = xOf(s.theta);
  if (h > 0) s.opening = (s.theta - before) / h; // deg/s, + opening
  s.p = s.theta > 0 && s.opening <= 0 ? pressure(s.x) : 0;
  s.latched = s.theta <= 0;
  return s;
}
