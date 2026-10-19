// Truth first: the elevator trim tab of the four-seat high-wing light aircraft (BP-022), one level below
// the flight controls (BP-106): the trim wheel and its position indicator in the pedestal, the cockpit
// drum, the trim cable loop and its pulleys, the jackscrew actuator in the port elevator (cable drum on
// the screw, Acme screw, bronze nut, bearing, housing and stops), the push-pull rod, the tab's horn, the
// piano hinge and the tab. Pure, no DOM.
//
// Every number the flight controls already have is imported from them (FC, flight-controls/model.mjs),
// and through them from the aircraft (A, light-aircraft/model.mjs): the tab's travel, horn, chord and
// place, the screw, the drums, the hinge-moment coefficients and the trimmed tab at each airspeed. So the
// two sheets show the same tab at the same angle for the same airspeed.
//
// Frames: the elevator's own, as BP-106 Section D-D: u aft of the elevator hinge, v up from its chord
// line, at the actuator's centre plane BL −485; mm. Angles in degrees. Tab δt + TE down (nose-up trim),
// elevator δe + TE down. Hinge moments + turn the trailing edge down.

import * as A from "../light-aircraft/model.mjs";
import * as FC from "../flight-controls/model.mjs";

export const rad = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ---------------------------------------------------------------- imported, not retyped
export const TAB_LIMITS = FC.TAB_LIMITS; // 10° up, 25° down
export const TAB_HORN = FC.TAB_HORN; // 32
export const TAB = FC.TAB; // FS 7104, BL −700…−270
export const TAB_CHORD = FC.TAB_CHORD; // 76
export const TAB_SPAN = TAB.bl[1] - TAB.bl[0]; // 430
export const TRIM_WHEEL_D = FC.TRIM_WHEEL_D; // 230
export const TRIM_DRUM_R = FC.TRIM_DRUM_R; // 30
export const ACT_DRUM_R = FC.ACT_DRUM_R; // 20
export const SCREW = FC.SCREW; // Ø10, lead 2, μ 0.15
export const LEAD_ANGLE = FC.LEAD_ANGLE; // 4.0°
export const FRICTION_ANGLE = FC.FRICTION_ANGLE; // 8.5°
export const CH = FC.CH; // C_hα, C_hδ, C_hδt per rad, downwash
export const ELEV_CHORD = FC.ELEV_CHORD;
export const S_E = FC.S_E;
export const TP = A.TAILPLANE;
export const ACT_BL = FC.ACT.bl; // −485
export const AXIS_V = FC.ACT.v; // the screw's axis, −6 below the chord line
export const CABLE_D = FC.TRIM_CABLE_D; // 2.4
export const PULLEY_D = FC.PULLEY_D;
export const nutFor = FC.nutFor;
export const screwTurns = FC.screwTurns;
export const cableFor = FC.cableFor;
export const trimWheelTurns = FC.trimWheelTurns;
export const TRIM_TURNS = FC.TRIM_TURNS;
export const trimmed = FC.trimmed;
export const forceAt = FC.forceAt;
export const alphaTail = FC.alphaTail;
export const TAB_U = TAB.fs - TP.hinge; // the tab hinge in the elevator's frame, 284
export const V_CRUISE = FC.V_CRUISE;
export const V_SLOW = FC.V_SLOW;

// ---------------------------------------------------------------- why a small tab holds a big elevator
// The air's moment about the elevator hinge is H = q·S_e·c_e·C_h with C_h = C_hα·α_t + C_hδ·δe + C_hδt·δt.
// Split it: the elevator's own share (its angle and the tail's angle of attack) and the tab's share. The
// tab is only 3 % of the elevator's area, but it sits at the very trailing edge, the longest lever about
// the hinge, so a few degrees of tab balance the whole elevator.
const qSc = (v) => A.q(v) * S_E * (ELEV_CHORD / 1000); // N·m per unit C_h
export function moments(v, de, dt, alphaBody) {
  const elev = qSc(v) * (CH.a * alphaTail(alphaBody) + CH.d * de) * rad;
  const tab = qSc(v) * CH.t * dt * rad;
  return { elev, tab, net: elev + tab }; // N·m; net is BP-106's hinge()
}
// Let go of the column and the elevator floats to where its hinge moment is zero:
// δe_float = −(C_hα·α_t + C_hδt·δt) / C_hδ. Trimmed means it floats to where the flight needs it.
export const floatAngle = (dt, alphaBody) => clamp(-(CH.a * alphaTail(alphaBody) + CH.t * dt) / CH.d, A.ELEVATOR_LIMITS[0], A.ELEVATOR_LIMITS[1]);
export const S_TAB = (TAB_SPAN * TAB_CHORD) / 1e6; // m²
export const TAB_SHARE = S_TAB / S_E; // of the elevator's area

// ---------------------------------------------------------------- the tab's own load and the jackscrew
// The tab's moment about its own hinge, which the rod must hold: class coefficients for a plain tab,
// b1 per rad of local flow angle (α_t + δe) and b2 per rad of tab.
export const TB = { a: -0.3, d: -0.6 };
export function tabLoad(v, de, dt, alphaBody) {
  const ch = (TB.a * (alphaTail(alphaBody) + de) + TB.d * dt) * rad;
  const H = A.q(v) * S_TAB * (TAB_CHORD / 1000) * ch; // N·m, + TE down
  const rod = H / (TAB_HORN / 1000); // N, + compression (pushes the nut aft)
  return { H, rod };
}
// Torques on the screw for an axial load F (N): to wind it against the load, and what the load alone
// can do to it. tan(λ − φ) < 0: the load cannot turn the screw at all, it is self-locking.
export const DM = SCREW.d - SCREW.lead / 2; // mean (pitch) diameter, 9
export const EFF = Math.tan(LEAD_ANGLE * rad) / Math.tan((LEAD_ANGLE + FRICTION_ANGLE) * rad); // winding efficiency
export const SELF_LOCKING = LEAD_ANGLE < FRICTION_ANGLE;
export function screwTorques(F) {
  const r = DM / 2 / 1000;
  const f = Math.abs(F);
  return {
    drive: f * r * Math.tan((LEAD_ANGLE + FRICTION_ANGLE) * rad), // N·m to wind the nut against F
    back: f * r * Math.tan((LEAD_ANGLE - FRICTION_ANGLE) * rad), // N·m the load would turn it by: < 0, it holds
  };
}
// the pilot's effort at the trim wheel's rim to wind against that load (the cable loop's drums, no losses)
export const rimForce = (F) => (screwTorques(F).drive * (TRIM_DRUM_R / ACT_DRUM_R)) / (TRIM_WHEEL_D / 2000);

// ---------------------------------------------------------------- the position indicator
// A pointer in the pedestal, geared to the wheel: it sweeps IND_SWEEP over the tab's full travel.
export const IND_SWEEP = 100;
export const indicatorFor = (dt) => -IND_SWEEP / 2 + (IND_SWEEP * (trimWheelTurns(dt) - TRIM_TURNS[0])) / (TRIM_TURNS[1] - TRIM_TURNS[0]);
export const TAKEOFF_TAB = trimmed(V_SLOW).tab; // the take-off mark: trimmed for 65 kt

// ---------------------------------------------------------------- the failure: a free tab flutters
// Disconnect the rod and nothing holds the tab: it floats where its own hinge moment is zero, and above
// a low airspeed its unbalanced mass couples with the elevator's motion and it flutters, growing until it
// bangs from stop to stop. The real flutter is 10–20 Hz; it is shown at FLUTTER_HZ_SHOWN.
export const V_FLUTTER = 70; // kt, for a tab with no mass balance (class figure)
export const FLUTTER_HZ = 14;
export const FLUTTER_HZ_SHOWN = 2.2;
export const tabFree = (de, alphaBody) => clamp((-TB.a * (alphaTail(alphaBody) + de)) / TB.d, TAB_LIMITS[0], TAB_LIMITS[1]);

// ---------------------------------------------------------------- the tour (30 s, loops)
// 0–3    cruise at 110 kt, trimmed: no force on the column
// 3–8    slow to 65 kt: the elevator must go up, the pull builds to 22 N
// 8–9    the pilot holds the pull
// 9–12   rolls the trim wheel nose up: the tab goes down, the floating elevator rises, the pull goes to zero
// 12–14  hands off, trimmed at 65 kt
// 14–18  back to cruise: a push builds
// 18–21  trim nose down: back to −3.9°
// 21–23  cruise, trimmed
// 23–28  if the rod came off: the tab floats, then flutters
// 28–30  reconnected, trimmed
export const TOUR = 30;
const ramp = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const sm = (k) => 0.5 - 0.5 * Math.cos(Math.PI * k);
export function tourAt(t) {
  const v = V_CRUISE + (V_SLOW - V_CRUISE) * sm(ramp(t, 3, 8)) + (V_CRUISE - V_SLOW) * sm(ramp(t, 14, 18));
  const t0 = trimmed(V_CRUISE).tab;
  const t1 = trimmed(V_SLOW).tab;
  const tab = t0 + (t1 - t0) * sm(ramp(t, 9, 12)) + (t0 - t1) * sm(ramp(t, 18, 21));
  const fail = t >= 23 && t < 28;
  return { v, tab, fail };
}
export function phase(s) {
  if (s.fail) return s.amp > 2 ? "ROD OFF: FLUTTER" : "ROD OFF: TAB FREE";
  if (s.mode !== "tour") return "HANDS ON";
  const t = s.t;
  if (t < 3) return "CRUISE, TRIMMED";
  if (t < 8) return "SLOWING TO 65 kt";
  if (t < 9) return "HOLDING THE PULL";
  if (t < 12) return "TRIM NOSE UP";
  if (t < 14) return "TRIMMED, HANDS OFF";
  if (t < 18) return "BACK TO CRUISE";
  if (t < 21) return "TRIM NOSE DOWN";
  return t < 23 ? "CRUISE, TRIMMED" : "RECONNECTED";
}

// ---------------------------------------------------------------- state and step
export function state() {
  return { t: 0, mode: "tour", v: V_CRUISE, set: trimmed(V_CRUISE).tab, tab: trimmed(V_CRUISE).tab, fail: false, amp: 0, ph: 0, free: 0, vT: V_CRUISE, tabT: trimmed(V_CRUISE).tab };
}
// one step of h seconds. The pilot holds the elevator where the flight needs it (attitude held); the
// trim wheel sets the tab through the screw, so the tab follows the setting exactly unless the rod is off.
export function step(s, h) {
  if (s.mode === "tour") {
    s.t += h;
    if (s.t >= TOUR) {
      s.t -= TOUR;
      s.amp = 0;
    }
    const k = tourAt(s.t);
    s.v = k.v;
    s.set = k.tab;
    s.fail = k.fail;
  } else {
    s.v += clamp(s.vT - s.v, -12 * h, 12 * h);
    s.set += clamp(s.tabT - s.set, -6 * h, 6 * h); // the wheel rolled about a turn a second
  }
  const fl = A.flight(s.v, 0, 0);
  if (s.fail) {
    const free = tabFree(fl.elevator, fl.alpha);
    s.free += (free - s.free) * Math.min(1, 6 * h);
    const grow = s.v > V_FLUTTER ? 0.9 * (s.v / V_FLUTTER - 1) + 0.25 : -1.5;
    if (s.amp < 0.8 && grow > 0) s.amp = 0.8;
    s.amp = clamp(s.amp * Math.exp(grow * h * 1.3), 0, 30);
    s.ph += 2 * Math.PI * FLUTTER_HZ_SHOWN * h;
    s.tab = clamp(s.free + s.amp * Math.sin(s.ph), TAB_LIMITS[0], TAB_LIMITS[1]);
  } else {
    s.amp = 0;
    s.free = s.tab;
    s.tab = clamp(s.set, TAB_LIMITS[0], TAB_LIMITS[1]);
  }
  return s;
}
// everything the pages show, for one state
export function solve(s) {
  const fl = A.flight(s.v, 0, 0);
  const de = fl.elevator;
  const m = moments(s.v, de, s.tab, fl.alpha);
  const F = forceAt(s.v, s.tab);
  const load = tabLoad(s.v, de, s.tab, fl.alpha);
  const tq = screwTorques(load.rod);
  return {
    v: s.v, de, alpha: fl.alpha, tab: s.tab, m, F, load, tq,
    float: floatAngle(s.tab, fl.alpha),
    nut: nutFor(s.fail ? s.set : s.tab), // the nut stays where the screw put it
    turns: trimWheelTurns(s.set),
    screw: screwTurns(s.set),
    ind: indicatorFor(s.set),
    fail: s.fail, amp: s.amp, set: s.set,
  };
}
