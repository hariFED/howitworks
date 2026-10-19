// Truth first: the primary flight controls of the four-seat high-wing light aircraft (BP-022), cable and
// pushrod: the control wheel on its sliding column, the aileron chain and cables, the differential
// aileron horn, the elevator idler, cables and bellcrank, the rudder pedals and cables, and the elevator
// trim wheel, drum, cables, jackscrew actuator and tab. Pure, no DOM. The aircraft's own model (A,
// light-aircraft/model.mjs) and the nose gear's (N, nose-gear/model.mjs) are imported, not retyped, so
// the surfaces' limits, the trimmed elevator, the roll rate, the coordinating rudder and the nose-wheel
// steering are the same numbers on all three pages.
//
// Frames (mm), as the aircraft's: FS aft of the datum (the firewall's front face), BL from the centre
// line (+ to starboard), WL above the ground at rest, WS along the span. Angles in degrees unless a name
// says rad. Surface signs: elevator and tab TE down +, aileron TE up + (each side its own), rudder TE to
// starboard + (nose right). Inputs: wheel θ (+ turned right), column x (+ pulled aft), pedal y (+ right
// pedal forward), trim tab δt (+ TE down, nose-up trim).

import * as A from "../light-aircraft/model.mjs";
import * as N from "../nose-gear/model.mjs";

export const rad = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ---------------------------------------------------------------- cable (class data)
export const CABLE_D = 3.2; // 1/8 in, 7×19 stainless, MIL-DTL-83420
export const TRIM_CABLE_D = 2.4; // 3/32 in, 7×19
export const CABLE_BREAK = 7600; // N, minimum breaking strength of the 1/8 in 7×19
export const T_RIG = 155; // N rigging tension at 21 °C, inside the class's 130–180 N band
export const T_BAND = [130, 180];
export const PULLEY_D = 76.2; // 3 in pulley for the 1/8 in cable
// Rigging tension falls in the cold: the aluminium airframe shrinks more than the steel cable. The
// class's rigging charts give about 1.2 N per °C for this cable size; the readout uses it.
export const T_PER_C = 1.2;
export const tensionAt = (tC) => T_RIG + T_PER_C * (tC - 21);

// ---------------------------------------------------------------- a crank driven by a rod (four-bar solve)
// Crank pivot O, crank length a at angle th (deg, from +u, counter-clockwise, v up); a rod of length L
// joins the crank tip to point P. Returns th within [lo, hi] where |tip − P| = L, the rod pulling along
// the side the neutral pose has. Pure bisection, monotone in the bracket the callers give.
export function crankFor(O, a, L, P, lo, hi, side = 1) {
  const f = (th) => {
    const tx = O[0] + a * Math.cos(th * rad);
    const ty = O[1] + a * Math.sin(th * rad);
    return side * (Math.hypot(tx - P[0], ty - P[1]) - L);
  };
  let a0 = lo;
  let a1 = hi;
  const s0 = Math.sign(f(a0));
  // out of reach: the nearer end of the bracket (the stops never let the linkage get there)
  if (s0 === Math.sign(f(a1))) return Math.abs(f(a0)) < Math.abs(f(a1)) ? a0 : a1;
  for (let i = 0; i < 60; i++) {
    const m = (a0 + a1) / 2;
    if (Math.sign(f(m)) === s0) a0 = m;
    else a1 = m;
  }
  return (a0 + a1) / 2;
}

// ---------------------------------------------------------------- ailerons: wheel → chain → cables → bellcrank → rod → horn
// The wheel turns a 12-tooth 3/8 in sprocket; the chain over it turns into the aileron cable loop (left
// wing, interconnect, right wing, balance cable). At each wing a bellcrank (pivot vertical) takes the loop
// on two arms of BC_IN either side of its pivot and drives the push-pull rod with an arm of BC_OUT.
export const SPROCKET = { teeth: 12, pitch: 9.525 };
export const R_SPR = SPROCKET.pitch / (2 * Math.sin(Math.PI / SPROCKET.teeth)); // pitch radius, 18.4
export const BC_IN = 75;
export const BC_OUT = 40;
// The differential: the rod pulls a horn HORN long that leans PSI0 forward of the vertical at neutral.
// Equal rod travel either way turns the aileron further up than down: near the horn's lean the same
// millimetre of rod buys more angle going forward (up) than coming back (down). Section A-A: (u aft, v up)
// about the aileron hinge.
export const HORN = 60;
export const ROD_L = 240;
export const UP_MAX = A.AILERON_LIMITS[0]; // 20° up, 15° down: the aircraft's
export const DOWN_MAX = A.AILERON_LIMITS[1];
// aileron angle (TE up +) for rod travel d (+ forward), with horn lean psi0
export function aileronFor(d, psi0 = PSI0) {
  const T0 = [-HORN * Math.sin(psi0 * rad), HORN * Math.cos(psi0 * rad)];
  const P = [T0[0] - ROD_L - d, T0[1]];
  // horn tip angle from +u: 90 + psi0 at neutral; TE up turns it further counter-clockwise
  const th = crankFor([0, 0], HORN, ROD_L, P, 90 + psi0 - 50, 170, -1);
  return th - (90 + psi0);
}
// solve the lean so that the rod travel giving 20° up gives 15° down: the horn is designed, not guessed
function dFor(target, psi0) {
  let lo = 0;
  let hi = HORN * 0.99;
  for (let i = 0; i < 50; i++) {
    const m = (lo + hi) / 2;
    if (aileronFor(Math.sign(target) * m, psi0) * Math.sign(target) < Math.abs(target)) lo = m;
    else hi = m;
  }
  return Math.sign(target) * (lo + hi) / 2;
}
export const PSI0 = (() => {
  let lo = 10;
  let hi = 60;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    const d = dFor(UP_MAX, m);
    if (-aileronFor(-d, m) > DOWN_MAX) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
})();
export const D_MAX = dFor(UP_MAX, PSI0); // rod travel at the bellcrank stops
export const BETA_MAX = Math.asin(D_MAX / BC_OUT) / rad; // bellcrank swing to its stops
export const S_AIL_MAX = BC_IN * Math.sin(BETA_MAX * rad); // cable travel at the stops
export const WHEEL_MAX = S_AIL_MAX / R_SPR / rad; // the wheel's travel each way, derived
// the chain of motion for wheel angle θ: cable s, bellcrank β, rod d, then each aileron
export function roll(theta) {
  const th = clamp(theta, -WHEEL_MAX, WHEEL_MAX);
  const s = R_SPR * th * rad;
  const beta = Math.asin(s / BC_IN) / rad;
  const d = BC_OUT * Math.sin(beta * rad);
  // wheel right: the right aileron goes up, the left one down
  return { theta: th, s, beta, d, right: aileronFor(d), left: aileronFor(-d) };
}
// the aircraft's δa is the up-going aileron's angle (A.ailerons): the wheel that gives it
export function wheelFor(da) {
  const want = clamp(Math.abs(da), 0, UP_MAX);
  let lo = 0;
  let hi = WHEEL_MAX;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (roll(m).right < want) lo = m;
    else hi = m;
  }
  return Math.sign(da) * (lo + hi) / 2;
}
// Adverse yaw, for the readout: the down-going aileron's drag yaws the nose away from the turn. With
// equal throws the aircraft's C_nδa applies to the full δa; the differential cuts the down side to what
// it is, and the up side's extra profile drag pulls the other way. A first-order estimate, per side:
// yaw ∝ (down² − k·up²), normalised so equal 15/15 throws give the aircraft's coefficient.
export function adverseYaw(r) {
  const up = Math.max(0, Math.max(r.right, r.left));
  const down = Math.max(0, -Math.min(r.right, r.left));
  const k = 0.25; // the up aileron's own drag, relative, helping
  const ref = 15 * 15 * (1 - k);
  return (A.D.Cnda * 15 * rad * (down * down - k * up * up)) / ref; // C_n, + nose right
}

// ---------------------------------------------------------------- elevator: column → push tube → idler → cables → bellcrank
// The column tube slides X travel in its panel bearing; a collar on it pushes a tube forward to the
// idler's upper arm (IDL_ROD); the idler's cable arms (IDL_CABLE) drive the two cables; at the tail they
// pull the elevator bellcrank's arms (ELEV_ARM) above and below the hinge. Pull the column: the idler
// turns, the up cable pulls the bellcrank's upper arm forward, the elevator's trailing edge rises.
export const IDL_ROD = 200;
export const IDL_CABLE = 80;
export const PUSH_L = 160; // push tube, collar lug to idler arm
export const ELEV_ARM = 100;
export const ELEV_UP = -A.ELEVATOR_LIMITS[0]; // 28 up, 23 down: the aircraft's
export const ELEV_DOWN = A.ELEVATOR_LIMITS[1];
// idler angle (deg, + aft at the top) for column travel x, the push tube's angularity included
export function idlerFor(x) {
  // in the idler's frame: pivot (0, 0), arm tip neutral at (0, IDL_ROD), the lug at (PUSH_L + x, IDL_ROD)
  const th = crankFor([0, 0], IDL_ROD, PUSH_L, [PUSH_L + x, IDL_ROD], 40, 140, 1);
  return 90 - th;
}
export function pitch(x) {
  const phi = idlerFor(x);
  const s = IDL_CABLE * Math.sin(phi * rad); // the up cable's pull, mm
  const de = -Math.asin(clamp(s / ELEV_ARM, -1, 1)) / rad;
  return { x, phi, s, de };
}
// column travel to each stop, solved from the stops at the tail
function xFor(de) {
  let lo = -200;
  let hi = 200;
  for (let i = 0; i < 50; i++) {
    const m = (lo + hi) / 2;
    if (pitch(m).de > de) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}
export const X_PULL = xFor(-ELEV_UP);
export const X_PUSH = xFor(ELEV_DOWN);
export const columnFor = (de) => xFor(clamp(de, -ELEV_UP, ELEV_DOWN));
// gearing |dδe/dx|, rad per metre of column
export const gearing = (x) => (Math.abs(pitch(x + 0.5).de - pitch(x - 0.5).de) * rad) / 0.001;

// ---------------------------------------------------------------- rudder: pedals → cables → horn
// Each pedal swings about a cross tube at the floor; the cable leaves its arm PED_ARM above the pivot, the
// toe pad is PED_PAD above it. At the tail the cables pull the rudder horn's arms (RUD_ARM) either side.
export const PED_ARM = 90;
export const PED_PAD = 250;
export const RUD_ARM = 125;
export const RUDDER_MAX = A.RUDDER_LIMIT; // ±17°, the aircraft's
export const PED_MAX = (RUD_ARM * Math.sin(RUDDER_MAX * rad) * PED_PAD) / PED_ARM; // toe travel each way
export function yaw(y) {
  const yy = clamp(y, -PED_MAX, PED_MAX);
  const s = (yy * PED_ARM) / PED_PAD;
  const dr = Math.asin(s / RUD_ARM) / rad;
  return { y: yy, s, dr, frac: yy / PED_MAX };
}
export const pedalFor = (dr) => (RUD_ARM * Math.sin(clamp(dr, -RUDDER_MAX, RUDDER_MAX) * rad) * PED_PAD) / PED_ARM;
// the nose wheel, through the bungees: on the ground it steers ±N.STEER_MAX at full pedal; in the air the
// centering cams hold it straight and the bungee stretches instead, adding to the pedal force
export function noseWheel(frac, onGround) {
  const psi = onGround ? frac * N.STEER_MAX : 0;
  const stretch = Math.abs(N.bungeeStretch(frac, psi));
  return { psi, stretch, force: N.K_BUNGEE * stretch };
}

// ---------------------------------------------------------------- trim: wheel → drum → cables → jackscrew → rod → tab
// The trim wheel's drum winds the cable loop; at the tail the loop turns a drum on the actuator's screw,
// the screw drives a nut, the nut pushes the rod and the rod turns the tab's horn. A fine screw is
// self-locking: its lead angle is smaller than the friction angle, so the air load on the tab cannot
// turn it back, and the tab stays where it is set.
export const TRIM_WHEEL_D = 230;
export const TRIM_DRUM_R = 30;
export const ACT_DRUM_R = 20;
export const SCREW = { d: 10, lead: 2, mu: 0.15 }; // Ø10 single-start, 2 mm lead, bronze nut on steel
export const LEAD_ANGLE = Math.atan(SCREW.lead / (Math.PI * (SCREW.d - SCREW.lead / 2))) / rad;
export const FRICTION_ANGLE = Math.atan(SCREW.mu) / rad;
export const TAB_HORN = 32; // tab horn, rod end to tab hinge
export const TAB_LIMITS = [-10, 25]; // TE up 10°, TE down 25° (nose-up trim): class figures
export const nutFor = (dt) => TAB_HORN * Math.sin(dt * rad); // the nut's stroke from neutral
export const screwTurns = (dt) => nutFor(dt) / SCREW.lead;
export const cableFor = (dt) => screwTurns(dt) * 2 * Math.PI * ACT_DRUM_R; // mm of trim cable
export const trimWheelTurns = (dt) => cableFor(dt) / (2 * Math.PI * TRIM_DRUM_R); // + nose up (top aft)
export const TRIM_TURNS = [trimWheelTurns(TAB_LIMITS[0]), trimWheelTurns(TAB_LIMITS[1])];

// ---------------------------------------------------------------- hinge moment and stick force
// The air's moment about the elevator hinge, H = q·S_e·c_e·C_h, C_h = C_hα·α_t + C_hδ·δe + C_hδt·δt
// (per rad; + turns the trailing edge down). Typical class values for a plain elevator with an inset tab.
// The tail's angle of attack follows the aircraft's: α_t = α(1 − dε/dα) + (i_t − ε0). The pilot holds
// F = H·|dδe/dx|: positive is a pull. Trimmed means F = 0, so the tab that trims is
// δt = −(C_hα·α_t + C_hδ·δe) / C_hδt.
export const TP = A.TAILPLANE;
export const ELEV_HINGE = { fs: TP.hinge, wl: TP.wl };
export const ELEV_CHORD = TP.te - TP.hinge; // 360 mm
export const ELEV_CUTOUT = 500; // the fin's and the tail cone's gap between the halves, mm
export const S_E = ((TP.span - ELEV_CUTOUT) * ELEV_CHORD) / 1e6; // m²
export const TAB = { fs: 7104, bl: [-700, -270] }; // the port elevator's inset tab, as the aircraft draws it
export const TAB_CHORD = TP.te - TAB.fs;
export const CH = { a: -0.2, d: -0.45, t: -0.1, epsGrad: 0.45, it: -2.5 };
export const alphaTail = (alphaBody) => alphaBody * (1 - CH.epsGrad) + CH.it; // deg
export function hinge(v, de, dt, alphaBody) {
  const ch = CH.a * alphaTail(alphaBody) * rad + CH.d * de * rad + CH.t * dt * rad;
  return A.q(v) * S_E * (ELEV_CHORD / 1000) * ch; // N·m, + TE down
}
export function stickForce(v, x, dt, alphaBody) {
  const de = pitch(x).de;
  return hinge(v, de, dt, alphaBody) * gearing(x); // N, + pull
}
// the trimmed state of steady flight at v (kt) and bank φ (deg): elevator from the aircraft's model
export function trimmed(v, phi = 0) {
  const fl = A.flight(v, 0, phi);
  const tab = -(CH.a * alphaTail(fl.alpha) + CH.d * fl.elevator) / CH.t;
  return { ...fl, tab: clamp(tab, TAB_LIMITS[0], TAB_LIMITS[1]), x: columnFor(fl.elevator) };
}
// the stick force a pilot feels in steady flight at v with the tab at dt (the curve of Diagram 2)
export function forceAt(v, dt, phi = 0) {
  const fl = A.flight(v, 0, phi);
  return stickForce(v, columnFor(fl.elevator), dt, fl.alpha);
}
// the elevator cables: the bellcrank's arms carry H as a difference of tensions; the rigging preload
// is shared until the slack side reaches zero
export function cableTensions(H, t0 = T_RIG) {
  const dT = H / (ELEV_ARM / 1000);
  let up = t0 + dT / 2;
  let down = t0 - dT / 2;
  if (down < 0) [up, down] = [dT, 0];
  if (up < 0) [up, down] = [0, -dT];
  return { up, down };
}

// ---------------------------------------------------------------- the arrangement (FS, BL, WL), mm
// Where things sit, from the aircraft's cabin, wing and tail. One list for the sheet's pictorial view and
// the 3D scene; the sheet's details use their own local frames. Left-side points; mirror() gives the right.
export const mirror = ([fs, bl, wl]) => [fs, -bl, wl];
export const WHEEL = { fs: 577, bl: 370, wl: 1483, r: 175 }; // the aircraft's yoke, both seats
export const PANEL_FS = 316;
export const COLUMN = { r: 15.9, fwd: 230, collar: 300, lug: 310 }; // tube Ø31.8; its forward end, collar, lug BL
export const SPR = { fs: 200, chain: 250 }; // sprockets on fixed splined shafts behind the panel; chain strand length
export const IDLER = { fs: COLUMN.collar - PUSH_L, wl: WHEEL.wl - IDL_ROD, bl: COLUMN.lug };
export const HINGE_FS = A.HINGE_FS; // aileron hinge line (rear spar)
export const AIL_TE = A.TE_FS;
export const AIL_WS = A.AILERON_WS;
export const HORN_WS = 3450;
export const BELLCRANK = { fs: HINGE_FS - HORN * Math.sin(PSI0 * rad) - ROD_L, ws: HORN_WS - BC_OUT }; // the rod arm points outboard
// the NACA 2412 camber line (chord fractions), on which the hinges sit
export const camber = (x) => (x < 0.4 ? (0.02 / 0.16) * (0.8 * x - x * x) : (0.02 / 0.36) * (0.2 + 0.8 * x - x * x));
// the wing's camber-line WL at span ws and chord fraction xi (the aircraft's section, incidence and dihedral)
export const wingWl = (ws, xi = 0.5) => {
  const c = A.chordAt(ws);
  const [, wl] = A.toWing([xi, camber(xi)], c, A.leAt(ws));
  return wl + A.dihedralRise(ws);
};
export const AIL_HINGE_WL = (ws) => wingWl(ws, (HINGE_FS - A.leAt(ws)) / A.chordAt(ws));
export const BC_WL = wingWl(BELLCRANK.ws, (BELLCRANK.fs - A.leAt(BELLCRANK.ws)) / A.chordAt(BELLCRANK.ws));
export const PED = { fs: 120, wl: 780, bl: 250, pads: [450, 290] }; // pedal cross tubes; cable arms at BL ±250
export const RUD_HORN = { fs: A.RUDDER_HINGE_FS, wl: 1560 };
export const TRIM = { fs: 430, wl: 930, drumBl: -100 }; // trim wheel in the pedestal, its drum beside it
export const ACT = { bl: -485, u: 14, v: -6, len: 120 }; // actuator in the port elevator, in the elevator's frame
export const NOSE_HORN = { fs: -150, bl: 75, wl: 620 };
export const BULKHEADS = [2450, 4300]; // fairleads where the tail cables pass frames

const R = PULLEY_D / 2;
// pulley centres, left side (the right side mirrors those named ..L); the solver finds each pulley's plane
// from the cable's way in and out, and the tangent points
export const PULLEYS = {
  A1L: [SPR.fs, -WHEEL.bl - R_SPR - R, 900], // under the chain: down → outboard
  A2L: [190, -540, 900], // door post foot: → up the post
  A3L: [610, -548, 1925], // door post head: → aft into the wing root
  A4L: [BELLCRANK.fs + BC_IN - R, -700, 0], // wing root: → outboard along the span (WL below)
  I1: [SPR.fs, -WHEEL.bl + R_SPR + R, 1010], // interconnect: down → across
  E1U: [IDLER.fs - IDL_CABLE + R, -40, 760], E1D: [IDLER.fs + IDL_CABLE + R, -60, 760],
  E2U: [1500, -40, 760], E2D: [1500, -60, 760],
  E3U: [6250, -40, A.TAILPLANE.wl + ELEV_ARM - R], E3D: [6250, -60, A.TAILPLANE.wl - ELEV_ARM - R],
  R1L: [330, -250, 760], R2L: [1500, -250, 760],
  T1A: [1500, -92, 760], T1B: [1500, -108, 760],
  T2A: [6634, -138, A.TAILPLANE.wl + 20], T2B: [6634, -138, A.TAILPLANE.wl - 20],
};
PULLEYS.A4L[2] = BC_WL - A.dihedralRise(BELLCRANK.ws) + A.dihedralRise(700); // the bellcrank's WL, at the root
// the balance cable bends only by the dihedral (1.7° each side) at the wing roots: a fairlead, not a pulley
export const ROOT_FAIRLEAD = [BELLCRANK.fs - BC_IN, -700, PULLEYS.A4L[2]];
export const pulleyAt = (name) => {
  const m = name.match(/^(.*)R$/);
  if (m && PULLEYS[m[1] + "L"]) return mirror(PULLEYS[m[1] + "L"]);
  if (name === "I2") return mirror(PULLEYS.I1);
  return PULLEYS[name];
};

// ---------------------------------------------------------------- vectors and cable routing
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => mul(a, 1 / (Math.hypot(...a) || 1));
export const V3 = { sub, add, mul, dot, cross, norm };
// rotate p about the axis through o along unit n by deg (right hand)
export function rotAbout(p, o, n, deg) {
  const v = sub(p, o);
  const c = Math.cos(deg * rad);
  const s = Math.sin(deg * rad);
  const r = add(add(mul(v, c), mul(cross(n, v), s)), mul(n, dot(n, v) * (1 - c)));
  return add(o, r);
}
// One cable run: a start point, pulleys by name, an end point. The cable leaves each pulley on the
// tangent to the next; the pulley's plane is the one the cable turns in, and its centre lies on the
// inside of the bend. Returns the polyline (arcs sampled every ~10°) and, per pulley, its centre, axis
// and wrap angle.
export function route(start, names, end) {
  const C = names.map(pulleyAt);
  const n = C.length;
  const tin = C.map(() => null);
  const tout = C.map(() => null);
  const axes = [];
  // the tangent point from P to the circle (c, R) in the plane ⟂ nrm; `leaving` for the way out
  const tangent = (P, c, nrm, leaving) => {
    const w0 = sub(P, c);
    const w = sub(w0, mul(nrm, dot(w0, nrm)));
    const d = Math.hypot(...w);
    const e1 = mul(w, 1 / d);
    const e2 = cross(nrm, e1);
    const al = Math.acos(Math.min(1, R / d));
    const tA = add(c, add(mul(e1, R * Math.cos(al)), mul(e2, R * Math.sin(al))));
    const tB = add(c, add(mul(e1, R * Math.cos(al)), mul(e2, -R * Math.sin(al))));
    // travel direction at the tangent point; the centre is to its left about nrm (a left turn)
    const fwd = (t) => (leaving ? sub(P, t) : sub(t, P));
    const left = (t) => dot(cross(nrm, norm(fwd(t))), sub(c, t));
    return left(tA) > 0 ? tA : tB;
  };
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < n; i++) {
      const P = i === 0 ? start : pass ? tout[i - 1] : C[i - 1];
      const Q = i === n - 1 ? end : pass && tin[i + 1] ? tin[i + 1] : C[i + 1];
      const c = C[i];
      const nrm = norm(cross(sub(c, P), sub(Q, c)));
      axes[i] = nrm;
      tin[i] = tangent(P, c, nrm, false);
      tout[i] = tangent(Q, c, nrm, true);
    }
  }
  const pts = [start];
  const wraps = [];
  for (let i = 0; i < n; i++) {
    const c = C[i];
    const nrm = axes[i];
    const a = norm(sub(tin[i], c));
    const b = norm(sub(tout[i], c));
    let ang = Math.atan2(dot(cross(a, b), nrm), dot(a, b));
    if (ang < 0) ang += 2 * Math.PI;
    const k = Math.max(1, Math.ceil(ang / (10 * rad)));
    for (let j = 0; j <= k; j++) pts.push(add(c, mul(rotAbout(a, [0, 0, 0], nrm, (ang * j) / k / rad), R)));
    wraps.push({ name: names[i], c, axis: nrm, wrap: ang / rad, tin: tin[i], tout: tout[i] });
  }
  pts.push(end);
  return { pts, wraps };
}
export const runLength = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(...sub(p, pts[i])), 0);

// ---------------------------------------------------------------- poses: where every moving point is
// for one solved state (solve() below). The sheet's pictorial view draws from it; the 3D view poses the
// same parts with the same angles.
export function pose(sol) {
  const { r, pt, yw } = sol;
  const s = r.s; // aileron loop travel
  const sw = WHEEL.wl - SPR.chain;
  // chain strand ends: the left strand of each sprocket up by s, the right one down by s
  const chain = {
    LL: [SPR.fs, -WHEEL.bl - R_SPR, sw + s], LR: [SPR.fs, -WHEEL.bl + R_SPR, sw - s],
    RL: [SPR.fs, WHEEL.bl - R_SPR, sw + s], RR: [SPR.fs, WHEEL.bl + R_SPR, sw - s],
  };
  // the wing bellcranks turn in plan by β; wheel right pulls the left one's aft arm inboard
  const bc = (side) => {
    const o = [BELLCRANK.fs, side * BELLCRANK.ws, BC_WL];
    const b = r.beta; // both turn the same way: mirror images moving opposite
    const turn = (p) => rotAbout(p, o, [0, 0, 1], b);
    return { o, beta: b, aft: turn([o[0] + BC_IN, o[1], o[2]]), fwd: turn([o[0] - BC_IN, o[1], o[2]]), rod: turn([o[0], side * HORN_WS, o[2]]) };
  };
  // the idler turns φ about BL (+: top aft); its cable arms point fore and aft
  const io = [IDLER.fs, 0, IDLER.wl];
  const ny = [0, 1, 0];
  const idl = (p) => rotAbout(p, io, ny, pt.phi);
  const idler = {
    o: io, phi: pt.phi,
    rodL: idl([IDLER.fs, -IDLER.bl, IDLER.wl + IDL_ROD]), rodR: idl([IDLER.fs, IDLER.bl, IDLER.wl + IDL_ROD]),
    fwd: idl([IDLER.fs - IDL_CABLE, -40, IDLER.wl]), aft: idl([IDLER.fs + IDL_CABLE, -60, IDLER.wl]),
  };
  // the elevator bellcrank on the hinge (rotation about +BL by δe: TE down +)
  const eh = [A.TAILPLANE.hinge, 0, A.TAILPLANE.wl];
  const elv = (p) => rotAbout(p, eh, ny, pt.de);
  const ebc = { up: elv([eh[0], -40, eh[2] + ELEV_ARM]), down: elv([eh[0], -60, eh[2] - ELEV_ARM]) };
  // rudder horn arms turn δr about the hinge (vertical; TE to starboard +)
  const rh = [RUD_HORN.fs, 0, RUD_HORN.wl];
  const rud = (p) => rotAbout(p, rh, [0, 0, 1], yw.dr);
  const horn = { L: rud([rh[0], -RUD_ARM, rh[2]]), R: rud([rh[0], RUD_ARM, rh[2]]) };
  // pedal tubes: the right pedals forward by y; the cable arms stand above the pivot
  const ped = { L: [PED.fs + yw.s, -PED.bl, PED.wl + PED_ARM], R: [PED.fs - yw.s, PED.bl, PED.wl + PED_ARM] };
  // trim drums: the strands leave the top and bottom of each drum
  const tw = { top: [TRIM.fs, TRIM.drumBl, TRIM.wl + TRIM_DRUM_R], bot: [TRIM.fs, TRIM.drumBl, TRIM.wl - TRIM_DRUM_R] };
  const ah = (v) => elv([A.TAILPLANE.hinge + ACT.u, ACT.bl, A.TAILPLANE.wl + v]);
  const act = { top: ah(ACT.v + ACT_DRUM_R), bot: ah(ACT.v - ACT_DRUM_R) };
  return { chain, bcL: bc(-1), bcR: bc(1), idler, ebc, horn, ped, tw, act, elv };
}
// every cable run for a pose: [name, polyline, travel s (+: the run moves toward its start)]
export function cables(ps, sol) {
  const s = sol.r.s;
  const se = sol.pt.s;
  const sr = sol.yw.s;
  const st = cableFor(sol.tab);
  return [
    ["ail-L", route(ps.chain.LL, ["A1L", "A2L", "A3L", "A4L"], ps.bcL.aft), s],
    ["ail-I", route(ps.chain.LR, ["I1", "I2"], ps.chain.RL), s],
    ["ail-R", route(ps.chain.RR, ["A1R", "A2R", "A3R", "A4R"], ps.bcR.aft), -s],
    ["ail-B", { pts: [ps.bcL.fwd, ROOT_FAIRLEAD, mirror(ROOT_FAIRLEAD), ps.bcR.fwd], wraps: [] }, s],
    ["elev-U", route(ps.idler.fwd, ["E1U", "E2U", "E3U"], ps.ebc.up), se],
    ["elev-D", route(ps.idler.aft, ["E1D", "E2D", "E3D"], ps.ebc.down), -se],
    ["rud-L", route(ps.ped.L, ["R1L", "R2L"], ps.horn.L), -sr],
    ["rud-R", route(ps.ped.R, ["R1R", "R2R"], ps.horn.R), sr],
    ["trim-A", route(ps.tw.top, ["T1A", "T2A"], ps.act.top), st],
    ["trim-B", route(ps.tw.bot, ["T1B", "T2B"], ps.act.bot), -st],
  ];
}

// ---------------------------------------------------------------- the tour (32 s, loops)
// 0–13  on the ground: the pre-flight check, "controls free and correct": full right and left wheel,
//       full back and forward, full right and left pedal. No airflow, no stick force.
// 13–32 in flight (the aircraft's model): cruise at 110 kt trimmed, slow to 65 kt (the pull builds),
//       trim nose up until the pull is gone, a 30° right turn and out (coordinated with rudder), then
//       back to 110 kt and trim nose down.
export const TOUR = 32;
export const T_AIR = 13;
const ramp = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const sm = (k) => 0.5 - 0.5 * Math.cos(Math.PI * k);
const hold = (t, a, b, c, d) => sm(ramp(t, a, b)) - sm(ramp(t, c, d));
export const V_CRUISE = 110;
export const V_SLOW = 65;
export function groundAt(t) {
  const wheel = WHEEL_MAX * (hold(t, 0.6, 1.8, 2.6, 3.4) - hold(t, 2.6, 3.4, 4.6, 5.4));
  const col = X_PULL * hold(t, 5.6, 6.6, 7.2, 7.9) - X_PUSH * hold(t, 7.2, 7.9, 8.7, 9.5);
  const ped = PED_MAX * (hold(t, 9.8, 10.6, 11.0, 11.5) - hold(t, 11.0, 11.5, 12.2, 12.9));
  return { wheel, col, ped };
}
export function flightAt(t) {
  const v = V_CRUISE + (V_SLOW - V_CRUISE) * sm(ramp(t, 15, 19)) + (V_CRUISE - V_SLOW) * sm(ramp(t, 29, 31.5));
  const phiT = 30 * (sm(ramp(t, 22.5, 23.5)) - sm(ramp(t, 26.5, 27.5)));
  const tab0 = trimmed(V_CRUISE).tab;
  const tab1 = trimmed(V_SLOW).tab;
  const tab = tab0 + (tab1 - tab0) * sm(ramp(t, 19.5, 21.5)) + (tab0 - tab1) * sm(ramp(t, 30, 31.8));
  return { v, phiT, tab };
}
// the state: inputs and what follows from them
export function state() {
  return { t: 0, v: 0, phi: 0, p: 0, wheel: 0, x: 0, y: 0, tab: trimmed(V_CRUISE).tab, air: false, da: 0 };
}
// one tour step of h seconds (deterministic from t = 0)
export function tourStep(s, h) {
  s.t += h;
  if (s.t >= TOUR) Object.assign(s, state());
  if (s.t < T_AIR) {
    const g = groundAt(s.t);
    s.air = false;
    s.v = 0;
    s.phi = 0;
    s.p = 0;
    s.wheel = g.wheel;
    s.x = g.col;
    s.y = g.ped;
    s.tab = trimmed(V_CRUISE).tab;
    return s;
  }
  const f = flightAt(s.t);
  s.air = true;
  s.v = f.v;
  s.tab = f.tab;
  flyStep(s, h, f.phiT);
  return s;
}
// steady flight with an attitude-holding pilot (the aircraft's): aileron for the bank wanted, rudder to
// coordinate, elevator for the airspeed and load factor
export function flyStep(s, h, phiT) {
  s.da = A.aileronFor(s.phi, phiT, s.v);
  s.p += (A.rollRate(s.da, s.v) - s.p) * Math.min(1, 4 * h);
  s.phi += s.p * h;
  s.wheel = wheelFor(s.da);
  s.y = pedalFor(A.rudderFor(s.da));
  s.x = columnFor(A.flight(s.v, 0, s.phi).elevator);
  return s;
}
// everything the pages show, for one state
export function solve(s) {
  const r = roll(s.wheel);
  const pt = pitch(s.x);
  const yw = yaw(s.y);
  const fl = s.air ? A.flight(s.v, 0, s.phi) : null;
  const H = s.air ? hinge(s.v, pt.de, s.tab, fl.alpha) : 0;
  const F = s.air ? H * gearing(s.x) : 0;
  const T = cableTensions(H);
  const nose = noseWheel(yw.frac, !s.air);
  return { r, pt, yw, fl, H, F, T, nose, tab: s.tab, trimTurns: trimWheelTurns(s.tab), nut: nutFor(s.tab), yawC: adverseYaw(r) };
}
// the phase, for the readout
export function phase(s) {
  if (!s.air) return "GROUND CHECK";
  if (s.t < 15) return "CRUISE, TRIMMED";
  if (s.t < 19.4) return "SLOWING";
  if (s.t < 22) return "TRIMMING";
  if (s.t < 28.5) return "TURN";
  return "ACCELERATING";
}
