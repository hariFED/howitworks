// Truth first: the nose landing gear of a four-seat high-wing light aircraft. An air-over-oil (oleo-
// pneumatic) strut with a metering pin, a steerable fork with torque links, a shimmy damper, bungee
// steering from the rudder pedals and centering cams. Pure, no imports, no DOM: the geometry, the
// dimensions, the readout and the charts all read this file.
//
// Conventions. World mm, the strut's axis vertical at u = 0, u forward-negative (the nose points left
// on the sheet), v up, the axle centre at v = 0 when the strut is fully extended. c is the strut's
// compression in mm: 0 fully extended, STROKE fully compressed. The strut's speed w is in m/s,
// positive in compression. Forces in N, pressures in bar absolute unless marked gauge.

export const G = 9.81;
export const P_ATM = 1.01325;

// ---------------------------------------------------------------- the aircraft (class figures)
export const MTOW = 1100; // kg, maximum take-off mass
export const NOSE_SHARE = 0.17; // nose wheel's share of the weight, at mid CG (15–20 % for the class)
export const MS = MTOW * NOSE_SHARE; // kg, the airframe mass the nose strut carries
export const W_NOSE = MS * G; // N, the static nose load
export const MU = 14; // kg, unsprung: piston tube, fork, axle, wheel, tyre

// ---------------------------------------------------------------- the strut (mm)
export const STROKE = 160;
export const OUTER_OD = 76.2; // outer cylinder, 3.0 in
export const OUTER_ID = 66.7;
export const PISTON_OD = 50.8; // piston tube, 2.0 in, chromed: the gland seals on it
export const PISTON_ID = 44.45;
export const ORIF_TUBE_OD = 30;
export const ORIF_TUBE_ID = 24;
export const D_ORIFICE = 7.5;
export const A_AIR = (Math.PI / 4) * PISTON_OD ** 2; // mm², the area the air pushes on
export const A_HYD = (Math.PI / 4) * PISTON_ID ** 2; // mm², the oil column forced through the orifice
export const A_OUTER = (Math.PI / 4) * OUTER_ID ** 2;

// Fixed heights at c = 0 (v, mm). The piston tube and all below it move up by c.
export const GLAND_BOT = 460; // gland nut's flange underside
export const OUTER_BOT = 470; // outer cylinder's lower end
export const GLAND_TOP = 505;
export const CAM_BOT = 505; // fixed cam ring on the gland nut
export const CAM_TOP = 525; // its top face; its V notch goes CAM_DEPTH below
export const CAM_DEPTH = 12; // mm
export const CAM_HALF = 32; // degrees, half-width of the notch at its top
export const MCAM_BOT = 525; // moving cam ring on the piston tube (its V tooth hangs CAM_DEPTH lower)
export const MCAM_TOP = 537;
export const SNUB_BOT = 537; // the snubber ring's cavity, between the moving cam and the head
export const SNUB_TOP = 543;
export const SNUB_T = 2; // ring thickness
export const HEAD_BOT = 543; // piston head (upper bearing), screwed on the tube
export const HEAD_TOP = 565;
export const TUBE_TOP = 550; // the piston tube's top end, inside the head
export const PLATE_BOT = 540; // orifice plate on the end of the orifice tube (fixed)
export const PLATE_TOP = 550;
export const VENT = 850; // vent holes near the orifice tube's top
export const CAP_BOT = 870; // the top fitting's spigot: the roof of the air chamber
export const OUTER_TOP = 890;
export const PIN_TIP = 532; // metering pin's tip at c = 0, below the orifice
export const PLUG_BOT = 210; // lower plug, flush with the tube's lower end
export const PLUG_TOP = 262; // carries the metering pin
export const PISTON_BOT = 210;
export const CROWN_BOT = 205; // fork crown's underside
export const CROWN_TOP = 262;
export const BOLT_V = 228; // fork bolt, fore and aft through crown, tube and plug
export const COLLAR_BOT = 472; // steering collar on the outer cylinder
export const COLLAR_TOP = 520;
export const HORN_V = 512; // steering horns, bungees and shimmy damper all at this height

// ---------------------------------------------------------------- the air spring
// Air (or nitrogen) over the oil, charged to 45 psi with the strut fully extended and unloaded.
// The piston tube entering the cylinder takes A_AIR of volume per mm; the air shrinks by that much.
// Polytropic n = 1.1 for a stroke of a second or so (1.0 isothermal, 1.4 adiabatic).
export const P_CHARGE_G = 3.1; // bar gauge, 45 psi
export const P0 = P_CHARGE_G + P_ATM;
export const L0 = 170; // mm, the air volume at c = 0 over A_AIR
export const V0 = (A_AIR * L0) / 1000; // cm³
export const N_POLY = 1.1;
export const airVolume = (c) => (A_AIR * (L0 - c)) / 1000; // cm³
export const pAir = (c, n = N_POLY) => P0 * (L0 / (L0 - Math.min(c, L0 - 2))) ** n; // bar abs
export const airForce = (c, n) => (pAir(c, n) - P_ATM) * A_AIR * 0.1; // N (bar·mm² × 0.1)
// The oil level above the head: the oil the piston tube displaces rises in the outer cylinder.
const A_FREE = A_OUTER - (Math.PI / 4) * (ORIF_TUBE_OD ** 2 - ORIF_TUBE_ID ** 2);
export const OIL_TOP0 = CAP_BOT - (A_AIR * L0) / A_FREE; // mm, the oil surface at c = 0
export const oilTop = (c) => OIL_TOP0 + (A_AIR * c) / A_FREE;
// Static: where the air alone carries the nose load (slowly, so isothermal).
export const C_STATIC = (() => {
  let lo = 0;
  let hi = STROKE;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (airForce(m) < W_NOSE) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
})();
export const P_STATIC = pAir(C_STATIC);

// ---------------------------------------------------------------- the metering orifice
// The oil in the piston tube is forced up through a Ø7.5 orifice in the plate on the orifice tube.
// A tapered metering pin on the piston tube's plug enters the orifice after PIN_GAP of stroke and
// closes it down as the strut compresses: the deeper the stroke, the smaller the hole, the harder it
// pushes back. Orifice flow: Δp = ½ρ(Q / (Cd·A_o))², so F = ½ρ·A_h³/(Cd·A_o)²·w|w|.
export const RHO = 850; // kg/m³, MIL-PRF-5606 hydraulic oil
export const CD = 0.7;
export const PIN_GAP = PLATE_BOT - PIN_TIP; // stroke before the pin's tip reaches the orifice
export const PIN_D0 = 3.0; // pin diameter at its tip
export const PIN_D1 = 6.3; // at PIN_LEN behind the tip
export const PIN_LEN = 150;
export const pinD = (z) => (z < 0 ? 0 : PIN_D0 + (PIN_D1 - PIN_D0) * Math.min(1, z / PIN_LEN));
// orifice area (mm²) at stroke c: the hole less the pin's section in it
export const orificeArea = (c) => (Math.PI / 4) * (D_ORIFICE ** 2 - pinD(c - PIN_GAP) ** 2);
// The recoil chamber: the annulus between the piston tube and the cylinder bore, under the head,
// grows as the strut compresses and is squeezed as it extends. Its oil passes four Ø5 ports in the
// moving cam and the head. Filling (compression) the snubber ring drops clear of the ports; emptying
// (extension) lifts it against the head and leaves only its three Ø3 bleed notches: rebound is snubbed.
export const A_ANN = A_OUTER - A_AIR; // mm²
export const A_PORTS = 4 * (Math.PI / 4) * 5 ** 2; // mm², ring open
export const A_BLEED = 3 * (Math.PI / 4) * 3 ** 2; // mm², ring seated
const kOrifice = (area, ah) => (0.5 * RHO * (ah * 1e-6) ** 3) / (CD * area * 1e-6) ** 2; // N·s²/m²
export const snubberShut = (w) => w < 0;
export function dampK(c, w) {
  return kOrifice(orificeArea(c), A_HYD) + kOrifice(snubberShut(w) ? A_BLEED : A_PORTS, A_ANN);
}
export const dampForce = (c, w) => dampK(c, w) * w * Math.abs(w); // N, resists the motion
// pressure drops (bar): across the orifice plate, and across the snubber
export const dpOrifice = (c, w) => (kOrifice(orificeArea(c), A_HYD) * w * w) / (A_HYD * 1e-6) / 1e5;
export const dpSnubber = (w) => (kOrifice(snubberShut(w) ? A_BLEED : A_PORTS, A_ANN) * w * w) / (A_ANN * 1e-6) / 1e5;
export const F_FRICTION = 90; // N, seals and bearings
export function strutForce(c, w, n) {
  return airForce(c, n) + dampForce(c, w) + F_FRICTION * Math.tanh(w / 0.02);
}

// ---------------------------------------------------------------- the tyre: 5.00-5, 6 ply
export const TYRE_OD = 353;
export const TYRE_R = TYRE_OD / 2;
export const TYRE_W = 128;
export const RIM_D = 127; // the 5 in bead seat
export const K_TYRE = 100000; // N/m, about 20 mm under the static load at 31 psi
export const C_TYRE = 300; // N·s/m

// ---------------------------------------------------------------- steering
// Rudder pedals steer the wheel through two bungee spring cartridges: ±10° at full pedal. The wheel
// follows the bungees against the shimmy damper (a first-order lag, τ = C_SHIMMY / K_BUNGEE). With
// the strut fully extended the centering cams take over: the moving cam's V nose drops into the fixed
// cam's notch and allows |ψ| ≤ CAM_HALF·c/CAM_DEPTH, so at c = 0 the wheel is held straight whatever
// the pedals do, and the bungees stretch instead.
export const STEER_MAX = 10; // degrees at full pedal
export const HORN_R = 75; // mm, steering horn on the collar
export const TAU_STEER = 0.22; // s
export const psiMax = (c) => (c >= CAM_DEPTH ? Infinity : (CAM_HALF * Math.max(0, c)) / CAM_DEPTH);
export const bungeeStretch = (pedal, psi) => HORN_R * Math.sin(((pedal * STEER_MAX - psi) * Math.PI) / 180); // mm
export const K_BUNGEE = 18; // N/mm per cartridge, preloaded

// ---------------------------------------------------------------- torque links (side view, mm)
// The upper link hangs from the collar's forward lug, the lower from the fork crown's; the knee folds
// forward as the strut shortens.
export const LINK_TOP = [-58, 482]; // upper link's pin on the collar (fixed in height)
export const LINK_BOT0 = [-58, 252]; // lower link's pin on the fork, at c = 0
export const LINK_L = 120; // pin to pin, each link
export function knee(c) {
  const [ut, vt] = LINK_TOP;
  const vb = LINK_BOT0[1] + c;
  const half = (vt - vb) / 2;
  const reach = Math.sqrt(Math.max(0, LINK_L ** 2 - half ** 2));
  return [ut - reach, vb + half];
}

// ---------------------------------------------------------------- the tour (16 s, loops)
// 0.0  in flight, gear extended, wheel centred by the cams; sinking at 0.9 m/s
// 1.2  nose-wheel touchdown: the strut compresses, rebounds, settles near C_STATIC
// 3.6  left pedal: the wheel steers left; 6.0 straight again
// 7.0  a 30 mm bump, 1 m long, at 4 m/s
// 8.6  right pedal; 10.6 straight
// 11   take-off roll, right rudder held against the propeller's yaw
// 12.2 rotation: the nose unloads, the strut extends, the cams centre the wheel; lift-off, climb
export const TOUR = 16;
export const T_TD = 1.2;
export const V_SINK = 0.9; // m/s at nose-wheel touchdown
export const BUMP = { t: 7.0, h: 0.03, len: 1.0, speed: 4 };
export const T_ROT = 12.2;
const ramp = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const smooth = (x) => x * x * (3 - 2 * x);
export function pedalAt(t) {
  const up = (a, b, c, d) => smooth(ramp(t, a, b)) - smooth(ramp(t, c, d));
  return up(3.6, 4.2, 5.4, 6.0) - up(8.6, 9.2, 10.0, 10.6) - 0.4 * up(11.0, 11.4, 14.6, 15.4);
}
// the nose load as a fraction of its weight: 1 on the ground, falling through 0 at rotation
export const loadAt = (t) => (t < T_ROT ? 1 : 1 - 1.25 * smooth(ramp(t, T_ROT, T_ROT + 0.7)));
export function groundAt(t) {
  const d = (t - BUMP.t) * BUMP.speed;
  if (d <= 0 || d >= BUMP.len) return 0;
  return BUMP.h * 0.5 * (1 - Math.cos((2 * Math.PI * d) / BUMP.len));
}

// ---------------------------------------------------------------- the gear as a two-mass system
// ys: height (m) of the airframe point where the axle sits at c = 0; yu: the axle's height. So
// c = (yu − ys)·1000. The tyre touches when yu − TYRE_R < ground.
export function gear() {
  return { t: 0, ys: TYRE_R / 1000 + V_SINK * T_TD, vs: -V_SINK, yu: TYRE_R / 1000 + V_SINK * T_TD, vu: -V_SINK, air: true, c: 0, w: 0, F: 0, Ft: 0, zg: 0, pedal: 0, psi: 0, load: 1, n: N_POLY };
}

// Advance by h seconds (semi-implicit Euler; call at 2 kHz or more). drive: { pedal, load, ground }
// override the tour's; hand: a held stroke (the airframe pinned, the wheel set by hand).
export function stepGear(s, h, drive = {}) {
  s.t += h;
  s.pedal = drive.pedal ?? s.pedal;
  s.load = drive.load ?? 1;
  s.zg = drive.ground ?? 0;
  const c = (s.yu - s.ys) * 1000;
  const w = s.vu - s.vs;
  const F = strutForce(Math.max(0, c), w, s.n);
  const pen = s.zg - (s.yu - TYRE_R / 1000);
  const Ft = pen > 0 ? Math.max(0, K_TYRE * pen - C_TYRE * s.vu) : 0;
  if (s.air) {
    // flying: the airframe follows its flight path; the strut hangs at full extension
    s.ys += s.vs * h;
  } else {
    s.vs += ((F - MS * G * s.load) / MS) * h;
    s.ys += s.vs * h;
  }
  s.vu += ((Ft - F - MU * G) / MU) * h;
  s.yu += s.vu * h;
  // the stops: top-out (the head on the cams) and bottoming, as hard contacts
  let cc = (s.yu - s.ys) * 1000;
  if (cc < 0) {
    s.yu = s.ys;
    if (s.vu < s.vs) s.vu = s.vs;
    cc = 0;
  } else if (cc > STROKE) {
    s.yu = s.ys + STROKE / 1000;
    if (s.vu > s.vs) s.vu = s.vs;
    cc = STROKE;
  }
  s.c = cc;
  s.w = s.vu - s.vs;
  s.F = strutForce(cc, s.w, s.n);
  s.Ft = Ft;
  // steering: bungees against the shimmy damper, inside the cams' limit
  s.psi += ((s.pedal * STEER_MAX - s.psi) / TAU_STEER) * h;
  const lim = psiMax(cc);
  if (s.psi > lim) s.psi = lim;
  if (s.psi < -lim) s.psi = -lim;
  return s;
}

// The tour: the gear at tour time t (0..TOUR), deterministic from t = 0.
export function tourStep(s, h) {
  const t = s.t + h;
  if (s.air && t < T_TD + 1) {
    // approach: sinking at V_SINK; touchdown when the tyre meets the runway
    s.vs = -V_SINK;
    if (s.yu - TYRE_R / 1000 <= 0.0005) s.air = false;
  }
  stepGear(s, h, { pedal: pedalAt(t), load: loadAt(t), ground: groundAt(t) });
  if (!s.air && t > T_ROT && s.c <= 0.01 && s.Ft === 0) {
    // lift-off: climb away at the speed the nose had
    s.air = true;
    s.vs = Math.max(0.5, s.vs);
  }
  return s;
}

// A held strut: the airframe fixed at its static height, the stroke set by hand.
export function holdGear(s, c, h, pedal) {
  const c0 = s.c;
  s.c = Math.min(STROKE, Math.max(0, c));
  s.w = (s.c - c0) / 1000 / h;
  s.ys = (TYRE_R - 20) / 1000 - C_STATIC / 1000;
  s.yu = s.ys + s.c / 1000;
  s.vs = 0;
  s.vu = s.w;
  s.air = false;
  s.pedal = pedal;
  s.F = strutForce(s.c, s.w);
  s.Ft = 0;
  s.psi += ((pedal * STEER_MAX - s.psi) / TAU_STEER) * h;
  const lim = psiMax(s.c);
  s.psi = Math.max(-lim, Math.min(lim, s.psi));
  return s;
}

// The phase of the tour, for the readout.
export function phase(s) {
  if (s.air) return s.c < 0.5 && Math.abs(s.psi) < 0.05 ? "FLYING, CENTRED" : "FLYING";
  if (s.c < CAM_DEPTH) return "CAMS ENGAGING";
  return "ON GROUND";
}

// The whole tour sampled, for the stroke–time diagram (computed once at build time).
export function tourTrace(dt = 1 / 2000, every = 40) {
  const s = gear();
  const out = [];
  let i = 0;
  while (s.t < TOUR) {
    tourStep(s, dt);
    if (i++ % every === 0) out.push([s.t, s.c, s.psi, s.F]);
  }
  return out;
}
