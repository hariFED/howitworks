// Truth first: the electrically driven single-slotted flaps of a four-seat high-wing light aircraft.
// Pure, no imports, no DOM: the section, the actuator, the linkage, the dimensions, the diagrams, the
// readouts and the 3D view all read this file.
//
// What it is. Each flap (one per wing, WS 600 to 3280, chord 442 mm) hangs on two tracks. A track is a
// steel plate with one curved slot; a bracket under the flap's nose carries two rollers in that slot.
// The slot runs straight and gently down at first, so both rollers slide aft together and the flap
// moves aft without turning (Fowler motion: the chord, so the area, grows); then it curves down, the
// aft roller drops ahead of the forward one and the flap turns down, opening the slot between its nose
// and the shroud. A 28 V DC motor turns a jackscrew through a 25:1 spur gearbox; the screw's nut pushes
// a bellcrank in the starboard wing root; a push-pull rod from the bellcrank drives the flap's lug, and
// two crossed cables make the port bellcrank (and so the port flap) follow. A follow-up cable from the
// bellcrank turns the switch carrier in the cockpit selector, so the motor stops when the flaps reach
// the selected angle; limit switches on the actuator stop it at 0° and 30°.
//
// Frames (mm).
//   Section: the starboard wing at the inboard track, WS 760: x aft from the leading edge along the
//   chord line, y up from it (incidence and dihedral left out: the chord plane is level).
//   Plan: x aft as above, w = WS, + to starboard (the actuator's wing).
//   The flap's own frame is its pose at 0°.
//
// Shared with the aircraft (examples/light-aircraft/model.mjs, BP-022; build.mjs checks they match):
// the wing (NACA 2412, 1626 mm root chord, hinge line at 72 %, flaps WS 600–3280), the weight, the
// wing area, the stall speeds the C_L,max come from and the lift added by each flap setting, the trim
// derivatives and the flap limit speed. Only the flap's path is this sheet's own: the aircraft draws
// it as a turn about one point, which agrees with this track at 0° and 30° in angle, not in place.

export const G = 9.80665;
export const RHO = 1.225; // kg/m³, ISA sea level
export const KT = 0.514444; // m/s per knot
export const deg = Math.PI / 180;

// ---------------------------------------------------------------- the aircraft (BP-022)
export const MTOW = 1100; // kg
export const W = MTOW * G; // N
export const SPAN = 11000;
export const ROOT_CHORD = 1626;
export const TIP_CHORD = 1066;
export const BREAK_WS = 2500;
export const TIP_WS = SPAN / 2;
export const INCIDENCE = 1.5; // deg
export const HINGE_X = 0.72; // flap hinge line (rear spar), fraction of the root chord
export const FLAP_WS = [600, 3280];
export const FLAP_STOPS = [0, 10, 20, 30];
export const chordAt = (ws) => (ws <= BREAK_WS ? ROOT_CHORD : ROOT_CHORD - ((ws - BREAK_WS) * (ROOT_CHORD - TIP_CHORD)) / (TIP_WS - BREAK_WS));
function integrate(f, a, b, n = 400) {
  let s = 0;
  for (let i = 0; i < n; i++) s += f(a + ((i + 0.5) * (b - a)) / n);
  return (s * (b - a)) / n;
}
export const S = (2 * integrate(chordAt, 0, TIP_WS)) / 1e6; // m², both wings
export const VS_PUBLISHED = { 0: 53, 10: 51, 20: 49.5, 30: 48 }; // kt CAS, MTOW, power off
export const DCL_FLAP = { 0: 0, 10: 0.25, 20: 0.45, 30: 0.6 };
export const D = { CL0: 0.307, CLa: 4.41, CLde: 0.43, Cm0: 0.04, Cma: -0.613, Cmde: -1.122 };
export const V_FE = 85; // kt, flap limit speed (top of the white arc)
export const C = ROOT_CHORD; // the section's chord at WS 760 (inside the constant-chord panel)

// ---------------------------------------------------------------- the aerofoil: NACA 2412, in mm
export function naca2412(n = 60) {
  const m = 0.02;
  const p = 0.4;
  const t = 0.12;
  const upper = [];
  const lower = [];
  for (let i = 0; i <= n; i++) {
    const x = 0.5 - 0.5 * Math.cos((Math.PI * i) / n);
    const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x ** 2 + 0.2843 * x ** 3 - 0.1036 * x ** 4);
    const yc = x < p ? (m / p ** 2) * (2 * p * x - x * x) : (m / (1 - p) ** 2) * (1 - 2 * p + 2 * p * x - x * x);
    const dy = x < p ? ((2 * m) / p ** 2) * (p - x) : ((2 * m) / (1 - p) ** 2) * (p - x);
    const th = Math.atan(dy);
    upper.push([x - yt * Math.sin(th), yc + yt * Math.cos(th)]);
    lower.push([x + yt * Math.sin(th), yc - yt * Math.cos(th)]);
  }
  return { upper, lower };
}
export function surfaceAt(pts, x) {
  for (let i = 1; i < pts.length; i++) {
    if (pts[i][0] >= x) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      return y0 + ((y1 - y0) * (x - x0)) / Math.max(1e-9, x1 - x0);
    }
  }
  return pts[pts.length - 1][1];
}
const AF = naca2412(120);
export const up = (x) => C * surfaceAt(AF.upper, x / C); // upper surface height at x (mm)
export const lo = (x) => C * surfaceAt(AF.lower, x / C); // lower surface

// ---------------------------------------------------------------- the fixed wing at the flap
// Rear spar: a 1.6 mm channel whose web's aft face is the hinge line. The upper skin runs on aft of
// it as the shroud, to its lip; the lower skin stops at the spar (the cove's lower lip). A curved cove
// panel closes the space between the spar and the flap's nose and guides the slot's air.
export const SPAR = { aft: HINGE_X * C, web: 1.6, flange: 30 };
export const LIP_X = 1330; // the shroud's trailing edge, 81.8 % chord
export const SKIN = 0.8;
export const LIP = [LIP_X, up(LIP_X) - 1.4]; // the point of the lip the slot's gap is measured from

// ---------------------------------------------------------------- the flap (its own frame = 0° pose)
// Chord 442 mm from its nose (72.8 % of the wing chord) to the wing's trailing edge: 27 % of the
// local chord at WS 760, 30 % at its outboard end where the wing has tapered to 1480 mm. Its upper
// surface runs 4 mm under the shroud and meets the wing's contour behind the lip; its nose is an
// ellipse between the two surfaces.
export const FLAP = { nose: 0.728 * C, a: 50, depress: 4, te: C, spar: 0.728 * C + 120 };
export const FLAP_CHORD = FLAP.te - FLAP.nose;
export const flapUp = (x) => up(x) - (x < LIP_X - 6 ? FLAP.depress : x > LIP_X + 20 ? 0 : (FLAP.depress * (LIP_X + 20 - x)) / 26);
export const NOSE_C = [FLAP.nose + FLAP.a, (flapUp(FLAP.nose + FLAP.a) + lo(FLAP.nose + FLAP.a)) / 2];
// the flap's outline, clockwise from the nose's top: upper surface aft to the trailing edge, lower
// surface forward, then the nose (an ellipse's front half) from its bottom round to its top
export function flapParts() {
  const [cx, cy] = NOSE_C;
  const bu = flapUp(cx) - cy;
  const bl = cy - lo(cx);
  const upper = [];
  for (let x = cx; x < FLAP.te - 1; x += 12) upper.push([x, flapUp(x)]);
  const te = [[FLAP.te, flapUp(FLAP.te) + 0.6], [FLAP.te, flapUp(FLAP.te) - 1.4]];
  const lower = [];
  for (let x = FLAP.te - 12; x > cx; x -= 12) lower.push([x, lo(x)]);
  const nose = [];
  for (let i = 0; i <= 16; i++) {
    const t = -Math.PI / 2 - (Math.PI * i) / 16;
    nose.push([cx + FLAP.a * Math.cos(t), cy + (t > -Math.PI ? bl : bu) * Math.sin(t)]);
  }
  return { upper, te, lower, nose };
}
export function flapOutline() {
  const f = flapParts();
  return [...f.upper, ...f.te, ...f.lower, ...f.nose.slice(0, -1)];
}
export const FLAP_PTS = flapOutline();

// ---------------------------------------------------------------- the track: one slot, two rollers
// The slot's centre line, from the forward roller's place at 0°: straight for SLOT.ls at SLOT.th0
// (slightly down, so the flap's upper surface clears the lip as it slides aft), then an arc of radius
// SLOT.rho curving down. The rollers are SLOT.d apart on the flap's bracket. These four numbers were
// chosen (a search, see the README of this example in its notes) so that at 30° the slot's gap is 2.0 %
// of the chord with the flap's nose 8 mm ahead of the lip, as on classic single-slotted flaps.
export const ROLLER_D = 22; // mm, sealed ball-bearing track roller
export const SLOT = { r1: [1210, -48], th0: -8, ls: 100, rho: 104, d: 90, w: 23 };
const T0 = [Math.cos(SLOT.th0 * deg), Math.sin(SLOT.th0 * deg)];
const NRM = [T0[1], -T0[0]]; // toward the arc's centre (below the straight)
const S0 = [SLOT.r1[0] + T0[0] * SLOT.ls, SLOT.r1[1] + T0[1] * SLOT.ls];
export const ARC_C = [S0[0] + NRM[0] * SLOT.rho, S0[1] + NRM[1] * SLOT.rho];
const A0 = Math.atan2(S0[1] - ARC_C[1], S0[0] - ARC_C[0]);
export function slotAt(s) {
  if (s <= SLOT.ls) return [SLOT.r1[0] + T0[0] * s, SLOT.r1[1] + T0[1] * s];
  const ph = (s - SLOT.ls) / SLOT.rho;
  return [ARC_C[0] + SLOT.rho * Math.cos(A0 - ph), ARC_C[1] + SLOT.rho * Math.sin(A0 - ph)];
}
// the aft roller sits on the slot SLOT.d (straight line) ahead of the forward one
function aftOf(s1) {
  const p1 = slotAt(s1);
  let a = s1;
  let b = s1 + SLOT.d * 1.6;
  for (let i = 0; i < 44; i++) {
    const m = (a + b) / 2;
    const q = slotAt(m);
    if (Math.hypot(q[0] - p1[0], q[1] - p1[1]) < SLOT.d) a = m;
    else b = m;
  }
  return a;
}
// The flap's pose with the forward roller at arc length s along the slot: where the two rollers are
// and how far the line between them has turned (deg, + = trailing edge down).
export function poseAt(s) {
  const p1 = slotAt(s);
  const s2 = aftOf(s);
  const p2 = slotAt(s2);
  const turn = SLOT.th0 - Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) / deg;
  return { s, s2, r1: p1, r2: p2, flap: turn };
}
export const R2_0 = poseAt(0).r2;
// a point of the flap (its own frame) placed by a pose
export function place([x, y], P) {
  const r = -P.flap * deg;
  const c = Math.cos(r);
  const sn = Math.sin(r);
  const dx = x - SLOT.r1[0];
  const dy = y - SLOT.r1[1];
  return [P.r1[0] + dx * c - dy * sn, P.r1[1] + dx * sn + dy * c];
}
// The forward roller's travel that gives a flap angle: a table, then interpolation both ways.
const N_TAB = 600;
export const S_MAX = (() => {
  let a = 0;
  let b = 400;
  for (let i = 0; i < 50; i++) {
    const m = (a + b) / 2;
    if (poseAt(m).flap < 30) a = m;
    else b = m;
  }
  return a;
})();
export const S_OVER = 2.5; // mm of overtravel past each stop, inside the slot's ends
export const TABLE = Array.from({ length: N_TAB + 1 }, (_, i) => {
  const s = -S_OVER + ((S_MAX + 2 * S_OVER) * i) / N_TAB;
  return poseAt(s);
});
export function lerpBy(key, val, want) {
  const t = TABLE;
  if (val <= t[0][key]) return t[0][want];
  for (let i = 1; i < t.length; i++) {
    if (t[i][key] >= val) {
      const a = t[i - 1];
      const b = t[i];
      const k = (val - a[key]) / Math.max(1e-9, b[key] - a[key]);
      return a[want] + (b[want] - a[want]) * k;
    }
  }
  return t[t.length - 1][want];
}
export const flapOf = (s) => (s <= 0 ? 0 : lerpBy("s", s, "flap"));
// the first s that reaches a flap angle (the dead band at the start is pure translation)
export const sOfFlap = (f) => (f <= 0 ? 0 : lerpBy("flap", f, "s"));
export const poseOfS = (s) => poseAt(s);

// ---------------------------------------------------------------- what the motion does to the wing
// the slot's gap (lip to the flap's nearest surface), the overlap (lip aft of the flap's nose) and the
// chord (leading edge to the flap's trailing edge, along the chord line)
function nearest(pts, q) {
  let g = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const r = pts[(i + 1) % pts.length];
    const dx = r[0] - p[0];
    const dy = r[1] - p[1];
    const t = Math.max(0, Math.min(1, ((q[0] - p[0]) * dx + (q[1] - p[1]) * dy) / (dx * dx + dy * dy)));
    g = Math.min(g, Math.hypot(p[0] + t * dx - q[0], p[1] + t * dy - q[1]));
  }
  return g;
}
export function geometry(s) {
  const P = poseOfS(s);
  const pts = FLAP_PTS.map((p) => place(p, P));
  const te = place([FLAP.te, flapUp(FLAP.te) - 0.4], P);
  return { P, flap: P.flap, gap: nearest(pts, LIP), overlap: LIP_X - Math.min(...pts.map((p) => p[0])), chord: te[0], te };
}

// ---------------------------------------------------------------- the drive (plan, starboard wing)
// Bellcrank on a vertical bolt forward of the rear spar, one plate, four holes: R (outboard, 110) for
// the push-pull rod; A (forward, 110) for the actuator; C (forward and aft, 60) for the two crossed
// interconnect cables; F (aft, 40) for the follow-up cable. β turns it, + = clockwise seen from above
// with the nose up (R's hole moves forward).
export const BC = { x: 1060, w: 635, y: 10, rR: 110, rA: 110, rC: 60, rF: 40 };
export const ROD_W = BC.w + BC.rR; // the rod's plane, WS 745, beside the track
export const ROD_Y = BC.y + 8; // its fore end rides on top of the bellcrank's plate
// The rod drives a lug on the flap's notch rib inside its nose: a point of the flap's own frame.
export const LUG = [1226, 0];
export const lugAt = (s) => place(LUG, poseOfS(s));
const tipR = (b) => [BC.x - BC.rR * Math.sin(b * deg), BC.w + BC.rR * Math.cos(b * deg)];
// β for a lug position with the rod length L (the rod's ends both on its plane's normal, small swing)
function betaFor(lug, L) {
  let a = -70;
  let b = 70;
  for (let i = 0; i < 50; i++) {
    const m = (a + b) / 2;
    const t = tipR(m);
    const dx = lug[0] - t[0];
    const len = Math.hypot(dx, lug[1] - ROD_Y, ROD_W - t[1]);
    // β up: the tip moves forward, the rod lengthens
    if (len < L) a = m;
    else b = m;
  }
  return (a + b) / 2;
}
// rig: the rod's length chosen so the bellcrank swings equally either side of square
export const ROD_L = (() => {
  const l0 = lugAt(-S_OVER);
  const l1 = lugAt(S_MAX + S_OVER);
  let a = 100;
  let b = 400;
  for (let i = 0; i < 50; i++) {
    const m = (a + b) / 2;
    if (betaFor(l0, m) + betaFor(l1, m) > 0) b = m;
    else a = m;
  }
  return (a + b) / 2;
})();
export const betaOf = (s) => betaFor(lugAt(s), ROD_L);
export const BETA0 = betaOf(0); // the bellcrank's angle at flap 0
export const holeOf = (b, which) => {
  const r = b * deg;
  const P = [BC.x, BC.w];
  if (which === "R") return [P[0] - BC.rR * Math.sin(r), P[1] + BC.rR * Math.cos(r)];
  if (which === "A") return [P[0] - BC.rA * Math.cos(r), P[1] - BC.rA * Math.sin(r)];
  if (which === "C1") return [P[0] - BC.rC * Math.cos(r), P[1] - BC.rC * Math.sin(r)];
  if (which === "C2") return [P[0] + BC.rC * Math.cos(r), P[1] + BC.rC * Math.sin(r)];
  return [P[0] + BC.rF * Math.cos(r), P[1] + BC.rF * Math.sin(r)]; // F
};
// The port bellcrank is the mirror image (w → −w) and turns by the same angle the other way: the
// crossed cables join starboard C1 to port C2 and starboard C2 to port C1, so both always pull.
export const mirror = ([x, w]) => [x, -w];
// The actuator: a clevis pin on a bracket at the root rib's inboard side, its rod end on hole A.
export const ACT = { mount: [BC.x - BC.rA, 230], y: 2 }; // its rod end under the bellcrank's plate
export const actLen = (b) => {
  const h = holeOf(b, "A");
  return Math.hypot(h[0] - ACT.mount[0], h[1] - ACT.mount[1]);
};
// the jackscrew's nut travel from its place at flap 0 (overtravel below 0 is negative)
export const LEN0 = actLen(betaOf(0));
export const nutOf = (s) => actLen(betaOf(s)) - LEN0;
const NT = TABLE.map((p) => [p.s, nutOf(p.s)]);
export const NUT_MAX = nutOf(S_MAX); // the stroke 0° to 30°
export function sOfNut(n) {
  if (n <= NT[0][1]) return NT[0][0];
  for (let i = 1; i < NT.length; i++) {
    if (NT[i][1] >= n) {
      const [s0, n0] = NT[i - 1];
      const [s1, n1] = NT[i];
      return s0 + ((s1 - s0) * (n - n0)) / Math.max(1e-9, n1 - n0);
    }
  }
  return NT[NT.length - 1][0];
}
// d(flap)/d(nut), rad per mm, for the loads
export function dFlapDNut(n) {
  const h = 0.5;
  return ((flapOf(sOfNut(n + h)) - flapOf(sOfNut(n - h))) / (2 * h)) * deg;
}

// ---------------------------------------------------------------- the actuator
// Motor beside the screw, both axes in one horizontal plane. Actuator frame: a along the screw from the
// mount pin (outboard), q across it (+ aft); the screw on q = 0, the motor on q = −QM.
export const GEAR = { m: 1, z1: 12, z2: 60, z3: 14, z4: 70 }; // motor pinion, idler gear, idler pinion, screw gear
export const RATIO = (GEAR.z2 / GEAR.z1) * (GEAR.z4 / GEAR.z3); // 25
export const Q_IDLER = -((GEAR.z3 + GEAR.z4) * GEAR.m) / 2; // −42
export const QM = -Q_IDLER + ((GEAR.z1 + GEAR.z2) * GEAR.m) / 2; // 78
export const SCREW = { d: 16, lead: 4, d2: 14, mu: 0.15, half: 15 }; // Tr16×4, bronze nut, greased
export const LEAD_ANGLE = Math.atan(SCREW.lead / (Math.PI * SCREW.d2)); // rad
export const FRICTION_ANGLE = Math.atan(SCREW.mu / Math.cos(SCREW.half * deg));
export const SCREW_EFF = Math.tan(LEAD_ANGLE) / Math.tan(LEAD_ANGLE + FRICTION_ANGLE);
export const SELF_LOCKING = FRICTION_ANGLE > LEAD_ANGLE; // the air load cannot turn the screw back
export const GEAR_EFF = 0.95 * 0.95;
// actuator layout along a (mm): mount pin, gearbox, the housing tube, the nut at flap 0
export const ACTL = { pin: 0, box0: 14, box1: 64, tube1: 262, nut0: 78, nutL: 30, motorL: 112, rodEnd: 0 };
ACTL.rodEnd = LEN0; // pin to rod-end pin at flap 0
export const AT_LEN = LEN0 - ACTL.nut0; // nut face to rod-end pin: the actuating tube's length
// 28 V DC permanent-magnet motor (class figures: 0.1 kW, about 5000 rpm on load)
export const MOTOR = { V: 28, R: 1.9, Ke: 0.042, I0: 1.0, spin: 30 }; // Ω, V·s/rad (= N·m/A), A, 1/s

// ---------------------------------------------------------------- loads
// Hinge moment of each flap about its own nose, the air pushing its trailing edge up:
// H = C_h q S_f c_f with C_h growing with the angle (a typical single-slotted flap's), and the
// tracks', rod ends' and cables' friction as a force at the nut.
export const FLAP_AREA = ((FLAP_WS[1] - FLAP_WS[0]) * FLAP_CHORD) / 1e6; // m² each
export const ch = (f) => 0.04 + 0.0065 * f;
export const q = (vkt) => 0.5 * RHO * (vkt * KT) ** 2; // Pa
export const hinge = (f, vkt) => ch(f) * q(vkt) * FLAP_AREA * (FLAP_CHORD / 1000); // N·m, one flap
export const FRICTION = 60; // N at the nut
// The force on the nut (N, + resists extending) and what the motor makes of it
export function nutForce(n, f, vkt) {
  return 2 * hinge(f, vkt) * dFlapDNut(n) * 1000; // N·m × rad/mm × 1000 mm/m
}
// motor current (A) and nut speed (mm/s) running in dir (+1 extend, −1 retract)
export function drive(n, f, vkt, dir) {
  const Fa = nutForce(n, f, vkt);
  const r2 = SCREW.d2 / 2000; // m
  const lam = LEAD_ANGLE;
  const phi = FRICTION_ANGLE;
  const load = Fa * dir; // + opposes the motion
  // a self-locking screw needs torque both ways: against the load tan(λ+φ), with it tan(φ−λ)
  const Ts = Math.abs(load) * r2 * (load >= 0 ? Math.tan(lam + phi) : Math.tan(phi - lam)) + FRICTION * r2 * Math.tan(lam + phi) + 0.02;
  const Tm = Ts / (RATIO * GEAR_EFF); // N·m at the motor
  const I = MOTOR.I0 + Tm / MOTOR.Ke;
  const w = Math.max(0, (MOTOR.V - MOTOR.R * I) / MOTOR.Ke); // rad/s
  const v = ((w / RATIO) * SCREW.lead) / (2 * Math.PI); // mm/s
  return { I, w, v, Tm, Ts, Fa };
}

// ---------------------------------------------------------------- the follow-up and the switches
// The follow-up cable runs from the bellcrank's hole F to a 60 mm pulley on the selector's switch
// carrier, so the carrier turns with the bellcrank, not with the flap: its scale (the position
// indicator) is marked where it stands at 10°, 20° and 30°, unevenly, because the first part of the
// travel moves the flaps aft without turning them. The selector lever turns on the same axis; a cam
// on it sits between the carrier's DOWN and UP micro-switches. When the lever leads the carrier by
// more than DB_ON one switch closes and the motor runs; it opens again within DB_OFF. At 0° and 30°
// the lever's detent is OVER past the mark, so the carrier never catches up: the actuator's limit
// switch stops the motor at the end of the screw's travel.
export const PULLEY_R = 60; // mm
export const followOf = (b) => BC.rF * (Math.sin(BETA0 * deg) - Math.sin(b * deg)); // cable travel, mm
export const carrierOf = (n) => followOf(betaOf(sOfNut(n))) / PULLEY_R / deg; // deg
export const MARKS = Object.fromEntries(FLAP_STOPS.map((f) => [f, carrierOf(nutOf(sOfFlap(f)))]));
export const DB_ON = 1.2; // deg of carrier
export const DB_OFF = 0.3;
export const OVER = 4;
export const leverOf = (sel) => (sel <= 0 ? -OVER : sel >= 30 ? MARKS[30] + OVER : MARKS[sel]);
export const LIMIT_DOWN = NUT_MAX; // the DOWN limit switch opens here (flap 30°)
export const LIMIT_UP = 0; // the UP limit switch (flap 0°, the nut home)

// ---------------------------------------------------------------- aerodynamics (the aircraft's model)
const clmaxFromVs = (vs) => (2 * W) / (RHO * (vs * KT) ** 2 * S);
export const CLMAX = Object.fromEntries(FLAP_STOPS.map((f) => [f, clmaxFromVs(VS_PUBLISHED[f])]));
function byFlap(tab, f) {
  const fs = FLAP_STOPS;
  if (f <= fs[0]) return tab[fs[0]];
  for (let i = 1; i < fs.length; i++) if (f <= fs[i]) return tab[fs[i - 1]] + ((tab[fs[i]] - tab[fs[i - 1]]) * (f - fs[i - 1])) / (fs[i] - fs[i - 1]);
  return tab[fs[fs.length - 1]];
}
export const clmax = (f) => byFlap(CLMAX, f);
export const dclFlap = (f) => byFlap(DCL_FLAP, f);
// trimmed lift slope and intercept (the elevator's down-load included), as the aircraft's model
export const DEN = D.CLa - (D.CLde * D.Cma) / D.Cmde; // per rad
export const CL_TRIM0 = D.CL0 - (D.CLde * D.Cm0) / D.Cmde;
// the wing's angle of attack (deg) for a C_L, flap f
export const alphaFor = (cl, f) => ((cl - CL_TRIM0 - dclFlap(f)) / DEN) / deg + INCIDENCE;
export const alphaStall = (f) => alphaFor(clmax(f), f);
export const ROUND = 1.5; // deg: the curve leaves its straight line ROUND before the linear stall angle
export const POST_STALL = 0.82; // C_L falls to this share of C_L,max once the wing has stalled
const K_DEG = DEN * deg; // lift slope per degree
// C_L against the wing's α: straight, then a parabola tangent to it that peaks at C_L,max ROUND past
// the straight line's stall angle, then falling to POST_STALL × C_L,max over 3°
export const alphaPeak = (f) => alphaStall(f) + ROUND;
export function clCurve(a, f) {
  const as = alphaStall(f);
  const cm = clmax(f);
  if (a <= as - ROUND) return CL_TRIM0 + dclFlap(f) + K_DEG * (a - INCIDENCE);
  if (a <= as + ROUND) return cm - (K_DEG / (4 * ROUND)) * (as + ROUND - a) ** 2;
  return cm * (1 - (1 - POST_STALL) * Math.min(1, ((a - as - ROUND) / 3) ** 1.5));
}
// the wing's α on that curve for a C_L below C_L,max
export function alphaOn(cl, f) {
  const as = alphaStall(f);
  const cm = clmax(f);
  if (cl <= cm - K_DEG * ROUND) return alphaFor(cl, f);
  return as + ROUND - Math.sqrt((Math.max(0, cm - cl) * 4 * ROUND) / K_DEG);
}
export const stallSpeed = (f, w = W) => Math.sqrt((2 * w) / (RHO * S * clmax(f))) / KT; // kt
export function flight(vkt, f) {
  const cl = W / (q(vkt) * S);
  const stalled = cl > clmax(f);
  return { v: vkt, flap: f, cl, alpha: stalled ? alphaPeak(f) + 2 : alphaOn(cl, f), stalled, vs: stallSpeed(f), margin: vkt / stallSpeed(f) };
}

// ---------------------------------------------------------------- the system's state and a step
export function system(sel = 0, n = 0) {
  return { t: 0, sel, n, w: 0, dir: 0, I: 0, down: false, up: false, limDown: true, limUp: n > LIMIT_UP, v: 60, spin: 0, lever: leverOf(sel), carrier: carrierOf(n), leverAt: null };
}
// one step of h seconds: the switches decide, the motor drives the nut through the screw
export function step(st, h) {
  const f = flapOf(sOfNut(st.n));
  st.lever = st.leverAt ?? leverOf(st.sel);
  st.carrier = carrierOf(st.n);
  const e = st.lever - st.carrier;
  if (st.down) st.down = e > DB_OFF;
  else st.down = e > DB_ON;
  if (st.up) st.up = e < -DB_OFF;
  else st.up = e < -DB_ON;
  st.limDown = st.n < LIMIT_DOWN;
  st.limUp = st.n > LIMIT_UP;
  const want = st.down && st.limDown ? 1 : st.up && st.limUp ? -1 : 0;
  let v = 0;
  if (want) {
    const d = drive(st.n, f, st.v, want);
    st.w += (d.w - st.w) * Math.min(1, MOTOR.spin * h);
    st.I = d.I;
    st.dir = want;
  } else {
    st.w += (0 - st.w) * Math.min(1, MOTOR.spin * 2 * h);
    if (st.w < 1) st.w = 0;
    st.I = 0;
  }
  const dir = want || st.dir;
  v = ((st.w / RATIO) * SCREW.lead) / (2 * Math.PI);
  st.n = Math.min(NUT_MAX + 1.5, Math.max(-1.5, st.n + dir * v * h));
  st.spin += dir * (st.w / RATIO) * h; // the screw's turn, rad
  if (!want && !st.w) st.dir = 0;
  st.t += h;
  return st;
}
export const stateOf = (st) => {
  const s = sOfNut(st.n);
  const g = geometry(s);
  return { s, ...g, beta: betaOf(s), fl: flight(st.v, g.flap) };
};

// ---------------------------------------------------------------- the tour
// At 60 kt on the approach: 10°, 20°, 30°, then up. The selector moves; the system does the rest.
export const TOUR = [
  [0, 0],
  [1, 10],
  [7.5, 20],
  [11.5, 30],
  [17.5, 0],
];
export const TOUR_PERIOD = 27;
export const TOUR_V = 60;
export function selAt(t) {
  const tt = ((t % TOUR_PERIOD) + TOUR_PERIOD) % TOUR_PERIOD;
  let s = TOUR[0][1];
  for (const [ts, v] of TOUR) if (tt >= ts) s = v;
  return s;
}
